import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Activity, TrendingUp, Table, AlertCircle, Gauge } from "lucide-react";

interface WidgetLibraryProps {
  onAddWidget: (widgetType: string) => void;
}

const widgetTypes = [
  {
    type: 'kpi_card',
    name: 'KPI Card',
    icon: Activity,
    description: 'Single metric display'
  },
  {
    type: 'traffic_light',
    name: 'Traffic Light',
    icon: AlertCircle,
    description: 'Red/Amber/Green status'
  },
  {
    type: 'line_chart',
    name: 'Line Chart',
    icon: TrendingUp,
    description: 'Trend over time'
  },
  {
    type: 'bar_chart',
    name: 'Bar Chart',
    icon: BarChart3,
    description: 'Compare values'
  },
  {
    type: 'gauge',
    name: 'Gauge',
    icon: Gauge,
    description: 'Progress indicator'
  },
  {
    type: 'table',
    name: 'Data Table',
    icon: Table,
    description: 'Tabular data'
  }
];

const WidgetLibrary = ({ onAddWidget }: WidgetLibraryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Widget Library</CardTitle>
        <CardDescription>Click to add widgets to your dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {widgetTypes.map(widget => {
          const Icon = widget.icon;
          return (
            <Button
              key={widget.type}
              variant="outline"
              className="w-full justify-start"
              onClick={() => onAddWidget(widget.type)}
            >
              <Icon className="h-4 w-4 mr-2" />
              <div className="flex flex-col items-start">
                <span className="font-medium">{widget.name}</span>
                <span className="text-xs text-muted-foreground">{widget.description}</span>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default WidgetLibrary;
