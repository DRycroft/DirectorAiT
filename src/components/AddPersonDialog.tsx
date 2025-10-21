import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPositionsByType } from "@/config/positions";
import { Combobox } from "@/components/ui/combobox";
import { Card } from "@/components/ui/card";

const formSchema = z.object({
  member_type: z.enum(["board", "executive", "key_staff"]),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  preferred_title: z.string().optional(),
  position: z.string().min(1, "Position is required"),
  home_address: z.string().optional(),
  date_of_birth: z.date().optional(),
  personal_email: z.string().email("Invalid email address").min(1, "Email is required"),
  personal_mobile: z.string().optional(),
  public_social_links: z.string().optional(),
  reports_responsible_for: z.string().optional(),
  reports_to: z.string().optional(),
  professional_qualifications: z.string().optional(),
  personal_interests: z.string().optional(),
  health_notes: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddPersonDialogProps {
  boardId: string;
  organizationName: string;
  onSuccess: () => void;
}

export function AddPersonDialog({ boardId, organizationName, onSuccess }: AddPersonDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingMembers, setExistingMembers] = useState<any[]>([]);
  const [formTemplate, setFormTemplate] = useState<any[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      member_type: "board",
      full_name: "",
      preferred_title: "",
      position: "",
      home_address: "",
      personal_email: "",
      personal_mobile: "",
      public_social_links: "",
      reports_responsible_for: "",
      reports_to: "",
      professional_qualifications: "",
      personal_interests: "",
      health_notes: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
    },
  });

  const memberType = form.watch("member_type");

  // Fetch form template when member type changes
  useEffect(() => {
    const loadFormTemplate = async () => {
      setLoadingTemplate(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (!profile?.org_id) return;

        // Fetch template for this member type
        const { data: template } = await supabase
          .from("staff_form_templates")
          .select("fields")
          .eq("org_id", profile.org_id)
          .eq("form_type", memberType === "board" ? "board_members" : memberType === "executive" ? "executive_team" : "key_staff")
          .single();

        if (template?.fields) {
          const fields = template.fields as any[];
          // Sort by order and filter enabled fields
          const sortedFields = fields
            .filter(f => f.enabled)
            .sort((a, b) => a.order - b.order);
          setFormTemplate(sortedFields);
        }
      } catch (error) {
        console.error("Error loading form template:", error);
      } finally {
        setLoadingTemplate(false);
      }
    };

    if (open) {
      loadFormTemplate();
    }
  }, [memberType, open]);

  // Fetch existing members when dialog opens
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const { data } = await supabase
        .from("board_members")
        .select("id, full_name, position")
        .eq("board_id", boardId)
        .eq("status", "active");
      setExistingMembers(data || []);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);

      // Parse LinkedIn URL if provided
      let socialLinks = {};
      if (values.public_social_links) {
        socialLinks = { linkedin: values.public_social_links };
      }

      // Parse reports responsible for (comma-separated)
      let reportsArray: string[] = [];
      if (values.reports_responsible_for) {
        reportsArray = values.reports_responsible_for
          .split(",")
          .map(r => r.trim())
          .filter(r => r);
      }

      const insertData: any = {
        board_id: boardId,
        member_type: values.member_type,
        full_name: values.full_name,
        preferred_title: values.preferred_title || null,
        position: values.position,
        home_address: values.home_address || null,
        date_of_birth: values.date_of_birth ? values.date_of_birth.toISOString().split('T')[0] : null,
        personal_email: values.personal_email,
        personal_mobile: values.personal_mobile || null,
        public_social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        reports_responsible_for: reportsArray.length > 0 ? reportsArray : null,
        reports_to: values.reports_to || null,
        professional_qualifications: values.professional_qualifications || null,
        personal_interests: values.personal_interests || null,
        health_notes: values.health_notes || null,
        emergency_contact_name: values.emergency_contact_name || null,
        emergency_contact_phone: values.emergency_contact_phone || null,
        status: "active",
      };

      const { error } = await supabase.from("board_members").insert(insertData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member added successfully",
      });

      form.reset();
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error adding team member:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add team member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMemberTypeLabel = () => {
    switch (memberType) {
      case "board":
        return "Board Member";
      case "executive":
        return "Executive";
      case "key_staff":
        return "Staff";
      default:
        return "Team Member";
    }
  };

  const positions = getPositionsByType(memberType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add New Person
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            <div className="mb-1 text-lg font-normal text-muted-foreground">
              {organizationName}
            </div>
            {getMemberTypeLabel()} Form
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="p-4 bg-muted/50">
              <FormField
                control={form.control}
                name="member_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="board">Board</SelectItem>
                        <SelectItem value="executive">Executive</SelectItem>
                        <SelectItem value="key_staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Mr., Dr., Prof., etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position Held *</FormLabel>
                  <FormControl>
                    <Combobox
                      options={positions.map(p => ({ label: p, value: p }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select or type a position"
                      searchPlaceholder="Search positions..."
                      emptyText="No position found. Start typing to create custom."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="personal_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="personal_mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+64 21 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="home_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Address (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="123 Main Street, City, Country" 
                      {...field} 
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="public_social_links"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn Profile</FormLabel>
                    <FormControl>
                      <Input placeholder="https://linkedin.com/in/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reports_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reports To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reporting manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {existingMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name} - {member.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Who does this person report to?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reports_responsible_for"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reports Responsible For (Board Papers)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Financial Report, Compliance Report (comma-separated)" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Enter report names separated by commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="professional_qualifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualifications</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Degrees, certifications, professional memberships..." 
                      {...field} 
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="personal_interests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Interests / Hobbies</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Interests outside of work..." 
                      {...field} 
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="health_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Health Information (Optional & Confidential)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any health information you wish to share with the company..." 
                      {...field} 
                      rows={2}
                    />
                  </FormControl>
                  <FormDescription>
                    This information is stored securely and treated as confidential
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergency_contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergency_contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+64 21 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {loadingTemplate && (
              <div className="text-sm text-muted-foreground text-center p-2 bg-muted/50 rounded">
                Loading form template...
              </div>
            )}

            {!loadingTemplate && formTemplate.length > 0 && (
              <div className="text-sm text-muted-foreground text-center p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded">
                Form fields are displayed in the order configured in Settings → Document Templates
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Team Member"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
