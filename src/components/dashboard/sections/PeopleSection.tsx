import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardGrid, DashboardSection } from "../DashboardLayout";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, UserMinus, UserPlus, Clock } from "lucide-react";

export const PeopleSection = () => {
  // Headcount trend
  const headcountData = [
    { month: 'Jan', total: 145, ft: 125, pt: 15, contractors: 5 },
    { month: 'Feb', total: 148, ft: 127, pt: 16, contractors: 5 },
    { month: 'Mar', total: 152, ft: 130, pt: 17, contractors: 5 },
    { month: 'Apr', total: 155, ft: 132, pt: 17, contractors: 6 },
    { month: 'May', total: 158, ft: 135, pt: 17, contractors: 6 },
    { month: 'Jun', total: 162, ft: 138, pt: 18, contractors: 6 }
  ];

  // Turnover data
  const turnoverData = [
    { month: 'Jan', voluntary: 2, involuntary: 1, rate: 8.2 },
    { month: 'Feb', voluntary: 1, involuntary: 0, rate: 7.8 },
    { month: 'Mar', voluntary: 3, involuntary: 1, rate: 8.5 },
    { month: 'Apr', voluntary: 2, involuntary: 0, rate: 8.3 },
    { month: 'May', voluntary: 1, involuntary: 1, rate: 8.1 },
    { month: 'Jun', voluntary: 2, involuntary: 0, rate: 7.9 }
  ];

  // Open vacancies
  const vacanciesData = [
    { role: 'Senior Developer', department: 'Engineering', daysOpen: 45, candidates: 3 },
    { role: 'Product Manager', department: 'Product', daysOpen: 28, candidates: 5 },
    { role: 'Sales Executive', department: 'Sales', daysOpen: 62, candidates: 8 },
    { role: 'Marketing Specialist', department: 'Marketing', daysOpen: 18, candidates: 12 }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">People & HR</h2>
        <p className="text-sm text-muted-foreground">Workforce metrics and talent management</p>
      </div>

      <DashboardGrid>
        {/* KPI Summary */}
        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Headcount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">162</div>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">+11.7% YoY</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">138 FT • 18 PT • 6 Contract</div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Turnover (12M)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">7.9%</div>
              <div className="flex items-center gap-2 mt-1">
                <TrendingDown className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">-0.6% vs prior</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Voluntary: 6.2% • Involuntary: 1.7%</div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Vacancies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">4</div>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-600">Avg 38 days</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">28 candidates in pipeline</div>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Headcount Trend */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Headcount Trend (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={headcountData}>
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
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="ft" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Full Time" />
                  <Line type="monotone" dataKey="pt" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Part Time" />
                  <Line type="monotone" dataKey="contractors" stroke="hsl(var(--chart-4))" strokeWidth={2} name="Contractors" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Turnover Analysis */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Turnover Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={turnoverData}>
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
                  <Bar dataKey="voluntary" fill="hsl(var(--chart-2))" name="Voluntary" stackId="a" />
                  <Bar dataKey="involuntary" fill="hsl(var(--destructive))" name="Involuntary" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 text-sm text-muted-foreground">
                Rolling 12-month turnover rate trend shown above bars
              </div>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Open Vacancies Table */}
        <DashboardSection width="full">
          <Card>
            <CardHeader>
              <CardTitle>Open Vacancies & Time to Fill</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Days Open</TableHead>
                    <TableHead>Candidates</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacanciesData.map((vacancy) => (
                    <TableRow key={vacancy.role}>
                      <TableCell className="font-medium">{vacancy.role}</TableCell>
                      <TableCell>{vacancy.department}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {vacancy.daysOpen}
                          {vacancy.daysOpen > 45 && (
                            <span className="text-amber-600">⚠️</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{vacancy.candidates}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          vacancy.candidates > 5 ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' : 
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                        }`}>
                          {vacancy.candidates > 5 ? 'Active' : 'Sourcing'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Key Staff Alerts */}
        <DashboardSection width="third">
          <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-sm">Key Staff Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <UserMinus className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-medium">CTO resignation notice</div>
                  <div className="text-xs text-muted-foreground">Notice period: 8 weeks remaining</div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <UserPlus className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">3 new hires starting</div>
                  <div className="text-xs text-muted-foreground">Onboarding scheduled for Q3</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </DashboardSection>
      </DashboardGrid>
    </div>
  );
};
