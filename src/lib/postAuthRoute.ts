import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for post-authentication routing.
 *
 * Reads the user's `onboarding_complete` flag and returns the destination
 * path. Fail-safe: any error or missing profile routes the user to
 * `/onboarding` so an incomplete profile is never silently bypassed.
 */
export async function resolvePostAuthRoute(userId: string): Promise<"/dashboard" | "/onboarding"> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return "/onboarding";
    return data.onboarding_complete ? "/dashboard" : "/onboarding";
  } catch {
    return "/onboarding";
  }
}
