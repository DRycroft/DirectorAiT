import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Last updated: April 2026
          </p>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Overview</h2>
              <p className="text-muted-foreground leading-relaxed">
                Aigentia Ltd ("we", "us", "our") operates the DirectorAiT platform.
                This Privacy Policy explains how we collect, use, store, and protect
                your personal information when you use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We collect information you provide directly:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Account details: name, email address, phone number, job title</li>
                <li>Organisation details: company name, business number, contact information</li>
                <li>Board member information: as entered by administrators</li>
                <li>Documents and files uploaded to the platform</li>
                <li>Usage data: actions taken within the platform for audit purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>To provide and maintain the Platform</li>
                <li>To authenticate your identity and manage access</li>
                <li>To generate AI-assisted insights and briefings</li>
                <li>To maintain audit trails for governance compliance</li>
                <li>To send transactional emails (invitations, notifications)</li>
                <li>To improve the Platform based on usage patterns</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Data Storage and Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your data is stored in secure, encrypted cloud infrastructure. We
                implement industry-standard security measures including: encryption at
                rest and in transit (TLS), role-based access controls with row-level
                security, multi-factor authentication support, and immutable audit
                logging. Sensitive personal information (date of birth, national ID,
                health notes) is stored in a separate, access-restricted table.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Data Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell your personal information. We may share data with:
                service providers who assist in operating the Platform (hosting,
                email delivery), and as required by New Zealand law or regulatory
                obligations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. AI Processing</h2>
              <p className="text-muted-foreground leading-relaxed">
                Documents and content may be processed by AI models to generate
                summaries, insights, and recommendations. This processing is performed
                to deliver Platform features and does not involve selling or sharing
                your content with third parties for their own purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your data for as long as your account is active or as needed
                to provide services. Audit trail data is retained in accordance with
                governance best practices. You may request deletion of your account
                and associated data by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                Under the New Zealand Privacy Act 2020, you have the right to: access
                your personal information, request correction of inaccurate information,
                and request deletion of your information. To exercise these rights,
                contact us at{" "}
                <a
                  href="mailto:privacy@aigentia.co.nz"
                  className="text-accent hover:underline"
                >
                  privacy@aigentia.co.nz
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use essential cookies for authentication and session management.
                We do not use tracking or advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify
                registered users of material changes. The "Last updated" date at the
                top indicates when the policy was last revised.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For privacy-related enquiries, contact us at{" "}
                <a
                  href="mailto:privacy@aigentia.co.nz"
                  className="text-accent hover:underline"
                >
                  privacy@aigentia.co.nz
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

export default Privacy;
