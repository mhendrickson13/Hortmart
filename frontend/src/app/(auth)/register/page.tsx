"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { LogoIcon } from "@/components/shared/logo";
import { auth, ApiError } from "@/lib/api-client";
import { Check, X, Mail, AtSign, Globe } from "lucide-react";
import { validateEmail, validateName, hasStartedEmail, PASSWORD_REQUIREMENTS, EMAIL_REQUIREMENTS } from "@/lib/validation";

// Email validation indicator component
function EmailValidationIndicator({ email }: { email: string }) {
  const validation = useMemo(() => validateEmail(email), [email]);
  const hasStarted = hasStartedEmail(email);

  const strengthLabel = useMemo(() => {
    if (!hasStarted) return "";
    if (validation.isValid) return "Valid";
    if (validation.strength >= 2) return "Almost there";
    if (validation.strength >= 1) return "Keep going";
    return "Invalid";
  }, [hasStarted, validation]);

  const strengthColor = useMemo(() => {
    if (validation.isValid) return "bg-success";
    if (validation.strength >= 2) return "bg-warning";
    return "bg-surface-3";
  }, [validation]);

  if (!hasStarted) return null;

  const icons = {
    format: AtSign,
    domain: Mail,
    tld: Globe,
  };

  return (
    <div className="mt-2 space-y-2 animate-fade-in">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out rounded-full ${strengthColor}`}
            style={{ width: `${(validation.strength / EMAIL_REQUIREMENTS.length) * 100}%` }}
          />
        </div>
        <span className={`text-[11px] font-medium min-w-[70px] text-right transition-colors duration-300 ${
          validation.isValid ? "text-success" : 
          validation.strength >= 2 ? "text-warning" : "text-text-3"
        }`}>
          {strengthLabel}
        </span>
      </div>

      {/* Requirements checklist */}
      <div className="flex items-center gap-4">
        {EMAIL_REQUIREMENTS.map((req) => {
          const passed = req.test(email);
          const Icon = icons[req.id as keyof typeof icons];
          return (
            <div
              key={req.id}
              className={`flex items-center gap-1.5 text-[11px] transition-all duration-300 ${
                passed ? "text-success" : "text-text-3"
              }`}
            >
              <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                passed ? "bg-success/15" : "bg-surface-3"
              }`}>
                {passed ? (
                  <Check className="w-2.5 h-2.5" />
                ) : (
                  <Icon className="w-2.5 h-2.5" />
                )}
              </div>
              <span className="hidden sm:inline">{req.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = useMemo(() => {
    if (!password) return 0;
    return PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length;
  }, [password]);

  const strengthLabel = useMemo(() => {
    if (strength === 0) return "";
    if (strength <= 1) return "Weak";
    if (strength <= 2) return "Fair";
    if (strength <= 3) return "Good";
    return "Strong";
  }, [strength]);

  const strengthColor = useMemo(() => {
    if (strength <= 1) return "bg-danger";
    if (strength <= 2) return "bg-warning";
    if (strength <= 3) return "bg-accent";
    return "bg-success";
  }, [strength]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2 animate-fade-in">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out rounded-full ${strengthColor}`}
            style={{ width: `${(strength / 4) * 100}%` }}
          />
        </div>
        <span className={`text-[11px] font-medium min-w-[50px] text-right transition-colors duration-300 ${
          strength <= 1 ? "text-danger" : 
          strength <= 2 ? "text-warning" : 
          strength <= 3 ? "text-accent" : "text-success"
        }`}>
          {strengthLabel}
        </span>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {PASSWORD_REQUIREMENTS.map((req) => {
          const passed = req.test(password);
          return (
            <div
              key={req.id}
              className={`flex items-center gap-1.5 text-[11px] transition-all duration-300 ${
                passed ? "text-success" : "text-text-3"
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300 ${
                passed ? "bg-success/15" : "bg-surface-3"
              }`}>
                {passed ? (
                  <Check className="w-2 h-2" />
                ) : (
                  <X className="w-2 h-2" />
                )}
              </div>
              {req.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Real-time validations
  const emailValidation = useMemo(() => validateEmail(email), [email]);
  const nameValidation = useMemo(() => validateName(name), [name]);
  const isPasswordValid = useMemo(() => {
    return PASSWORD_REQUIREMENTS.every((req) => req.test(password));
  }, [password]);
  const passwordsMatch = password === confirmPassword && confirmPassword !== "";

  // Form is valid when all fields pass validation
  const isFormValid = nameValidation.isValid && emailValidation.isValid && isPasswordValid && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isFormValid) return;

    setIsLoading(true);

    try {
      await auth.register({ name: name.trim(), email: email.trim(), password });
      router.push("/login?registered=true");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <LogoIcon size="lg" />
          </div>

          <h1 className="text-h2 font-bold text-center text-text-1 mb-2">
            Create an account
          </h1>
          <p className="text-body-sm text-text-2 text-center mb-8">
            Start your learning journey today
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className={
                    nameValidation.isValid
                      ? "border-success focus:border-success focus:ring-success/20 pr-10"
                      : ""
                  }
                />
                {nameValidation.isValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                    <Check className="w-3 h-3 text-success" />
                  </div>
                )}
              </div>
              {name.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] animate-fade-in">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                    nameValidation.isValid ? "bg-success/15" : "bg-surface-3"
                  }`}>
                    <Check className={`w-2.5 h-2.5 transition-colors duration-300 ${
                      nameValidation.isValid ? "text-success" : "text-text-3"
                    }`} />
                  </div>
                  <span className={`transition-colors duration-300 ${
                    nameValidation.isValid ? "text-success" : "text-text-3"
                  }`}>
                    At least 2 characters
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={
                    emailValidation.isValid
                      ? "border-success focus:border-success focus:ring-success/20 pr-10"
                      : ""
                  }
                />
                {emailValidation.isValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                    <Check className="w-3 h-3 text-success" />
                  </div>
                )}
              </div>
              <EmailValidationIndicator email={email} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={
                  isPasswordValid
                    ? "border-success focus:border-success focus:ring-success/20"
                    : ""
                }
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <PasswordInput
                id="confirmPassword"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={
                  confirmPassword && passwordsMatch 
                    ? "border-success focus:border-success focus:ring-success/20"
                    : ""
                }
              />
              {confirmPassword.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] animate-fade-in">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                    passwordsMatch ? "bg-success/15" : "bg-surface-3"
                  }`}>
                    <Check className={`w-2.5 h-2.5 transition-colors duration-300 ${
                      passwordsMatch ? "text-success" : "text-text-3"
                    }`} />
                  </div>
                  <span className={`transition-colors duration-300 ${
                    passwordsMatch ? "text-success" : "text-text-3"
                  }`}>
                    Passwords match
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-danger text-center p-3 bg-danger/5 rounded-xl border border-danger/20 animate-fade-in">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-body-sm text-text-2 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
