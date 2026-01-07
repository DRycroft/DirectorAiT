import { supabase } from "@/integrations/supabase/client";

/**
 * Idempotently bootstrap a first-time user with org, board, and membership.
 * Detection: user has no org_id in profile AND no board_memberships.
 */
export async function runBootstrapFromLocalStorage(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Check if user already has an organization
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.org_id) {
    // Already bootstrapped, clean up any pending data
    sessionStorage.removeItem("pendingSignUpV1");
    return;
  }

  // Check if user has any board_memberships
  const { data: existingMemberships } = await supabase
    .from("board_memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (existingMemberships && existingMemberships.length > 0) {
    // User has membership but no org - unusual state, skip bootstrap
    sessionStorage.removeItem("pendingSignUpV1");
    return;
  }

  // First-time user: no org AND no board_membership
  // Try to get signup form data if available
  let raw = sessionStorage.getItem("pendingSignUpV1");
  if (!raw) {
    raw = localStorage.getItem("pendingSignUpV1");
    if (raw) {
      localStorage.removeItem("pendingSignUpV1");
    }
  }

  let orgName = "My First Organization";
  let contactName = user.email?.split("@")[0] || "User";
  let contactEmail = user.email || "";
  let contactPhone: string | null = null;

  if (raw) {
    try {
      const pending = JSON.parse(raw);
      // Check expiration
      if (!pending.expiresAt || pending.expiresAt >= Date.now()) {
        orgName = pending.companyName || orgName;
        contactName = pending.name || contactName;
        contactEmail = pending.email || contactEmail;
        contactPhone = pending.phone || null;
      }
    } catch {
      // Invalid JSON, use defaults
    }
  }

  // 1) Create organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: orgName,
      primary_contact_name: contactName,
      primary_contact_email: contactEmail,
      primary_contact_phone: contactPhone,
    })
    .select()
    .single();

  if (orgError) throw orgError;

  // 2) Create a default board for the organization
  const { data: board, error: boardError } = await supabase
    .from("boards")
    .insert({
      org_id: org.id,
      title: "Main Board",
      board_type: "board",
      status: "active",
    })
    .select()
    .single();

  if (boardError) throw boardError;

  // 3) Create board_membership with role "owner"
  const { error: membershipError } = await supabase
    .from("board_memberships")
    .insert({
      board_id: board.id,
      user_id: user.id,
      role: "owner",
    });

  if (membershipError) throw membershipError;

  // 4) Update profile with org_id
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      org_id: org.id,
      name: contactName,
      phone: contactPhone,
    })
    .eq("id", user.id);

  if (profileError) throw profileError;

  // 5) Assign org_admin role
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: user.id, role: "org_admin" });

  if (roleError && !/duplicate key/i.test(roleError.message)) throw roleError;

  sessionStorage.removeItem("pendingSignUpV1");
}
