import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
}

const countryCodes = [
  { code: "+1", country: "US/CA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+61", country: "AU", flag: "🇦🇺" },
  { code: "+64", country: "NZ", flag: "🇳🇿" },
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+86", country: "CN", flag: "🇨🇳" },
  { code: "+81", country: "JP", flag: "🇯🇵" },
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+39", country: "IT", flag: "🇮🇹" },
  { code: "+34", country: "ES", flag: "🇪🇸" },
  { code: "+7", country: "RU", flag: "🇷🇺" },
  { code: "+55", country: "BR", flag: "🇧🇷" },
  { code: "+27", country: "ZA", flag: "🇿🇦" },
  { code: "+82", country: "KR", flag: "🇰🇷" },
  { code: "+65", country: "SG", flag: "🇸🇬" },
];

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, ...props }, ref) => {
    // Parse existing value to extract country code and number
    const parseValue = (val: string) => {
      if (!val) return { countryCode: "+64", number: "" };
      
      const matchedCode = countryCodes.find(cc => val.startsWith(cc.code));
      if (matchedCode) {
        return {
          countryCode: matchedCode.code,
          number: val.substring(matchedCode.code.length).trim(),
        };
      }
      return { countryCode: "+64", number: val };
    };

    const { countryCode: initialCode, number: initialNumber } = parseValue(value);
    const [countryCode, setCountryCode] = React.useState(initialCode);
    const [number, setNumber] = React.useState(initialNumber);

    // Update internal state when value prop changes
    React.useEffect(() => {
      const parsed = parseValue(value);
      setCountryCode(parsed.countryCode);
      setNumber(parsed.number);
    }, [value]);

    const handleCountryCodeChange = (newCode: string) => {
      setCountryCode(newCode);
      const fullNumber = number ? `${newCode} ${number}` : "";
      onChange?.(fullNumber);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newNumber = e.target.value;
      setNumber(newNumber);
      const fullNumber = newNumber ? `${countryCode} ${newNumber}` : "";
      onChange?.(fullNumber);
    };

    return (
      <div className="flex gap-2">
        <Select value={countryCode} onValueChange={handleCountryCodeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countryCodes.map((cc) => (
              <SelectItem key={cc.code} value={cc.code}>
                <span className="flex items-center gap-2">
                  <span>{cc.flag}</span>
                  <span>{cc.code}</span>
                  <span className="text-muted-foreground text-xs">{cc.country}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="tel"
          className={cn("flex-1", className)}
          value={number}
          onChange={handleNumberChange}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
