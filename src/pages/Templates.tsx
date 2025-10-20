import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

const Templates = () => {
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
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Document Templates
          </h1>
          <p className="text-lg text-muted-foreground">
            Configure templates for all your board documentation
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Template Configuration</CardTitle>
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
              <div className="border border-border rounded-lg p-8 bg-muted/30 min-h-[600px]">
                <h3 className="text-xl font-semibold mb-4">
                  {templateOptions.find(t => t.value === selectedTemplate)?.label} Template
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Configure the structure and headers for this document template. This will serve as the base for all documents of this type.
                </p>
                {/* Template builder will go here */}
                <div className="bg-background rounded-lg p-6 border border-border min-h-[400px]">
                  <p className="text-sm text-muted-foreground">Template editor area - document customization interface will appear here</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8">
                Please select a template type to begin configuring its structure.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Templates;
