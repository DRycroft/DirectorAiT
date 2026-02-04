import { supabase } from "@/integrations/supabase/client";

/**
 * Idempotently bootstrap a first-time user with:
 * - organization
 * - default board
 * - board_membership (owner)
 * - profile.org_id update
 * - user_roles entry (org_admin)
 *
 * Detection rule:
 *   User has NO profiles.org_id AND NO board_memberships
 * 
 * IMPORTANT: Uses user_roles table for role management (not org_admins)
 * 
 * SECURITY: Only stores minimal non-PII data in sessionStorage (company name only).
 * User's name, email, phone come from Supabase auth user metadata.
 */
export async function runBootstrapFromLocalStorage(): Promise<void> {
  console.log('[Bootstrap] Starting bootstrap check...');
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    console.error('[Bootstrap] Failed to get user:', userError);
    throw userError;
  }
  
  if (!user) {
    console.log('[Bootstrap] No authenticated user, skipping bootstrap');
    return;
  }

  console.log('[Bootstrap] Checking user:', user.id);

  // 1) Check if profile already has org
  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[Bootstrap] Failed to check profile:', profileError);
    throw profileError;
  }

  if (existingProfile?.org_id) {
    console.log('[Bootstrap] User already has org_id, skipping bootstrap');
    cleanupPendingData();
    return;
  }

  // 2) Check if user already has board membership
  const { data: existingMemberships, error: membershipError } = await supabase
    .from("board_memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (membershipError) {
    console.error('[Bootstrap] Failed to check memberships:', membershipError);
    throw membershipError;
  }

  if (existingMemberships && existingMemberships.length > 0) {
    console.log('[Bootstrap] User already has board membership, skipping bootstrap');
    cleanupPendingData();
    return;
  }

  console.log('[Bootstrap] User needs bootstrap, proceeding...');

  // 3) Load signup cache - V2 only stores company name (no PII)
  // User data comes from auth metadata
  let orgName = "My Organization";
  
  // Get user info from Supabase auth (secure source)
  const contactName = user.user_metadata?.name || user.email?.split("@")[0] || "User";
  const contactEmail = user.email || "";
  const contactPhone: string | null = user.user_metadata?.phone || null;

  // Try to get company name from V2 storage (minimal data approach)
  let raw = sessionStorage.getItem("pendingSignUpV2");
  if (raw) {
    try {
      const pending = JSON.parse(raw);
      if (!pending.expiresAt || pending.expiresAt >= Date.now()) {
        orgName = pending.companyName || orgName;
        console.log('[Bootstrap] Using cached company name:', orgName);
      } else {
        console.log('[Bootstrap] Cached signup data expired, using defaults');
      }
    } catch (e) {
      console.warn('[Bootstrap] Failed to parse cached signup data:', e);
    }
  }

  // 4) Create organization
  console.log('[Bootstrap] Creating organization:', orgName);
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

  if (orgError) {
    console.error('[Bootstrap] Failed to create organization:', orgError);
    throw orgError;
  }

  console.log('[Bootstrap] Organization created:', org.id);

  // 5) Create default board
  console.log('[Bootstrap] Creating default board...');
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

  if (boardError) {
    console.error('[Bootstrap] Failed to create board:', boardError);
    throw boardError;
  }

  console.log('[Bootstrap] Board created:', board.id);

  // 6) Create board membership (owner)
  console.log('[Bootstrap] Creating board membership...');
  const { error: membershipCreateError } = await supabase
    .from("board_memberships")
    .insert({
      board_id: board.id,
      user_id: user.id,
      role: "owner",
    });

  if (membershipCreateError) {
    console.error('[Bootstrap] Failed to create board membership:', membershipCreateError);
    throw membershipCreateError;
  }

  console.log('[Bootstrap] Board membership created');

  // 7) Update profile with org
  console.log('[Bootstrap] Updating profile with org_id...');
  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      org_id: org.id,
      name: contactName,
      phone: contactPhone,
    })
    .eq("id", user.id);

  if (profileUpdateError) {
    console.error('[Bootstrap] Failed to update profile:', profileUpdateError);
    throw profileUpdateError;
  }

  console.log('[Bootstrap] Profile updated');

  // 8) Assign org_admin role via user_roles table (idempotent)
  console.log('[Bootstrap] Assigning org_admin role...');
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: user.id, role: "org_admin" });

  // Ignore duplicate key error - means role already exists
  if (roleError && !/duplicate key/i.test(roleError.message)) {
    console.error('[Bootstrap] Failed to assign role:', roleError);
    throw roleError;
  }

  console.log('[Bootstrap] Bootstrap completed successfully!');
  cleanupPendingData();
}

/**
 * Clean up any pending signup data from storage
 * Removes both old V1 format (contained PII) and new V2 format
 */
function cleanupPendingData(): void {
  try {
    // Remove V2 (current minimal format)
    sessionStorage.removeItem("pendingSignUpV2");
    // Remove legacy V1 format (contained PII - should already be removed)
    sessionStorage.removeItem("pendingSignUpV1");
    localStorage.removeItem("pendingSignUpV1");
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Check if bootstrap is needed for the current user
 * Returns true if user needs org/board setup
 */
export async function needsBootstrap(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  return !profile?.org_id;
}