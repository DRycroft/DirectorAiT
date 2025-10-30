import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardGrid, DashboardSection } from "../DashboardLayout";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, DollarSign, AlertCircle } from "lucide-react";

export const FinancialSection = () => {
  // Revenue trend data
  const revenueData = [
    { month: 'Jan', actual: 850, budget: 800, prior: 750 },
    { month: 'Feb', actual: 920, budget: 850, prior: 780 },
    { month: 'Mar', actual: 980, budget: 900, prior: 820 },
    { month: 'Apr', actual: 1050, budget: 950, prior: 880 },
    { month: 'May', actual: 1100, budget: 1000, prior: 920 },
    { month: 'Jun', actual: 1180, budget: 1050, prior: 980 }
  ];

  // Aged debtors data
  const agedDebtorsData = [
    { range: '0-30', amount: 450, count: 45 },
    { range: '31-60', amount: 180, count: 12 },
    { range: '61-90', amount: 85, count: 5 },
    { range: '>90', amount: 35, count: 3 }
  ];

  // Cash flow data
  const cashFlowData = [
    { month: 'Jan', operating: 120, investing: -30, financing: 50 },
    { month: 'Feb', operating: 145, investing: -20, financing: 0 },
    { month: 'Mar', operating: 180, investing: -45, financing: 100 },
    { month: 'Apr', operating: 165, investing: -15, financing: 0 },
    { month: 'May', operating: 190, investing: -25, financing: 0 },
    { month: 'Jun', operating: 180, investing: -30, financing: 0 }
  ];

  // Covenant data
  const covenantData = [
    { covenant: 'Debt/EBITDA Ratio', current: '2.8x', limit: '3.5x', buffer: '20%', status: 'ok' },
    { covenant: 'Interest Cover', current: '4.2x', limit: '3.0x', buffer: '40%', status: 'ok' },
    { covenant: 'Current Ratio', current: '1.8', limit: '1.2', buffer: '50%', status: 'ok' },
    { covenant: 'Tangible Net Worth', current: '$8.5M', limit: '$5.0M', buffer: '70%', status: 'ok' }
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--destructive))'];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">Financial Health</h2>
        <p className="text-sm text-muted-foreground">Comprehensive financial performance metrics</p>
      </div>

      <DashboardGrid>
        {/* KPI Summary */}
        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue (YTD)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$6.08M</div>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">+12% vs budget</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Budget: $5.45M</div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gross Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">42.5%</div>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">+1.5% vs prior</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Target: 40%</div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Operating Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$980K</div>
              <div className="flex items-center gap-2 mt-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">This period</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">YTD: $2.85M</div>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Revenue Trend */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend (T12)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={revenueData}>
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
                  <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} name="Actual" />
                  <Line type="monotone" dataKey="budget" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" name="Budget" />
                  <Line type="monotone" dataKey="prior" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="3 3" name="Prior Year" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Cash Flow */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cashFlowData}>
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
                  <Bar dataKey="operating" fill="hsl(var(--primary))" name="Operating" />
                  <Bar dataKey="investing" fill="hsl(var(--chart-2))" name="Investing" />
                  <Bar dataKey="financing" fill="hsl(var(--chart-3))" name="Financing" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Aged Debtors */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Aged Debtors (DSO: 42 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="40%" height={180}>
                  <PieChart>
                    <Pie
                      data={agedDebtorsData}
                      dataKey="amount"
                      nameKey="range"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label
                    >
                      {agedDebtorsData.map((entry, index) => (
                        <Cell key={`cell-${entry.range}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Age</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">#</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agedDebtorsData.map((item, idx) => (
                      <TableRow key={item.range}>
                        <TableCell className="font-medium">{item.range} days</TableCell>
                        <TableCell className="text-right">${item.amount}K</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {agedDebtorsData[3].amount > 30 && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-600">Alert: $35K over 90 days requires attention</span>
                </div>
              )}
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Bank Covenants */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Bank Covenants Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Covenant</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Buffer</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {covenantData.map((covenant) => (
                    <TableRow key={covenant.covenant}>
                      <TableCell className="font-medium">{covenant.covenant}</TableCell>
                      <TableCell>{covenant.current}</TableCell>
                      <TableCell>{covenant.limit}</TableCell>
                      <TableCell>{covenant.buffer}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-green-500"></span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </DashboardSection>
      </DashboardGrid>
    </div>
  );
};
