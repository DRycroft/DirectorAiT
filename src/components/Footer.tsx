import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-2 text-xs">
          <div className="flex-shrink-0">
            <img src="/directorait-logo.png" alt="DirectorAiT" className="h-6" />
            <p className="text-xs text-muted-foreground max-w-[200px] leading-tight mt-0.5">
              AI-assisted board governance for evidence-driven decision making.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-xs whitespace-nowrap">Product:</h3>
            <div className="flex flex-col gap-0.5 text-muted-foreground">
              <Link to="/#features" className="hover:text-foreground transition-colors">Features</Link>
              <Link to="/#security" className="hover:text-foreground transition-colors">Security</Link>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-xs whitespace-nowrap">Company:</h3>
            <div className="flex flex-col gap-0.5 text-muted-foreground">
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-xs whitespace-nowrap">Legal:</h3>
            <div className="flex flex-col gap-0.5 text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Aigentia Ltd.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
