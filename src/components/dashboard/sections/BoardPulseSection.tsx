import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardGrid, DashboardSection } from "../DashboardLayout";
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Activity, Users, AlertCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricProps {
  title: string;
  value: string | number;
  subtitle?: string;
  status: 'green' | 'amber' | 'red';
  icon: React.ReactNode;
  trend?: { direction: 'up' | 'down'; value: string };
}

const PulseMetric = ({ title, value, subtitle, status, icon, trend }: MetricProps) => {
  const statusColors = {
    green: 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20',
    amber: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20',
    red: 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
  };

  const statusIconColors = {
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400'
  };

  return (
    <Card className={cn("border-l-4", statusColors[status])}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={statusIconColors[status]}>{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-3xl font-bold">{value}</div>
          {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              {trend.direction === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                {trend.value}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface BoardPulseSectionProps {
  data?: {
    cashOnHand: number;
    monthsRunway: number;
    operatingCashFlow: number;
    ebitda: number;
    covenantStatus: 'ok' | 'at-risk' | 'breach';
    ltiYtd: number;
    daysSinceLastLti: number;
    customerNrr: number;
    staffTurnover: number;
  };
}

export const BoardPulseSection = ({ data }: BoardPulseSectionProps) => {
  // Default mock data
  const metrics = data || {
    cashOnHand: 2450000,
    monthsRunway: 8.5,
    operatingCashFlow: 180000,
    ebitda: 420000,
    covenantStatus: 'ok' as const,
    ltiYtd: 0,
    daysSinceLastLti: 247,
    customerNrr: 112,
    staffTurnover: 8.5
  };

  const covenantStatusMap = {
    ok: { label: 'Compliant', status: 'green' as const },
    'at-risk': { label: 'At Risk', status: 'amber' as const },
    breach: { label: 'Breach', status: 'red' as const }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">Board Pulse</h2>
        <p className="text-sm text-muted-foreground">Critical metrics at a glance</p>
      </div>

      <DashboardGrid>
        <DashboardSection width="third">
          <PulseMetric
            title="Cash on Hand"
            value={`$${(metrics.cashOnHand / 1000000).toFixed(2)}M`}
            subtitle={`${metrics.monthsRunway} months runway`}
            status={metrics.monthsRunway > 6 ? 'green' : metrics.monthsRunway > 3 ? 'amber' : 'red'}
            icon={<DollarSign className="h-5 w-5" />}
          />
        </DashboardSection>

        <DashboardSection width="third">
          <PulseMetric
            title="Operating Cash Flow"
            value={`$${(metrics.operatingCashFlow / 1000).toFixed(0)}K`}
            subtitle="This period"
            status={metrics.operatingCashFlow > 0 ? 'green' : 'red'}
            icon={<Activity className="h-5 w-5" />}
            trend={
              metrics.operatingCashFlow > 0
                ? { direction: 'up', value: '+15% vs budget' }
                : { direction: 'down', value: '-5% vs budget' }
            }
          />
        </DashboardSection>

        <DashboardSection width="third">
          <PulseMetric
            title="EBITDA"
            value={`$${(metrics.ebitda / 1000).toFixed(0)}K`}
            subtitle="This period"
            status={metrics.ebitda > 0 ? 'green' : 'red'}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={{ direction: 'up', value: '+8% vs prior' }}
          />
        </DashboardSection>

        <DashboardSection width="third">
          <PulseMetric
            title="Covenant Status"
            value={covenantStatusMap[metrics.covenantStatus].label}
            subtitle="All covenants"
            status={covenantStatusMap[metrics.covenantStatus].status}
            icon={<ShieldAlert className="h-5 w-5" />}
          />
        </DashboardSection>

        <DashboardSection width="third">
          <PulseMetric
            title="Lost Time Injuries"
            value={metrics.ltiYtd}
            subtitle={`${metrics.daysSinceLastLti} days since last LTI`}
            status={metrics.ltiYtd === 0 ? 'green' : metrics.ltiYtd < 3 ? 'amber' : 'red'}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </DashboardSection>

        <DashboardSection width="third">
          <PulseMetric
            title="Customer NRR"
            value={`${metrics.customerNrr}%`}
            subtitle="Net Revenue Retention"
            status={metrics.customerNrr > 110 ? 'green' : metrics.customerNrr > 95 ? 'amber' : 'red'}
            icon={<Users className="h-5 w-5" />}
            trend={{ direction: 'up', value: '+4% vs quarter' }}
          />
        </DashboardSection>

        <DashboardSection width="third">
          <PulseMetric
            title="Staff Turnover"
            value={`${metrics.staffTurnover}%`}
            subtitle="12-month rolling"
            status={metrics.staffTurnover < 12 ? 'green' : metrics.staffTurnover < 20 ? 'amber' : 'red'}
            icon={<Users className="h-5 w-5" />}
          />
        </DashboardSection>

        <DashboardSection width="third">
          <Card className="border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top 3 Risks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Cash runway declining</div>
                    <div className="text-xs text-muted-foreground">High severity</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Key staff departures</div>
                    <div className="text-xs text-muted-foreground">Medium severity</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium">Supplier delays</div>
                    <div className="text-xs text-muted-foreground">Medium severity</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </DashboardSection>
      </DashboardGrid>
    </div>
  );
};
