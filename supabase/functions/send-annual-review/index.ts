import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: track requests per minute
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // Reduced: max 5 requests per minute for cron
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

// IP allowlist for cron triggers (add your cron service IPs)
const ALLOWED_IPS = new Set([
  // Add known cron service IPs here
  // "1.2.3.4",
]);

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

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do the comparison to maintain constant time
    const dummy = "a".repeat(a.length);
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ dummy.charCodeAt(i);
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const requestTimestamp = new Date().toISOString();
  
  // Get client IP for logging and optional IP allowlisting
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || 
                   "unknown";
  
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

    // Validate secret is present
    if (!cronSecret) {
      console.error(`[${requestId}] [${requestTimestamp}] Missing cron secret from IP: ${clientIP}`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Use timing-safe comparison to prevent timing attacks
    const isValidSecret = timingSafeEqual(expectedSecret, cronSecret);
    
    if (!isValidSecret) {
      console.error(`[${requestId}] [${requestTimestamp}] Invalid cron secret from IP: ${clientIP}`);
      
      // Log security event for monitoring
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from("audit_log").insert({
        entity_type: "security",
        entity_id: crypto.randomUUID(),
        action: "unauthorized_cron_attempt",
        detail_json: {
          ip_address: clientIP,
          request_id: requestId,
          timestamp: requestTimestamp,
        },
      });
      
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply rate limiting based on the function name
    if (!checkRateLimit("send-annual-review")) {
      console.error(`[${requestId}] [${requestTimestamp}] Rate limit exceeded from IP: ${clientIP}`);
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[${requestId}] [${requestTimestamp}] Starting annual review reminder check from IP: ${clientIP}`);

    // Log the cron execution for audit trail
    await supabase.from("audit_log").insert({
      entity_type: "cron_job",
      entity_id: crypto.randomUUID(),
      action: "send_annual_review_started",
      detail_json: {
        request_id: requestId,
        timestamp: requestTimestamp,
        ip_address: clientIP,
      },
    });

    // Get all active members whose profiles need annual review
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: members, error } = await supabase
      .from("board_members")
      .select("id, full_name, board_id")
      .eq("status", "active")
      .lt("profile_completed_at", oneYearAgo.toISOString())
      .limit(100); // Limit batch size

    if (error) {
      console.error(`[${requestId}] [${requestTimestamp}] Database error:`, error);
      throw error;
    }

    console.log(`[${requestId}] [${requestTimestamp}] Found ${members?.length || 0} members requiring annual review`);

    let notifiedCount = 0;
    const errors: string[] = [];

    // Process each member
    for (const member of members || []) {
      try {
        // Generate a secure review token
        const reviewToken = crypto.randomUUID();

        // Update member with review reminder sent
        const { error: updateError } = await supabase
          .from("board_members")
          .update({
            invite_token: reviewToken,
            invite_sent_at: new Date().toISOString(),
            invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          })
          .eq("id", member.id);

        if (updateError) {
          errors.push(`Failed to update member ${member.id}: ${updateError.message}`);
          continue;
        }

        // Create audit log entry
        await supabase.rpc("log_board_member_audit", {
          _member_id: member.id,
          _field_name: "annual_review_reminder",
          _change_type: "updated",
          _new_value: `Annual review reminder sent (request: ${requestId})`,
        });

        notifiedCount++;
        console.log(`[${requestId}] [${requestTimestamp}] Annual review reminder prepared for member ${member.id}`);
        
        // TODO: Integrate with email service (Resend) to send actual emails
      } catch (memberError) {
        const errorMsg = memberError instanceof Error ? memberError.message : "Unknown error";
        errors.push(`Error processing member ${member.id}: ${errorMsg}`);
        console.error(`[${requestId}] [${requestTimestamp}] Error for member ${member.id}:`, errorMsg);
      }
    }

    // Log completion
    await supabase.from("audit_log").insert({
      entity_type: "cron_job",
      entity_id: crypto.randomUUID(),
      action: "send_annual_review_completed",
      detail_json: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        members_notified: notifiedCount,
        errors_count: errors.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        membersNotified: notifiedCount,
        errorsCount: errors.length,
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