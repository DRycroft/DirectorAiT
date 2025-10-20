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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting annual review reminder check...");

    // Get all active members whose profiles need annual review
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: members, error } = await supabase
      .from("board_members")
      .select("id, full_name, personal_email, profile_completed_at, board_id")
      .eq("status", "active")
      .lt("profile_completed_at", oneYearAgo.toISOString());

    if (error) {
      console.error("Error fetching members:", error);
      throw error;
    }

    console.log(`Found ${members?.length || 0} members requiring annual review`);

    // For each member, create an audit log entry and generate a review token
    for (const member of members || []) {
      // Generate a review token
      const reviewToken = crypto.randomUUID();

      // Update member with review reminder sent
      await supabase
        .from("board_members")
        .update({
          invite_token: reviewToken,
          invite_sent_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      // Create audit log
      await supabase.from("board_member_audit").insert({
        member_id: member.id,
        field_name: "annual_review_reminder",
        new_value: "Annual review reminder sent",
        change_type: "updated",
      });

      const reviewLink = `${Deno.env.get("SUPABASE_URL")
        ?.replace("supabase.co", "lovableproject.com")
        || ""}/member-invite?token=${reviewToken}`;

      console.log(`Annual review reminder for ${member.full_name}: ${reviewLink}`);

      // TODO: Send email notification
      // For now, just log the review link
      // In production, integrate with Resend or another email service
    }

    return new Response(
      JSON.stringify({
        success: true,
        membersNotified: members?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-annual-review:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
