import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Table, ArrowLeft } from "lucide-react";

const ExportTeam = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [includeConfidential, setIncludeConfidential] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-team-csv", {
        body: { boardId, includeConfidential },
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `board-team-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: `Exported ${data.memberCount} members to CSV`,
      });
    } catch (error: any) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export team data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async (memberId: string) => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-member-pdf", {
        body: { memberId },
      });

      if (error) throw error;

      // Open HTML in new window for print-to-PDF
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        
        toast({
          title: "PDF ready",
          description: "Use Print > Save as PDF to download",
        });
      }
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export member profile",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-8">Export Team Data</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                <CardTitle>Team Directory (CSV)</CardTitle>
              </div>
              <CardDescription>
                Export all team members to a spreadsheet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confidential"
                  checked={includeConfidential}
                  onCheckedChange={(checked) => setIncludeConfidential(checked as boolean)}
                />
                <Label htmlFor="confidential" className="text-sm">
                  Include confidential information (admin only)
                </Label>
              </div>

              <Button
                onClick={handleExportCSV}
                disabled={exporting}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? "Exporting..." : "Export to CSV"}
              </Button>

              <p className="text-xs text-muted-foreground">
                Exports name, title, contact info, and appointment details for all team members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Individual Bios (PDF)</CardTitle>
              </div>
              <CardDescription>
                Export single-page profiles for Board Papers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate professional PDF bios for each member, respecting their publish preferences.
              </p>

              <Button
                onClick={() => navigate(`/boards/${boardId}`)}
                variant="outline"
                className="w-full"
              >
                Select Member to Export
              </Button>

              <p className="text-xs text-muted-foreground">
                Click on individual members from the team list to generate their PDF bio
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ExportTeam;
