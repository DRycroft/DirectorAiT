import { useEffect, useRef } from "react";
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
 * password recovery, OAuth). Uses a ref (not state) for the handled
 * flag to avoid stale-closure bugs in the fallback timer.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY" && !handledRef.current) {
          handledRef.current = true;
          navigate("/auth/reset-password", { replace: true });
        }
      }
    );

    const timer = setTimeout(async () => {
      if (handledRef.current) return;
      handledRef.current = true;

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
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
