import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BoardPaper {
  id: string;
  date: string;
  companyName: string;
  periodCovered: string;
  createdBy: string;
}

const BoardPapers = () => {
  const { toast } = useToast();
  const [createPaperDialogOpen, setCreatePaperDialogOpen] = useState(false);
  const [boardPapers, setBoardPapers] = useState<BoardPaper[]>([]);
  const [newPaperData, setNewPaperData] = useState({
    date: new Date().toISOString().split('T')[0],
    companyName: "",
    periodCovered: "",
  });

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
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 pt-16 pb-4 max-w-7xl">
        <div className="mb-2 flex items-center justify-between gap-4">
          <Tabs defaultValue="papers" className="w-full flex-1">
            <TabsList className="grid w-full grid-cols-4 h-10">
              <TabsTrigger value="papers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Board Papers</TabsTrigger>
              <TabsTrigger value="exec" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Exec Reports</TabsTrigger>
              <TabsTrigger value="minutes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Minutes</TabsTrigger>
              <TabsTrigger value="special" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Special Papers</TabsTrigger>
            </TabsList>
          </Tabs>
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

        <Tabs defaultValue="papers" className="w-full">
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
                    className="px-4 -my-1 border rounded-lg hover:border-primary transition-all cursor-pointer group bg-slate-50"
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
                        <Button size="sm" variant="outline" className="text-white bg-black border-black hover:bg-primary hover:text-white hover:border-primary transition-colors h-6 py-0">
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
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default BoardPapers;
