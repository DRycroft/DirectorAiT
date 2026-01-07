import { Card, CardContent } from "@/components/ui/card";

export default function TwoPersonApproval() {

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Two-Person Approval</h2>
        <p className="text-muted-foreground">Manage requests requiring dual authorization</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Two-person approval system coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
