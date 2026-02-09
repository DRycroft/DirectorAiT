import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-board.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-24">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background -z-10" />
      
      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-medium text-accent">AI-Powered Board Governance</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              Transform Board
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Decision Making
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
              Move from monthly rituals to continuous, evidence-driven governance. 
              DirectorAiT enables timely decisions through AI-assisted briefings, 
              anonymous insights, and immutable audit trails.
            </p>
            
            <div className="space-y-3">
              {[
                "80% pre-meeting engagement rate",
                "30% faster action item resolution",
                "Zero-setup multi-tenant security"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-foreground font-medium">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" variant="accent" className="group" asChild>
                <Link to="/signup">
                  Start Free Pilot
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="#features">Explore Features</Link>
              </Button>
            </div>
          </div>
          
          {/* Right column - Hero image */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 rounded-2xl blur-3xl" />
            <img 
              src={heroImage} 
              alt="DirectorAiT Platform" 
              className="relative rounded-2xl shadow-2xl border border-border"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;