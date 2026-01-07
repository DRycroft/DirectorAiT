import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import featureAi from "@/assets/feature-ai.jpg";
import featureSecure from "@/assets/feature-secure.jpg";
import featureAudit from "@/assets/feature-audit.jpg";
import { Brain, Shield, FileCheck, Users, Vote, Clock } from "lucide-react";

const features = [
  {
    icon: Brain,
    image: featureAi,
    title: "AI-Powered Intelligence",
    description: "Auto-generated TL;DRs, key questions, and market intelligence. Get to the heart of every decision faster."
  },
  {
    icon: Shield,
    image: featureSecure,
    title: "Enterprise Security",
    description: "Multi-tenant isolation, enforced MFA, and role-based access. Built for governance from day one."
  },
  {
    icon: FileCheck,
    image: featureAudit,
    title: "Immutable Audit Trails",
    description: "Every decision, vote, and piece of evidence is timestamped and archived. Complete transparency."
  },
  {
    icon: Users,
    title: "Anonymous Staff Inputs",
    description: "Surface frontline reality through structured, permissioned staff briefings. Reduce blind spots."
  },
  {
    icon: Vote,
    title: "Pre-Meeting Silent Voting",
    description: "Submit votes before meetings to reduce groupthink. Reveal analytics when the time is right."
  },
  {
    icon: Clock,
    title: "Asynchronous Workflows",
    description: "Prepare on your schedule. 48-72 hour briefing windows ensure everyone arrives informed."
  }
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Built for Modern Governance
          </h2>
          <p className="text-xl text-muted-foreground">
            Every feature designed to enable evidence-first, transparent, and timely board decisions.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <Card key={i} className="group hover:shadow-lg transition-all duration-300 hover:border-accent/50">
              <CardHeader>
                {feature.image ? (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="mb-4 w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <feature.icon className="w-6 h-6" />
                  </div>
                )}
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;