import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

export interface DatePickerFieldProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

/**
 * DatePickerField Component
 * 
 * A date picker with calendar popup, year/month dropdowns for easy navigation.
 * Ideal for board meeting dates, compliance due dates, etc.
 * 
 * @example
 * ```tsx
 * <DatePickerField
 *   value={meetingDate}
 *   onChange={setMeetingDate}
 *   label="Meeting Date"
 *   minDate={subYears(new Date(), 2)}
 *   maxDate={addYears(new Date(), 1)}
 * />
 * ```
 */
export function DatePickerField({
  value,
  onChange,
  label,
  placeholder = "Pick a date",
  minDate,
  maxDate,
  disabled = false,
  required = false,
  className,
  id,
}: DatePickerFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            initialFocus
            showYearMonthDropdowns={true}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
