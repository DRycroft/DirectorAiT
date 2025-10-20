import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-2 text-xs">
          <div className="flex-shrink-0">
            <div className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              BoardConnect
            </div>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              AI-assisted board governance for evidence-driven decision making.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-xs">Product:</h3>
            <div className="flex gap-3 text-muted-foreground">
              <Link to="#features" className="hover:text-foreground transition-colors">Features</Link>
              <Link to="#security" className="hover:text-foreground transition-colors">Security</Link>
              <Link to="#pilot" className="hover:text-foreground transition-colors">Pilot Program</Link>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-xs">Company:</h3>
            <div className="flex gap-3 text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">About Aigentia</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-xs">Legal:</h3>
            <div className="flex gap-3 text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Security</a>
            </div>
          </div>
          
          <div className="ml-auto text-muted-foreground">
            © 2025 Aigentia Ltd.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;