/**
 * Email validation utilities
 */

export const EMAIL_REQUIREMENTS = [
  { 
    id: "format", 
    label: "Contains @", 
    test: (e: string) => {
      const trimmed = e.trim();
      const parts = trimmed.split("@");
      return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
    }
  },
  { 
    id: "domain", 
    label: "Domain name", 
    test: (e: string) => {
      const trimmed = e.trim();
      if (!trimmed.includes("@")) return false;
      const domain = trimmed.split("@")[1];
      if (!domain || !domain.includes(".")) return false;
      const parts = domain.split(".");
      return parts.every(part => part.length > 0);
    }
  },
  { 
    id: "tld", 
    label: "Valid extension", 
    test: (e: string) => {
      const trimmed = e.trim();
      if (!trimmed.includes("@")) return false;
      const domain = trimmed.split("@")[1];
      if (!domain || !domain.includes(".")) return false;
      const parts = domain.split(".");
      const tld = parts[parts.length - 1];
      return tld && tld.length >= 2 && /^[a-zA-Z]+$/.test(tld);
    }
  },
] as const;

export interface EmailValidationResult {
  isValid: boolean;
  strength: number;
  error?: string;
}

export function validateEmail(email: string): EmailValidationResult {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) return { isValid: false, strength: 0, error: "Email is required" };
  const strength = EMAIL_REQUIREMENTS.filter((req) => req.test(trimmedEmail)).length;
  if (trimmedEmail.length > 254) return { isValid: false, strength, error: "Email address is too long" };
  if (!EMAIL_REQUIREMENTS[0].test(trimmedEmail)) return { isValid: false, strength, error: "Enter a valid email format" };
  const atIndex = trimmedEmail.indexOf("@");
  const localPart = trimmedEmail.substring(0, atIndex);
  const domain = trimmedEmail.substring(atIndex + 1);
  if (localPart.length > 64) return { isValid: false, strength, error: "Username part is too long" };
  if (/\.\./.test(localPart)) return { isValid: false, strength, error: "Cannot have consecutive dots" };
  if (localPart.startsWith(".") || localPart.endsWith(".")) return { isValid: false, strength, error: "Cannot start or end with a dot" };
  if (!domain || !domain.includes(".")) return { isValid: false, strength, error: "Enter a valid domain" };
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) return { isValid: false, strength, error: "Enter a valid domain extension" };
  if (!/^[a-zA-Z]+$/.test(tld)) return { isValid: false, strength, error: "Invalid domain extension" };
  for (const part of domainParts) {
    if (part.startsWith("-") || part.endsWith("-")) return { isValid: false, strength, error: "Invalid domain format" };
  }
  return { isValid: true, strength: EMAIL_REQUIREMENTS.length };
}

export function hasStartedEmail(email: string): boolean {
  return email.trim().length > 0;
}

/**
 * Password validation utilities
 */
export const PASSWORD_REQUIREMENTS = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
] as const;

export function validatePassword(password: string): { isValid: boolean; strength: number; error?: string } {
  if (!password) return { isValid: false, strength: 0, error: "Password is required" };
  const strength = PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length;
  const isValid = strength === PASSWORD_REQUIREMENTS.length;
  return { isValid, strength, error: isValid ? undefined : "Password does not meet requirements" };
}

/**
 * Name validation
 */
export function validateName(name: string): { isValid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) return { isValid: false, error: "Full name is required" };
  if (trimmed.length < 2) return { isValid: false, error: "Name must be at least 2 characters" };
  if (trimmed.length > 100) return { isValid: false, error: "Name is too long" };
  return { isValid: true };
}
