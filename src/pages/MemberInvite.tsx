import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const MemberInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    preferred_title: "",
    public_job_title: "",
    short_bio: "",
    public_company_affiliations: "",
    professional_qualifications: "",
    personal_mobile: "",
    personal_email: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });
  const [publishToggles, setPublishToggles] = useState({
    full_name: false,
    public_job_title: false,
    short_bio: false,
    public_company_affiliations: false,
    professional_qualifications: false,
    public_contact_email: false,
  });

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      toast({
        title: "Invalid invite",
        description: "No invite token provided",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    fetchMemberData(token);
  }, [searchParams]);

  const fetchMemberData = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from("board_members")
        .select("*")
        .eq("invite_token", token)
        .eq("status", "invited")
        .single();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Invalid invite",
          description: "This invite link is invalid or has expired",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setMember(data);
      setFormData({
        full_name: data.full_name || "",
        preferred_title: data.preferred_title || "",
        public_job_title: data.public_job_title || "",
        short_bio: data.short_bio || "",
        public_company_affiliations: data.public_company_affiliations || "",
        professional_qualifications: data.professional_qualifications || "",
        personal_mobile: data.personal_mobile || "",
        personal_email: data.personal_email || "",
        emergency_contact_name: data.emergency_contact_name || "",
        emergency_contact_phone: data.emergency_contact_phone || "",
      });
    } catch (error: any) {
      console.error("Error fetching member:", error);
      toast({
        title: "Error",
        description: "Failed to load invite details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("board_members")
        .update({
          ...formData,
          publish_preferences: publishToggles,
          status: "pending",
          profile_completed_at: new Date().toISOString(),
          consent_signed_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      if (error) throw error;

      toast({
        title: "Profile submitted",
        description: "Your profile has been submitted for review. You'll be notified once approved.",
      });

      navigate("/");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Board Member Profile</CardTitle>
            <CardDescription>
              Please complete your profile information. Select which details you'd like to make public.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                  <div className="flex items-center mt-2 space-x-2">
                    <Checkbox
                      checked={publishToggles.full_name}
                      onCheckedChange={(checked) =>
                        setPublishToggles({ ...publishToggles, full_name: checked as boolean })
                      }
                    />
                    <Label className="text-sm text-muted-foreground">Make public</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="preferred_title">Preferred Title (Mr/Ms/Dr)</Label>
                  <Input
                    id="preferred_title"
                    value={formData.preferred_title}
                    onChange={(e) => setFormData({ ...formData, preferred_title: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="public_job_title">Job Title / Primary Occupation</Label>
                  <Input
                    id="public_job_title"
                    value={formData.public_job_title}
                    onChange={(e) => setFormData({ ...formData, public_job_title: e.target.value })}
                  />
                  <div className="flex items-center mt-2 space-x-2">
                    <Checkbox
                      checked={publishToggles.public_job_title}
                      onCheckedChange={(checked) =>
                        setPublishToggles({ ...publishToggles, public_job_title: checked as boolean })
                      }
                    />
                    <Label className="text-sm text-muted-foreground">Make public</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="public_company_affiliations">Company Affiliations</Label>
                  <Input
                    id="public_company_affiliations"
                    value={formData.public_company_affiliations || ""}
                    onChange={(e) => setFormData({ ...formData, public_company_affiliations: e.target.value })}
                    placeholder="Current companies/organizations"
                  />
                  <div className="flex items-center mt-2 space-x-2">
                    <Checkbox
                      checked={publishToggles.public_company_affiliations}
                      onCheckedChange={(checked) =>
                        setPublishToggles({ ...publishToggles, public_company_affiliations: checked as boolean })
                      }
                    />
                    <Label className="text-sm text-muted-foreground">Make public</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="professional_qualifications">Professional Qualifications</Label>
                  <Input
                    id="professional_qualifications"
                    value={formData.professional_qualifications || ""}
                    onChange={(e) => setFormData({ ...formData, professional_qualifications: e.target.value })}
                    placeholder="e.g., MBA, CPA, PhD"
                  />
                  <div className="flex items-center mt-2 space-x-2">
                    <Checkbox
                      checked={publishToggles.professional_qualifications}
                      onCheckedChange={(checked) =>
                        setPublishToggles({ ...publishToggles, professional_qualifications: checked as boolean })
                      }
                    />
                    <Label className="text-sm text-muted-foreground">Make public</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="short_bio">Short Biography (100-200 words)</Label>
                  <Textarea
                    id="short_bio"
                    value={formData.short_bio}
                    onChange={(e) => setFormData({ ...formData, short_bio: e.target.value })}
                    rows={4}
                  />
                  <div className="flex items-center mt-2 space-x-2">
                    <Checkbox
                      checked={publishToggles.short_bio}
                      onCheckedChange={(checked) =>
                        setPublishToggles({ ...publishToggles, short_bio: checked as boolean })
                      }
                    />
                    <Label className="text-sm text-muted-foreground">Make public</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="personal_mobile">Mobile Phone</Label>
                  <Input
                    id="personal_mobile"
                    type="tel"
                    value={formData.personal_mobile}
                    onChange={(e) => setFormData({ ...formData, personal_mobile: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Internal use only</p>
                </div>

                <div>
                  <Label htmlFor="personal_email">Personal Email</Label>
                  <Input
                    id="personal_email"
                    type="email"
                    value={formData.personal_email}
                    onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
                  />
                  <div className="flex items-center mt-2 space-x-2">
                    <Checkbox
                      checked={publishToggles.public_contact_email}
                      onCheckedChange={(checked) =>
                        setPublishToggles({ ...publishToggles, public_contact_email: checked as boolean })
                      }
                    />
                    <Label className="text-sm text-muted-foreground">Make public</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Confidential</p>
                </div>

                <div>
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Confidential</p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Profile"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/")}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberInvite;
