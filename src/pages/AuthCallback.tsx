import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { resolvePostAuthRoute } from "@/lib/postAuthRoute";

/**
 * AuthCallback handles Supabase redirect flows (email verification,
 * password recovery, OAuth). Event-driven: waits for the SDK to emit
 * SIGNED_IN / INITIAL_SESSION / PASSWORD_RECOVERY rather than polling
 * on a fixed timer. A long safety-net timeout routes to /auth only if
 * no event arrives at all (never silently to /dashboard).
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    const resolveWithSession = async (userId: string) => {
      const target = await resolvePostAuthRoute(userId);
      navigate(target, { replace: true });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (handledRef.current) return;

        if (event === "PASSWORD_RECOVERY") {
          handledRef.current = true;
          navigate("/auth/reset-password", { replace: true });
          return;
        }

        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
          handledRef.current = true;
          await resolveWithSession(session.user.id);
          return;
        }

        // INITIAL_SESSION with no session and no hash to process → no auth.
        if (event === "INITIAL_SESSION" && !session) {
          handledRef.current = true;
          navigate("/auth", { replace: true });
        }
      }
    );

    // Safety net: if no event arrives within 10s, fall back to /auth.
    // Never falls through to /dashboard.
    const safetyTimer = setTimeout(async () => {
      if (handledRef.current) return;
      handledRef.current = true;

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await resolveWithSession(session.user.id);
      } else {
        navigate("/auth", { replace: true });
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
