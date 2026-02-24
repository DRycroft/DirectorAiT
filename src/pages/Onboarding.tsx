import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandling";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

const PENDING_SIGNUP_KEY = "pendingSignUpV2";

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orgData, setOrgData] = useState({
    name: "",
    type: "",
    website: "",
  });
  const [profileData, setProfileData] = useState({
    jobTitle: "",
    phone: "" as string | undefined,
  });

  useEffect(() => {
    // Pre-fill org name from bootstrap session data if available
    try {
      const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
      if (raw) {
        const pending = JSON.parse(raw);
        if (pending.companyName && pending.expiresAt > Date.now()) {
          setOrgData((prev) => ({ ...prev, name: pending.companyName }));
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleComplete = async () => {
    if (!orgData.name.trim()) {
      toast.error("Organisation name is required");
      return;
    }
    if (!orgData.type) {
      toast.error("Please select an organisation type");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        navigate("/auth");
        return;
      }

      // Get profile to find org_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // Update organization
      if (profile?.org_id) {
        const { error: orgError } = await supabase
          .from("organizations")
          .update({
            name: orgData.name.trim(),
            domain: orgData.website.trim() || null,
          })
          .eq("id", profile.org_id);

        if (orgError) throw orgError;
      }

      // Update profile with job title and phone
      const profileUpdate: Record<string, string | null> = {};
      if (profileData.jobTitle.trim()) {
        profileUpdate.phone = profileData.phone || null;
      }
      if (profileData.phone) {
        profileUpdate.phone = profileData.phone;
      }

      // Always update phone if provided
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          phone: profileData.phone || null,
        })
        .eq("id", user.id);

      if (profileUpdateError) throw profileUpdateError;

      // Clean up session data
      sessionStorage.removeItem(PENDING_SIGNUP_KEY);

      toast.success("Setup complete! Welcome to DirectorAiT.");
      navigate("/dashboard");
    } catch (error) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/directorait-logo.png" alt="DirectorAiT" className="h-10 mx-auto mt-4 mb-2" />
          <p className="text-muted-foreground">Let's get you set up</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`h-2 w-12 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-2 w-12 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Organisation</CardTitle>
              <CardDescription>Tell us about your organisation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organisation Name</Label>
                  <Input
                    id="orgName"
                    type="text"
                    placeholder="Acme Corporation"
                    value={orgData.name}
                    onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgType">Organisation Type</Label>
                  <Select
                    value={orgData.type}
                    onValueChange={(value) => setOrgData({ ...orgData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Company">Company</SelectItem>
                      <SelectItem value="Charity">Charity</SelectItem>
                      <SelectItem value="Government">Government</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://example.com"
                    value={orgData.website}
                    onChange={(e) => setOrgData({ ...orgData, website: e.target.value })}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    if (!orgData.name.trim()) {
                      toast.error("Organisation name is required");
                      return;
                    }
                    if (!orgData.type) {
                      toast.error("Please select an organisation type");
                      return;
                    }
                    setStep(2);
                  }}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>A few more details about you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    type="text"
                    placeholder="CEO, Director, Manager, etc."
                    value={profileData.jobTitle}
                    onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="onboardingPhone">Phone</Label>
                  <PhoneInput
                    id="onboardingPhone"
                    international
                    defaultCountry="NZ"
                    value={profileData.phone}
                    onChange={(value) => setProfileData({ ...profileData, phone: value || "" })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 md:text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleComplete}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Complete Setup"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
