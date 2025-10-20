import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { BoardPaperTemplateBuilder } from "@/components/BoardPaperTemplateBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const BoardPapers = () => {
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const templateOptions = [
    { value: "board-papers", label: "Board Papers" },
    { value: "chair-report", label: "Chair Report" },
    { value: "ceo-report", label: "CEO Report" },
    { value: "cfo-report", label: "CFO Report" },
    { value: "osh-report", label: "OSH Report" },
    { value: "finance-report", label: "Finance Report" },
    { value: "sm-report", label: "S&M Report" },
    { value: "hr-report", label: "HR Report" },
    { value: "kpi-report", label: "KPIs Report" },
    { value: "one-off-report", label: "One-Off Report" },
    { value: "minutes", label: "Minutes" },
    { value: "special-papers", label: "Special Papers" },
    { value: "financial-updates", label: "Financial Updates" },
  ];
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Board Papers
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage all aspects of your board documentation
          </p>
        </div>

        <Tabs defaultValue="papers" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="papers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Board Papers</TabsTrigger>
            <TabsTrigger value="minutes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Minutes</TabsTrigger>
            <TabsTrigger value="special" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Special Papers</TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Financial Updates</TabsTrigger>
            <TabsTrigger value="exec" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Exec Reports</TabsTrigger>
            <TabsTrigger value="template" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="papers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Board Papers</CardTitle>
                    <CardDescription className="text-base mt-1">
                      Create and manage regular board papers using your template
                    </CardDescription>
                  </div>
                  <Button variant="accent" size="lg" className="shadow-lg hover:shadow-xl">Add New Board Paper</Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Board papers list will appear here once you create your first template.
                </p>
              </CardContent>
            </Card>
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

          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Updates</CardTitle>
                <CardDescription>
                  CFO financial reports and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Financial updates list will appear here.
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

          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Document Templates</CardTitle>
                    <CardDescription>
                      Select a template type to configure its structure and fields (Admin access required)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium min-w-32">Select Template:</label>
                  <select 
                    className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                  >
                    <option value="">Choose a template type...</option>
                    {templateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedTemplate ? (
                  <div className="border border-border rounded-lg p-6 bg-muted/30">
                    <h3 className="text-lg font-semibold mb-2">
                      {templateOptions.find(t => t.value === selectedTemplate)?.label} Template
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Template builder will appear here. This section will allow you to configure headers and structure for this document type.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Please select a template type to begin configuring its structure.
                  </p>
                )}
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
