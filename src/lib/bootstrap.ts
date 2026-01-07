import { supabase } from "@/integrations/supabase/client";

/**
 * Idempotently attach an org, update profile, and grant org_admin.
 * Uses data saved under 'pendingSignUpV1' in sessionStorage.
 * Data expires after 15 minutes for security.
 */
export async function runBootstrapFromLocalStorage(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // If already bootstrapped (profile has org_id), skip.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.org_id) {
    sessionStorage.removeItem("pendingSignUpV1");
    return;
  }

  // Try sessionStorage first (new secure method), fall back to localStorage for migration
  let raw = sessionStorage.getItem("pendingSignUpV1");
  if (!raw) {
    raw = localStorage.getItem("pendingSignUpV1");
    if (raw) {
      // Migrate from localStorage to sessionStorage and clear old storage
      localStorage.removeItem("pendingSignUpV1");
    }
  }
  
  if (!raw) return; // allow re-entry even without the form cache

  const pending = JSON.parse(raw);
  
  // Check expiration if present (new format includes expiresAt)
  if (pending.expiresAt && pending.expiresAt < Date.now()) {
    sessionStorage.removeItem("pendingSignUpV1");
    console.warn("Signup data expired, please sign up again");
    return;
  }

  // 1) Create organization with simplified data
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: pending.companyName,
      primary_contact_name: pending.name,
      primary_contact_email: pending.email,
      primary_contact_phone: pending.phone || null,
    })
    .select()
    .single();

  if (orgError) throw orgError;

  // 2) Update profile with org_id and phone
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ 
      org_id: org.id, 
      phone: pending.phone || null,
      name: pending.name 
    })
    .eq("id", user.id);
  if (profileError) throw profileError;

  // 3) Assign org_admin role
  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: user.id, role: "org_admin" });
  if (roleError && !/duplicate key/i.test(roleError.message)) throw roleError;

  sessionStorage.removeItem("pendingSignUpV1");
}
