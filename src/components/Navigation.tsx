import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            BoardConnect
          </div>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link to="/boards" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Boards
          </Link>
          <Link to="/board-papers" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Board Papers
          </Link>
          <Link to="/library" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Documents
          </Link>
          <Link to="/templates" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Templates
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button variant="accent" asChild>
            <Link to="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;