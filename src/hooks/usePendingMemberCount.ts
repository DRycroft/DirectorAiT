import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the number of board members in the current user's organization
 * whose profile is awaiting admin approval (status = 'pending').
 * Returns 0 for non-admin users (enforced server-side by RPC).
 */
export function usePendingMemberCount() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCount(0);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.org_id) {
        setCount(0);
        return;
      }

      const { data, error } = await supabase.rpc("get_pending_member_count", {
        _org_id: profile.org_id,
      });

      if (error) {
        console.error("get_pending_member_count error", error);
        setCount(0);
        return;
      }

      setCount(typeof data === "number" ? data : 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
  }, []);

  return { count, loading, refresh: fetchCount };
}
