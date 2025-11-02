import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardGrid, DashboardSection } from "../DashboardLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, FileText, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const GovernanceSection = () => {
  // Board actions
  const boardActions = [
    { id: 'BA-001', description: 'Review Q3 financial forecasts', owner: 'CFO', dueDate: '2025-11-15', status: 'in_progress', progress: 60 },
    { id: 'BA-002', description: 'Approve new H&S policy', owner: 'Chair', dueDate: '2025-11-10', status: 'overdue', progress: 30 },
    { id: 'BA-003', description: 'Sign off annual budget', owner: 'Board', dueDate: '2025-11-25', status: 'pending', progress: 0 },
    { id: 'BA-004', description: 'Review CEO succession plan', owner: 'Chair', dueDate: '2025-11-20', status: 'in_progress', progress: 45 }
  ];

  // Board papers status
  const boardPapers = [
    { title: 'CEO Report - November', status: 'final', dueDate: '2025-11-05', author: 'CEO' },
    { title: 'Financial Report - Q3', status: 'draft', dueDate: '2025-11-08', author: 'CFO' },
    { title: 'Strategy Update', status: 'review', dueDate: '2025-11-12', author: 'Strategy Lead' },
    { title: 'Risk Register Update', status: 'final', dueDate: '2025-11-05', author: 'Risk Manager' },
    { title: 'H&S Quarterly Report', status: 'draft', dueDate: '2025-11-10', author: 'H&S Manager' }
  ];

  // Recent decisions
  const recentDecisions = [
    { date: '2025-10-15', decision: 'Approved capital expenditure for new equipment', value: '$450K', rationale: 'Capacity expansion required for Q1 orders' },
    { date: '2025-10-15', decision: 'Appointed new CFO', value: 'N/A', rationale: 'Succession planning - existing CFO retiring Dec 2025' },
    { date: '2025-09-20', decision: 'Approved strategic partnership with Tech Co', value: '$250K', rationale: 'Access to new markets and technology' },
    { date: '2025-09-20', decision: 'Updated dividend policy', value: '$0.15/share', rationale: 'Reflecting strong cash position' }
  ];

  // Upcoming meetings
  const upcomingMeetings = [
    { date: '2025-11-15', type: 'Board Meeting', agenda: 'Monthly review & budget approval' },
    { date: '2025-11-22', type: 'Audit Committee', agenda: 'Q3 audit findings' },
    { date: '2025-12-10', type: 'Risk Committee', agenda: 'Annual risk review' }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">Governance & Board Actions</h2>
        <p className="text-sm text-muted-foreground">Board effectiveness and meeting preparation</p>
      </div>

      <DashboardGrid>
        {/* KPI Summary */}
        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Board Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">12</div>
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-600">2 overdue</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">10 on track • 2 require attention</div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Board Papers Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">5</div>
              <div className="flex items-center gap-2 mt-1">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">For Nov meeting</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">2 final • 2 draft • 1 review</div>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection width="third">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Next Board Meeting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Nov 15</div>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">10 days away</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">8 agenda items • Papers due Nov 10</div>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Board Actions Table */}
        <DashboardSection width="full">
          <Card>
            <CardHeader>
              <CardTitle>Open Board Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boardActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium">{action.id}</TableCell>
                      <TableCell>{action.description}</TableCell>
                      <TableCell>{action.owner}</TableCell>
                      <TableCell>{action.dueDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={action.progress} className="w-20" />
                          <span className="text-xs text-muted-foreground">{action.progress}%</span>
                        </div>
                      </TableCell>
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

        {/* Board Papers */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Board Papers</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paper</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boardPapers.map((paper) => (
                    <TableRow key={paper.title}>
                      <TableCell className="font-medium">{paper.title}</TableCell>
                      <TableCell>{paper.author}</TableCell>
                      <TableCell>{paper.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant={
                          paper.status === 'final' ? 'default' :
                          paper.status === 'review' ? 'secondary' :
                          'outline'
                        }>
                          {paper.status === 'final' ? 'Final' :
                           paper.status === 'review' ? 'In Review' :
                           'Draft'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Upcoming Meetings */}
        <DashboardSection width="half">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.date} className="p-3 border rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{meeting.type}</div>
                        <div className="text-sm text-muted-foreground">{meeting.agenda}</div>
                      </div>
                      <div className="text-sm font-medium">{meeting.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Decision Register */}
        <DashboardSection width="full">
          <Card>
            <CardHeader>
              <CardTitle>Recent Board Decisions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Rationale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDecisions.map((decision, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{decision.date}</TableCell>
                      <TableCell>{decision.decision}</TableCell>
                      <TableCell>{decision.value}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{decision.rationale}</TableCell>
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
