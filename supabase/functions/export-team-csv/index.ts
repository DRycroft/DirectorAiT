import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CSV escaping utility function
function escapeCsv(field: string): string {
  if (!field) return '""';
  let safe = String(field);
  // Remove leading characters that Excel interprets as formulas
  safe = safe.replace(/^[=+\-@]/, "'");
  // Escape quotes
  safe = safe.replace(/"/g, '""');
  return `"${safe}"`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestSchema = z.object({
      boardId: z.string().uuid("Invalid board ID format"),
      includeConfidential: z.boolean().optional().default(false)
    });

    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid request", 
          details: validationResult.error.errors 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const { boardId, includeConfidential } = validationResult.data;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's org_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.org_id) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify board belongs to user's organization
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .select("org_id")
      .eq("id", boardId)
      .single();

    if (boardError || !board) {
      return new Response(
        JSON.stringify({ error: "Board not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (board.org_id !== profile.org_id) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For confidential exports, require admin role
    if (includeConfidential) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['org_admin', 'super_admin']);
        
      if (!roles || roles.length === 0) {
        return new Response(
          JSON.stringify({ error: "Insufficient permissions for confidential export" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Fetch all members for this board
    const { data: members, error } = await supabase
      .from("board_members")
      .select("*")
      .eq("board_id", boardId)
      .order("full_name");

    if (error) {
      console.error("Error fetching members:", error);
      throw error;
    }

    // Generate CSV headers
    const headers = [
      "Full Name",
      "Title",
      "Job Title",
      "Email",
      "Mobile",
      "Status",
      "Appointment Date",
      "Term Expiry",
    ];

    if (includeConfidential) {
      headers.push("Legal Name", "National ID", "Home Address");
    }

    // Generate CSV rows with proper escaping
    const rows = [headers];
    
    for (const member of members || []) {
      const row = [
        escapeCsv(member.full_name || ""),
        escapeCsv(member.preferred_title || ""),
        escapeCsv(member.public_job_title || ""),
        escapeCsv(member.personal_email || ""),
        escapeCsv(member.personal_mobile || ""),
        escapeCsv(member.status || ""),
        escapeCsv(member.appointment_date ? new Date(member.appointment_date).toLocaleDateString() : ""),
        escapeCsv(member.term_expiry ? new Date(member.term_expiry).toLocaleDateString() : ""),
      ];

      if (includeConfidential) {
        row.push(
          escapeCsv(member.legal_name || ""),
          escapeCsv(member.national_id || ""),
          escapeCsv(member.home_address || "")
        );
      }

      rows.push(row);
    }

    // Convert to CSV string
    const csv = rows.map(row => row.join(',')).join('\n');

    // Create audit log for export
    await supabase.rpc('log_audit_entry', {
      _entity_type: 'board_export',
      _entity_id: boardId,
      _action: 'csv_export',
      _detail_json: {
        member_count: members?.length || 0,
        included_confidential: includeConfidential,
        member_ids: members?.map(m => m.id) || []
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        csv: csv,
        memberCount: members?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in export-team-csv:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
