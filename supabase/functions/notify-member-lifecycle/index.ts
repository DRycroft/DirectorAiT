import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  member_id: z.string().uuid(),
  event: z.enum(["profile_submitted", "approved", "rejected"]),
  comments: z.string().trim().max(2000).optional(),
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

const APP_URL = "https://www.directorait.com";

function wrap(title: string, innerHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr><td align="center" style="padding:32px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:16px;">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#111827;">${escapeHtml(title)}</h1>
        </td></tr>
        <tr><td style="font-size:15px;color:#374151;line-height:1.6;">${innerHtml}</td></tr>
        <tr><td style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:16px;font-size:12px;color:#9ca3af;">
          <p style="margin:16px 0 0 0;">DirectorAiT</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendEmail(
  apiKey: string,
  to: string[],
  subject: string,
  html: string,
): Promise<boolean> {
  if (to.length === 0) return true;
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "DirectorAiT <invites@directorait.com>",
      to,
      subject,
      html,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    console.error("Resend error:", resp.status, t);
    return false;
  }
  return true;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid request" }, 400);
    }
    const { member_id, event, comments } = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey);

    // Load member + board + org
    const { data: member, error: mErr } = await admin
      .from("board_members")
      .select("id, full_name, invite_email, board_id, user_id, status")
      .eq("id", member_id)
      .maybeSingle();
    if (mErr || !member) return jsonResponse({ error: "Not found" }, 404);

    const { data: board } = await admin
      .from("boards")
      .select("id, title, org_id")
      .eq("id", member.board_id)
      .maybeSingle();
    if (!board) return jsonResponse({ error: "Not found" }, 404);

    const { data: org } = await admin
      .from("organizations")
      .select("id, name")
      .eq("id", board.org_id)
      .maybeSingle();

    // Authorization:
    //  - profile_submitted: caller must be the member (user_id matches) OR an admin of the board/org
    //  - approved/rejected:  caller must be admin (board chair/admin/owner, org_admin/chair, or super_admin)
    const [{ data: roles }, { data: membership }] = await Promise.all([
      admin.from("user_roles").select("role, org_id").eq("user_id", userId),
      admin
        .from("board_memberships")
        .select("role")
        .eq("board_id", board.id)
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
    const isAdmin = isSuper || isOrgAdminOrChair || isBoardAdmin;
    const isSelf = member.user_id === userId;

    if (event === "profile_submitted") {
      if (!isSelf && !isAdmin) return jsonResponse({ error: "Forbidden" }, 403);
    } else {
      if (!isAdmin) return jsonResponse({ error: "Forbidden" }, 403);
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY missing");
      return jsonResponse({ error: "Email service unavailable" }, 500);
    }

    const safeMember = escapeHtml(member.full_name ?? "A member");
    const safeBoard = escapeHtml(board.title);
    const safeOrg = escapeHtml(org?.name ?? "");

    if (event === "profile_submitted") {
      // Resolve admin recipient emails: org_admins + board chair/admin/owner memberships.
      const [{ data: orgAdmins }, { data: boardAdmins }] = await Promise.all([
        admin
          .from("user_roles")
          .select("user_id")
          .eq("org_id", board.org_id)
          .in("role", ["org_admin", "chair"]),
        admin
          .from("board_memberships")
          .select("user_id")
          .eq("board_id", board.id)
          .in("role", ["chair", "admin", "owner"]),
      ]);
      const userIds = Array.from(
        new Set(
          [
            ...(orgAdmins ?? []).map((r: any) => r.user_id),
            ...(boardAdmins ?? []).map((r: any) => r.user_id),
          ].filter(Boolean),
        ),
      );
      let recipients: string[] = [];
      if (userIds.length > 0) {
        const { data: profs } = await admin
          .from("profiles")
          .select("email")
          .in("id", userIds);
        recipients = Array.from(
          new Set(
            (profs ?? [])
              .map((p: any) => p.email)
              .filter((e: string | null) => !!e),
          ),
        );
      }
      if (recipients.length === 0) {
        return jsonResponse({ success: true, skipped: "no_recipients" }, 200);
      }
      const url = `${APP_URL}/member-approval/${encodeURIComponent(member_id)}`;
      const html = wrap(
        "Member profile submitted for review",
        `<p style="margin:0 0 12px 0;"><strong>${safeMember}</strong> has submitted their profile for the <strong>${safeBoard}</strong> board${safeOrg ? ` at <strong>${safeOrg}</strong>` : ""}.</p>
         <p style="margin:0 0 16px 0;">Please review and approve or request changes.</p>
         <p style="margin:0;"><a href="${url}" style="color:#1e40af;text-decoration:underline;">Review profile</a></p>`,
      );
      const ok = await sendEmail(
        apiKey,
        recipients,
        `Profile submitted for review: ${member.full_name}`,
        html,
      );
      return jsonResponse({ success: ok, recipients: recipients.length }, 200);
    }

    // approved / rejected -> notify the member
    let memberEmail: string | null = member.invite_email ?? null;
    if (!memberEmail && member.user_id) {
      const { data: prof } = await admin
        .from("profiles")
        .select("email")
        .eq("id", member.user_id)
        .maybeSingle();
      memberEmail = prof?.email ?? null;
    }
    if (!memberEmail) {
      return jsonResponse({ success: true, skipped: "no_member_email" }, 200);
    }

    if (event === "approved") {
      const url = `${APP_URL}/my-profile`;
      const html = wrap(
        "Your board member profile has been approved",
        `<p style="margin:0 0 12px 0;">Hi ${safeMember},</p>
         <p style="margin:0 0 12px 0;">Your profile for the <strong>${safeBoard}</strong> board${safeOrg ? ` at <strong>${safeOrg}</strong>` : ""} has been approved. You are now an active member.</p>
         <p style="margin:0;"><a href="${url}" style="color:#1e40af;text-decoration:underline;">View your profile</a></p>`,
      );
      const ok = await sendEmail(
        apiKey,
        [memberEmail],
        `You're approved: ${board.title}`,
        html,
      );
      return jsonResponse({ success: ok }, 200);
    }

    // rejected
    const safeComments = comments ? escapeHtml(comments) : "";
    const url = `${APP_URL}/my-profile`;
    const commentsBlock = safeComments
      ? `<p style="margin:0 0 12px 0;">Reviewer comments:</p>
         <blockquote style="margin:0 0 16px 0;padding:12px 16px;border-left:3px solid #e5e7eb;background:#f9fafb;color:#374151;white-space:pre-wrap;">${safeComments}</blockquote>`
      : "";
    const html = wrap(
      "Changes requested on your board member profile",
      `<p style="margin:0 0 12px 0;">Hi ${safeMember},</p>
       <p style="margin:0 0 12px 0;">A reviewer has requested changes to your profile for the <strong>${safeBoard}</strong> board${safeOrg ? ` at <strong>${safeOrg}</strong>` : ""} before it can be approved.</p>
       ${commentsBlock}
       <p style="margin:0;"><a href="${url}" style="color:#1e40af;text-decoration:underline;">Update your profile</a></p>`,
    );
    const ok = await sendEmail(
      apiKey,
      [memberEmail],
      `Changes requested: ${board.title}`,
      html,
    );
    return jsonResponse({ success: ok }, 200);
  } catch (err) {
    console.error("notify-member-lifecycle error:", err);
    return jsonResponse({ error: "Failed" }, 500);
  }
});
