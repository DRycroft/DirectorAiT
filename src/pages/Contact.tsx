import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, Clock } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl font-bold mb-4">Get in Touch</h1>
            <p className="text-xl text-muted-foreground">
              Whether you're ready to start a pilot or have questions about DirectorAiT,
              we'd love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">Email Us</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <a
                  href="mailto:hello@aigentia.co.nz"
                  className="text-accent hover:underline font-medium"
                >
                  hello@aigentia.co.nz
                </a>
                <p className="text-sm text-muted-foreground mt-2">
                  General enquiries and pilot applications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">Schedule a Demo</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <a
                  href="mailto:demo@aigentia.co.nz?subject=DirectorAiT%20Demo%20Request"
                  className="text-accent hover:underline font-medium"
                >
                  demo@aigentia.co.nz
                </a>
                <p className="text-sm text-muted-foreground mt-2">
                  Book a 30-minute walkthrough of the platform
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
                  <Clock className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">Response Time</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="font-medium">Within 1 business day</p>
                <p className="text-sm text-muted-foreground mt-2">
                  NZ business hours (NZST)
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-16 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Aigentia Ltd</h2>
            <p className="text-muted-foreground">
              New Zealand-based governance technology company building
              AI-powered tools for modern boards and committees.
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Support:</strong>{" "}
              <a href="mailto:support@aigentia.co.nz" className="text-accent hover:underline">
                support@aigentia.co.nz
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
