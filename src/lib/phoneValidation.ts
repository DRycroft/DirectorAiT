import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";

export interface PhoneValidationResult {
  valid: boolean;
  message: string;
  formatted?: string;
}

/**
 * Validate an E.164 phone string (e.g. "+64211234567"). Empty is valid
 * (treated as optional). Uses libphonenumber-js via react-phone-number-input,
 * so it correctly handles NZ leading-zero stripping, country length rules, etc.
 */
export function validatePhoneNumber(value: string): PhoneValidationResult {
  if (!value?.trim()) return { valid: true, message: "" };
  if (!value.startsWith("+")) {
    return { valid: false, message: "Phone number must include a country code" };
  }
  if (!isValidPhoneNumber(value)) {
    return { valid: false, message: "Please enter a valid phone number" };
  }
  return { valid: true, message: "", formatted: value };
}

/**
 * Single shared optional phone schema used by every form.
 * Accepts empty string or any valid E.164 number.
 */
export const phoneSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || validatePhoneNumber(val).valid, {
    message: "Please enter a valid phone number",
  });
