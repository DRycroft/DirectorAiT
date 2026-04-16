import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Last updated: April 2026
          </p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Agreement</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using DirectorAiT ("the Platform"), operated by Aigentia Ltd
                ("we", "us", "our"), you agree to be bound by these Terms of Service.
                If you do not agree, do not use the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Service Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                DirectorAiT is a board governance platform that provides AI-assisted
                briefings, document management, meeting coordination, compliance tracking,
                and audit trail capabilities for boards and committees.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Account Responsibilities</h2>
              <p className="text-muted-foreground leading-relaxed">
                You are responsible for maintaining the confidentiality of your account
                credentials. You must provide accurate and complete information during
                registration. You must notify us immediately of any unauthorised use of
                your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree not to misuse the Platform, including but not limited to:
                uploading malicious content, attempting to circumvent security controls,
                using the Platform for unlawful purposes, or sharing access credentials
                with unauthorised parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Data and Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your use of the Platform is also governed by our{" "}
                <a href="/privacy" className="text-accent hover:underline">
                  Privacy Policy
                </a>
                . We take reasonable measures to protect your data, including encryption
                at rest and in transit, role-based access controls, and audit logging.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Platform and its original content, features, and functionality are
                owned by Aigentia Ltd. Your data remains your property. We do not claim
                ownership over content you upload to the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by New Zealand law, Aigentia Ltd shall
                not be liable for any indirect, incidental, special, consequential, or
                punitive damages arising from your use of the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may suspend or terminate your access if you violate these terms.
                You may close your account at any time by contacting us at{" "}
                <a
                  href="mailto:hello@aigentia.co.nz"
                  className="text-accent hover:underline"
                >
                  hello@aigentia.co.nz
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These terms are governed by the laws of New Zealand. Any disputes shall
                be subject to the exclusive jurisdiction of the New Zealand courts.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these terms from time to time. We will notify registered
                users of material changes. Continued use of the Platform constitutes
                acceptance of updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                Questions about these terms? Contact us at{" "}
                <a
                  href="mailto:hello@aigentia.co.nz"
                  className="text-accent hover:underline"
                >
                  hello@aigentia.co.nz
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
