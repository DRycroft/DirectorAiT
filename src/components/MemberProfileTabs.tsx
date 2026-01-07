import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MemberProfileTabsProps {
  member: any;
  isAdmin?: boolean;
}

const MemberProfileTabs = ({ member, isAdmin = false }: MemberProfileTabsProps) => {
  const publishPrefs = member.publish_preferences || {};

  const PublicPreview = () => (
    <Card>
      <CardHeader>
        <CardTitle>Public Profile Preview</CardTitle>
        <CardDescription>How this profile will appear publicly</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={member.public_photo_url} />
            <AvatarFallback>
              {member.full_name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-bold">
              {publishPrefs.full_name && member.full_name ? (
                member.full_name
              ) : (
                <span className="text-muted-foreground">Name not published</span>
              )}
            </h3>
            {publishPrefs.public_job_title && member.public_job_title && (
              <p className="text-sm text-muted-foreground">{member.public_job_title}</p>
            )}
          </div>
        </div>

        {publishPrefs.short_bio && member.short_bio && (
          <div>
            <h4 className="font-semibold mb-2">Biography</h4>
            <p className="text-sm">{member.short_bio}</p>
          </div>
        )}

        {publishPrefs.public_company_affiliations && member.public_company_affiliations && (
          <div>
            <h4 className="font-semibold mb-2">Company Affiliations</h4>
            <p className="text-sm">{member.public_company_affiliations}</p>
          </div>
        )}

        {publishPrefs.professional_qualifications && member.professional_qualifications && (
          <div>
            <h4 className="font-semibold mb-2">Qualifications</h4>
            <p className="text-sm">{member.professional_qualifications}</p>
          </div>
        )}

        {publishPrefs.public_contact_email && member.personal_email && (
          <div>
            <h4 className="font-semibold mb-2">Contact</h4>
            <p className="text-sm">{member.personal_email}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const InternalDetails = () => (
    <Card>
      <CardHeader>
        <CardTitle>Internal Details</CardTitle>
        <CardDescription>Visible to board members only</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold">Legal Name</label>
            <p className="text-sm">{member.legal_name || "Not provided"}</p>
          </div>
          <div>
            <label className="text-sm font-semibold">Personal Mobile</label>
            <p className="text-sm">{member.personal_mobile || "Not provided"}</p>
          </div>
          <div>
            <label className="text-sm font-semibold">Personal Email</label>
            <p className="text-sm">{member.personal_email || "Not provided"}</p>
          </div>
          <div>
            <label className="text-sm font-semibold">Appointment Date</label>
            <p className="text-sm">
              {member.appointment_date
                ? new Date(member.appointment_date).toLocaleDateString()
                : "Not set"}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold">Term Expiry</label>
            <p className="text-sm">
              {member.term_expiry
                ? new Date(member.term_expiry).toLocaleDateString()
                : "Not set"}
            </p>
          </div>
        </div>

        {member.detailed_work_history && (
          <div>
            <label className="text-sm font-semibold">Work History</label>
            <p className="text-sm whitespace-pre-line">{member.detailed_work_history}</p>
          </div>
        )}

        {member.cv_file_url && (
          <div>
            <label className="text-sm font-semibold">CV/Resume</label>
            <a href={member.cv_file_url} className="text-sm text-primary hover:underline">
              Download CV
            </a>
          </div>
        )}

        <div>
          <label className="text-sm font-semibold">Emergency Contact</label>
          <p className="text-sm">
            {member.emergency_contact_name || "Not provided"}
            {member.emergency_contact_phone && ` - ${member.emergency_contact_phone}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const ConfidentialInfo = () => {
    if (!isAdmin) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Only administrators can view confidential information
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Confidential Information</CardTitle>
          <CardDescription>Admin access only</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-semibold">National ID</label>
            <p className="text-sm">{member.national_id || "Not provided"}</p>
          </div>
          <div>
            <label className="text-sm font-semibold">Home Address</label>
            <p className="text-sm whitespace-pre-line">{member.home_address || "Not provided"}</p>
          </div>
          {member.sensitive_notes && (
            <div>
              <label className="text-sm font-semibold">Sensitive Notes</label>
              <p className="text-sm whitespace-pre-line">{member.sensitive_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const PublishingStatus = () => (
    <Card>
      <CardHeader>
        <CardTitle>Publishing Preferences</CardTitle>
        <CardDescription>Fields selected for public viewing</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { key: "full_name", label: "Full Name" },
            { key: "public_job_title", label: "Job Title" },
            { key: "short_bio", label: "Biography" },
            { key: "public_photo", label: "Photo" },
            { key: "public_company_affiliations", label: "Company Affiliations" },
            { key: "professional_qualifications", label: "Qualifications" },
            { key: "public_contact_email", label: "Contact Email" },
          ].map((field) => (
            <div key={field.key} className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">{field.label}</span>
              {publishPrefs[field.key] ? (
                <Badge variant="default" className="gap-1">
                  <Eye className="h-3 w-3" />
                  Public
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <EyeOff className="h-3 w-3" />
                  Private
                </Badge>
              )}
            </div>
          ))}
        </div>

        {member.consent_signed_at && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>
                Consent signed on {new Date(member.consent_signed_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Tabs defaultValue="public" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="public">Public Preview</TabsTrigger>
        <TabsTrigger value="internal">Internal</TabsTrigger>
        <TabsTrigger value="confidential">Confidential</TabsTrigger>
        <TabsTrigger value="publishing">Publishing</TabsTrigger>
      </TabsList>

      <TabsContent value="public">
        <PublicPreview />
      </TabsContent>

      <TabsContent value="internal">
        <InternalDetails />
      </TabsContent>

      <TabsContent value="confidential">
        <ConfidentialInfo />
      </TabsContent>

      <TabsContent value="publishing">
        <PublishingStatus />
      </TabsContent>
    </Tabs>
  );
};

export default MemberProfileTabs;
