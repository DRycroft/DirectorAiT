import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardGrid, DashboardSection } from "../DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ShieldCheck, AlertCircle, FileText, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const HealthSafetySection = () => {
  // Incident trend data
  const incidentData = [
    { month: 'Jan', minor: 2, medium: 1, serious: 0, lti: 0 },
    { month: 'Feb', minor: 1, medium: 0, serious: 0, lti: 0 },
    { month: 'Mar', minor: 3, medium: 1, serious: 0, lti: 0 },
    { month: 'Apr', minor: 2, medium: 0, serious: 0, lti: 0 },
    { month: 'May', minor: 1, medium: 1, serious: 1, lti: 0 },
    { month: 'Jun', minor: 2, medium: 0, serious: 0, lti: 0 }
  ];

  // Near miss trend
  const nearMissData = [
    { month: 'Jan', count: 8 },
    { month: 'Feb', count: 12 },
    { month: 'Mar', count: 15 },
    { month: 'Apr', count: 18 },
    { month: 'May', count: 22 },
    { month: 'Jun', count: 25 }
  ];

  // Open corrective actions
  const correctiveActions = [
    { id: 'CA-001', description: 'Update forklift training procedures', owner: 'H&S Manager', dueDate: '2025-11-15', status: 'in_progress' },
    { id: 'CA-002', description: 'Install additional emergency lighting', owner: 'Facilities', dueDate: '2025-11-20', status: 'pending' },
    { id: 'CA-003', description: 'Replace damaged safety barriers', owner: 'Operations', dueDate: '2025-11-10', status: 'overdue' },
    { id: 'CA-004', description: 'Update chemical handling procedures', owner: 'Production', dueDate: '2025-11-25', status: 'pending' }
  ];

  const trifr = 2.4; // Total Recordable Injury Frequency Rate
  const ltiYtd = 0;
  const daysSinceLastLti = 247;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">Health & Safety</h2>
        <p className="text-sm text-muted-foreground">Safety performance and incident management</p>
      </div>

      <DashboardGrid>
        {/* KPI Summary */}
        <DashboardSection width="third">
          <Card className="border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lost Time Injuries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{ltiYtd}</div>
              <div className="flex items-center gap-2 mt-1">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">{daysSinceLastLti} days</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Since last LTI</div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">TRIFR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{trifr}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Recordable Injury Frequency Rate</div>
              <div className="text-xs text-muted-foreground mt-1">Target: {'<'}3.0</div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Near Misses (YTD)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">100</div>
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">+35% vs prior</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Indicates strong reporting culture</div>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Incident Breakdown */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Incident Breakdown (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={incidentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="minor" fill="hsl(var(--chart-4))" name="Minor" stackId="a" />
                  <Bar dataKey="medium" fill="hsl(var(--chart-3))" name="Medium" stackId="a" />
                  <Bar dataKey="serious" fill="hsl(var(--chart-2))" name="Serious" stackId="a" />
                  <Bar dataKey="lti" fill="hsl(var(--destructive))" name="LTI" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-4 gap-2 mt-4">
                <div className="text-center p-2 border rounded">
                  <div className="text-sm font-medium">11</div>
                  <div className="text-xs text-muted-foreground">Minor</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="text-sm font-medium">3</div>
                  <div className="text-xs text-muted-foreground">Medium</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="text-sm font-medium">1</div>
                  <div className="text-xs text-muted-foreground">Serious</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="text-sm font-medium">0</div>
                  <div className="text-xs text-muted-foreground">LTI</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Near Miss Trend */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Near Miss Reporting Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={nearMissData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Near Misses" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Positive trend indicates strong safety culture</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Corrective Actions */}
        <DashboardSection width="full">
          <Card>
            <CardHeader>
              <CardTitle>Open Corrective Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {correctiveActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium">{action.id}</TableCell>
                      <TableCell>{action.description}</TableCell>
                      <TableCell>{action.owner}</TableCell>
                      <TableCell>{action.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant={
                          action.status === 'overdue' ? 'destructive' :
                          action.status === 'in_progress' ? 'default' :
                          'secondary'
                        }>
                          {action.status === 'overdue' ? 'Overdue' :
                           action.status === 'in_progress' ? 'In Progress' :
                           'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Safety Audits */}
        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Safety Audits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completed (YTD)</span>
                  <span className="font-bold">8 / 12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Overdue</span>
                  <span className="font-bold text-amber-600">1</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Upcoming (30 days)</span>
                  <span className="font-bold">2</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </DashboardSection>
      </DashboardGrid>
    </div>
  );
};
