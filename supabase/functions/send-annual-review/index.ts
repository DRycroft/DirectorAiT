import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: track requests per minute
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max requests per minute
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(identifier, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const requestTimestamp = new Date().toISOString();
  
  try {
    // Verify cron secret for security (since JWT verification is disabled)
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    
    if (!expectedSecret) {
      console.error(`[${requestId}] [${requestTimestamp}] CRON_SECRET environment variable not configured`);
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Use timing-safe comparison to prevent timing attacks
    const encoder = new TextEncoder();
    const secretBytes = encoder.encode(expectedSecret);
    const providedBytes = encoder.encode(cronSecret || "");
    
    // Ensure both have same length for constant-time comparison
    let isValid = secretBytes.length === providedBytes.length;
    
    // Compare byte by byte (constant time regardless of where mismatch occurs)
    const maxLen = Math.max(secretBytes.length, providedBytes.length);
    for (let i = 0; i < maxLen; i++) {
      const a = secretBytes[i] ?? 0;
      const b = providedBytes[i] ?? 0;
      if (a !== b) isValid = false;
    }
    
    if (!isValid) {
      console.error(`[${requestId}] [${requestTimestamp}] Unauthorized: Invalid cron secret`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply rate limiting based on the function name (cron job identifier)
    if (!checkRateLimit("send-annual-review")) {
      console.error(`[${requestId}] [${requestTimestamp}] Rate limit exceeded`);
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[${requestId}] [${requestTimestamp}] Starting annual review reminder check...`);

    // Get all active members whose profiles need annual review
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: members, error } = await supabase
      .from("board_members")
      .select("id, full_name, personal_email, profile_completed_at, board_id")
      .eq("status", "active")
      .lt("profile_completed_at", oneYearAgo.toISOString());

    if (error) {
      throw error;
    }

    console.log(`[${requestId}] [${requestTimestamp}] Found ${members?.length || 0} members requiring annual review`);

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

      // Create audit log using the new secure function
      await supabase.rpc("log_board_member_audit", {
        _member_id: member.id,
        _field_name: "annual_review_reminder",
        _change_type: "updated",
        _new_value: "Annual review reminder sent",
      });

      console.log(`[${requestId}] [${requestTimestamp}] Annual review reminder sent to member ${member.id}`);

      // TODO: Send email notification
      // For now, just log the review link
      // In production, integrate with Resend or another email service
    }

    return new Response(
      JSON.stringify({
        success: true,
        membersNotified: members?.length || 0,
        requestId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[${requestId}] [${requestTimestamp}] Error in send-annual-review:`, errorMessage);
    return new Response(
      JSON.stringify({ error: "Internal server error", requestId }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});