import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Circle } from "lucide-react";

interface TrafficLightProps {
  title: string;
  status: 'green' | 'amber' | 'red';
  description?: string;
  className?: string;
  onClick?: () => void;
}

const TrafficLight = ({ title, status, description, className, onClick }: TrafficLightProps) => {
  const statusConfig = {
    green: { color: 'text-green-500', bg: 'bg-green-500/10', label: 'On Track' },
    amber: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'At Risk' },
    red: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Critical' }
  };

  const config = statusConfig[status];

  return (
    <Card className={className} onClick={onClick}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${config.bg}`}>
            <Circle className={`h-8 w-8 ${config.color} fill-current`} />
          </div>
          <div>
            <div className={`text-lg font-bold ${config.color}`}>{config.label}</div>
            {description && <div className="text-sm text-muted-foreground mt-1">{description}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrafficLight;
