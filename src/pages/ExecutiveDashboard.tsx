import { logger } from "@/lib/logger";
import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Settings } from "lucide-react";
import { TemporalFilter, TemporalPeriod, BaselineType, getDateRangeFromPeriod } from "@/components/dashboard/TemporalFilter";
import { BoardPulseSection } from "@/components/dashboard/sections/BoardPulseSection";
import { FinancialSection } from "@/components/dashboard/sections/FinancialSection";
import { PeopleSection } from "@/components/dashboard/sections/PeopleSection";
import { HealthSafetySection } from "@/components/dashboard/sections/HealthSafetySection";
import { CustomersSalesSection } from "@/components/dashboard/sections/CustomersSalesSection";
import { GovernanceSection } from "@/components/dashboard/sections/GovernanceSection";
import { Separator } from "@/components/ui/separator";

const ExecutiveDashboard = () => {
  const [period, setPeriod] = useState<TemporalPeriod>('month');
  const [baseline, setBaseline] = useState<BaselineType>('actual');
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>();
  const [selectedEntity, setSelectedEntity] = useState<string>('main');

  const handleSnapshotExport = () => {
    // TODO: Implement PDF export functionality
    logger.info('Exporting dashboard snapshot');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Executive Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive business performance at a glance
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">Main Entity</SelectItem>
                <SelectItem value="subsidiary1">Subsidiary 1</SelectItem>
                <SelectItem value="subsidiary2">Subsidiary 2</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSnapshotExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Snapshot
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </div>
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

export default ExecutiveDashboard;
