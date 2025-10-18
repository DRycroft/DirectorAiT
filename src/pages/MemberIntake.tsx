import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Shield, Link as LinkIcon } from "lucide-react";

const MemberIntake = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    linkedinUrl: "",
    organizationUrl: "",
    additionalLinks: "",
    consentGiven: false,
    consentPublicData: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.consentGiven) {
      toast({
        title: "Consent Required",
        description: "Please provide consent to scan your public profile",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // This would call an edge function to initiate member scanning
      const { data, error } = await supabase.functions.invoke("member-intake", {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "Profile Scan Initiated",
        description: "We'll scan your public information and notify you when complete.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        linkedinUrl: "",
        organizationUrl: "",
        additionalLinks: "",
        consentGiven: false,
        consentPublicData: false,
      });
    } catch (error: any) {
      console.error("Error submitting member intake:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit member information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 pt-24 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Member Profile Scanner</h1>
          <p className="text-muted-foreground">
            Help us build your profile by providing your public information
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Member Information
            </CardTitle>
            <CardDescription>
              We'll scan publicly available information to create your board member profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedinUrl">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    LinkedIn Profile URL
                  </div>
                </Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  placeholder="https://linkedin.com/in/your-profile"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationUrl">Organization/Company Website</Label>
                <Input
                  id="organizationUrl"
                  type="url"
                  placeholder="https://your-company.com"
                  value={formData.organizationUrl}
                  onChange={(e) => setFormData({ ...formData, organizationUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalLinks">
                  Additional Links (optional)
                </Label>
                <Textarea
                  id="additionalLinks"
                  placeholder="Add any other relevant links, one per line"
                  value={formData.additionalLinks}
                  onChange={(e) => setFormData({ ...formData, additionalLinks: e.target.value })}
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Personal website, publications, board positions, etc.
                </p>
              </div>

              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Privacy & Consent
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="consent"
                      checked={formData.consentGiven}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, consentGiven: checked as boolean })
                      }
                    />
                    <div className="space-y-1">
                      <Label htmlFor="consent" className="text-sm font-normal cursor-pointer">
                        I consent to BoardConnect scanning my publicly available information *
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        We will only collect information that is publicly accessible online
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="consentPublic"
                      checked={formData.consentPublicData}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, consentPublicData: checked as boolean })
                      }
                    />
                    <div className="space-y-1">
                      <Label htmlFor="consentPublic" className="text-sm font-normal cursor-pointer">
                        I consent to sharing my profile with other board members
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Your profile will be visible to other members of boards you join
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Processing..." : "Submit Profile"}
                </Button>
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. We'll scan your public profiles and compile relevant information</p>
            <p>2. Our AI will generate a profile summary highlighting your expertise and experience</p>
            <p>3. A governance administrator will review the profile before it's finalized</p>
            <p>4. You'll receive an email notification when your profile is ready</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MemberIntake;
