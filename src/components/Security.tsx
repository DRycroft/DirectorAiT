import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Eye, FileCheck, Database, Key } from "lucide-react";

const securityFeatures = [
  {
    icon: Shield,
    title: "Multi-Tenant Isolation",
    description: "Complete data separation with RLS policies"
  },
  {
    icon: Lock,
    title: "Enforced MFA",
    description: "Two-factor authentication for all users"
  },
  {
    icon: Eye,
    title: "Role-Based Access",
    description: "Granular permissions per board and project"
  },
  {
    icon: FileCheck,
    title: "Evidence Archiving",
    description: "Immutable snapshots of all cited sources"
  },
  {
    icon: Database,
    title: "Encrypted Storage",
    description: "TLS everywhere, encryption at rest"
  },
  {
    icon: Key,
    title: "SSO Ready",
    description: "SAML/OIDC for enterprise integration"
  }
];

const Security = () => {
  return (
    <section id="security" className="py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Enterprise-Grade Security
          </h2>
          <p className="text-xl text-primary-foreground/80">
            Built with compliance and governance in mind. Every security feature you'd expect, 
            plus immutable audit trails for complete transparency.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityFeatures.map((feature, i) => (
            <Card key={i} className="bg-primary-foreground/5 border-primary-foreground/10 hover:bg-primary-foreground/10 transition-colors">
              <CardContent className="pt-6">
                <div className="mb-4 w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-primary-foreground">
                  {feature.title}
                </h3>
                <p className="text-primary-foreground/70">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Security;