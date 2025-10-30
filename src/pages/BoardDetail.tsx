import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandling";
import { Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TemporalFilter, TemporalPeriod, BaselineType } from "@/components/dashboard/TemporalFilter";
import { BoardPulseSection } from "@/components/dashboard/sections/BoardPulseSection";
import { FinancialSection } from "@/components/dashboard/sections/FinancialSection";
import { PeopleSection } from "@/components/dashboard/sections/PeopleSection";
import { HealthSafetySection } from "@/components/dashboard/sections/HealthSafetySection";
import { CustomersSalesSection } from "@/components/dashboard/sections/CustomersSalesSection";
import { GovernanceSection } from "@/components/dashboard/sections/GovernanceSection";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

const BoardDetail = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<any>(null);
  const [period, setPeriod] = useState<TemporalPeriod>('month');
  const [baseline, setBaseline] = useState<BaselineType>('actual');
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>();

  useEffect(() => {
    if (boardId) {
      checkAuth();
    }
  }, [boardId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    await fetchBoardData();
  };

  const fetchBoardData = async () => {
    try {
      setLoading(true);

      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select(`
          *,
          organizations(name),
          board_settings(*)
        `)
        .eq("id", boardId)
        .maybeSingle();

      if (boardError) {
        logError("BoardDetail - Board fetch", boardError);
        throw boardError;
      }

      if (!boardData) {
        setBoard(null);
        setLoading(false);
        return;
      }

      setBoard(boardData);
    } catch (error: any) {
      logError("BoardDetail - Fetch board data", error);
      const errorMessage = getUserFriendlyError(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Skeleton className="h-12 w-96 mb-8" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pt-24">
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Board not found</h3>
                <Button onClick={() => navigate("/boards")}>Back to Boards</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <Button variant="ghost" onClick={() => navigate("/boards")} className="mb-2">
              ← Back to Boards
            </Button>
            <h1 className="text-4xl font-bold mb-2">{board.title}</h1>
            <p className="text-muted-foreground">{board.description}</p>
          </div>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>

        {/* Temporal Filters */}
        <TemporalFilter
          period={period}
          baseline={baseline}
          customRange={customRange}
          onPeriodChange={setPeriod}
          onBaselineChange={setBaseline}
          onCustomRangeChange={setCustomRange}
        />

        {/* Priority Matters - Top of page */}
        <div className="mt-8">
          <BoardPulseSection />
        </div>

        {/* Dashboard Sections */}
        <div className="space-y-8 mt-8">
          <Separator />

          {/* Financial Health */}
          <div id="financial-section" className="border-4 border-red-500 rounded-lg p-4">
            <FinancialSection />
          </div>

          <Separator />

          {/* People & HR */}
          <div id="people-section" className="border-4 border-amber-500 rounded-lg p-4">
            <PeopleSection />
          </div>

          <Separator />

          {/* Health & Safety */}
          <div id="health-safety-section" className="border-4 border-green-500 rounded-lg p-4">
            <HealthSafetySection />
          </div>

          <Separator />

          {/* Customers & Sales */}
          <div id="customers-sales-section" className="border-4 border-amber-500 rounded-lg p-4">
            <CustomersSalesSection />
          </div>

          <Separator />

          {/* Governance & Board Actions */}
          <div id="governance-section" className="border-4 border-green-500 rounded-lg p-4">
            <GovernanceSection />
          </div>
        </div>
      </main>
    </div>
  );
};

export default BoardDetail;
