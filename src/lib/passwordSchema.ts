import { z } from "zod";

/**
 * Shared password validation schema used across signup and invite flows.
 * Do NOT weaken these rules without a security review.
 */
export const passwordSchema = z.string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be less than 128 characters")
  .refine(
    (password) => /[A-Z]/.test(password),
    "Password must contain at least one uppercase letter"
  )
  .refine(
    (password) => /[a-z]/.test(password),
    "Password must contain at least one lowercase letter"
  )
  .refine(
    (password) => /[0-9]/.test(password),
    "Password must contain at least one number"
  )
  .refine(
    (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
    "Password must contain at least one special character"
  )
  .refine(
    (password) => !/(.)\1{2,}/.test(password),
    "Password cannot contain repeated characters"
  )
  .refine(
    (password) => !/^(password|12345678|qwerty)/i.test(password),
    "Password is too common"
  );

export const PASSWORD_REQUIREMENTS_TEXT =
  "Must be 10+ characters with uppercase, lowercase, numbers, and special characters";
