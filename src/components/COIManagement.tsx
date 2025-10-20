import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

interface COIManagementProps {
  memberId: string;
  isEditable?: boolean;
}

const COIManagement = ({ memberId, isEditable = true }: COIManagementProps) => {
  const { toast } = useToast();
  const [cois, setCois] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    declared_interest: "",
    type: "financial",
    related_party_name: "",
    management_steps: "",
  });

  useEffect(() => {
    fetchCOIs();
  }, [memberId]);

  const fetchCOIs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("board_member_coi")
        .select("*")
        .eq("member_id", memberId)
        .order("date_declared", { ascending: false });

      if (error) throw error;
      setCois(data || []);
    } catch (error: any) {
      console.error("Error fetching COIs:", error);
      toast({
        title: "Error",
        description: "Failed to load conflicts of interest",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCOI = async () => {
    if (!formData.declared_interest.trim()) {
      toast({
        title: "Error",
        description: "Please describe the conflict of interest",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("board_member_coi").insert({
        member_id: memberId,
        ...formData,
      });

      if (error) throw error;

      toast({
        title: "COI added",
        description: "Conflict of interest has been recorded",
      });

      setFormData({
        declared_interest: "",
        type: "financial",
        related_party_name: "",
        management_steps: "",
      });
      setDialogOpen(false);
      fetchCOIs();
    } catch (error: any) {
      console.error("Error adding COI:", error);
      toast({
        title: "Error",
        description: "Failed to add conflict of interest",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (coiId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("board_member_coi")
        .update({ status: newStatus })
        .eq("id", coiId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "COI status has been changed",
      });

      fetchCOIs();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <AlertCircle className="h-4 w-4" />;
      case "mitigated":
        return <CheckCircle2 className="h-4 w-4" />;
      case "resolved":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "destructive";
      case "mitigated":
        return "secondary";
      case "resolved":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Conflicts of Interest</CardTitle>
            <CardDescription>Declared interests and management</CardDescription>
          </div>
          {isEditable && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Declare COI
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Declare Conflict of Interest</DialogTitle>
                  <DialogDescription>
                    Record a potential or actual conflict of interest
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="declared_interest">Declared Interest *</Label>
                    <Textarea
                      id="declared_interest"
                      value={formData.declared_interest}
                      onChange={(e) =>
                        setFormData({ ...formData, declared_interest: e.target.value })
                      }
                      placeholder="Describe the conflict of interest..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="financial">Financial</SelectItem>
                        <SelectItem value="familial">Familial</SelectItem>
                        <SelectItem value="contractual">Contractual</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="related_party_name">Related Party Name</Label>
                    <Input
                      id="related_party_name"
                      value={formData.related_party_name}
                      onChange={(e) =>
                        setFormData({ ...formData, related_party_name: e.target.value })
                      }
                      placeholder="Company or individual name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="management_steps">Management Steps</Label>
                    <Textarea
                      id="management_steps"
                      value={formData.management_steps}
                      onChange={(e) =>
                        setFormData({ ...formData, management_steps: e.target.value })
                      }
                      placeholder="How will this be managed? (recusal, waiver, etc.)"
                      rows={2}
                    />
                  </div>

                  <Button onClick={handleAddCOI} className="w-full">
                    Record COI
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : cois.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conflicts of interest declared</p>
        ) : (
          <div className="space-y-4">
            {cois.map((coi) => (
              <div key={coi.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getStatusVariant(coi.status)} className="gap-1">
                        {getStatusIcon(coi.status)}
                        {coi.status}
                      </Badge>
                      <Badge variant="outline">{coi.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Declared: {format(new Date(coi.date_declared), "PP")}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">{coi.declared_interest}</p>
                    {coi.related_party_name && (
                      <p className="text-sm text-muted-foreground">
                        Related party: {coi.related_party_name}
                      </p>
                    )}
                    {coi.management_steps && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Management: {coi.management_steps}
                      </p>
                    )}
                  </div>
                </div>

                {isEditable && coi.status === "active" && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(coi.id, "mitigated")}
                    >
                      Mark as Mitigated
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(coi.id, "resolved")}
                    >
                      Mark as Resolved
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default COIManagement;
