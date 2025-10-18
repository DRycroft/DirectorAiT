import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Upload, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const HistoricalContext = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-accent/5 to-primary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Build Organizational Memory
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Upload historical board papers to create a comprehensive knowledge base. 
              AI analyzes past decisions to inform future governance.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-accent/20">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
                  <Upload className="w-6 h-6" />
                </div>
                <CardTitle>Unlimited Document Upload</CardTitle>
                <CardDescription className="text-base">
                  Upload as many board papers, minutes, and decisions as you need. 
                  PDF, Word, and other formats supported.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="border-accent/20">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
                  <Brain className="w-6 h-6" />
                </div>
                <CardTitle>AI-Powered Analysis</CardTitle>
                <CardDescription className="text-base">
                  Automatically extract decisions, action items, risks, and themes. 
                  Build a searchable knowledge base of governance history.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          
          <Card className="mt-8 bg-primary text-primary-foreground border-0">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">
                    What gets captured from historical papers?
                  </h3>
                  <ul className="space-y-2 text-primary-foreground/90">
                    <li>• Past decisions and their rationale</li>
                    <li>• Recurring themes and strategic priorities</li>
                    <li>• Risk patterns and mitigation approaches</li>
                    <li>• Action items and their outcomes</li>
                    <li>• Key stakeholder concerns and feedback</li>
                  </ul>
                </div>
                
                <Button size="lg" variant="outline" className="flex-shrink-0 group bg-primary-foreground/10 hover:bg-primary-foreground/20 border-primary-foreground/20 text-primary-foreground" asChild>
                  <Link to="/library">
                    Start Uploading
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HistoricalContext;