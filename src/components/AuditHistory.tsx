import { Card, CardContent } from "@/components/ui/card";

interface AuditHistoryProps {
  memberId?: string;
}

export default function AuditHistory({ memberId: _memberId }: AuditHistoryProps) {

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Audit History</h2>
        <p className="text-muted-foreground">Complete audit trail of system activities</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Audit history viewer coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
