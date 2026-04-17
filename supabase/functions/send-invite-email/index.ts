import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  invite_token: z.string().min(8).max(256),
  invite_email: z.string().email().max(255),
  invitee_name: z.string().trim().max(120).optional().default(""),
  org_name: z.string().trim().min(1).max(200),
  board_name: z.string().trim().min(1).max(200),
  invited_by_name: z.string().trim().min(1).max(120),
  board_id: z.string().uuid(),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. JWT auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    // 2. Validate input
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid request" }, 400);
    }
    const body = parsed.data;

    // 3. Authorize: must be super_admin, org_admin/chair of board's org,
    //    or chair/admin/owner board membership for the target board.
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: board, error: boardErr } = await admin
      .from("boards")
      .select("id, org_id")
      .eq("id", body.board_id)
      .maybeSingle();
    if (boardErr || !board) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const [{ data: roles }, { data: membership }] = await Promise.all([
      admin
        .from("user_roles")
        .select("role, org_id")
        .eq("user_id", userId),
      admin
        .from("board_memberships")
        .select("role")
        .eq("board_id", body.board_id)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const roleRows = roles ?? [];
    const isSuper = roleRows.some((r) => r.role === "super_admin");
    const isOrgAdminOrChair = roleRows.some(
      (r) =>
        (r.role === "org_admin" || r.role === "chair") &&
        r.org_id === board.org_id,
    );
    const boardRole = membership?.role ?? null;
    const isBoardAdmin =
      boardRole === "chair" || boardRole === "admin" || boardRole === "owner";

    if (!isSuper && !isOrgAdminOrChair && !isBoardAdmin) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // 4. Build email (escape all interpolated fields)
    const safeInvitee = escapeHtml(body.invitee_name || "there");
    const safeInviter = escapeHtml(body.invited_by_name);
    const safeBoard = escapeHtml(body.board_name);
    const safeOrg = escapeHtml(body.org_name);
    const inviteUrl = `https://www.directorait.com/invite/${encodeURIComponent(body.invite_token)}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <img src="https://www.directorait.com/directorait-logo.png" alt="DirectorAiT" height="40" style="height:40px;" />
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">You've been invited to join a board</h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;font-size:16px;color:#374151;line-height:1.6;">
          <p style="margin:0 0 12px 0;">Hi ${safeInvitee},</p>
          <p style="margin:0 0 12px 0;"><strong>${safeInviter}</strong> has invited you to join the <strong>${safeBoard}</strong> board at <strong>${safeOrg}</strong> on DirectorAiT.</p>
          <p style="margin:0;">Click the button below to accept your invitation and set up your account.</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${inviteUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#1e40af;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">Accept Invitation</a>
        </td></tr>
        <tr><td style="padding-bottom:32px;font-size:14px;color:#6b7280;line-height:1.5;">
          <p style="margin:0 0 8px 0;">Or copy and paste this link into your browser:</p>
          <p style="margin:0;word-break:break-all;"><a href="${inviteUrl}" style="color:#1e40af;text-decoration:underline;">${escapeHtml(inviteUrl)}</a></p>
        </td></tr>
        <tr><td style="border-top:1px solid #e5e7eb;padding-top:24px;font-size:12px;color:#9ca3af;line-height:1.5;">
          <p style="margin:0;">This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY missing");
      return jsonResponse({ error: "Email service unavailable" }, 500);
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DirectorAiT Invites <invites@directorait.com>",
        to: [body.invite_email],
        subject: `You've been invited to join the ${body.board_name} board on DirectorAiT`,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend API error:", errorData);
      return jsonResponse({ error: "Failed to send invite" }, 502);
    }

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error("send-invite-email error:", error);
    return jsonResponse({ error: "Failed to send invite" }, 500);
  }
});
