import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriorityIssue {
  title: string;
  section: string;
  sectionId: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

interface BoardPulseSectionProps {
  data?: {
    priorityIssues?: PriorityIssue[];
  };
}

const severityConfig = {
  high: {
    label: 'High severity',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30',
    borderColor: 'border-l-red-500'
  },
  medium: {
    label: 'Medium severity',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30',
    borderColor: 'border-l-amber-500'
  },
  low: {
    label: 'Low severity',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30',
    borderColor: 'border-l-green-500'
  }
};

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

export const BoardPulseSection = ({ data }: BoardPulseSectionProps) => {
  // Default priority issues (breaching parameters)
  const priorityIssues: PriorityIssue[] = data?.priorityIssues || [
    {
      title: 'Cash runway declining',
      section: 'Financial Health',
      sectionId: 'financial-section',
      severity: 'high',
      description: 'Cash on hand below 6 months runway'
    },
    {
      title: 'Key staff departures',
      section: 'People & HR',
      sectionId: 'people-section',
      severity: 'medium',
      description: 'Staff turnover above target threshold'
    },
    {
      title: 'Customer retention declining',
      section: 'Customers & Sales',
      sectionId: 'customers-sales-section',
      severity: 'medium',
      description: 'NRR trending below 100%'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">Priority Matters</h2>
        <p className="text-sm text-muted-foreground">Items requiring immediate attention</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {priorityIssues.map((issue) => {
          const config = severityConfig[issue.severity];
          return (
            <Card
              key={`${issue.sectionId}-${issue.title}`}
              className={cn(
                "border-l-4 cursor-pointer transition-all",
                config.borderColor,
                config.bgColor
              )}
              onClick={() => scrollToSection(issue.sectionId)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold leading-tight">
                    {issue.title}
                  </CardTitle>
                  <ChevronRight className={cn("h-5 w-5 flex-shrink-0", config.color)} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className={cn("h-4 w-4", config.color)} />
                  <span className={cn("text-xs font-medium", config.color)}>
                    {config.label}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">{issue.description}</div>
                <div className="text-xs text-muted-foreground">
                  Section: <span className="font-medium">{issue.section}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
