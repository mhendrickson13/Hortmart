/**
 * Email validation utilities
 */

// Email validation requirements for checklist display
export const EMAIL_REQUIREMENTS = [
  { 
    id: "format", 
    label: "Contains @", 
    test: (e: string) => {
      const trimmed = e.trim();
      // Must have exactly one @ and characters on both sides
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
      // Domain must have at least one dot and valid structure
      if (!domain || !domain.includes(".")) return false;
      const parts = domain.split(".");
      // Each part must have at least 1 character and no consecutive dots
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
      // TLD must be at least 2 characters and only letters
      return tld && tld.length >= 2 && /^[a-zA-Z]+$/.test(tld);
    }
  },
] as const;

export interface EmailValidationResult {
  isValid: boolean;
  strength: number;
  error?: string;
}

/**
 * Validates an email address with comprehensive checks
 */
export function validateEmail(email: string): EmailValidationResult {
  const trimmedEmail = email.trim();

  // Check if empty
  if (!trimmedEmail) {
    return { isValid: false, strength: 0, error: "Email is required" };
  }

  // Calculate strength based on requirements
  const strength = EMAIL_REQUIREMENTS.filter((req) => req.test(trimmedEmail)).length;

  // Check length
  if (trimmedEmail.length > 254) {
    return { isValid: false, strength, error: "Email address is too long" };
  }

  // Check for basic structure first
  if (!EMAIL_REQUIREMENTS[0].test(trimmedEmail)) {
    return { isValid: false, strength, error: "Enter a valid email format" };
  }

  // Split into local and domain parts
  const atIndex = trimmedEmail.indexOf("@");
  const localPart = trimmedEmail.substring(0, atIndex);
  const domain = trimmedEmail.substring(atIndex + 1);

  // Validate local part length (max 64 characters)
  if (localPart.length > 64) {
    return { isValid: false, strength, error: "Username part is too long" };
  }

  // Check for consecutive dots in local part
  if (/\.\./.test(localPart)) {
    return { isValid: false, strength, error: "Cannot have consecutive dots" };
  }

  // Check if local part starts or ends with a dot
  if (localPart.startsWith(".") || localPart.endsWith(".")) {
    return { isValid: false, strength, error: "Cannot start or end with a dot" };
  }

  // Validate domain has proper structure
  if (!domain || !domain.includes(".")) {
    return { isValid: false, strength, error: "Enter a valid domain" };
  }

  // Check for valid TLD
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) {
    return { isValid: false, strength, error: "Enter a valid domain extension" };
  }

  // Check TLD contains only letters
  if (!/^[a-zA-Z]+$/.test(tld)) {
    return { isValid: false, strength, error: "Invalid domain extension" };
  }

  // Check domain doesn't start or end with hyphen
  for (const part of domainParts) {
    if (part.startsWith("-") || part.endsWith("-")) {
      return { isValid: false, strength, error: "Invalid domain format" };
    }
  }

  // All checks passed
  return { isValid: true, strength: EMAIL_REQUIREMENTS.length };
}

/**
 * Check if user has started typing an email (for showing validation UI)
 */
export function hasStartedEmail(email: string): boolean {
  return email.trim().length > 0;
}

/**
 * Check if email looks complete enough to validate
 */
export function isTypingEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.includes("@") && trimmed.length >= 5;
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
  if (!password) {
    return { isValid: false, strength: 0, error: "Password is required" };
  }

  const strength = PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length;
  const isValid = strength === PASSWORD_REQUIREMENTS.length;

  return {
    isValid,
    strength,
    error: isValid ? undefined : "Password does not meet requirements",
  };
}

/**
 * Name validation
 */
export function validateName(name: string): { isValid: boolean; error?: string } {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { isValid: false, error: "Full name is required" };
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: "Name must be at least 2 characters" };
  }
  
  if (trimmed.length > 100) {
    return { isValid: false, error: "Name is too long" };
  }
  
  return { isValid: true };
}
