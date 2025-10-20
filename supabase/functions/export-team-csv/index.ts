import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { boardId, includeConfidential = false } = await req.json();

    if (!boardId) {
      return new Response(
        JSON.stringify({ error: "boardId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching team members for CSV export:", boardId);

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

    // Generate CSV rows
    const rows = [headers];
    
    for (const member of members || []) {
      const row = [
        member.full_name || "",
        member.preferred_title || "",
        member.public_job_title || "",
        member.personal_email || "",
        member.personal_mobile || "",
        member.status || "",
        member.appointment_date ? new Date(member.appointment_date).toLocaleDateString() : "",
        member.term_expiry ? new Date(member.term_expiry).toLocaleDateString() : "",
      ];

      if (includeConfidential) {
        row.push(
          member.legal_name || "",
          member.national_id || "",
          member.home_address || ""
        );
      }

      rows.push(row);
    }

    // Convert to CSV string
    const csv = rows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(cell).replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
      }).join(',')
    ).join('\n');

    // Create audit log for export
    await supabase.from("board_member_audit").insert({
      member_id: members?.[0]?.id,
      field_name: "team_export",
      new_value: `CSV export for board ${boardId} (${includeConfidential ? "with" : "without"} confidential data)`,
      change_type: "updated",
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
