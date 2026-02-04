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
import { logError } from "@/lib/errorHandling";
import { TemplateField, BoardMemberInsert } from "@/types/database";

// Fields that should always be optional (for new additions, not terminations)
const ALWAYS_OPTIONAL_FIELDS = [
  "finishing_date",
  "term_expiry",
  "end_date",
  "public_social_links",
  "linkedin_profile",
];

const isUuid = (value: unknown) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const dateFromFormValue = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};

const requiredDate = (label: string) =>
  z.preprocess(
    (v) => dateFromFormValue(v),
    z.date({ required_error: `${label} is required` })
  );

const optionalDate = () => z.preprocess((v) => dateFromFormValue(v), z.date().optional());

// Predefined "Reports To" options.
// NOTE: The database column `board_members.reports_to` is a UUID (reference). These presets are NOT UUIDs,
// so we store them in custom_fields and keep `reports_to` null.
const REPORTS_TO_PRESETS = [
  { label: "CEO", value: "preset:CEO" },
  { label: "MD (Managing Director)", value: "preset:MD" },
  { label: "Chair", value: "preset:Chair" },
  { label: "Deputy Chair", value: "preset:Deputy Chair" },
  { label: "Other", value: "__other__" },
];

// Create dynamic schema based on template
const createFormSchema = (template: TemplateField[]) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {
    member_type: z.enum(["board", "executive", "key_staff"]),
  };

  template.forEach((field) => {
    if (!field.enabled) return;

    const fieldId = field.id || field.label?.toLowerCase().replace(/\s+/g, "_");
    const fieldType = field.field_type || field.type;

    // Force finishing_date and term_expiry to always be optional
    const isRequired = ALWAYS_OPTIONAL_FIELDS.includes(fieldId) ? false : field.required;

    if (fieldType === "email") {
      schemaFields[fieldId] = isRequired
        ? z.string().email("Invalid email address").min(1, `${field.label} is required`)
        : z.string().email("Invalid email address").optional().or(z.literal(""));
    } else if (fieldType === "date") {
      schemaFields[fieldId] = isRequired ? requiredDate(field.label) : optionalDate();
    } else if (fieldType === "tel" || fieldType === "phone") {
      schemaFields[fieldId] = isRequired
        ? z.string().min(1, `${field.label} is required`)
        : z.string().optional().or(z.literal(""));
    } else if (fieldType === "url") {
      // LinkedIn/URL fields: accept any string (loose validation)
      schemaFields[fieldId] = isRequired
        ? z.string().min(1, `${field.label} is required`)
        : z.string().optional().or(z.literal(""));
    } else {
      schemaFields[fieldId] = isRequired
        ? z.string().min(1, `${field.label} is required`)
        : z.string().optional().or(z.literal(""));
    }
  });

  // Support the conditional "Reports To → Other" text input
  schemaFields.reports_to_custom = z.string().optional().or(z.literal(""));

  return z.object(schemaFields);
};

const baseFormSchema = z.object({
  member_type: z.enum(["board", "executive", "key_staff"]),
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  preferred_title: z.string().optional(),
  position: z.string().min(1, "Position is required"),
  starting_date: requiredDate("Starting date"),
  finishing_date: optionalDate(),
  home_address: z.string().optional(),
  date_of_birth: optionalDate(),
  personal_email: z.string().email("Invalid email address").min(1, "Email is required"),
  personal_mobile: z.string().optional(),
  public_social_links: z.string().optional(),
  reports_responsible_for: z.string().optional(),
  reports_to: z.string().optional(),
  reports_to_custom: z.string().optional(),
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
  const [existingMembers, setExistingMembers] = useState<Array<{ id: string; full_name: string; position: string | null }>>([]);
  const [formTemplate, setFormTemplate] = useState<TemplateField[]>([]);
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
          logError("AddPersonDialog - Template fetch", templateError);
        }

        if (template?.fields) {
          const fields = Array.isArray(template.fields) 
            ? (template.fields as unknown) as TemplateField[]
            : [];
          
          // Sort by order and filter enabled fields
          const sortedFields = fields
            .filter(f => f.enabled)
            .sort((a, b) => a.order - b.order);
          setFormTemplate(sortedFields);
          
          // Update form schema based on template
          const dynamicSchema = createFormSchema(sortedFields) as typeof baseFormSchema;
          setFormSchema(dynamicSchema);
          
          // Reset form with new schema
          const defaultValues: Record<string, any> = { member_type: memberType };
          sortedFields.forEach((field) => {
            const fieldId = field.id || field.label?.toLowerCase().replace(/\s+/g, "_");
            const fieldType = field.field_type || field.type;
            defaultValues[fieldId] = fieldType === "date" ? undefined : "";
          });
          defaultValues.reports_to_custom = "";
          form.reset(defaultValues);
        }
      } catch (error) {
        logError("AddPersonDialog - Template load", error);
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

      // Standard field mapping (non-sensitive fields only)
      const standardFields = new Set([
        'full_name', 'preferred_title', 'position', 'starting_date', 'finishing_date',
        'public_social_links', 'reports_responsible_for', 'reports_to',
        'professional_qualifications', 'personal_interests', 'member_type'
      ]);

      // Sensitive fields that go to board_members_sensitive
      const sensitiveFields = new Set([
        'home_address', 'date_of_birth', 'personal_email', 'personal_mobile',
        'health_notes', 'emergency_contact_name', 'emergency_contact_phone'
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
        if (!standardFields.has(key) && !sensitiveFields.has(key)) {
          const value = values[key];
          // Convert Date objects to ISO strings for storage
          if (value instanceof Date) {
            customFields[key] = value.toISOString().split('T')[0];
          } else {
            customFields[key] = value;
          }
        }
      });

      // Handle reports_to (UUID reference) vs preset labels
      const selectedReportsTo = values.reports_to || "";
      const selectedPreset = REPORTS_TO_PRESETS.find((p) => p.value === selectedReportsTo);

      if (selectedPreset && selectedPreset.value !== "__other__") {
        customFields.reports_to_title = selectedPreset.label;
      }

      if (selectedReportsTo === "__other__") {
        const otherName = (values.reports_to_custom || "").trim();
        if (otherName) customFields.reports_to_custom = otherName;
      }

      // Insert board member (without sensitive fields)
      const insertData: BoardMemberInsert = {
        board_id: boardId,
        member_type: values.member_type,
        full_name: values.full_name,
        preferred_title: values.preferred_title || null,
        position: values.position,
        appointment_date: values.starting_date instanceof Date
          ? values.starting_date.toISOString().split("T")[0]
          : null,
        term_expiry: values.finishing_date instanceof Date
          ? values.finishing_date.toISOString().split("T")[0]
          : null,
        public_social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        reports_responsible_for: reportsArray.length > 0 ? reportsArray : null,
        // Only store a UUID in the DB column. Presets/custom names go into custom_fields.
        reports_to: isUuid(selectedReportsTo) ? selectedReportsTo : null,
        professional_qualifications: values.professional_qualifications || null,
        personal_interests: values.personal_interests || null,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
        status: "active",
      };

      const { data: newMember, error } = await supabase
        .from("board_members")
        .insert(insertData)
        .select('id')
        .single();

      if (error) throw error;

      // Insert sensitive data into board_members_sensitive
      const sensitiveData = {
        member_id: newMember.id,
        home_address: values.home_address || null,
        date_of_birth: values.date_of_birth instanceof Date
          ? values.date_of_birth.toISOString().split("T")[0]
          : null,
        personal_email: values.personal_email || null,
        personal_mobile: values.personal_mobile || null,
        health_notes: values.health_notes || null,
        emergency_contact_name: values.emergency_contact_name || null,
        emergency_contact_phone: values.emergency_contact_phone || null,
      };

      const { error: sensitiveError } = await supabase
        .from("board_members_sensitive")
        .insert(sensitiveData);

      if (sensitiveError) {
        // Log error but don't fail the whole operation
        logError("AddPersonDialog - Insert sensitive data", sensitiveError);
      }

      toast({
        title: "Success",
        description: "Team member added successfully",
      });

      form.reset();
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      logError("AddPersonDialog - Add member", error);
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

  const renderField = (field: TemplateField) => {
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
      // finishing_date/term_expiry should never show asterisk (always optional for new additions)
      const showRequired = ALWAYS_OPTIONAL_FIELDS.includes(fieldId) ? false : field.required;
      return (
        <FormField
          key={fieldId}
          control={form.control}
          name={fieldId}
          render={({ field: formField }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{fieldLabel}{showRequired && ' *'}</FormLabel>
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
      const reportsToValue = form.watch('reports_to') || '';
      const isOtherSelected = reportsToValue === '__other__';

      // Build combined options: presets + existing members (UUID)
      const combinedOptions = [
        ...REPORTS_TO_PRESETS,
        ...existingMembers.map((m) => ({
          label: `${m.full_name}${m.position ? ` - ${m.position}` : ''}`,
          value: m.id,
        })),
      ];

      return (
        <div key={fieldId} className="space-y-2">
          <FormField
            control={form.control}
            name={fieldId}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{fieldLabel}</FormLabel>
                <Select onValueChange={formField.onChange} value={formField.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select who this person reports to" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {combinedOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Who does this person report to?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {isOtherSelected && (
            <FormField
              control={form.control}
              name="reports_to_custom"
              render={({ field: customField }) => (
                <FormItem>
                  <FormLabel>Specify name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter name of reporting manager"
                      value={customField.value || ''}
                      onChange={(e) => customField.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
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
