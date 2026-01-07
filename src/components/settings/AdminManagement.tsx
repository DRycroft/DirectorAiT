import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandling";
import { Shield, Crown, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OrgAdmin {
  id: string;
  org_id: string;
  user_id: string;
  admin_type: "primary" | "secondary";
  appointed_at: string;
  appointed_by: string | null;
  profile?: {
    name: string;
    email: string;
  };
  appointer_profile?: {
    name: string;
  };
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

export default function AdminManagement() {
  const [admins, setAdmins] = useState<OrgAdmin[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrimaryAdmin, setSelectedPrimaryAdmin] = useState("");
  const [selectedSecondaryAdmin, setSelectedSecondaryAdmin] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAdmins();
    fetchProfiles();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id) return;

      const { data, error } = await supabase
        .from("org_admins")
        .select(`
          *,
          profile:profiles!org_admins_user_id_fkey(name, email),
          appointer_profile:profiles!org_admins_appointed_by_fkey(name)
        `)
        .eq("org_id", profile.org_id);

      if (error) throw error;
      setAdmins((data as any) || []);

      // Set current selections
      const primary = data?.find((a: any) => a.admin_type === "primary");
      const secondary = data?.find((a: any) => a.admin_type === "secondary");
      
      if (primary) setSelectedPrimaryAdmin(primary.user_id);
      if (secondary) setSelectedSecondaryAdmin(secondary.user_id);
    } catch (error) {
      logError("AdminManagement.fetchAdmins", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("org_id", profile.org_id)
        .order("name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      logError("AdminManagement.fetchProfiles", error);
    }
  };

  const handleAssignAdmin = async (adminType: "primary" | "secondary", userId: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id) return;

      // Check if this user is already assigned to another admin type
      const existingAssignment = admins.find(
        a => a.user_id === userId && a.admin_type !== adminType
      );

      if (existingAssignment) {
        toast({
          title: "Error",
          description: "This user is already assigned as another admin type",
          variant: "destructive",
        });
        return;
      }

      // First, ensure org_admin role is assigned
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({
          user_id: userId,
          role: "org_admin" as any,
          org_id: profile.org_id,
        }, {
          onConflict: "user_id,role",
        });

      if (roleError) throw roleError;

      // Then assign admin type
      const { error } = await supabase
        .from("org_admins")
        .upsert({
          org_id: profile.org_id,
          user_id: userId,
          admin_type: adminType,
          appointed_by: user.id,
        }, {
          onConflict: "org_id,admin_type",
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${adminType === "primary" ? "Primary" : "Secondary"} admin assigned successfully`,
      });

      fetchAdmins();
    } catch (error) {
      logError("AdminManagement.handleAssignAdmin", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!confirm("Are you sure you want to remove this admin assignment?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("org_admins")
        .delete()
        .eq("id", adminId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Admin assignment removed successfully",
      });

      fetchAdmins();
    } catch (error) {
      logError("AdminManagement.handleRemoveAdmin", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading admin management...</div>;
  }

  const primaryAdmin = admins.find(a => a.admin_type === "primary");
  const secondaryAdmin = admins.find(a => a.admin_type === "secondary");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admin Management</h2>
        <p className="text-muted-foreground">Manage primary and secondary administrators for your organization</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Primary and secondary admins have full administrative access to the organization.
          Ensure you trust anyone assigned to these roles.
        </AlertDescription>
      </Alert>

      {/* Current Admins Display */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={primaryAdmin ? "border-primary" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <CardTitle>Primary Administrator</CardTitle>
            </div>
            <CardDescription>
              Main administrative authority for the organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {primaryAdmin ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{primaryAdmin.profile?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {primaryAdmin.profile?.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Appointed {format(new Date(primaryAdmin.appointed_at), "PPP")}
                      {primaryAdmin.appointer_profile?.name && 
                        ` by ${primaryAdmin.appointer_profile.name}`
                      }
                    </p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveAdmin(primaryAdmin.id)}
                  className="w-full"
                >
                  Remove Assignment
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No primary administrator assigned</p>
            )}
          </CardContent>
        </Card>

        <Card className={secondaryAdmin ? "border-secondary" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-secondary-foreground" />
              <CardTitle>Secondary Administrator</CardTitle>
            </div>
            <CardDescription>
              Backup administrative authority
            </CardDescription>
          </CardHeader>
          <CardContent>
            {secondaryAdmin ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{secondaryAdmin.profile?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {secondaryAdmin.profile?.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Appointed {format(new Date(secondaryAdmin.appointed_at), "PPP")}
                      {secondaryAdmin.appointer_profile?.name && 
                        ` by ${secondaryAdmin.appointer_profile.name}`
                      }
                    </p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveAdmin(secondaryAdmin.id)}
                  className="w-full"
                >
                  Remove Assignment
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No secondary administrator assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign New Admins */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Administrators</CardTitle>
          <CardDescription>
            Select users from your organization to assign as administrators
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="primary-admin">Primary Administrator</Label>
            <div className="flex gap-2">
              <Select
                value={selectedPrimaryAdmin}
                onValueChange={setSelectedPrimaryAdmin}
              >
                <SelectTrigger id="primary-admin">
                  <SelectValue placeholder="Select primary admin" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem 
                      key={profile.id} 
                      value={profile.id}
                      disabled={profile.id === secondaryAdmin?.user_id}
                    >
                      {profile.name} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleAssignAdmin("primary", selectedPrimaryAdmin)}
                disabled={!selectedPrimaryAdmin}
              >
                Assign
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="secondary-admin">Secondary Administrator</Label>
            <div className="flex gap-2">
              <Select
                value={selectedSecondaryAdmin}
                onValueChange={setSelectedSecondaryAdmin}
              >
                <SelectTrigger id="secondary-admin">
                  <SelectValue placeholder="Select secondary admin" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem 
                      key={profile.id} 
                      value={profile.id}
                      disabled={profile.id === primaryAdmin?.user_id}
                    >
                      {profile.name} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => handleAssignAdmin("secondary", selectedSecondaryAdmin)}
                disabled={!selectedSecondaryAdmin}
              >
                Assign
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
