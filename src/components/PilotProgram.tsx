import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const PilotProgram = () => {
  return (
    <section id="pilot" className="py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              4-Week Pilot Program
            </h2>
            <p className="text-xl text-muted-foreground">
              Transform your board meetings with guided implementation and facilitator support
            </p>
          </div>
          
          <Card className="border-accent/50 shadow-xl">
            <CardHeader className="bg-gradient-to-br from-accent/5 to-primary/5">
              <CardTitle className="text-2xl">What's Included</CardTitle>
              <CardDescription className="text-base">
                Complete pilot package for 1 board with up to 10 users
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4 mb-8">
                {[
                  "Private multi-tenant instance with full platform access",
                  "Onboarding session and two training workshops",
                  "Dedicated facilitator for your first two meetings",
                  "Security review and pilot NDA included",
                  "Participation analytics and insights report",
                  "Implementation recommendations for full rollout"
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-secondary/50 rounded-lg p-6 mb-8">
                <div className="text-sm font-medium text-muted-foreground mb-2">Pilot Investment</div>
                <div className="text-3xl font-bold mb-2">NZD $2,500</div>
                <div className="text-sm text-muted-foreground">
                  Or participate free in exchange for structured feedback
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" variant="accent" className="flex-1 group" asChild>
                  <Link to="/auth">
                    Apply for Pilot
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="flex-1">
                  Schedule a Demo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PilotProgram;