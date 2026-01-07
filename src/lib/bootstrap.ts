import { supabase } from "@/integrations/supabase/client";

/**
 * Idempotently bootstrap a first-time user with:
 * - organization
 * - default board
 * - board_membership (owner)
 * - profile.org_id
 * - org_admin role
 *
 * Detection rule:
 *   User has NO profiles.org_id AND NO board_memberships
 */
export async function runBootstrapFromLocalStorage(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 1) Check if profile already has org
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.org_id) {
    sessionStorage.removeItem("pendingSignUpV1");
    return;
  }

  // 2) Check if user already has board membership
  const { data: existingMemberships } = await supabase
    .from("board_memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (existingMemberships && existingMemberships.length > 0) {
    sessionStorage.removeItem("pendingSignUpV1");
    return;
  }

  // 3) Load signup cache (sessionStorage first, localStorage fallback)
  let raw = sessionStorage.getItem("pendingSignUpV1");
  if (!raw) {
    raw = localStorage.getItem("pendingSignUpV1");
    if (raw) localStorage.removeItem("pendingSignUpV1");
  }

  // Sensible defaults
  let orgName = "My First Organization";
  let contactName = user.email?.split("@")[0] || "User";
  let contactEmail = user.email || "";
  let contactPhone: string | null = null;

  if (raw) {
    try {
      const pending = JSON.parse(raw);
      if (!pending.expiresAt || pending.expiresAt >= Date.now()) {
        orgName = pending.companyName || orgName;
        contactName = pending.name || contactName;
        contactEmail = pending.email || contactEmail;
        contactPhone = pending.phone || null;
      }
    } catch {
      // ignore malformed cache
    }
  }

  // 4) Create organization
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

  // 5) Create default board
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

  // 6) Create board membership (owner)
  const { error: membershipError } = await supabase
    .from("board_memberships")
    .insert({
      board_id: board.id,
      user_id: user.id,
      role: "owner",
    });

  if (membershipError) throw membershipError;

  // 7) Update profile with org
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      org_id: org.id,
      name: contactName,
      phone: contactPhone,
    })
    .eq("id", user.id);

  if (profileError) throw profileError;

  // 8) Assign org_admin role (idempotent)
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: user.id, role: "org_admin" });

  if (roleError && !/duplicate key/i.test(roleError.message)) {
    throw roleError;
  }

  sessionStorage.removeItem("pendingSignUpV1");
}
