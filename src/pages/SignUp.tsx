import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, RefreshCw, Copy, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { getUserFriendlyError, logError } from "@/lib/errorHandling";
import zxcvbn from "zxcvbn";

const signUpSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  
  email: z.string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  
  phone: z.string()
    .optional()
    .refine(
      (val) => !val || /^\+?[1-9]\d{1,14}$/.test(val.replace(/\s/g, '')),
      "Please enter a valid phone number"
    ),

  password: z.string()
    .min(10, "Password must be at least 10 characters")
    .max(128, "Password must be less than 128 characters")
    .refine(
      (password) => /[A-Z]/.test(password),
      "Password must contain at least one uppercase letter"
    )
    .refine(
      (password) => /[a-z]/.test(password),
      "Password must contain at least one lowercase letter"
    )
    .refine(
      (password) => /[0-9]/.test(password),
      "Password must contain at least one number"
    )
    .refine(
      (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
      "Password must contain at least one special character"
    )
    .refine(
      (password) => !/(.)\1{2,}/.test(password),
      "Password cannot contain repeated characters"
    )
    .refine(
      (password) => !/^(password|12345678|qwerty)/i.test(password),
      "Password is too common"
    ),
  
  companyName: z.string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name must be less than 200 characters"),
  
  userRole: z.string()
    .min(2, "Your role in the company is required")
    .max(100, "Role must be less than 100 characters"),
});

const SignUp = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string;
    warning: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    companyName: "",
    userRole: "",
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

const handleSignUp = async (e: React.FormEvent) => {
  console.count("[SIGNUP] handleSignUp invoked");
  e.preventDefault();
  setLoading(true);

  try {
    console.log("🔄 Starting signup process...");
    const validatedData = signUpSchema.parse(formData);
    console.log("✅ Form validation passed");

    // Store signup data for bootstrap (15-minute expiry)
    const pendingData = {
      companyName: validatedData.companyName,
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone || null,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    };
    sessionStorage.setItem("pendingSignUpV1", JSON.stringify(pendingData));

    console.log("🔐 Creating user account...");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          name: validatedData.name,
        },
      },
    });

    // ❗ ALWAYS handle error first
    if (authError) {
      console.error("❌ Auth error:", authError);

      if (
        authError.message?.toLowerCase().includes("already registered") ||
        authError.message?.toLowerCase().includes("user already exists")
      ) {
        toast.error("This email is already registered! Please log in instead.", {
          duration: 8000,
          action: {
            label: "Go to Login",
            onClick: () => navigate("/auth"),
          },
        });
      } else {
        toast.error(getUserFriendlyError(authError));
      }

      throw authError;
    }

    // ✅ Success path
    if (authData?.user) {
      console.log("✅ Signup successful:", authData.user.id);

      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        companyName: "",
        userRole: "",
      });

      toast.success("Account created. Please log in.");
      navigate("/auth");
      return;
    }

    throw new Error("Signup failed with no error and no user.");
  } catch (error) {
    if (error instanceof z.ZodError) {
      const newErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(newErrors);
      toast.error(error.errors[0].message);
    } else {
      logError("SignUp", error);
      toast.error(getUserFriendlyError(error));
    }
  } finally {
    setLoading(false);
  }
};


  const getPasswordStrengthColor = () => {
    if (!passwordStrength) return "";
    const colors = [
      "bg-destructive",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-blue-500",
      "bg-green-500"
    ];
    return colors[passwordStrength.score];
  };
  const generateStrongPassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    const password = Array.from(array, byte => charset[byte % charset.length]).join('');
    
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true);
    toast.success("Strong password generated");
  };

  const copyPasswordToClipboard = async () => {
    if (formData.password) {
      await navigator.clipboard.writeText(formData.password);
      setCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
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
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              Enter your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Your Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    type="text"
                    placeholder="John Smith"
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
                    type="email" 
                    placeholder="john@example.com"
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
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    onBlur={(e) => validateField('phone', e.target.value)}
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter a strong password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        onBlur={(e) => validateField('password', e.target.value)}
                        className={errors.password ? 'border-destructive' : ''}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generateStrongPassword}
                      disabled={loading}
                      title="Generate strong password"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    {formData.password && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={copyPasswordToClipboard}
                        disabled={loading}
                        title="Copy password"
                      >
                        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                  {passwordStrength && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded ${
                              level <= passwordStrength.score
                                ? getPasswordStrengthColor()
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Strength: {passwordStrength.feedback}
                        {passwordStrength.warning && ` - ${passwordStrength.warning}`}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must be 10+ characters with uppercase, lowercase, numbers, and special characters
                  </p>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Company Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    type="text"
                    placeholder="Acme Corporation"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    onBlur={(e) => validateField('companyName', e.target.value)}
                    className={errors.companyName ? 'border-destructive' : ''}
                  />
                  {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userRole">Your Role in Company</Label>
                  <Input 
                    id="userRole" 
                    type="text"
                    placeholder="CEO, Director, Manager, etc."
                    value={formData.userRole}
                    onChange={(e) => setFormData({ ...formData, userRole: e.target.value })}
                    onBlur={(e) => validateField('userRole', e.target.value)}
                    className={errors.userRole ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Additional company details can be configured later in the app
                  </p>
                  {errors.userRole && <p className="text-sm text-destructive">{errors.userRole}</p>}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/auth" className="text-primary hover:underline font-medium">
                  Log in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
