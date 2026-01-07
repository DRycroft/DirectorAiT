import { Card, CardContent } from "@/components/ui/card";

interface COIManagementProps {
  memberId?: string;
  isEditable?: boolean;
}

export default function COIManagement({ memberId: _memberId, isEditable: _isEditable = true }: COIManagementProps) {

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Conflict of Interest Management</h2>
        <p className="text-muted-foreground">Track and manage declared conflicts of interest</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">COI management system coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
