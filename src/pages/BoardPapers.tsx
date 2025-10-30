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
import { Download, Upload, Filter, CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { BoardPaper } from "@/types/database";

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

interface MeetingMinute {
  id: string;
  meeting_date: string;
  meeting_type: string;
  file_name: string;
  file_path: string;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_at: string;
  status: string;
}

interface SpecialPaper {
  id: string;
  title: string;
  category: string;
  file_name: string;
  file_path: string;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_at: string;
  deadline: string | null;
  status: string;
  description: string | null;
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
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinute[]>([]);
  const [specialPapers, setSpecialPapers] = useState<SpecialPaper[]>([]);
  const [minutesUploadOpen, setMinutesUploadOpen] = useState(false);
  const [specialPaperUploadOpen, setSpecialPaperUploadOpen] = useState(false);
  const [minutesFile, setMinutesFile] = useState<File | null>(null);
  const [minutesMeetingDate, setMinutesMeetingDate] = useState("");
  const [minutesMeetingType, setMinutesMeetingType] = useState("Regular Board Meeting");
  const [specialPaperFile, setSpecialPaperFile] = useState<File | null>(null);
  const [specialPaperTitle, setSpecialPaperTitle] = useState("");
  const [specialPaperCategory, setSpecialPaperCategory] = useState("");
  const [specialPaperDescription, setSpecialPaperDescription] = useState("");
  const [specialPaperDeadline, setSpecialPaperDeadline] = useState("");
  const getMonthEnd = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  };

  const [selectedDate, setSelectedDate] = useState<Date>(getMonthEnd());
  const [selectedFrequency, setSelectedFrequency] = useState<'monthly' | 'bi-monthly' | 'quarterly'>('quarterly');
  const [newPaperData, setNewPaperData] = useState({
    companyName: "",
  });

  useEffect(() => {
    fetchOrganizationData();
    fetchBoardPapers();
    fetchMeetingMinutes();
    fetchSpecialPapers();
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
        companyName: org.name || ""
      }));
    } catch (error) {
      console.error('Error in fetchOrganizationData:', error);
    }
  };

  const getPeriodFromDate = (date: Date, frequency: 'monthly' | 'bi-monthly' | 'quarterly') => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    if (frequency === 'quarterly') {
      const quarter = Math.floor(month / 3) + 1;
      return `Q${quarter} ${year}`;
    } else if (frequency === 'monthly') {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (frequency === 'bi-monthly') {
      const period = Math.floor(month / 2) + 1;
      return `Period ${period} ${year}`;
    }
    
    return `Q${Math.floor(month / 3) + 1} ${year}`;
  };

  // Update dialog data when organization changes or dialog opens
  useEffect(() => {
    if (createPaperDialogOpen && organization) {
      setNewPaperData(prev => ({
        ...prev,
        companyName: organization.name || ""
      }));
      // Set frequency based on org settings
      if (organization.reporting_frequency === 'monthly') {
        setSelectedFrequency('monthly');
      } else if (organization.reporting_frequency === 'quarterly') {
        setSelectedFrequency('quarterly');
      }
    }
  }, [createPaperDialogOpen, organization]);

  const fetchBoardPapers = async () => {
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
        .from('board_papers')
        .select(`
          *,
          creator:profiles!board_papers_created_by_fkey(name)
        `)
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching board papers:', error);
        return;
      }

      setBoardPapers(data || []);
    } catch (error) {
      console.error('Error in fetchBoardPapers:', error);
    }
  };

  const handleCreateBoardPaper = async () => {
    if (!newPaperData.companyName || !selectedDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const periodCovered = getPeriodFromDate(selectedDate, selectedFrequency);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!profile?.org_id) throw new Error("No organization found");

      // Fetch the saved Board Paper template
      const { data: template } = await supabase
        .from('board_paper_templates')
        .select('*')
        .eq('org_id', profile.org_id)
        .eq('is_default', true)
        .maybeSingle();

      // Save to database
      const { error: insertError } = await supabase
        .from('board_papers')
        .insert({
          org_id: profile.org_id,
          created_by: user.id,
          company_name: newPaperData.companyName,
          period_covered: periodCovered,
          period_end_date: selectedDate.toISOString().split('T')[0],
          template_id: template?.id || null,
          status: 'draft'
        });

      if (insertError) throw insertError;
      
      setCreatePaperDialogOpen(false);
      setSelectedDate(getMonthEnd());
      setSelectedFrequency('quarterly');
      setNewPaperData({
        companyName: "",
      });
      
      // Refresh the list
      fetchBoardPapers();
      
      toast({
        title: "Board Paper Created",
        description: template 
          ? `Board paper created using your saved template with ${(template.sections as any[])?.length || 0} sections.`
          : `Board paper created for ${newPaperData.companyName} (${periodCovered}).`,
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

  const fetchMeetingMinutes = async () => {
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
        .from('meeting_minutes')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('meeting_date', { ascending: false });

      if (error) {
        console.error('Error fetching minutes:', error);
        return;
      }

      setMeetingMinutes(data || []);
    } catch (error) {
      console.error('Error in fetchMeetingMinutes:', error);
    }
  };

  const fetchSpecialPapers = async () => {
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
        .from('special_papers')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching special papers:', error);
        return;
      }

      setSpecialPapers(data || []);
    } catch (error) {
      console.error('Error in fetchSpecialPapers:', error);
    }
  };

  const handleUploadMinutes = async () => {
    if (!minutesFile || !minutesMeetingDate) {
      toast({
        title: "Missing Information",
        description: "Please select a file and meeting date.",
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

      const fileExt = minutesFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('meeting-minutes')
        .upload(filePath, minutesFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('meeting_minutes')
        .insert({
          meeting_date: minutesMeetingDate,
          meeting_type: minutesMeetingType,
          file_name: minutesFile.name,
          file_path: filePath,
          uploaded_by: user.id,
          uploaded_by_name: profile.name,
          org_id: profile.org_id,
          status: 'draft'
        });

      if (dbError) throw dbError;

      toast({
        title: "Minutes Uploaded",
        description: "Meeting minutes uploaded successfully.",
      });

      setMinutesUploadOpen(false);
      setMinutesFile(null);
      setMinutesMeetingDate("");
      setMinutesMeetingType("Regular Board Meeting");
      fetchMeetingMinutes();
    } catch (error) {
      console.error('Error uploading minutes:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload minutes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadSpecialPaper = async () => {
    if (!specialPaperFile || !specialPaperTitle || !specialPaperCategory) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
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

      const fileExt = specialPaperFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('special-papers')
        .upload(filePath, specialPaperFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('special_papers')
        .insert({
          title: specialPaperTitle,
          category: specialPaperCategory,
          file_name: specialPaperFile.name,
          file_path: filePath,
          uploaded_by: user.id,
          uploaded_by_name: profile.name,
          org_id: profile.org_id,
          description: specialPaperDescription || null,
          deadline: specialPaperDeadline || null,
          status: 'pending'
        });

      if (dbError) throw dbError;

      toast({
        title: "Special Paper Uploaded",
        description: "Special paper uploaded successfully.",
      });

      setSpecialPaperUploadOpen(false);
      setSpecialPaperFile(null);
      setSpecialPaperTitle("");
      setSpecialPaperCategory("");
      setSpecialPaperDescription("");
      setSpecialPaperDeadline("");
      fetchSpecialPapers();
    } catch (error) {
      console.error('Error uploading special paper:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload special paper. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadMinutes = async (minute: MeetingMinute) => {
    try {
      const { data, error } = await supabase.storage
        .from('meeting-minutes')
        .download(minute.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = minute.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: `Downloading ${minute.file_name}`,
      });
    } catch (error) {
      console.error('Error downloading minutes:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download minutes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadSpecialPaper = async (paper: SpecialPaper) => {
    try {
      const { data, error } = await supabase.storage
        .from('special-papers')
        .download(paper.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = paper.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Started",
        description: `Downloading ${paper.file_name}`,
      });
    } catch (error) {
      console.error('Error downloading special paper:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download special paper. Please try again.",
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
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
                    <Label htmlFor="frequency">Reporting Frequency</Label>
                    <Select value={selectedFrequency} onValueChange={(value: any) => setSelectedFrequency(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="bi-monthly">Bi-Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Period Covered (Auto-generated)</Label>
                    <div className="px-3 py-2 border rounded-md bg-muted text-sm">
                      {getPeriodFromDate(selectedDate, selectedFrequency)}
                    </div>
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
                <div className="grid grid-cols-6 gap-4 px-4 text-sm font-medium text-muted-foreground">
                  <div>Period End</div>
                  <div>Company Name</div>
                  <div>Period</div>
                  <div>Created By</div>
                  <div>Status</div>
                  <div></div>
                </div>
                {boardPapers.map((paper) => (
                  <div 
                    key={paper.id} 
                    className="px-4 py-1 border rounded-lg hover:border-primary transition-all cursor-pointer group bg-slate-50"
                  >
                    <div className="grid grid-cols-6 gap-4 items-center">
                      <div>
                        <p className="text-sm font-medium text-black">
                          {paper.period_end_date ? new Date(paper.period_end_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">{paper.company_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">{paper.period_covered}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">{(paper as any).creator?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">{paper.status}</p>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Meeting Minutes</CardTitle>
                    <CardDescription className="text-base mt-1">
                      Record and manage meeting minutes
                    </CardDescription>
                  </div>
                  <Dialog open={minutesUploadOpen} onOpenChange={setMinutesUploadOpen}>
                    <DialogTrigger asChild>
                      <Button variant="accent" size="lg" className="shadow-lg hover:shadow-xl">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Minutes
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Meeting Minutes</DialogTitle>
                        <DialogDescription>
                          Upload the minutes from a board meeting.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="minutes-file">Minutes File</Label>
                          <Input
                            id="minutes-file"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => setMinutesFile(e.target.files?.[0] || null)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="meeting-date">Meeting Date</Label>
                          <Input
                            id="meeting-date"
                            type="date"
                            value={minutesMeetingDate}
                            onChange={(e) => setMinutesMeetingDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="meeting-type">Meeting Type</Label>
                          <Select value={minutesMeetingType} onValueChange={setMinutesMeetingType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Regular Board Meeting">Regular Board Meeting</SelectItem>
                              <SelectItem value="Special Meeting">Special Meeting</SelectItem>
                              <SelectItem value="Annual General Meeting">Annual General Meeting</SelectItem>
                              <SelectItem value="Emergency Meeting">Emergency Meeting</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setMinutesUploadOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleUploadMinutes} disabled={isUploading}>
                          {isUploading ? "Uploading..." : "Upload Minutes"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-4 px-4 text-sm font-medium text-muted-foreground">
                    <div>Meeting Date</div>
                    <div>Meeting Type</div>
                    <div>Uploaded By</div>
                    <div>Status</div>
                    <div></div>
                  </div>
                  {meetingMinutes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No minutes uploaded yet. Upload your first meeting minutes to get started.
                    </div>
                  ) : (
                    meetingMinutes.map((minute) => (
                      <div 
                        key={minute.id}
                        className="px-4 py-2 border rounded-lg hover:border-primary transition-all group bg-slate-50"
                      >
                        <div className="grid grid-cols-5 gap-4 items-center">
                          <div>
                            <p className="text-sm font-medium text-black">
                              {new Date(minute.meeting_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-black">{minute.meeting_type}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-black">{minute.uploaded_by_name}</p>
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              minute.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {minute.status}
                            </span>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 py-0.5"
                              onClick={() => handleDownloadMinutes(minute)}
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="special" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Special Papers</CardTitle>
                    <CardDescription className="text-base mt-1">
                      One-off matters to be sent out and later added to board papers
                    </CardDescription>
                  </div>
                  <Dialog open={specialPaperUploadOpen} onOpenChange={setSpecialPaperUploadOpen}>
                    <DialogTrigger asChild>
                      <Button variant="accent" size="lg" className="shadow-lg hover:shadow-xl">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Special Paper
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Special Paper</DialogTitle>
                        <DialogDescription>
                          Upload a one-off matter or special paper for board consideration.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="special-title">Title *</Label>
                          <Input
                            id="special-title"
                            placeholder="e.g., Capital Investment Proposal"
                            value={specialPaperTitle}
                            onChange={(e) => setSpecialPaperTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="special-category">Category *</Label>
                          <Select value={specialPaperCategory} onValueChange={setSpecialPaperCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Strategic">Strategic</SelectItem>
                              <SelectItem value="Financial">Financial</SelectItem>
                              <SelectItem value="Governance">Governance</SelectItem>
                              <SelectItem value="Risk">Risk</SelectItem>
                              <SelectItem value="Compliance">Compliance</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="special-description">Description</Label>
                          <Input
                            id="special-description"
                            placeholder="Brief description"
                            value={specialPaperDescription}
                            onChange={(e) => setSpecialPaperDescription(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="special-deadline">Deadline (Optional)</Label>
                          <Input
                            id="special-deadline"
                            type="date"
                            value={specialPaperDeadline}
                            onChange={(e) => setSpecialPaperDeadline(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="special-file">Document File *</Label>
                          <Input
                            id="special-file"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => setSpecialPaperFile(e.target.files?.[0] || null)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setSpecialPaperUploadOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleUploadSpecialPaper} disabled={isUploading}>
                          {isUploading ? "Uploading..." : "Upload Paper"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-6 gap-4 px-4 text-sm font-medium text-muted-foreground">
                    <div>Title</div>
                    <div>Category</div>
                    <div>Uploaded By</div>
                    <div>Deadline</div>
                    <div>Status</div>
                    <div></div>
                  </div>
                  {specialPapers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No special papers yet. Upload your first special paper to get started.
                    </div>
                  ) : (
                    specialPapers.map((paper) => (
                      <div 
                        key={paper.id}
                        className="px-4 py-2 border rounded-lg hover:border-primary transition-all group bg-slate-50"
                      >
                        <div className="grid grid-cols-6 gap-4 items-center">
                          <div>
                            <p className="text-sm font-medium text-black">{paper.title}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-black">{paper.category}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-black">{paper.uploaded_by_name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-black">
                              {paper.deadline ? new Date(paper.deadline).toLocaleDateString() : 'None'}
                            </p>
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              paper.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {paper.status}
                            </span>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 py-0.5"
                              onClick={() => handleDownloadSpecialPaper(paper)}
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
