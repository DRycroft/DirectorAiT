import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { runBootstrapFromLocalStorage } from "@/lib/bootstrap";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try { 
          await runBootstrapFromLocalStorage(); 
        } catch (error) {
          console.error("Bootstrap error:", error);
        }
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/auth", { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
