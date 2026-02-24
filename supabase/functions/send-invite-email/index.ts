import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteEmailRequest {
  invite_token: string;
  invite_email: string;
  invitee_name: string;
  org_name: string;
  board_name: string;
  invited_by_name: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      invite_token,
      invite_email,
      invitee_name,
      org_name,
      board_name,
      invited_by_name,
    }: InviteEmailRequest = await req.json();

    if (!invite_token || !invite_email) {
      throw new Error("Missing required fields: invite_token and invite_email");
    }

    const inviteUrl = `https://www.directorait.com/invite/${invite_token}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <img src="https://www.directorait.com/directorait-logo.png" alt="DirectorAiT" height="40" style="height:40px;" />
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">
                You've been invited to join a board
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;font-size:16px;color:#374151;line-height:1.6;">
              <p style="margin:0 0 12px 0;">Hi ${invitee_name || "there"},</p>
              <p style="margin:0 0 12px 0;">
                <strong>${invited_by_name}</strong> has invited you to join the 
                <strong>${board_name}</strong> board at <strong>${org_name}</strong> on DirectorAiT.
              </p>
              <p style="margin:0;">
                Click the button below to accept your invitation and set up your account.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="${inviteUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:#1e40af;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;">
                Accept Invitation
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;font-size:14px;color:#6b7280;line-height:1.5;">
              <p style="margin:0 0 8px 0;">Or copy and paste this link into your browser:</p>
              <p style="margin:0;word-break:break-all;">
                <a href="${inviteUrl}" style="color:#1e40af;text-decoration:underline;">${inviteUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e5e7eb;padding-top:24px;font-size:12px;color:#9ca3af;line-height:1.5;">
              <p style="margin:0;">
                This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DirectorAiT Invites <invites@directorait.com>",
        to: [invite_email],
        subject: `You've been invited to join the ${board_name} board on DirectorAiT`,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Email delivery failed: ${errorData}`);
    }

    const result = await resendResponse.json();
    console.log("Invite email sent successfully:", result);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-invite-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
