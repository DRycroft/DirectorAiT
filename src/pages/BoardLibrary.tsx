import { useState } from "react";
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
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

const BoardLibrary = () => {
  const [dragActive, setDragActive] = useState(false);
  
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
  
  // Mock data for demonstration
  const documents = [
    {
      id: 1,
      title: "Q3 2024 Financial Review",
      date: "2024-09-15",
      category: "Financials",
      pages: 24,
      processed: true,
      keywords: ["revenue", "expenses", "forecast"]
    },
    {
      id: 2,
      title: "Product Strategy 2025",
      date: "2024-08-20",
      category: "Strategy",
      pages: 18,
      processed: true,
      keywords: ["roadmap", "innovation", "market"]
    },
    {
      id: 3,
      title: "Risk Register Update",
      date: "2024-07-10",
      category: "Risk",
      pages: 12,
      processed: true,
      keywords: ["compliance", "security", "operations"]
    }
  ];
  
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
                <div className="text-3xl font-bold">247</div>
                <p className="text-sm text-muted-foreground mt-1">Across all boards</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">AI Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">243</div>
                <p className="text-sm text-muted-foreground mt-1">Ready for insights</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Storage Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">2.4 GB</div>
                <p className="text-sm text-muted-foreground mt-1">of 100 GB available</p>
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
                        placeholder="Search documents, keywords, decisions..." 
                        className="pl-9"
                      />
                    </div>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Documents Grid */}
              <div className="space-y-4">
                {documents.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{doc.title}</h3>
                              {doc.processed && (
                                <CheckCircle2 className="w-4 h-4 text-success" />
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(doc.date).toLocaleDateString()}
                              </div>
                              <Badge variant="secondary">{doc.category}</Badge>
                              <span>{doc.pages} pages</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {doc.keywords.map((keyword, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {keyword}
                                </Badge>
                              ))}
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default BoardLibrary;