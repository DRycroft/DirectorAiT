import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

async function shouldOnboard(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", userId)
      .single();
    if (error || !data) return true;
    return !data.onboarding_complete;
  } catch {
    return false;
  }
}

/**
 * AuthCallback handles Supabase redirect flows (email verification,
 * password recovery, OAuth). It relies on AuthContext's onAuthStateChange
 * listener for session hydration — it only needs to read the resulting
 * session and perform one-time navigation.
 *
 * Previous implementation had a duplicate onAuthStateChange listener that
 * raced with AuthContext. Now we listen for a single auth event to handle
 * PASSWORD_RECOVERY (which requires special routing), then fall back to
 * a session check for all other cases.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY specifically — Supabase fires this event
    // when the user arrives via a recovery link. We must intercept it before
    // a generic SIGNED_IN redirect takes over.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setHandled(true);
          navigate("/auth/reset-password", { replace: true });
        }
      }
    );

    // Give the auth state listener a moment to fire PASSWORD_RECOVERY
    // before falling back to the generic session check.
    const timer = setTimeout(async () => {
      if (handled) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const needsOnboarding = await shouldOnboard(session.user.id);
        navigate(needsOnboarding ? "/onboarding" : "/dashboard", { replace: true });
      } else {
        navigate("/auth", { replace: true });
      }
    }, 500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate, handled]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
