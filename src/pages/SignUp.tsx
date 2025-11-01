import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { getUserFriendlyError, logError } from "@/lib/errorHandling";
import { phoneSchema } from "@/lib/phoneValidation";

const signUpSchema = z.object({
  // User details
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100)
    .refine(s => s.length > 0, "Name cannot be empty"),
  email: z.string().trim().email("Invalid email address").max(255).toLowerCase(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .refine(
      (pwd) => /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd),
      "Password must contain uppercase, lowercase, and numbers"
    ),
  phone: phoneSchema,
  
  // Company details
  companyName: z.string().trim().min(2, "Company name required").max(200)
    .refine(s => s.length > 0, "Company name cannot be empty"),
  businessNumber: z.string().trim()
    .regex(/^\d{8,13}$/, "Invalid business number (8-13 digits)")
    .optional()
    .or(z.literal('')),
  
  // Primary contact
  primaryContactName: z.string().trim().min(2, "Primary contact name required").max(200),
  primaryContactRole: z.string().trim().min(2, "Role required").max(100),
  primaryContactEmail: z.string().trim().email("Invalid email").max(255).toLowerCase(),
  primaryContactPhone: phoneSchema,
  
  // Admin details
  adminName: z.string().trim().min(2, "Admin name required").max(200),
  adminRole: z.string().trim().min(2, "Admin role required").max(100),
  adminEmail: z.string().trim().email("Invalid email").max(255).toLowerCase(),
  adminPhone: phoneSchema,
  
  // Board reporting
  reportingFrequency: z.enum(['monthly', 'bi-monthly', 'quarterly', 'biannually']),
  financialYearEnd: z.string().optional(),
  agmDate: z.string().optional(),
});

const SignUp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // User
    name: "",
    email: "",
    password: "",
    phone: "",
    // Company
    companyName: "",
    businessNumber: "",
    // Primary contact
    primaryContactName: "",
    primaryContactRole: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    // Admin
    adminName: "",
    adminRole: "",
    adminEmail: "",
    adminPhone: "",
    // Reporting
    reportingFrequency: "quarterly" as const,
    financialYearEnd: "",
    agmDate: "",
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = signUpSchema.parse(formData);

      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            name: validatedData.name,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create organization with all details
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: validatedData.companyName,
            business_number: validatedData.businessNumber,
            primary_contact_name: validatedData.primaryContactName,
            primary_contact_role: validatedData.primaryContactRole,
            primary_contact_email: validatedData.primaryContactEmail,
            primary_contact_phone: validatedData.primaryContactPhone,
            admin_name: validatedData.adminName,
            admin_role: validatedData.adminRole,
            admin_email: validatedData.adminEmail,
            admin_phone: validatedData.adminPhone,
            reporting_frequency: validatedData.reportingFrequency,
            financial_year_end: validatedData.financialYearEnd || null,
            agm_date: validatedData.agmDate || null,
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Update profile with org_id and phone
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            org_id: org.id,
            phone: validatedData.phone,
          })
          .eq("id", authData.user.id);

        if (profileError) throw profileError;

        // Assign org_admin role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: "org_admin",
          });

        if (roleError) throw roleError;

        toast.success("Account created successfully!");
        navigate("/dashboard");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        logError("SignUp", error);
        toast.error(getUserFriendlyError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-4">
            BoardConnect
          </div>
          <p className="text-muted-foreground">Create your account</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Sign Up - Step {step} of 4</CardTitle>
            <CardDescription>
              {step === 1 && "Create your account"}
              {step === 2 && "Company information"}
              {step === 3 && "Contact details"}
              {step === 4 && "Board reporting preferences"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={step === 4 ? handleSignUp : (e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      type="text"
                      placeholder="John Doe"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@company.com"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <PhoneInput 
                      id="phone"
                      value={formData.phone}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input 
                      id="companyName" 
                      type="text"
                      placeholder="Acme Corporation"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessNumber">Business Number (Optional)</Label>
                    <Input 
                      id="businessNumber" 
                      type="text"
                      placeholder="123456789"
                      value={formData.businessNumber}
                      onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="text-sm font-semibold text-foreground mb-2">Primary Contact (CEO/Chair)</div>
                  <div className="space-y-2">
                    <Label htmlFor="primaryContactName">Name</Label>
                    <Input 
                      id="primaryContactName" 
                      type="text"
                      required
                      value={formData.primaryContactName}
                      onChange={(e) => setFormData({ ...formData, primaryContactName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primaryContactRole">Role</Label>
                    <Input 
                      id="primaryContactRole" 
                      type="text"
                      placeholder="CEO"
                      required
                      value={formData.primaryContactRole}
                      onChange={(e) => setFormData({ ...formData, primaryContactRole: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primaryContactEmail">Email</Label>
                    <Input 
                      id="primaryContactEmail" 
                      type="email"
                      required
                      value={formData.primaryContactEmail}
                      onChange={(e) => setFormData({ ...formData, primaryContactEmail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primaryContactPhone">Phone (Optional)</Label>
                    <PhoneInput 
                      id="primaryContactPhone"
                      value={formData.primaryContactPhone}
                      onChange={(value) => setFormData({ ...formData, primaryContactPhone: value })}
                    />
                  </div>

                  <div className="text-sm font-semibold text-foreground mb-2 mt-6">Admin Person</div>
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Name</Label>
                    <Input 
                      id="adminName" 
                      type="text"
                      required
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminRole">Role</Label>
                    <Input 
                      id="adminRole" 
                      type="text"
                      placeholder="Administrator"
                      required
                      value={formData.adminRole}
                      onChange={(e) => setFormData({ ...formData, adminRole: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email</Label>
                    <Input 
                      id="adminEmail" 
                      type="email"
                      required
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPhone">Phone (Optional)</Label>
                    <PhoneInput 
                      id="adminPhone"
                      value={formData.adminPhone}
                      onChange={(value) => setFormData({ ...formData, adminPhone: value })}
                    />
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="reportingFrequency">Board Reporting Frequency</Label>
                    <Select 
                      value={formData.reportingFrequency}
                      onValueChange={(value) => setFormData({ ...formData, reportingFrequency: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="bi-monthly">Bi-Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="biannually">Biannually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="financialYearEnd">Financial Year End (Optional)</Label>
                    <Input 
                      id="financialYearEnd" 
                      type="date"
                      value={formData.financialYearEnd}
                      onChange={(e) => setFormData({ ...formData, financialYearEnd: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agmDate">AGM Date (Optional)</Label>
                    <Input 
                      id="agmDate" 
                      type="date"
                      value={formData.agmDate}
                      onChange={(e) => setFormData({ ...formData, agmDate: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                    Back
                  </Button>
                )}
                <Button type="submit" variant="accent" className="flex-1" disabled={loading}>
                  {loading ? "Creating account..." : step === 4 ? "Create Account" : "Next"}
                </Button>
              </div>
            </form>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth" className="text-accent hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;