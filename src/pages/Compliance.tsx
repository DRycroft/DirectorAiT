import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, AlertCircle, CheckCircle, Clock, Building2 } from "lucide-react";
import { format } from "date-fns";

interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  authority: string;
  frequency: string;
  next_due_date: string | null;
  last_completed_date: string | null;
  responsible_person: string;
  status: string;
  category_id: string;
  notes: string;
}

interface ComplianceCategory {
  id: string;
  name: string;
  description: string;
}

interface NewComplianceItem {
  title: string;
  description: string;
  authority: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "semi_annual" | "annual" | "biennial" | "as_required";
  next_due_date: string;
  responsible_person: string;
  category_id: string;
  notes: string;
}

interface ComplianceTemplate {
  id: string;
  title: string;
  description: string;
  authority: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "semi_annual" | "annual" | "biennial" | "as_required";
  industry_sector: string;
}

const Compliance = () => {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [categories, setCategories] = useState<ComplianceCategory[]>([]);
  const [templates, setTemplates] = useState<ComplianceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  const [newItem, setNewItem] = useState<NewComplianceItem>({
    title: "",
    description: "",
    authority: "",
    frequency: "annual",
    next_due_date: "",
    responsible_person: "",
    category_id: "",
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*, organizations(*)")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      const [itemsRes, categoriesRes, templatesRes] = await Promise.all([
        supabase.from("compliance_items")
          .select("*")
          .eq("is_active", true) // Only show active items
          .order("next_due_date", { ascending: true }),
        supabase.from("compliance_categories").select("*"),
        supabase.from("compliance_templates").select("*")
      ]);

      if (itemsRes.data) setItems(itemsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (templatesRes.data) setTemplates(templatesRes.data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load compliance data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newItem.title || !profile?.org_id) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const { error } = await supabase.from("compliance_items").insert([{
        ...newItem,
        org_id: profile.org_id,
        status: "in_progress"
      }]);

      if (error) throw error;

      toast.success("Compliance item created");
      setOpen(false);
      setNewItem({
        title: "",
        description: "",
        authority: "",
        frequency: "annual",
        next_due_date: "",
        responsible_person: "",
        category_id: "",
        notes: ""
      });
      fetchData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message);
    }
  };

  const handleAddFromTemplate = async (template: ComplianceTemplate) => {
    if (!profile?.org_id) return;

    try {
      const { error } = await supabase.from("compliance_items").insert([{
        org_id: profile.org_id,
        title: template.title,
        description: template.description || "",
        authority: template.authority,
        frequency: template.frequency,
        status: "in_progress",
        responsible_person: profile.name
      }]);

      if (error) throw error;

      toast.success("Compliance item added from template");
      fetchData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message);
    }
  };

  const handleAIScan = async () => {
    if (!profile?.org_id) {
      toast.error("Please set up your organization first");
      return;
    }

    if (!profile.organizations?.industry_sector || !profile.organizations?.business_category) {
      toast.error("Please set your industry sector and business category in Settings first");
      return;
    }

    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-compliance", {
        body: { org_id: profile.org_id }
      });

      if (error) throw error;

      toast.success(`Successfully scanned and added ${data.count} compliance requirements!`);
      fetchData();
    } catch (error: any) {
      console.error("Error scanning compliance:", error);
      toast.error(error.message || "Failed to scan compliance requirements");
    } finally {
      setScanning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "overdue":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "due_soon":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      compliant: "bg-green-500",
      overdue: "bg-red-500",
      due_soon: "bg-yellow-500",
      in_progress: "bg-blue-500",
      not_applicable: "bg-gray-500"
    };
    return <Badge className={variants[status] || ""}>{status.replace("_", " ")}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Compliance Management</h1>
            <p className="text-muted-foreground">Track and manage regulatory compliance requirements</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              onClick={handleAIScan}
              disabled={scanning}
            >
              {scanning ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  AI Compliance Scan
                </>
              )}
            </Button>
            <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Building2 className="mr-2 h-4 w-4" />
                  Add from Templates
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Compliance Templates</DialogTitle>
                  <DialogDescription>
                    Select industry-standard compliance requirements to add to your register
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{template.title}</CardTitle>
                            <CardDescription>{template.description}</CardDescription>
                          </div>
                          <Button size="sm" onClick={() => handleAddFromTemplate(template)}>
                            Add
                          </Button>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{template.authority}</Badge>
                          <Badge variant="outline">{template.frequency}</Badge>
                          <Badge variant="outline">{template.industry_sector}</Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Compliance Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Compliance Item</DialogTitle>
                  <DialogDescription>Create a new compliance requirement for your organization</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="authority">Authority</Label>
                      <Input
                        id="authority"
                        placeholder="e.g. IRD, WorkSafe"
                        value={newItem.authority}
                        onChange={(e) => setNewItem({ ...newItem, authority: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="frequency">Frequency</Label>
                      <Select value={newItem.frequency} onValueChange={(value: any) => setNewItem({ ...newItem, frequency: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                          <SelectItem value="biennial">Biennial</SelectItem>
                          <SelectItem value="as_required">As Required</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={newItem.category_id} onValueChange={(value) => setNewItem({ ...newItem, category_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="next_due_date">Next Due Date</Label>
                      <Input
                        id="next_due_date"
                        type="date"
                        value={newItem.next_due_date}
                        onChange={(e) => setNewItem({ ...newItem, next_due_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="responsible_person">Responsible Person</Label>
                    <Input
                      id="responsible_person"
                      value={newItem.responsible_person}
                      onChange={(e) => setNewItem({ ...newItem, responsible_person: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newItem.notes}
                      onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="due_soon">Due Soon</TabsTrigger>
            <TabsTrigger value="compliant">Compliant</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <CardTitle>{item.title}</CardTitle>
                        {getStatusBadge(item.status)}
                      </div>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Authority</p>
                      <p className="font-medium">{item.authority}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Frequency</p>
                      <p className="font-medium">{item.frequency.replace("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Next Due</p>
                      <p className="font-medium">
                        {item.next_due_date ? format(new Date(item.next_due_date), "dd MMM yyyy") : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Responsible</p>
                      <p className="font-medium">{item.responsible_person || "Unassigned"}</p>
                    </div>
                  </div>
                  {item.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm">{item.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {items.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No compliance items yet</p>
                  <p className="text-muted-foreground mb-4">Get started by adding compliance requirements</p>
                  <Button onClick={() => setOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Item
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="overdue">
            {items.filter(i => i.status === "overdue").map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <CardTitle>{item.title}</CardTitle>
                    {getStatusBadge(item.status)}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="due_soon">
            {items.filter(i => i.status === "due_soon").map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <CardTitle>{item.title}</CardTitle>
                    {getStatusBadge(item.status)}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="compliant">
            {items.filter(i => i.status === "compliant").map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <CardTitle>{item.title}</CardTitle>
                    {getStatusBadge(item.status)}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Compliance;
