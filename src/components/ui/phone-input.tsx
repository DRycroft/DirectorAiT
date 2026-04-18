import * as React from "react";
import RPNInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

export interface PhoneInputProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  defaultCountry?: any;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hasError?: boolean;
}

/**
 * Shared phone input. Wraps `react-phone-number-input` so every form in the
 * app emits the same E.164 string (e.g. "+64211234567") with no spaces, which
 * matches the database CHECK constraint on profiles/organizations.
 */
const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      id,
      value = "",
      onChange,
      onBlur,
      defaultCountry = "NZ",
      placeholder,
      disabled,
      className,
      hasError,
    },
    _ref,
  ) => {
    return (
      <RPNInput
        id={id}
        international
        defaultCountry={defaultCountry}
        value={value || undefined}
        onChange={(v) => onChange?.((v as string) || "")}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 md:text-sm",
          hasError ? "border-destructive" : "border-input",
          className,
        )}
      />
    );
  },
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
export default PhoneInput;
