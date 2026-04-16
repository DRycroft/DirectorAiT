import { Card, CardContent } from "@/components/ui/card";
import { Database } from "lucide-react";

interface DashboardEmptyStateProps {
  sectionTitle: string;
  description: string;
}

export const DashboardEmptyState = ({ sectionTitle, description }: DashboardEmptyStateProps) => (
  <div className="space-y-4">
    <div>
      <h2 className="text-2xl font-bold mb-1">{sectionTitle}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Card>
      <CardContent className="py-12 text-center">
        <Database className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">Not yet connected</p>
        <p className="text-sm text-muted-foreground mt-1">
          This section will display live data once metrics are configured.
        </p>
      </CardContent>
    </Card>
  </div>
);
