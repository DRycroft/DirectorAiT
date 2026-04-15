import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle } from "lucide-react";
import Navigation from "@/components/Navigation";

interface BoardMemberRecord {
  id: string;
  full_name: string;
  preferred_title: string | null;
  public_job_title: string | null;
  short_bio: string | null;
  public_company_affiliations: string | null;
  professional_qualifications: string | null;
  public_contact_email: string | null;
  publish_preferences: Record<string, boolean> | null;
  profile_completed_at: string | null;
  board_id: string;
}

interface BoardMemberWithBoard extends BoardMemberRecord {
  boards: { title: string } | null;
}

const LAST_BOARD_KEY = "myprofile_last_board_member";

const MyProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [allMembers, setAllMembers] = useState<BoardMemberWithBoard[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [member, setMember] = useState<BoardMemberRecord | null>(null);
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
    if (user) {
      fetchAllMemberships();
    }
  }, [user]);

  const fetchAllMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from("board_members")
        .select("id, full_name, preferred_title, public_job_title, short_bio, public_company_affiliations, professional_qualifications, public_contact_email, publish_preferences, profile_completed_at, board_id, boards:boards!board_members_board_id_fkey(title)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No board membership found",
          description: "You don't have any board member profiles to complete.",
          variant: "destructive",
        });
        navigate("/dashboard", { replace: true });
        return;
      }

      const members = data as unknown as BoardMemberWithBoard[];
      setAllMembers(members);

      // Pick initial: last-used, or first incomplete, or first
      const lastUsed = localStorage.getItem(LAST_BOARD_KEY);
      const preferred = members.find((m) => m.id === lastUsed)
        || members.find((m) => !m.profile_completed_at)
        || members[0];

      setSelectedMemberId(preferred.id);
    } catch (error) {
      console.error("Error fetching memberships:", error);
      toast({ title: "Error", description: "Failed to load profile details", variant: "destructive" });
    }
  };

  // Load member detail whenever selection changes
  useEffect(() => {
    if (selectedMemberId) {
      loadMemberDetail(selectedMemberId);
    }
  }, [selectedMemberId]);

  const loadMemberDetail = useCallback(async (memberId: string) => {
    setLoading(true);
    setSaved(false);
    try {
      const found = allMembers.find((m) => m.id === memberId);
      if (!found) return;

      setMember(found);
      localStorage.setItem(LAST_BOARD_KEY, memberId);

      // Load sensitive data
      const { data: sensitive } = await supabase
        .from("board_members_sensitive")
        .select("personal_mobile, personal_email, emergency_contact_name, emergency_contact_phone")
        .eq("member_id", memberId)
        .maybeSingle();

      const prefs = (found.publish_preferences as Record<string, boolean>) || {};

      setFormData({
        full_name: found.full_name || "",
        preferred_title: found.preferred_title || "",
        public_job_title: found.public_job_title || "",
        short_bio: found.short_bio || "",
        public_company_affiliations: found.public_company_affiliations || "",
        professional_qualifications: found.professional_qualifications || "",
        personal_mobile: sensitive?.personal_mobile || "",
        personal_email: sensitive?.personal_email || "",
        emergency_contact_name: sensitive?.emergency_contact_name || "",
        emergency_contact_phone: sensitive?.emergency_contact_phone || "",
      });

      setPublishToggles({
        full_name: prefs.full_name ?? false,
        public_job_title: prefs.public_job_title ?? false,
        short_bio: prefs.short_bio ?? false,
        public_company_affiliations: prefs.public_company_affiliations ?? false,
        professional_qualifications: prefs.professional_qualifications ?? false,
        public_contact_email: prefs.public_contact_email ?? false,
      });
    } catch (error) {
      console.error("Error loading member detail:", error);
      toast({ title: "Error", description: "Failed to load profile details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [allMembers, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setSaving(true);
    setSaved(false);

    try {
      const { error: memberError } = await supabase
        .from("board_members")
        .update({
          full_name: formData.full_name,
          preferred_title: formData.preferred_title || null,
          public_job_title: formData.public_job_title || null,
          short_bio: formData.short_bio || null,
          public_company_affiliations: formData.public_company_affiliations || null,
          professional_qualifications: formData.professional_qualifications || null,
          publish_preferences: publishToggles,
          profile_completed_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      if (memberError) throw memberError;

      const { error: sensitiveError } = await supabase
        .from("board_members_sensitive")
        .upsert(
          {
            member_id: member.id,
            personal_mobile: formData.personal_mobile || null,
            personal_email: formData.personal_email || null,
            emergency_contact_name: formData.emergency_contact_name || null,
            emergency_contact_phone: formData.emergency_contact_phone || null,
          },
          { onConflict: "member_id" }
        );

      if (sensitiveError) throw sensitiveError;

      // Update local state so completion status reflects immediately
      setAllMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, profile_completed_at: new Date().toISOString() } : m
        )
      );

      setSaved(true);
      toast({ title: "Profile saved", description: "Your board member profile has been updated." });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ title: "Error", description: "Failed to save profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const currentBoard = allMembers.find((m) => m.id === selectedMemberId);

  if (loading && allMembers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Board selector — only shown when user has multiple memberships */}
          {allMembers.length > 1 && (
            <Card className="mb-4">
              <CardContent className="pt-4 pb-4">
                <Label className="mb-2 block">Select board membership to edit:</Label>
                <Select
                  value={selectedMemberId || ""}
                  onValueChange={(value) => setSelectedMemberId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a board…" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.boards?.title || "Board"} — {m.full_name}
                        {m.profile_completed_at ? "" : " (incomplete)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                Your Board Member Profile
                {currentBoard?.boards?.title ? ` — ${currentBoard.boards.title}` : ""}
              </CardTitle>
              <CardDescription>
                Complete or update your profile information. Select which details you'd like to make publicly visible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    {/* Full Name */}
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

                    {/* Preferred Title */}
                    <div>
                      <Label htmlFor="preferred_title">Preferred Title (Mr/Ms/Dr)</Label>
                      <Input
                        id="preferred_title"
                        value={formData.preferred_title}
                        onChange={(e) => setFormData({ ...formData, preferred_title: e.target.value })}
                      />
                    </div>

                    {/* Job Title */}
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

                    {/* Company Affiliations */}
                    <div>
                      <Label htmlFor="public_company_affiliations">Company Affiliations</Label>
                      <Input
                        id="public_company_affiliations"
                        value={formData.public_company_affiliations}
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

                    {/* Professional Qualifications */}
                    <div>
                      <Label htmlFor="professional_qualifications">Professional Qualifications</Label>
                      <Input
                        id="professional_qualifications"
                        value={formData.professional_qualifications}
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

                    {/* Short Bio */}
                    <div>
                      <Label htmlFor="short_bio">Short Biography (100–200 words)</Label>
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

                    {/* Mobile Phone (sensitive) */}
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

                    {/* Personal Email (sensitive) */}
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

                    {/* Emergency Contact Name (sensitive) */}
                    <div>
                      <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                      <Input
                        id="emergency_contact_name"
                        value={formData.emergency_contact_name}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Confidential</p>
                    </div>

                    {/* Emergency Contact Phone (sensitive) */}
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
                          Saving...
                        </>
                      ) : saved ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Saved — Update Again
                        </>
                      ) : (
                        "Save Profile"
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                      {saved ? "Go to Dashboard" : "Skip for Now"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
