import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/team', label: 'Board & Team' },
  { path: '/boards-committees', label: 'Boards & Committees' },
  { path: '/pack-management', label: 'Board Papers' },
  { path: '/meetings', label: 'Meetings' },
  { path: '/actions', label: 'Actions' },
  { path: '/compliance', label: 'Compliance' },
  { path: '/library', label: 'Documents' },
  { path: '/my-profile', label: 'My Profile', authOnly: true },
  { path: '/settings', label: 'Settings' },
] as const;

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/my-profile') return location.pathname === '/my-profile';
    if (path === '/team') return location.pathname === '/team';
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/boards-committees') return location.pathname === '/boards-committees';
    if (path === '/pack-management') return location.pathname.startsWith('/pack-management') || location.pathname.startsWith('/pack/') || location.pathname.startsWith('/report-submission');
    if (path === '/meetings') return location.pathname.startsWith('/meetings');
    if (path === '/actions') return location.pathname === '/actions';
    if (path === '/compliance') return location.pathname === '/compliance';
    if (path === '/library') return location.pathname === '/library';
    if (path === '/settings') return location.pathname === '/settings';
    return false;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch {
      toast.error("Error signing out");
    }
  };

  const visibleItems = NAV_ITEMS.filter(item => !('authOnly' in item) || (item.authOnly && user));

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 py-3">
            <img src="/directorait-logo.png" alt="DirectorAiT" className="h-8" />
          </Link>
          
          {/* Desktop nav */}
          <div className="hidden lg:flex items-end gap-1 h-full relative">
            {visibleItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative px-4 pt-3 pb-4 text-sm font-medium transition-all rounded-t-xl",
                  isActive(item.path)
                    ? "text-foreground bg-background border-t-2 border-x-2 border-primary shadow-[0_-2px_8px_rgba(0,0,0,0.1)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30 mb-0.5"
                )}
                style={isActive(item.path) ? { marginBottom: '-1px' } : {}}
              >
                {item.label}
              </Link>
            ))}
          </div>
          
          <div className="flex items-center gap-2 py-3">
            {user ? (
              <>
                <Button variant="ghost" onClick={handleSignOut} className="hidden sm:inline-flex">
                  Sign Out
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link to="/pricing">Pricing</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && user && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-md">
          <div className="container mx-auto px-4 py-2 space-y-1">
            {visibleItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive(item.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive px-3"
              onClick={() => { setMobileOpen(false); handleSignOut(); }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
