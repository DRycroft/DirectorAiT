import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-4 gap-6">
          <div>
            <div className="text-lg font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              BoardConnect
            </div>
            <p className="text-xs text-muted-foreground">
              AI-assisted board governance for evidence-driven decision making.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm mb-2">Product</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li><Link to="#features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link to="#security" className="hover:text-foreground transition-colors">Security</Link></li>
              <li><Link to="#pilot" className="hover:text-foreground transition-colors">Pilot Program</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm mb-2">Company</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">About Aigentia</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm mb-2">Legal</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-border text-center text-xs text-muted-foreground">
          <p>© 2025 Aigentia Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;