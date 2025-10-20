import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { BoardPaperTemplateBuilder } from "@/components/BoardPaperTemplateBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BoardPapers = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-3xl -z-10" />
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Board Papers
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage all aspects of your board documentation
          </p>
        </div>

        <Tabs defaultValue="papers" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8 bg-card/50 backdrop-blur-sm p-2 rounded-xl border border-primary/10 shadow-lg">
            <TabsTrigger value="papers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Board Papers</TabsTrigger>
            <TabsTrigger value="minutes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Minutes</TabsTrigger>
            <TabsTrigger value="special" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Special Papers</TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Financial Updates</TabsTrigger>
            <TabsTrigger value="exec" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Exec Reports</TabsTrigger>
            <TabsTrigger value="template" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md">Template Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="papers" className="space-y-4">
            <Card className="border-primary/20 shadow-xl bg-gradient-to-br from-card via-card to-primary/5 hover:shadow-2xl transition-all">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Board Papers</CardTitle>
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
            <Card className="border-accent/20 shadow-xl bg-gradient-to-br from-card via-card to-accent/5 hover:shadow-2xl transition-all">
              <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Executive Reports</CardTitle>
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
            <BoardPaperTemplateBuilder />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default BoardPapers;
