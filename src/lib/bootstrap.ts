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

  // Guard: skip bootstrap on invite acceptance path.
  if (window.location.pathname.startsWith("/invite/")) {
    console.log('[Bootstrap] Skipping — invite acceptance path');
    return;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) {
    console.log('[Bootstrap] No authenticated user');
    return;
  }

  // Short-circuit if profile already linked
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.org_id) {
    console.log('[Bootstrap] Already linked, skipping');
    cleanupPendingData();
    return;
  }

  // Read company name from V2 storage (non-PII)
  let companyName: string | null = null;
  const raw = sessionStorage.getItem("pendingSignUpV2");
  if (raw) {
    try {
      const pending = JSON.parse(raw);
      if (!pending.expiresAt || pending.expiresAt >= Date.now()) {
        companyName = pending.companyName ?? null;
      }
    } catch (e) {
      console.warn('[Bootstrap] Failed to parse pending signup', e);
    }
  }

  // Atomic server-side bootstrap (idempotent)
  console.log('[Bootstrap] Calling bootstrap_user_workspace RPC...');
  const { error } = await supabase.rpc('bootstrap_user_workspace', {
    _company_name: companyName,
  });
  if (error) {
    console.error('[Bootstrap] RPC failed:', error);
    throw error;
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