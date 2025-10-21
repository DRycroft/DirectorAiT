import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Upload, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BoardPaper {
  id: string;
  date: string;
  companyName: string;
  periodCovered: string;
  createdBy: string;
}

interface ExecutiveReport {
  id: string;
  report_type: string;
  file_name: string;
  file_path: string;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_at: string;
  period_covered: string;
  status: string;
}

const BoardPapers = () => {
  const { toast } = useToast();
  const [createPaperDialogOpen, setCreatePaperDialogOpen] = useState(false);
  const [boardPapers, setBoardPapers] = useState<BoardPaper[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [selectedReportType, setSelectedReportType] = useState<string | null>(null);
  const [executiveReports, setExecutiveReports] = useState<ExecutiveReport[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPeriod, setUploadPeriod] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [filterPerson, setFilterPerson] = useState<string>("all");
  const [isUploading, setIsUploading] = useState(false);
  const [newPaperData, setNewPaperData] = useState({
    date: new Date().toISOString().split('T')[0],
    companyName: "",
    periodCovered: "",
  });

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  useEffect(() => {
    if (selectedReportType) {
      fetchExecutiveReports();
    }
  }, [selectedReportType]);

  const fetchOrganizationData = async () => {
    try {
      // Get the current user's profile to find their org_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!profile?.org_id) return;

      // Fetch organization details
      const { data: org, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.org_id)
        .single();

      if (error) {
        console.error('Error fetching organization:', error);
        return;
      }

      setOrganization(org);
      
      // Auto-populate company name
      setNewPaperData(prev => ({
        ...prev,
        companyName: org.name || "",
        periodCovered: getCurrentPeriod(org.reporting_frequency)
      }));
    } catch (error) {
      console.error('Error in fetchOrganizationData:', error);
    }
  };

  const getCurrentPeriod = (frequency: string | null) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    if (frequency === 'quarterly') {
      const quarter = Math.floor(month / 3) + 1;
      return `Q${quarter} ${year}`;
    } else if (frequency === 'monthly') {
      return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (frequency === 'annually') {
      return `FY ${year}`;
    }
    
    return `Q${Math.floor(month / 3) + 1} ${year}`; // Default to quarterly
  };

  // Update dialog data when organization changes or dialog opens
  useEffect(() => {
    if (createPaperDialogOpen && organization) {
      setNewPaperData(prev => ({
        ...prev,
        companyName: organization.name || "",
        periodCovered: getCurrentPeriod(organization.reporting_frequency)
      }));
    }
  }, [createPaperDialogOpen, organization]);

  const handleCreateBoardPaper = async () => {
    if (!newPaperData.companyName || !newPaperData.periodCovered) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch the saved Board Paper template
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('name', 'Board Papers')
        .eq('scope', 'personal')
        .single();

      if (templateError && templateError.code !== 'PGRST116') {
        console.error('Error fetching template:', templateError);
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
        description: template 
          ? `Board paper created using your saved template with ${(template.sections as any[])?.length || 0} sections.`
          : `Board paper created for ${newPaperData.companyName} (${newPaperData.periodCovered}).`,
      });
    } catch (error) {
      console.error('Error creating board paper:', error);
      toast({
        title: "Error",
        description: "Failed to create board paper. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchExecutiveReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!profile?.org_id) return;

      const { data, error } = await supabase
        .from('executive_reports')
        .select('*')
        .eq('org_id', profile.org_id)
        .eq('report_type', selectedReportType)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching reports:', error);
        return;
      }

      setExecutiveReports(data || []);
    } catch (error) {
      console.error('Error in fetchExecutiveReports:', error);
    }
  };

  const handleUploadReport = async () => {
    if (!uploadFile || !uploadPeriod || !selectedReportType) {
      toast({
        title: "Missing Information",
        description: "Please select a file and enter the period covered.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, name')
        .eq('id', user.id)
        .single();

      if (!profile?.org_id) throw new Error("No organization found");

      // Upload file to storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('executive-reports')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('executive_reports')
        .insert({
          report_type: selectedReportType,
          file_name: uploadFile.name,
          file_path: filePath,
          uploaded_by: user.id,
          uploaded_by_name: profile.name,
          period_covered: uploadPeriod,
          org_id: profile.org_id,
          status: 'pending'
        });

      if (dbError) throw dbError;

      toast({
        title: "Report Uploaded",
        description: `${selectedReportType} has been uploaded successfully.`,
      });

      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadPeriod("");
      fetchExecutiveReports();
    } catch (error) {
      console.error('Error uploading report:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadReport = async (report: ExecutiveReport) => {
    try {
      const { data, error } = await supabase.storage
        .from('executive-reports')
        .download(report.file_path);

      if (error) throw error;

      // Create a download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: `Downloading ${report.file_name}`,
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get unique periods and people for filters
  const uniquePeriods = Array.from(new Set(executiveReports.map(r => r.period_covered)));
  const uniquePeople = Array.from(new Set(executiveReports.map(r => r.uploaded_by_name)));

  // Filter reports based on selected filters
  const filteredReports = executiveReports.filter(report => {
    const periodMatch = filterPeriod === "all" || report.period_covered === filterPeriod;
    const personMatch = filterPerson === "all" || report.uploaded_by_name === filterPerson;
    return periodMatch && personMatch;
  });
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-4 max-w-7xl">
        <Tabs defaultValue="papers" className="w-full">
          <div className="mb-2 flex items-center justify-between gap-4">
            <TabsList className="grid w-full grid-cols-4 h-10 flex-1">
              <TabsTrigger value="papers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Board Papers</TabsTrigger>
              <TabsTrigger value="exec" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Exec Reports</TabsTrigger>
              <TabsTrigger value="minutes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Minutes</TabsTrigger>
              <TabsTrigger value="special" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Special Papers</TabsTrigger>
            </TabsList>
            <Dialog open={createPaperDialogOpen} onOpenChange={setCreatePaperDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="accent" className="shadow-lg hover:shadow-xl whitespace-nowrap h-10 -mt-1">
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

          <TabsContent value="papers" className="space-y-4">
            {boardPapers.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-4 px-4 text-sm font-medium text-muted-foreground">
                  <div>Date</div>
                  <div>Company Name</div>
                  <div>Period</div>
                  <div>Created By</div>
                  <div></div>
                </div>
                {boardPapers.map((paper) => (
                  <div 
                    key={paper.id} 
                    className="px-4 py-1 border rounded-lg hover:border-primary transition-all cursor-pointer group bg-slate-50"
                  >
                    <div className="grid grid-cols-5 gap-4 items-center">
                      <div>
                        <p className="text-sm font-medium text-black">{paper.date}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">{paper.companyName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">{paper.periodCovered}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">{paper.createdBy}</p>
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-white bg-black border-black hover:bg-primary hover:text-white hover:border-primary transition-colors h-7 py-0.5"
                          onClick={() => window.location.href = `/board-papers/${paper.id}`}
                        >
                          Open Document
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
            {!selectedReportType ? (
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
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-6 border-primary/30 hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all group"
                      onClick={() => setSelectedReportType("Chair Report")}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-lg group-hover:text-primary transition-colors">Chair Report</div>
                        <div className="text-xs text-muted-foreground mt-1">Board Chair updates</div>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-6 border-accent/30 hover:border-accent hover:bg-accent/5 hover:shadow-lg transition-all group"
                      onClick={() => setSelectedReportType("CEO Report")}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-lg group-hover:text-accent transition-colors">CEO Report</div>
                        <div className="text-xs text-muted-foreground mt-1">Chief Executive updates</div>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-6 border-primary/30 hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all group"
                      onClick={() => setSelectedReportType("CFO Report")}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-lg group-hover:text-primary transition-colors">CFO Report</div>
                        <div className="text-xs text-muted-foreground mt-1">Chief Financial Officer</div>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-6 border-accent/30 hover:border-accent hover:bg-accent/5 hover:shadow-lg transition-all group"
                      onClick={() => setSelectedReportType("OSH Report")}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-lg group-hover:text-accent transition-colors">OSH Report</div>
                        <div className="text-xs text-muted-foreground mt-1">Occupational Safety & Health</div>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-6 border-primary/30 hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all group"
                      onClick={() => setSelectedReportType("Finance Report")}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-lg group-hover:text-primary transition-colors">Finance Report</div>
                        <div className="text-xs text-muted-foreground mt-1">Financial performance</div>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-6 border-accent/30 hover:border-accent hover:bg-accent/5 hover:shadow-lg transition-all group"
                      onClick={() => setSelectedReportType("S&M Report")}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-lg group-hover:text-accent transition-colors">S&M Report</div>
                        <div className="text-xs text-muted-foreground mt-1">Sales & Marketing</div>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-6 border-primary/30 hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all group"
                      onClick={() => setSelectedReportType("HR Report")}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-lg group-hover:text-primary transition-colors">HR Report</div>
                        <div className="text-xs text-muted-foreground mt-1">Human Resources</div>
                      </div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-6 border-accent/30 hover:border-accent hover:bg-accent/5 hover:shadow-lg transition-all group"
                      onClick={() => setSelectedReportType("KPIs Report")}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-lg group-hover:text-accent transition-colors">KPIs Report</div>
                        <div className="text-xs text-muted-foreground mt-1">Key Performance Indicators</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">{selectedReportType}</CardTitle>
                      <CardDescription className="text-base mt-1">
                        Repository of uploaded {selectedReportType.toLowerCase()}s
                      </CardDescription>
                    </div>
                     <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setSelectedReportType(null)}>
                        Back to Reports
                      </Button>
                      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="accent" size="lg" className="shadow-lg hover:shadow-xl">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload New Report
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload {selectedReportType}</DialogTitle>
                            <DialogDescription>
                              Select a file and enter the period covered for this report.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="file">Report File</Label>
                              <Input
                                id="file"
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx"
                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="period">Period Covered</Label>
                              <Input
                                id="period"
                                placeholder="e.g., Q1 2024, March 2024"
                                value={uploadPeriod}
                                onChange={(e) => setUploadPeriod(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleUploadReport} disabled={isUploading}>
                              {isUploading ? "Uploading..." : "Upload Report"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-lg border">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Filter by Period</Label>
                          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="All periods" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All periods</SelectItem>
                              {uniquePeriods.map(period => (
                                <SelectItem key={period} value={period}>{period}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Filter by Person</Label>
                          <Select value={filterPerson} onValueChange={setFilterPerson}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="All people" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All people</SelectItem>
                              {uniquePeople.map(person => (
                                <SelectItem key={person} value={person}>{person}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Reports list */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-5 gap-4 px-4 text-sm font-medium text-muted-foreground">
                        <div>Date Uploaded</div>
                        <div>Uploaded By</div>
                        <div>Period Covered</div>
                        <div>File Name</div>
                        <div></div>
                      </div>
                      {filteredReports.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No reports found. Upload your first report to get started.
                        </div>
                      ) : (
                        filteredReports.map((report) => (
                          <div 
                            key={report.id}
                            className="px-4 py-2 border rounded-lg hover:border-primary transition-all group bg-slate-50"
                          >
                            <div className="grid grid-cols-5 gap-4 items-center">
                              <div>
                                <p className="text-sm font-medium text-black">
                                  {new Date(report.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-black">{report.uploaded_by_name}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-black">{report.period_covered}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-black truncate">{report.file_name}</p>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 py-0.5"
                                  onClick={() => handleDownloadReport(report)}
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default BoardPapers;
