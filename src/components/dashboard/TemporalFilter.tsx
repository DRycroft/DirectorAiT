import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, subMonths } from "date-fns";
import { useState } from "react";

export type TemporalPeriod = 'month' | 'quarter' | 'ytd' | 't12' | 'custom';
export type BaselineType = 'actual' | 'budget' | 'prior_year' | 'forecast';

interface TemporalFilterProps {
  period: TemporalPeriod;
  baseline: BaselineType;
  customRange?: { from: Date; to: Date };
  onPeriodChange: (period: TemporalPeriod) => void;
  onBaselineChange: (baseline: BaselineType) => void;
  onCustomRangeChange: (range: { from: Date; to: Date }) => void;
}

export const TemporalFilter = ({
  period,
  baseline,
  customRange,
  onPeriodChange,
  onBaselineChange,
  onCustomRangeChange
}: TemporalFilterProps) => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(customRange);

  const periods: { value: TemporalPeriod; label: string }[] = [
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'ytd', label: 'YTD' },
    { value: 't12', label: 'T12' },
    { value: 'custom', label: 'Custom' }
  ];

  const baselines: { value: BaselineType; label: string }[] = [
    { value: 'actual', label: 'Actual' },
    { value: 'budget', label: 'vs Budget' },
    { value: 'prior_year', label: 'vs Prior Year' },
    { value: 'forecast', label: 'vs Forecast' }
  ];

  return (
    <div className="flex flex-wrap gap-4 items-center p-4 bg-card rounded-lg border">
      <div className="flex gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-2">Period:</span>
        {periods.map(p => (
          <Button
            key={p.value}
            variant={period === p.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {period === 'custom' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                  onCustomRangeChange({ from: range.from, to: range.to });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}

      <div className="flex gap-2 ml-auto">
        <span className="text-sm font-medium text-muted-foreground mr-2">Compare:</span>
        {baselines.map(b => (
          <Button
            key={b.value}
            variant={baseline === b.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onBaselineChange(b.value)}
          >
            {b.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export const getDateRangeFromPeriod = (period: TemporalPeriod): { from: Date; to: Date } => {
  const now = new Date();
  
  switch (period) {
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'quarter':
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case 'ytd':
      return { from: startOfYear(now), to: now };
    case 't12':
      return { from: subMonths(now, 12), to: now };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
};
