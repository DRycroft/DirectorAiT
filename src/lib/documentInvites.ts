import { supabase } from "@/integrations/supabase/client";

interface CreateInviteParams {
  orgId: string;
  inviteType: string;
  targetType: string;
  targetId: string;
  recipientEmail?: string;
  recipientName?: string;
  expiresAt?: Date;
}

interface CreateInviteResult {
  inviteId: string;
  url: string;
}

/**
 * Generate a secure random token for invite links
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a document invite and return the invite ID and magic-link URL
 */
export async function createDocumentInvite(
  params: CreateInviteParams
): Promise<CreateInviteResult> {
  const token = generateSecureToken();

  const user = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from("document_invites")
    .insert({
      org_id: params.orgId,
      invite_type: params.inviteType,
      target_type: params.targetType,
      target_id: params.targetId,
      recipient_email: params.recipientEmail || null,
      recipient_name: params.recipientName || null,
      token,
      expires_at: params.expiresAt?.toISOString() || null,
      created_by: user.data.user?.id || "",
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating document invite:", error);
    throw new Error(`Failed to create invite: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to create invite: No data returned");
  }

  // Construct the magic-link URL
  const baseUrl = window.location.origin;
  const url = `${baseUrl}/action/${token}`;

  return {
    inviteId: data.id,
    url,
  };
}

/**
 * Get an invite by token (public access for magic-link pages)
 */
export async function getInviteByToken(token: string) {
  const { data, error } = await supabase
    .from("document_invites")
    .select("*")
    .eq("token", token)
    .single();

  if (error) {
    console.error("Error fetching invite:", error);
    return null;
  }

  return data;
}

/**
 * Mark an invite as completed
 */
export async function completeInvite(inviteId: string) {
  const { error } = await supabase
    .from("document_invites")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", inviteId);

  if (error) {
    console.error("Error completing invite:", error);
    throw new Error(`Failed to complete invite: ${error.message}`);
  }
}
