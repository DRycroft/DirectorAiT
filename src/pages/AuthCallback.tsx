import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

async function shouldOnboard(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single();
    if (error || !data) return true;
    return !data.name || data.name.trim() === "";
  } catch {
    return false;
  }
}

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("/auth/reset-password", { replace: true });
      } else if (event === "SIGNED_IN") {
        if (session?.user) {
          const needsOnboarding = await shouldOnboard(session.user.id);
          navigate(needsOnboarding ? "/onboarding" : "/dashboard", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } else if (event === "SIGNED_OUT") {
        navigate("/auth", { replace: true });
      }
    });

    // Fallback: check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const needsOnboarding = await shouldOnboard(session.user.id);
        navigate(needsOnboarding ? "/onboarding" : "/dashboard", { replace: true });
      } else {
        navigate("/auth", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
