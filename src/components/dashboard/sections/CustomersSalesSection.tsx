import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardGrid, DashboardSection } from "../DashboardLayout";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Users, AlertCircle, FileText, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const CustomersSalesSection = () => {
  // Customer metrics trend
  const customerTrendData = [
    { month: 'Jan', new: 12, churned: 3, active: 245 },
    { month: 'Feb', new: 15, churned: 2, active: 258 },
    { month: 'Mar', new: 18, churned: 4, active: 272 },
    { month: 'Apr', new: 14, churned: 3, active: 283 },
    { month: 'May', new: 20, churned: 5, active: 298 },
    { month: 'Jun', new: 22, churned: 3, active: 317 }
  ];

  // Pipeline data
  const pipelineData = [
    { stage: 'Prospecting', deals: 45, value: 2250 },
    { stage: 'Qualification', deals: 28, value: 1820 },
    { stage: 'Proposal', deals: 15, value: 1350 },
    { stage: 'Negotiation', deals: 8, value: 980 },
    { stage: 'Closing', deals: 5, value: 625 }
  ];

  // Top customers by revenue
  const topCustomers = [
    { name: 'Acme Corp', revenue: 450, concentration: 7.4, status: 'healthy' },
    { name: 'Global Industries', revenue: 380, concentration: 6.3, status: 'healthy' },
    { name: 'TechStart Ltd', revenue: 325, concentration: 5.4, status: 'at-risk' },
    { name: 'Enterprise Co', revenue: 290, concentration: 4.8, status: 'healthy' },
    { name: 'Innovation Inc', revenue: 265, concentration: 4.4, status: 'healthy' }
  ];

  // Tenders/Contracts
  const tenderData = [
    { category: 'Submitted', count: 12, value: 5400 },
    { category: 'Under Review', count: 8, value: 3200 },
    { category: 'Awarded', count: 5, value: 2100 },
    { category: 'Lost', count: 3, value: 1200 }
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  const nrr = 112; // Net Revenue Retention
  const churnRate = 4.2;
  const winRate = 62.5;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">Customers & Sales</h2>
        <p className="text-sm text-muted-foreground">Customer health and sales pipeline performance</p>
      </div>

      <DashboardGrid>
        {/* KPI Summary */}
        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">317</div>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">+29% YoY</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">New: 22 • Churned: 3 this month</div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Revenue Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{nrr}%</div>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Strong growth</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Churn: {churnRate}%</div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sales Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$7.0M</div>
              <div className="flex items-center gap-2 mt-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Win rate: {winRate}%</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">101 active deals</div>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Customer Growth Trend */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Customer Growth & Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={customerTrendData}>
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
                  <Line type="monotone" dataKey="active" stroke="hsl(var(--primary))" strokeWidth={3} name="Active Customers" />
                  <Line type="monotone" dataKey="new" stroke="hsl(var(--chart-2))" strokeWidth={2} name="New" />
                  <Line type="monotone" dataKey="churned" stroke="hsl(var(--destructive))" strokeWidth={2} name="Churned" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Sales Pipeline */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Sales Pipeline by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="stage" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" name="Value ($K)" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 text-sm text-muted-foreground">
                Total pipeline value: $7.0M • Weighted: $3.8M (avg conversion 54%)
              </div>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Top Customers */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Customers (Revenue Concentration)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Revenue ($K)</TableHead>
                    <TableHead className="text-right">% Total</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.map((customer) => (
                    <TableRow key={customer.name}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-right">${customer.revenue}K</TableCell>
                      <TableCell className="text-right">{customer.concentration}%</TableCell>
                      <TableCell>
                        <Badge variant={customer.status === 'healthy' ? 'default' : 'destructive'}>
                          {customer.status === 'healthy' ? 'Healthy' : 'At Risk'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {topCustomers[0].concentration > 10 && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-600">Top 5 customers represent 28% of revenue</span>
                </div>
              )}
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Tenders & Contracts */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Tenders & Contract Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {tenderData.map((item, idx) => (
                    <div key={item.category} className="p-3 border rounded">
                      <div className="text-sm font-medium text-muted-foreground">{item.category}</div>
                      <div className="text-2xl font-bold mt-1">{item.count}</div>
                      <div className="text-xs text-muted-foreground mt-1">Value: ${item.value}K</div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-primary/10 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Win Rate</span>
                    <span className="text-lg font-bold">{winRate}%</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">Avg Deal Close Time</span>
                    <span className="text-sm font-medium">68 days</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* AR Ageing Summary */}
        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">AR Ageing Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Top overdue</span>
                  <span className="font-bold text-red-600">Acme Corp</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Amount</span>
                  <span className="font-bold">$85K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Days overdue</span>
                  <span className="font-bold text-red-600">72</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Contact owner</span>
                  <span className="text-sm">Sales Director</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </DashboardSection>
      </DashboardGrid>
    </div>
  );
};
