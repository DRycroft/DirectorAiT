import { z } from 'zod';

export const COUNTRY_CODES = [
  { code: "+1", country: "US/CA", flag: "🇺🇸", pattern: /^\d{10}$/, example: "2025551234" },
  { code: "+44", country: "UK", flag: "🇬🇧", pattern: /^[1-9]\d{9,10}$/, example: "2012345678" },
  { code: "+61", country: "AU", flag: "🇦🇺", pattern: /^[2-9]\d{8}$/, example: "212345678" },
  { code: "+64", country: "NZ", flag: "🇳🇿", pattern: /^[2-9]\d{7,9}$/, example: "212345678" },
  { code: "+33", country: "FR", flag: "🇫🇷", pattern: /^[1-9]\d{8}$/, example: "123456789" },
  { code: "+49", country: "DE", flag: "🇩🇪", pattern: /^[1-9]\d{9,11}$/, example: "1512345678" },
  { code: "+81", country: "JP", flag: "🇯🇵", pattern: /^[1-9]\d{8,9}$/, example: "312345678" },
  { code: "+86", country: "CN", flag: "🇨🇳", pattern: /^1[3-9]\d{9}$/, example: "13812345678" },
  { code: "+91", country: "IN", flag: "🇮🇳", pattern: /^[6-9]\d{9}$/, example: "9876543210" },
  { code: "+65", country: "SG", flag: "🇸🇬", pattern: /^[689]\d{7}$/, example: "91234567" },
  { code: "+852", country: "HK", flag: "🇭🇰", pattern: /^[5-9]\d{7}$/, example: "91234567" },
  { code: "+27", country: "ZA", flag: "🇿🇦", pattern: /^[1-9]\d{8}$/, example: "712345678" },
  { code: "+55", country: "BR", flag: "🇧🇷", pattern: /^[1-9]\d{10}$/, example: "11987654321" },
  { code: "+52", country: "MX", flag: "🇲🇽", pattern: /^[1-9]\d{9}$/, example: "5512345678" },
  { code: "+34", country: "ES", flag: "🇪🇸", pattern: /^[6-9]\d{8}$/, example: "612345678" },
  { code: "+39", country: "IT", flag: "🇮🇹", pattern: /^3\d{8,9}$/, example: "3123456789" },
] as const;

export interface PhoneValidationResult {
  valid: boolean;
  message: string;
  formatted?: string;
}

/**
 * Validates a phone number against country-specific rules
 * @param phone - The phone number to validate (without country code)
 * @param countryCode - The country code (e.g., "+64")
 * @returns Validation result with formatted number in E.164 format
 * @example
 * validatePhoneNumber("212345678", "+64")
 * // Returns: { valid: true, message: "", formatted: "+64212345678" }
 */
export function validatePhoneNumber(
  phone: string,
  countryCode: string
): PhoneValidationResult {
  if (!phone?.trim()) {
    return { valid: true, message: "" }; // Optional field
  }

  const country = COUNTRY_CODES.find((c) => c.code === countryCode);
  if (!country) {
    return { valid: false, message: "Invalid country code" };
  }

  const cleanNumber = phone.replace(/[\s\-()]/g, "");

  if (!country.pattern.test(cleanNumber)) {
    return {
      valid: false,
      message: `Invalid ${country.country} phone number. Example: ${country.example}`,
    };
  }

  // Return E.164 format (no spaces)
  return {
    valid: true,
    message: "",
    formatted: `${countryCode}${cleanNumber}`,
  };
}

/**
 * Zod schema for phone number validation
 * Use this in forms with react-hook-form
 */
export const createPhoneSchema = (countryCode: string) =>
  z
    .string()
    .trim()
    .refine(
      (val) => !val || validatePhoneNumber(val, countryCode).valid,
      (val) => ({ message: validatePhoneNumber(val, countryCode).message })
    )
    .transform((val) => {
      if (!val) return "";
      const result = validatePhoneNumber(val, countryCode);
      return result.formatted || val;
    });

/**
 * Simple phone schema that accepts any valid phone format
 * Used when country code is selected dynamically
 */
export const phoneSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""));
