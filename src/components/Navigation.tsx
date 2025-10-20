import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  const isActive = (path: string) => {
    if (path === '/team') return location.pathname === '/team';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/board-papers') return location.pathname.startsWith('/board-papers');
    if (path === '/compliance') return location.pathname === '/compliance';
    if (path === '/library') return location.pathname === '/library';
    if (path === '/settings') return location.pathname === '/settings';
    return false;
  };

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="container mx-auto px-4 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-border">
          <Link to="/" className="flex items-center gap-2 py-3">
            <div className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              BoardConnect
            </div>
          </Link>
          
          <div className="hidden md:flex items-end gap-1 h-full relative">
            <Link 
              to="/dashboard" 
              className={cn(
                "relative px-5 pt-3 pb-4 text-sm font-medium transition-all rounded-t-xl",
                isActive('/dashboard')
                  ? "text-foreground bg-background border-t-2 border-x-2 border-primary shadow-[0_-2px_8px_rgba(0,0,0,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 mb-0.5"
              )}
              style={isActive('/dashboard') ? { marginBottom: '-1px' } : {}}
            >
              Dashboard
            </Link>
            <Link 
              to="/team" 
              className={cn(
                "relative px-5 pt-3 pb-4 text-sm font-medium transition-all rounded-t-xl",
                isActive('/team')
                  ? "text-foreground bg-background border-t-2 border-x-2 border-primary shadow-[0_-2px_8px_rgba(0,0,0,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 mb-0.5"
              )}
              style={isActive('/team') ? { marginBottom: '-1px' } : {}}
            >
              Board & Team
            </Link>
            <Link 
              to="/board-papers" 
              className={cn(
                "relative px-5 pt-3 pb-4 text-sm font-medium transition-all rounded-t-xl",
                isActive('/board-papers')
                  ? "text-foreground bg-background border-t-2 border-x-2 border-primary shadow-[0_-2px_8px_rgba(0,0,0,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 mb-0.5"
              )}
              style={isActive('/board-papers') ? { marginBottom: '-1px' } : {}}
            >
              Board Papers
            </Link>
            <Link 
              to="/compliance" 
              className={cn(
                "relative px-5 pt-3 pb-4 text-sm font-medium transition-all rounded-t-xl",
                isActive('/compliance')
                  ? "text-foreground bg-background border-t-2 border-x-2 border-primary shadow-[0_-2px_8px_rgba(0,0,0,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 mb-0.5"
              )}
              style={isActive('/compliance') ? { marginBottom: '-1px' } : {}}
            >
              Compliance
            </Link>
            <Link 
              to="/library" 
              className={cn(
                "relative px-5 pt-3 pb-4 text-sm font-medium transition-all rounded-t-xl",
                isActive('/library')
                  ? "text-foreground bg-background border-t-2 border-x-2 border-primary shadow-[0_-2px_8px_rgba(0,0,0,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 mb-0.5"
              )}
              style={isActive('/library') ? { marginBottom: '-1px' } : {}}
            >
              Documents
            </Link>
            <Link 
              to="/settings" 
              className={cn(
                "relative px-5 pt-3 pb-4 text-sm font-medium transition-all rounded-t-xl",
                isActive('/settings')
                  ? "text-foreground bg-background border-t-2 border-x-2 border-primary shadow-[0_-2px_8px_rgba(0,0,0,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 mb-0.5"
              )}
              style={isActive('/settings') ? { marginBottom: '-1px' } : {}}
            >
              Settings
            </Link>
          </div>
          
          <div className="flex items-center gap-3 py-3">
            {user ? (
              <Button variant="ghost" onClick={handleSignOut}>
                Sign Out
              </Button>
            ) : (
              <Button variant="ghost" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;