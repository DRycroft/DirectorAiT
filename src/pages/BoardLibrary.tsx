import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { 
  Upload, 
  FileText, 
  Search, 
  Filter, 
  Calendar,
  Tag,
  Download,
  Eye,
  Trash2,
  Brain,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LibraryDocument {
  id: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
  processing_status: string | null;
  confidential_level: string | null;
}

const BoardLibrary = () => {
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();
      
      if (!profile?.org_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("archived_documents")
        .select("id, file_name, file_type, uploaded_at, processing_status, confidential_level")
        .eq("org_id", profile.org_id)
        .order("uploaded_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setDocuments(data);
      }
      setLoading(false);
    };

    fetchDocuments();
  }, [user]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };
  
  const handleFiles = (files: File[]) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validFiles = files.filter(file => validTypes.includes(file.type));
    
    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} document(s) uploaded successfully`, {
        description: "AI processing will begin shortly"
      });
    } else {
      toast.error("Invalid file type", {
        description: "Please upload PDF or Word documents"
      });
    }
  };

  const processedCount = documents.filter(d => d.processing_status === "completed").length;

  const filteredDocuments = searchQuery
    ? documents.filter(d => d.file_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : documents;
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3">Board Paper Library</h1>
            <p className="text-lg text-muted-foreground">
              Upload historical board papers to build organizational context and inform AI-assisted decision making
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? "—" : documents.length}</div>
                <p className="text-sm text-muted-foreground mt-1">Across all boards</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">AI Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{loading ? "—" : processedCount}</div>
                <p className="text-sm text-muted-foreground mt-1">Ready for insights</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? "—" : documents.length - processedCount}</div>
                <p className="text-sm text-muted-foreground mt-1">In queue</p>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="upload">Upload Documents</TabsTrigger>
              <TabsTrigger value="library">Document Library</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-6">
              {/* Upload Zone */}
              <Card>
                <CardHeader>
                  <CardTitle>Upload Board Papers</CardTitle>
                  <CardDescription>
                    Upload PDF or Word documents. AI will automatically extract key information, 
                    decisions, and context to inform future governance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                      dragActive 
                        ? "border-accent bg-accent/5" 
                        : "border-border hover:border-accent/50"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      Drop files here or click to browse
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Supports PDF, DOC, DOCX • Max 50MB per file
                    </p>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                    />
                    <Button variant="accent" asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Select Files
                      </label>
                    </Button>
                  </div>
                  
                  <div className="mt-6 space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-accent/5 rounded-lg border border-accent/20">
                      <Brain className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm mb-1">AI Processing</h4>
                        <p className="text-sm text-muted-foreground">
                          Each document is analyzed to extract decisions, action items, risks, 
                          and key themes. This context helps inform future board discussions.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Metadata Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Document Metadata (Optional)</CardTitle>
                  <CardDescription>
                    Add additional context to help organize and search documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="board">Board/Committee</Label>
                      <Input id="board" placeholder="e.g., Main Board, Audit Committee" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="meeting-date">Meeting Date</Label>
                      <Input id="meeting-date" type="date" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" placeholder="e.g., Strategy, Financial, Risk, Compliance" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input id="tags" placeholder="e.g., budget, expansion, regulatory" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="library" className="space-y-6">
              {/* Search and Filter */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search documents..." 
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Documents list */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredDocuments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload your first board paper to get started
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredDocuments.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                              <FileText className="w-6 h-6" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">{doc.file_name}</h3>
                                {doc.processing_status === "completed" && (
                                  <CheckCircle2 className="w-4 h-4 text-success" />
                                )}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(doc.uploaded_at).toLocaleDateString()}
                                </div>
                                <Badge variant="secondary">{doc.file_type}</Badge>
                                {doc.confidential_level && (
                                  <Badge variant="outline">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {doc.confidential_level}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default BoardLibrary;
