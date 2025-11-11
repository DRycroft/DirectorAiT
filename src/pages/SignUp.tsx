import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { getUserFriendlyError, logError } from "@/lib/errorHandling";
import { phoneSchema } from "@/lib/phoneValidation";
import zxcvbn from "zxcvbn";

const signUpSchema = z.object({
  // User details
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100)
    .refine(s => s.length > 0, "Name cannot be empty"),
  email: z.string().trim().email("Invalid email address").max(255).toLowerCase(),
  password: z.string()
    .min(10, "Password must be at least 10 characters")
    .max(128, "Password is too long")
    .refine(
      (pwd) => /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd),
      "Password must contain uppercase, lowercase, and numbers"
    )
    .refine(
      (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      "Password must contain at least one special character"
    )
    .refine(
      (pwd) => !/^(.)\1+$/.test(pwd),
      "Password cannot be all the same character"
    )
    .refine(
      (pwd) => !/^(123|abc|qwe|password|admin)/i.test(pwd),
      "Password is too common or predictable"
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string;
    warning: string;
  } | null>(null);
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

  useEffect(() => {
    if (formData.password) {
      const result = zxcvbn(formData.password);
      const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
      
      setPasswordStrength({
        score: result.score,
        feedback: strengthLabels[result.score],
        warning: result.feedback.warning || 
          (result.score < 3 ? 'This password may be too common or easily guessed' : '')
      });
    } else {
      setPasswordStrength(null);
    }
  }, [formData.password]);

  const validateField = (fieldName: string, value: any) => {
    try {
      const fieldSchema = (signUpSchema.shape as any)[fieldName];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [fieldName]: error.errors[0].message }));
      }
    }
  };

  const handleNext = () => {
    // Validate current step before moving forward
    try {
      if (step === 1) {
        const stepSchema = z.object({
          name: signUpSchema.shape.name,
          email: signUpSchema.shape.email,
          password: signUpSchema.shape.password,
          phone: signUpSchema.shape.phone,
        });
        stepSchema.parse(formData);
        setErrors({});
      } else if (step === 2) {
        const stepSchema = z.object({
          companyName: signUpSchema.shape.companyName,
          businessNumber: signUpSchema.shape.businessNumber,
        });
        stepSchema.parse(formData);
        setErrors({});
      } else if (step === 3) {
        const stepSchema = z.object({
          primaryContactName: signUpSchema.shape.primaryContactName,
          primaryContactRole: signUpSchema.shape.primaryContactRole,
          primaryContactEmail: signUpSchema.shape.primaryContactEmail,
          primaryContactPhone: signUpSchema.shape.primaryContactPhone,
          adminName: signUpSchema.shape.adminName,
          adminRole: signUpSchema.shape.adminRole,
          adminEmail: signUpSchema.shape.adminEmail,
          adminPhone: signUpSchema.shape.adminPhone,
        });
        stepSchema.parse(formData);
        setErrors({});
      }
      if (step < 4) setStep(step + 1);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        toast.error(error.errors[0].message);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("🔄 Starting signup process...");
      const validatedData = signUpSchema.parse(formData);
      console.log("✅ Form validation passed");
      console.log("📧 Email:", validatedData.email);
      console.log("🏢 Company:", validatedData.companyName);

      // Cache form data before signup for callback bootstrap
      console.log("💾 Caching form data for callback bootstrap...");
      const cache = {
        email: validatedData.email,
        name: validatedData.name,
        phone: validatedData.phone || "",
        companyName: validatedData.companyName,
        businessNumber: validatedData.businessNumber || "",
        primaryContactName: validatedData.primaryContactName,
        primaryContactRole: validatedData.primaryContactRole,
        primaryContactEmail: validatedData.primaryContactEmail,
        primaryContactPhone: validatedData.primaryContactPhone,
        adminName: validatedData.adminName,
        adminRole: validatedData.adminRole,
        adminEmail: validatedData.adminEmail,
        adminPhone: validatedData.adminPhone,
        reportingFrequency: validatedData.reportingFrequency,
        financialYearEnd: validatedData.financialYearEnd || "",
        agmDate: validatedData.agmDate || "",
      };
      localStorage.setItem("pendingSignUpV1", JSON.stringify(cache));

      // Sign up the user
      console.log("🔐 Creating user account in auth system...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            name: validatedData.name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        
        // Check for specific error types and provide clear guidance
        if (authError.message?.toLowerCase().includes('already registered') || 
            authError.message?.toLowerCase().includes('user already exists') ||
            authError.message?.toLowerCase().includes('already been registered')) {
          toast.error(
            <div className="flex flex-col gap-2">
              <p className="font-semibold">This email is already registered!</p>
              <p>Please <Link to="/auth" className="underline font-medium">log in</Link> instead, or use a different email address.</p>
            </div>,
            { duration: 8000 }
          );
        } else if (authError.message?.includes('weak') || 
                   authError.message?.includes('pwned') ||
                   authError.message?.toLowerCase().includes('password is too weak') ||
                   authError.message?.toLowerCase().includes('found in data breach')) {
          toast.error(
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Password Rejected!</p>
              <p>This password has been found in data breaches or is too common. Please use a unique, strong password that hasn't been compromised.</p>
              <p className="text-xs">Tip: Use a mix of random words, numbers, and symbols.</p>
            </div>,
            { duration: 10000 }
          );
        } else if (authError.message?.toLowerCase().includes('invalid email') ||
                   authError.message?.toLowerCase().includes('email validation')) {
          toast.error("Invalid email address. Please check and try again.");
        } else if (authError.status === 422 || authError.code === '422') {
          // Generic 422 - likely password issue
          toast.error(
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Signup Failed</p>
              <p>Your password may have been found in data breaches. Please try a completely unique password that you haven't used elsewhere.</p>
              <p className="text-xs mt-1">Use at least 12 characters with a mix of letters, numbers, and symbols.</p>
            </div>,
            { duration: 10000 }
          );
        } else {
          toast.error(
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Signup Error</p>
              <p>{authError.message || 'An error occurred during signup. Please try again.'}</p>
            </div>,
            { duration: 8000 }
          );
        }
        throw authError;
      }
      console.log("✅ User account created successfully!");
      console.log("   User ID:", authData.user?.id);
      console.log("   Email:", authData.user?.email);

      if (authData.user && authData.session) {
        console.log("✅ Authentication session established - completing signup immediately");
        
        // Wait a moment for session to propagate, then verify it
        await new Promise(resolve => setTimeout(resolve, 100));
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !currentSession) {
          console.error("❌ Failed to verify session:", sessionError);
          throw new Error("Session verification failed. Please try again.");
        }
        
        console.log("✅ Session verified, user role:", currentSession.user.role);
        
        // Create organization with all details
        console.log("Creating organization...");
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

        if (orgError) {
          console.error("❌ Organization creation failed:", orgError);
          throw new Error(`Failed to create organization: ${orgError.message}`);
        }
        console.log("✅ Organization created:", org.id);

        // Update profile with org_id and phone
        console.log("Updating profile with org_id...");
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            org_id: org.id,
            phone: validatedData.phone,
          })
          .eq("id", authData.user.id);

        if (profileError) {
          console.error("❌ Profile update failed:", profileError);
          throw new Error(`Failed to update profile: ${profileError.message}`);
        }
        console.log("✅ Profile updated with org_id");

        // Wait a moment to ensure profile update is committed
        await new Promise(resolve => setTimeout(resolve, 100));

        // Assign org_admin role
        console.log("Assigning org_admin role...");
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: "org_admin",
          });

        if (roleError) {
          console.error("❌ Role assignment failed:", roleError);
          throw new Error(`Failed to assign role: ${roleError.message}`);
        }
        console.log("✅ Role assigned successfully");

        // Clean up cache and navigate to dashboard
        localStorage.removeItem("pendingSignUpV1");
        toast.success("Account created successfully!");
        navigate("/dashboard");
      } else if (authData.user && !authData.session) {
        // Email confirmation required: show success message and let callback handle bootstrap
        console.log("📧 Email confirmation required - user will complete signup via callback");
        toast.success("Check your email to confirm your account, then you'll be redirected to finish setup.");
        setLoading(false);
        return;
      } else {
        throw new Error('Signup failed; please try again.');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        logError("SignUp", error);
        // Show more detailed error in development
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Signup error details:", { error, errorMessage });
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
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      onBlur={(e) => validateField('name', e.target.value)}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="text" 
                      placeholder="name@company.com"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      onBlur={(e) => validateField('email', e.target.value)}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <PhoneInput 
                      id="phone"
                      value={formData.phone}
                      onChange={(value) => {
                        setFormData({ ...formData, phone: value });
                        validateField('phone', value);
                      }}
                    />
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      onBlur={(e) => validateField('password', e.target.value)}
                      className={errors.password || (passwordStrength && passwordStrength.score < 3) ? 'border-destructive' : ''}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be 10+ characters with uppercase, lowercase, numbers, and special characters. Use a unique password not found in data breaches.
                    </p>
                    {passwordStrength && formData.password && (
                      <div className={`flex items-start gap-2 text-sm ${
                        passwordStrength.score < 3 ? 'text-destructive' : 'text-green-600'
                      }`}>
                        {passwordStrength.score < 3 ? (
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium">Strength: {passwordStrength.feedback}</p>
                          {passwordStrength.warning && (
                            <p className="text-xs mt-0.5">{passwordStrength.warning}</p>
                          )}
                           {passwordStrength.score < 3 && (
                            <p className="text-xs mt-0.5">
                              ⚠️ Weak passwords are rejected. Use a unique password you've never used before. 
                              Try combining 3-4 random words with numbers and symbols (e.g., "BlueElephant$89Mountain!").
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
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
                      value={formData.primaryContactRole}
                      onChange={(e) => setFormData({ ...formData, primaryContactRole: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primaryContactEmail">Email</Label>
                    <Input 
                      id="primaryContactEmail" 
                      type="text"
                      autoComplete="email"
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
                      value={formData.adminRole}
                      onChange={(e) => setFormData({ ...formData, adminRole: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email</Label>
                    <Input 
                      id="adminEmail" 
                      type="text"
                      autoComplete="email"
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