import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Pilot",
    price: "Free",
    subtitle: "In exchange for structured feedback",
    features: [
      "1 board, up to 10 users",
      "Full platform access for 4 weeks",
      "Onboarding session included",
      "Facilitator for first two meetings",
      "Participation analytics report",
    ],
    cta: "Apply for Pilot",
    ctaLink: "/signup",
    highlighted: false,
  },
  {
    name: "Pilot Pro",
    price: "NZD $2,500",
    subtitle: "4-week guided implementation",
    features: [
      "Everything in Pilot, plus:",
      "Priority onboarding and support",
      "Two training workshops",
      "Security review and NDA included",
      "Implementation recommendations",
      "Rollout planning for full deployment",
    ],
    cta: "Get Started",
    ctaLink: "/contact",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    subtitle: "For organisations ready to scale",
    features: [
      "Unlimited boards and users",
      "SSO / SAML integration",
      "Dedicated account manager",
      "Custom compliance templates",
      "SLA and priority support",
      "On-premise deployment options",
    ],
    cta: "Contact Us",
    ctaLink: "/contact",
    highlighted: false,
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="text-xl text-muted-foreground">
              Start with a free pilot to experience DirectorAiT with your board.
              No credit card required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.highlighted
                    ? "border-accent shadow-xl scale-105"
                    : "border-border"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.subtitle}
                  </p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.highlighted ? "accent" : "outline"}
                    className="w-full group"
                    asChild
                  >
                    <Link to={plan.ctaLink}>
                      {plan.cta}
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-16 max-w-2xl mx-auto">
            <p className="text-muted-foreground">
              All plans include enterprise-grade security, immutable audit trails,
              and AI-powered board intelligence. Need something different?{" "}
              <Link to="/contact" className="text-accent hover:underline">
                Let's talk.
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
