/**
 * DocumentUploads Component
 * 
 * Upload and list executive reports, meeting minutes, and special papers.
 * Previously only accessible from the legacy BoardPapers page.
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/errorHandling';

interface ExecutiveReport {
  id: string;
  report_type: string;
  file_name: string;
  file_path: string;
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
  uploaded_by_name: string;
  uploaded_at: string;
  status: string;
  description: string | null;
}

const REPORT_TYPES = [
  "CEO Report", "CFO Report", "Operations Report", "Sales Report",
  "HR Report", "HSE Report", "ESG Report", "Chair's Report",
];

const MEETING_TYPES = [
  "Regular Board Meeting", "Special Board Meeting", "AGM",
  "Committee Meeting", "Workshop",
];

const SPECIAL_CATEGORIES = [
  "Strategy", "Risk", "Legal", "Regulatory", "Policy", "Other",
];

export function DocumentUploads() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  // Executive reports state
  const [execReports, setExecReports] = useState<ExecutiveReport[]>([]);
  const [execDialogOpen, setExecDialogOpen] = useState(false);
  const [execFile, setExecFile] = useState<File | null>(null);
  const [execType, setExecType] = useState('');
  const [execPeriod, setExecPeriod] = useState('');

  // Meeting minutes state
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [minutesDialogOpen, setMinutesDialogOpen] = useState(false);
  const [minutesFile, setMinutesFile] = useState<File | null>(null);
  const [minutesDate, setMinutesDate] = useState('');
  const [minutesType, setMinutesType] = useState('Regular Board Meeting');

  // Special papers state
  const [specialPapers, setSpecialPapers] = useState<SpecialPaper[]>([]);
  const [specialDialogOpen, setSpecialDialogOpen] = useState(false);
  const [specialFile, setSpecialFile] = useState<File | null>(null);
  const [specialTitle, setSpecialTitle] = useState('');
  const [specialCategory, setSpecialCategory] = useState('');
  const [specialDescription, setSpecialDescription] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const getOrgProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, name')
      .eq('id', user.id)
      .single();
    if (!profile?.org_id) throw new Error("No organization found");
    return { user, profile };
  };

  const fetchAll = async () => {
    try {
      const { profile } = await getOrgProfile();
      const orgId = profile.org_id!;

      const [execRes, minRes, specRes] = await Promise.all([
        supabase.from('executive_reports').select('*').eq('org_id', orgId).order('uploaded_at', { ascending: false }).limit(20),
        supabase.from('meeting_minutes').select('*').eq('org_id', orgId).order('meeting_date', { ascending: false }).limit(20),
        supabase.from('special_papers').select('*').eq('org_id', orgId).order('uploaded_at', { ascending: false }).limit(20),
      ]);

      if (execRes.data) setExecReports(execRes.data as ExecutiveReport[]);
      if (minRes.data) setMinutes(minRes.data as MeetingMinute[]);
      if (specRes.data) setSpecialPapers(specRes.data as SpecialPaper[]);
    } catch (error) {
      logError('fetchDocuments', error);
    }
  };

  const uploadFile = async (bucket: string, file: File, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) throw error;
    return filePath;
  };

  const handleDownload = async (bucket: string, filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logError('download', error);
      toast({ title: "Download Failed", variant: "destructive" });
    }
  };

  const handleUploadExecReport = async () => {
    if (!execFile || !execType || !execPeriod) {
      toast({ title: "Missing Information", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const { user, profile } = await getOrgProfile();
      const filePath = await uploadFile('executive-reports', execFile, user.id);
      const { error } = await supabase.from('executive_reports').insert({
        report_type: execType,
        file_name: execFile.name,
        file_path: filePath,
        uploaded_by: user.id,
        uploaded_by_name: profile.name,
        period_covered: execPeriod,
        org_id: profile.org_id!,
        status: 'pending',
      });
      if (error) throw error;
      toast({ title: "Report Uploaded" });
      setExecDialogOpen(false);
      setExecFile(null);
      setExecType('');
      setExecPeriod('');
      fetchAll();
    } catch (error) {
      logError('uploadExecReport', error);
      toast({ title: "Upload Failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadMinutes = async () => {
    if (!minutesFile || !minutesDate) {
      toast({ title: "Missing Information", description: "Please select a file and meeting date.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const { user, profile } = await getOrgProfile();
      const filePath = await uploadFile('meeting-minutes', minutesFile, user.id);
      const { error } = await supabase.from('meeting_minutes').insert({
        meeting_date: minutesDate,
        meeting_type: minutesType,
        file_name: minutesFile.name,
        file_path: filePath,
        uploaded_by: user.id,
        uploaded_by_name: profile.name,
        org_id: profile.org_id!,
        status: 'draft',
      });
      if (error) throw error;
      toast({ title: "Minutes Uploaded" });
      setMinutesDialogOpen(false);
      setMinutesFile(null);
      setMinutesDate('');
      setMinutesType('Regular Board Meeting');
      fetchAll();
    } catch (error) {
      logError('uploadMinutes', error);
      toast({ title: "Upload Failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadSpecialPaper = async () => {
    if (!specialFile || !specialTitle || !specialCategory) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const { user, profile } = await getOrgProfile();
      const filePath = await uploadFile('special-papers', specialFile, user.id);
      const { error } = await supabase.from('special_papers').insert({
        title: specialTitle,
        category: specialCategory,
        file_name: specialFile.name,
        file_path: filePath,
        uploaded_by: user.id,
        uploaded_by_name: profile.name,
        org_id: profile.org_id!,
        description: specialDescription || null,
        status: 'pending',
      });
      if (error) throw error;
      toast({ title: "Special Paper Uploaded" });
      setSpecialDialogOpen(false);
      setSpecialFile(null);
      setSpecialTitle('');
      setSpecialCategory('');
      setSpecialDescription('');
      fetchAll();
    } catch (error) {
      logError('uploadSpecialPaper', error);
      toast({ title: "Upload Failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'approved' || status === 'final') return <CheckCircle2 className="h-4 w-4 text-success" />;
    return <Clock className="h-4 w-4 text-warning" />;
  };

  const DocumentRow = ({ name, date, status, onDownload }: { name: string; date: string; status: string; onDownload: () => void }) => (
    <div className="flex items-center justify-between py-2 px-3 rounded hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <StatusIcon status={status} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{new Date(date).toLocaleDateString()}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onDownload}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-1">Supporting Documents</h2>
        <p className="text-muted-foreground">Upload executive reports, meeting minutes, and special papers</p>
      </div>

      <Tabs defaultValue="exec-reports">
        <TabsList className="mb-4">
          <TabsTrigger value="exec-reports">Executive Reports</TabsTrigger>
          <TabsTrigger value="minutes">Meeting Minutes</TabsTrigger>
          <TabsTrigger value="special">Special Papers</TabsTrigger>
        </TabsList>

        {/* Executive Reports Tab */}
        <TabsContent value="exec-reports">
          <div className="flex justify-end mb-4">
            <Dialog open={execDialogOpen} onOpenChange={setExecDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Upload className="h-4 w-4 mr-2" />Upload Report</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Upload Executive Report</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Report Type</Label>
                    <Select value={execType} onValueChange={setExecType}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {REPORT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Period Covered</Label>
                    <Input value={execPeriod} onChange={e => setExecPeriod(e.target.value)} placeholder="e.g. Q1 2026" />
                  </div>
                  <div>
                    <Label>File</Label>
                    <Input type="file" onChange={e => setExecFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setExecDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUploadExecReport} disabled={isUploading}>
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {execReports.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No executive reports uploaded yet.</p>
          ) : (
            <div className="space-y-1">
              {execReports.map(r => (
                <DocumentRow key={r.id} name={`${r.report_type} — ${r.period_covered}`} date={r.uploaded_at} status={r.status}
                  onDownload={() => handleDownload('executive-reports', r.file_path, r.file_name)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Meeting Minutes Tab */}
        <TabsContent value="minutes">
          <div className="flex justify-end mb-4">
            <Dialog open={minutesDialogOpen} onOpenChange={setMinutesDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Upload className="h-4 w-4 mr-2" />Upload Minutes</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Upload Meeting Minutes</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Meeting Date</Label>
                    <Input type="date" value={minutesDate} onChange={e => setMinutesDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Meeting Type</Label>
                    <Select value={minutesType} onValueChange={setMinutesType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MEETING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>File</Label>
                    <Input type="file" onChange={e => setMinutesFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setMinutesDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUploadMinutes} disabled={isUploading}>
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {minutes.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No meeting minutes uploaded yet.</p>
          ) : (
            <div className="space-y-1">
              {minutes.map(m => (
                <DocumentRow key={m.id} name={`${m.meeting_type} — ${m.meeting_date}`} date={m.uploaded_at} status={m.status}
                  onDownload={() => handleDownload('meeting-minutes', m.file_path, m.file_name)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Special Papers Tab */}
        <TabsContent value="special">
          <div className="flex justify-end mb-4">
            <Dialog open={specialDialogOpen} onOpenChange={setSpecialDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Upload className="h-4 w-4 mr-2" />Upload Paper</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Upload Special Paper</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Title</Label>
                    <Input value={specialTitle} onChange={e => setSpecialTitle(e.target.value)} placeholder="Paper title" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={specialCategory} onValueChange={setSpecialCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {SPECIAL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea value={specialDescription} onChange={e => setSpecialDescription(e.target.value)} rows={3} />
                  </div>
                  <div>
                    <Label>File</Label>
                    <Input type="file" onChange={e => setSpecialFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setSpecialDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUploadSpecialPaper} disabled={isUploading}>
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {specialPapers.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No special papers uploaded yet.</p>
          ) : (
            <div className="space-y-1">
              {specialPapers.map(p => (
                <DocumentRow key={p.id} name={`${p.title} (${p.category})`} date={p.uploaded_at} status={p.status}
                  onDownload={() => handleDownload('special-papers', p.file_path, p.file_name)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
