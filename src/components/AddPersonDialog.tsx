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
import { PhoneInput } from "@/components/ui/phone-input";

// Create dynamic schema based on template
const createFormSchema = (template: any[]) => {
  const schemaFields: any = {
    member_type: z.enum(["board", "executive", "key_staff"]),
  };
  
  template.forEach((field: any) => {
    if (!field.enabled) return;
    
    const fieldId = field.id || field.label?.toLowerCase().replace(/\s+/g, '_');
    const fieldType = field.field_type || field.type; // Handle both field_type and type
    
    if (fieldType === 'email') {
      schemaFields[fieldId] = field.required 
        ? z.string().email("Invalid email address").min(1, `${field.label} is required`)
        : z.string().email("Invalid email address").optional().or(z.literal(''));
    } else if (fieldType === 'date') {
      schemaFields[fieldId] = field.required 
        ? z.date({ required_error: `${field.label} is required` })
        : z.date().optional();
    } else if (fieldType === 'tel' || fieldType === 'phone') {
      schemaFields[fieldId] = field.required
        ? z.string().min(1, `${field.label} is required`)
        : z.string().optional();
    } else if (fieldType === 'url') {
      schemaFields[fieldId] = field.required
        ? z.string().url("Invalid URL").min(1, `${field.label} is required`)
        : z.string().url("Invalid URL").optional().or(z.literal(''));
    } else {
      schemaFields[fieldId] = field.required
        ? z.string().min(1, `${field.label} is required`)
        : z.string().optional();
    }
  });
  
  return z.object(schemaFields);
};

const baseFormSchema = z.object({
  member_type: z.enum(["board", "executive", "key_staff"]),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  preferred_title: z.string().optional(),
  position: z.string().min(1, "Position is required"),
  starting_date: z.date({ required_error: "Starting date is required" }),
  finishing_date: z.date().optional(),
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

type FormValues = z.infer<typeof baseFormSchema> & Record<string, any>;

interface AddPersonDialogProps {
  boardId: string;
  organizationName: string;
  onSuccess: () => void;
  trigger?: React.ReactNode;
  defaultMemberType?: 'board' | 'executive' | 'key_staff';
}

export function AddPersonDialog({ boardId, organizationName, onSuccess, trigger, defaultMemberType }: AddPersonDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingMembers, setExistingMembers] = useState<any[]>([]);
  const [formTemplate, setFormTemplate] = useState<any[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const { toast } = useToast();

  const [formSchema, setFormSchema] = useState(baseFormSchema);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      member_type: defaultMemberType || "board",
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

        // Map member_type to form_type
        const formTypeMap: Record<string, string> = {
          "board": "board_members",
          "executive": "executive_team",
          "key_staff": "key_staff"
        };

        // Fetch template for this member type
        const { data: template, error: templateError } = await supabase
          .from("staff_form_templates")
          .select("fields")
          .eq("org_id", profile.org_id)
          .eq("form_type", formTypeMap[memberType] || "board_members")
          .single();

        if (templateError) {
          console.error("Error fetching template:", templateError);
        }

        if (template?.fields) {
          const fields = template.fields as any[];
          console.log("Loaded template fields:", fields.map(f => ({ id: f.id, label: f.label, order: f.order, enabled: f.enabled })));
          
          // Sort by order and filter enabled fields
          const sortedFields = fields
            .filter(f => f.enabled)
            .sort((a, b) => a.order - b.order);
          
          console.log("Filtered and sorted fields:", sortedFields.length);
          setFormTemplate(sortedFields);
          
          // Update form schema based on template
          const dynamicSchema = createFormSchema(sortedFields);
          setFormSchema(dynamicSchema);
          
          // Reset form with new schema
          const defaultValues: any = { member_type: memberType };
          sortedFields.forEach(field => {
            const fieldId = field.id || field.label?.toLowerCase().replace(/\s+/g, '_');
            defaultValues[fieldId] = '';
          });
          form.reset(defaultValues);
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

      // Standard field mapping
      const standardFields = new Set([
        'full_name', 'preferred_title', 'position', 'starting_date', 'finishing_date',
        'home_address', 'date_of_birth', 'personal_email', 'personal_mobile',
        'public_social_links', 'reports_responsible_for', 'reports_to',
        'professional_qualifications', 'personal_interests', 'health_notes',
        'emergency_contact_name', 'emergency_contact_phone', 'member_type'
      ]);

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

      // Separate custom fields from standard fields and convert dates
      const customFields: Record<string, any> = {};
      Object.keys(values).forEach(key => {
        if (!standardFields.has(key)) {
          const value = values[key];
          // Convert Date objects to ISO strings for storage
          if (value instanceof Date) {
            customFields[key] = value.toISOString().split('T')[0];
          } else {
            customFields[key] = value;
          }
        }
      });

      const insertData: any = {
        board_id: boardId,
        member_type: values.member_type,
        full_name: values.full_name,
        preferred_title: values.preferred_title || null,
        position: values.position,
        appointment_date: values.starting_date ? values.starting_date.toISOString().split('T')[0] : null,
        term_expiry: values.finishing_date ? values.finishing_date.toISOString().split('T')[0] : null,
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
        custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
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

  // Map field IDs to standard database columns
  const standardFieldMap: Record<string, string> = {
    'full_name': 'full_name',
    'preferred_title': 'preferred_title',
    'position': 'position',
    'starting_date': 'starting_date',
    'appointment_date': 'starting_date',
    'finishing_date': 'finishing_date',
    'term_expiry': 'finishing_date',
    'home_address': 'home_address',
    'date_of_birth': 'date_of_birth',
    'personal_email': 'personal_email',
    'email': 'personal_email',
    'personal_mobile': 'personal_mobile',
    'phone': 'personal_mobile',
    'linkedin_profile': 'public_social_links',
    'public_social_links': 'public_social_links',
    'reports_to': 'reports_to',
    'reports_responsible_for': 'reports_responsible_for',
    'professional_qualifications': 'professional_qualifications',
    'qualifications': 'professional_qualifications',
    'personal_interests': 'personal_interests',
    'health_notes': 'health_notes',
    'emergency_contact_name': 'emergency_contact_name',
    'emergency_contact_phone': 'emergency_contact_phone',
  };

  const renderField = (field: any) => {
    const fieldId = standardFieldMap[field.id] || field.id || field.label?.toLowerCase().replace(/\s+/g, '_');
    const fieldLabel = field.label || field.id?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    // Special handling for certain fields
    if (fieldId === 'position') {
      return (
        <FormField
          key={fieldId}
          control={form.control}
          name={fieldId}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>{fieldLabel}{field.required && ' *'}</FormLabel>
              <FormControl>
                <Combobox
                  options={positions.map(p => ({ label: p, value: p }))}
                  value={formField.value}
                  onValueChange={formField.onChange}
                  placeholder="Select or type a position"
                  searchPlaceholder="Search positions..."
                  emptyText="No position found. Start typing to create custom."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    // Handle date fields with calendar
    const fieldType = field.field_type || field.type;
    if (fieldId === 'starting_date' || fieldId === 'finishing_date' || fieldId === 'date_of_birth' || fieldType === 'date') {
      return (
        <FormField
          key={fieldId}
          control={form.control}
          name={fieldId}
          render={({ field: formField }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{fieldLabel}{field.required && ' *'}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !formField.value && "text-muted-foreground"
                      )}
                    >
                      {formField.value ? format(formField.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formField.value}
                    onSelect={formField.onChange}
                    disabled={fieldId === 'date_of_birth' ? (date) => date > new Date() || date < new Date("1900-01-01") : undefined}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    if (fieldId === 'reports_to') {
      return (
        <FormField
          key={fieldId}
          control={form.control}
          name={fieldId}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>{fieldLabel}{field.required && ' *'}</FormLabel>
              <Select onValueChange={formField.onChange} value={formField.value}>
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
              <FormDescription>Who does this person report to?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    if (fieldId === 'personal_mobile' || fieldId === 'emergency_contact_phone') {
      return (
        <FormField
          key={fieldId}
          control={form.control}
          name={fieldId}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>{fieldLabel}{field.required && ' *'}</FormLabel>
              <FormControl>
                <PhoneInput 
                  placeholder="21 123 4567" 
                  value={formField.value}
                  onChange={formField.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    if (field.type === 'textarea' || ['professional_qualifications', 'personal_interests', 'health_notes', 'home_address', 'reports_responsible_for'].includes(fieldId)) {
      return (
        <FormField
          key={fieldId}
          control={form.control}
          name={fieldId}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>{fieldLabel}{field.required && ' *'}</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
                  {...formField}
                  rows={fieldId === 'home_address' ? 2 : 3}
                />
              </FormControl>
              {fieldId === 'health_notes' && (
                <FormDescription>
                  This information is stored securely and treated as confidential
                </FormDescription>
              )}
              {fieldId === 'reports_responsible_for' && (
                <FormDescription>
                  Enter report names separated by commas
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    // Default: text input
    return (
      <FormField
        key={fieldId}
        control={form.control}
        name={fieldId}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>{fieldLabel}{field.required && ' *'}</FormLabel>
            <FormControl>
              <Input 
                type={field.type === 'email' ? 'email' : 'text'}
                placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
                {...formField}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  const positions = getPositionsByType(memberType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add New Person
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
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
            {!defaultMemberType && (
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
            )}

            {loadingTemplate && (
              <div className="text-sm text-muted-foreground text-center p-2 bg-muted/50 rounded">
                Loading form template...
              </div>
            )}

            {!loadingTemplate && formTemplate.length > 0 && (
              <>
                <div className="text-sm text-muted-foreground text-center p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded">
                  Form fields are displayed based on your template configuration in Settings → Document Templates
                </div>
                
                <div className="space-y-4">
                  {formTemplate.map((field, index) => {
                    // Check if this field should be in a grid with the next field
                    const nextField = formTemplate[index + 1];
                    const shouldPairWithNext = nextField && 
                      ['preferred_title', 'personal_mobile', 'emergency_contact_phone', 'finishing_date'].includes(
                        standardFieldMap[nextField.id] || nextField.id
                      );
                    
                    // Skip if this field was paired with previous
                    const prevField = formTemplate[index - 1];
                    const isPairedWithPrev = prevField &&
                      ['preferred_title', 'personal_mobile', 'emergency_contact_phone', 'finishing_date'].includes(
                        standardFieldMap[field.id] || field.id
                      );
                    
                    if (isPairedWithPrev) return null;

                    if (shouldPairWithNext) {
                      return (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {renderField(field)}
                          {renderField(nextField)}
                        </div>
                      );
                    }

                    return renderField(field);
                  })}
                </div>
              </>
            )}

            {!loadingTemplate && formTemplate.length === 0 && (
              <div className="text-sm text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded">
                No template fields configured. Please configure the form template in Settings → Document Templates → Staff Forms.
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
              <Button type="submit" disabled={loading || formTemplate.length === 0}>
                {loading ? "Adding..." : "Add Team Member"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
