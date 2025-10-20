import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { BoardPaperTemplateBuilder } from "@/components/BoardPaperTemplateBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BoardPapers = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Board Papers</h1>
          <p className="text-muted-foreground">
            Manage all aspects of your board documentation
          </p>
        </div>

        <Tabs defaultValue="papers" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="papers">Board Papers</TabsTrigger>
            <TabsTrigger value="minutes">Minutes</TabsTrigger>
            <TabsTrigger value="special">Special Papers</TabsTrigger>
            <TabsTrigger value="financial">Financial Updates</TabsTrigger>
            <TabsTrigger value="exec">Exec Reports</TabsTrigger>
            <TabsTrigger value="template">Template Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="papers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Board Papers</CardTitle>
                <CardDescription>
                  Create and manage regular board papers using your template
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                <CardTitle>Executive Reports</CardTitle>
                <CardDescription>
                  CEO and executive team reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Executive reports list will appear here.
                </p>
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
