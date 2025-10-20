import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BoardPaper {
  id: string;
  date: string;
  companyName: string;
  periodCovered: string;
  createdBy: string;
}

const BoardPapers = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [createPaperDialogOpen, setCreatePaperDialogOpen] = useState(false);
  const [boardPapers, setBoardPapers] = useState<BoardPaper[]>([]);
  const [newPaperData, setNewPaperData] = useState({
    date: new Date().toISOString().split('T')[0],
    companyName: "",
    periodCovered: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    linkedin: "",
    personalWebsite: "",
    bio: "",
  });
  const [consent, setConsent] = useState({
    privacy: false,
    terms: false,
  });

  const handleCreateBoardPaper = () => {
    if (!newPaperData.companyName || !newPaperData.periodCovered) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const newPaper: BoardPaper = {
      id: Date.now().toString(),
      date: new Date(newPaperData.date).toLocaleDateString(),
      companyName: newPaperData.companyName,
      periodCovered: newPaperData.periodCovered,
      createdBy: "Current User",
    };
    
    setBoardPapers([...boardPapers, newPaper]);
    setCreatePaperDialogOpen(false);
    setNewPaperData({
      date: new Date().toISOString().split('T')[0],
      companyName: "",
      periodCovered: "",
    });
    
    toast({
      title: "Board Paper Created",
      description: `Board paper for ${newPaperData.companyName} (${newPaperData.periodCovered}) has been created using your template.`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consent.privacy || !consent.terms) {
      toast({
        title: "Consent Required",
        description: "Please accept the privacy policy and terms to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("member-intake", {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "Profile Submitted Successfully",
        description: "We'll process your information and get back to you soon.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        linkedin: "",
        personalWebsite: "",
        bio: "",
      });
      setConsent({ privacy: false, terms: false });
    } catch (error) {
      console.error("Error submitting profile:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 pt-20 pb-4 max-w-7xl">
        <Tabs defaultValue="papers" className="w-full flex-1">
          <TabsList className="grid w-full grid-cols-5 mb-2 h-10">
            <TabsTrigger value="papers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Board Papers</TabsTrigger>
            <TabsTrigger value="minutes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Minutes</TabsTrigger>
            <TabsTrigger value="special" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Special Papers</TabsTrigger>
            <TabsTrigger value="exec" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Exec Reports</TabsTrigger>
            <TabsTrigger value="member-intake" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Member Intake</TabsTrigger>
          </TabsList>

          <TabsContent value="papers" className="space-y-4">
            <div className="bg-card rounded-lg border px-4 h-10 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Board Papers</h2>
              <Dialog open={createPaperDialogOpen} onOpenChange={setCreatePaperDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="accent" size="sm" className="shadow-lg hover:shadow-xl h-8">
                    Create New Board Paper
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Board Paper</DialogTitle>
                    <DialogDescription>
                      Enter the details for your new board paper. It will use your saved template structure.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newPaperData.date}
                        onChange={(e) => setNewPaperData({ ...newPaperData, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        placeholder="Enter company name"
                        value={newPaperData.companyName}
                        onChange={(e) => setNewPaperData({ ...newPaperData, companyName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="periodCovered">Period Covered</Label>
                      <Input
                        id="periodCovered"
                        placeholder="e.g., Q1 2024, January 2024"
                        value={newPaperData.periodCovered}
                        onChange={(e) => setNewPaperData({ ...newPaperData, periodCovered: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCreatePaperDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateBoardPaper}>
                      Create Board Paper
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {boardPapers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Board Paper Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {boardPapers.map((paper) => (
                      <div 
                        key={paper.id} 
                        className="p-4 border rounded-lg hover:border-primary hover:bg-accent/5 transition-all cursor-pointer group"
                      >
                        <div className="grid grid-cols-5 gap-4 items-center">
                          <div>
                            <Label className="text-xs text-muted-foreground">Date</Label>
                            <p className="text-sm font-medium mt-1">{paper.date}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Company Name</Label>
                            <p className="text-sm font-medium mt-1">{paper.companyName}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Period Covered</Label>
                            <p className="text-sm font-medium mt-1">{paper.periodCovered}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Created By</Label>
                            <p className="text-sm font-medium mt-1">{paper.createdBy}</p>
                          </div>
                          <div className="flex justify-end">
                            <Button size="sm" variant="outline" className="group-hover:bg-primary group-hover:text-white transition-colors">
                              Open Document
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="minutes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Minutes</CardTitle>
                <CardDescription>
                  Record and manage meeting minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Minutes management will appear here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="special" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Special Papers</CardTitle>
                <CardDescription>
                  One-off matters to be sent out and later added to board papers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Special papers list will appear here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exec" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Executive Reports</CardTitle>
                    <CardDescription className="text-base mt-1">
                      Select report type to view or create reports
                    </CardDescription>
                  </div>
                  <Button variant="accent" size="lg" className="shadow-lg hover:shadow-xl">Add New Report</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Button variant="outline" className="justify-start h-auto py-6 border-primary/30 hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all group">
                    <div className="text-left">
                      <div className="font-semibold text-lg group-hover:text-primary transition-colors">Chair Report</div>
                      <div className="text-xs text-muted-foreground mt-1">Board Chair updates</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start h-auto py-6 border-accent/30 hover:border-accent hover:bg-accent/5 hover:shadow-lg transition-all group">
                    <div className="text-left">
                      <div className="font-semibold text-lg group-hover:text-accent transition-colors">CEO Report</div>
                      <div className="text-xs text-muted-foreground mt-1">Chief Executive updates</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start h-auto py-6 border-primary/30 hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all group">
                    <div className="text-left">
                      <div className="font-semibold text-lg group-hover:text-primary transition-colors">CFO Report</div>
                      <div className="text-xs text-muted-foreground mt-1">Chief Financial Officer</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start h-auto py-6 border-accent/30 hover:border-accent hover:bg-accent/5 hover:shadow-lg transition-all group">
                    <div className="text-left">
                      <div className="font-semibold text-lg group-hover:text-accent transition-colors">OSH Report</div>
                      <div className="text-xs text-muted-foreground mt-1">Occupational Safety & Health</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start h-auto py-6 border-primary/30 hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all group">
                    <div className="text-left">
                      <div className="font-semibold text-lg group-hover:text-primary transition-colors">Finance Report</div>
                      <div className="text-xs text-muted-foreground mt-1">Financial performance</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start h-auto py-6 border-accent/30 hover:border-accent hover:bg-accent/5 hover:shadow-lg transition-all group">
                    <div className="text-left">
                      <div className="font-semibold text-lg group-hover:text-accent transition-colors">S&M Report</div>
                      <div className="text-xs text-muted-foreground mt-1">Sales & Marketing</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start h-auto py-6 border-primary/30 hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all group">
                    <div className="text-left">
                      <div className="font-semibold text-lg group-hover:text-primary transition-colors">HR Report</div>
                      <div className="text-xs text-muted-foreground mt-1">Human Resources</div>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start h-auto py-6 border-accent/30 hover:border-accent hover:bg-accent/5 hover:shadow-lg transition-all group">
                    <div className="text-left">
                      <div className="font-semibold text-lg group-hover:text-accent transition-colors">KPIs Report</div>
                      <div className="text-xs text-muted-foreground mt-1">Key Performance Indicators</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="member-intake" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Board Member Profile Intake</CardTitle>
                <CardDescription>
                  Submit your information to create your board member profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="your.email@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
                      <Input
                        id="linkedin"
                        type="url"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Personal Website URL</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.personalWebsite}
                        onChange={(e) => setFormData({ ...formData, personalWebsite: e.target.value })}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Professional Bio</Label>
                      <textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Brief professional background and expertise..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="privacy"
                        checked={consent.privacy}
                        onCheckedChange={(checked) => 
                          setConsent({ ...consent, privacy: checked as boolean })
                        }
                      />
                      <label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                        I consent to my information being scanned and processed to create my board member profile *
                      </label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="terms"
                        checked={consent.terms}
                        onCheckedChange={(checked) => 
                          setConsent({ ...consent, terms: checked as boolean })
                        }
                      />
                      <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                        I agree to the terms and conditions *
                      </label>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">What happens next?</h3>
                    <p className="text-sm text-muted-foreground">
                      After submission, our AI will scan your provided information and URLs to create a comprehensive board member profile. You'll receive confirmation once your profile is ready for review.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading || !consent.privacy || !consent.terms}
                      className="flex-1"
                    >
                      {isLoading ? "Submitting..." : "Submit Profile"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          name: "",
                          email: "",
                          linkedin: "",
                          personalWebsite: "",
                          bio: "",
                        });
                        setConsent({ privacy: false, terms: false });
                      }}
                    >
                      Clear Form
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default BoardPapers;
