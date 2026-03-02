import { useState, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { LogoIcon } from "@/components/shared/logo";
import { useAuth } from "@/lib/auth-context";
import { Check, X, Mail, AtSign, Globe, BookOpen, PenTool } from "lucide-react";
import { validateEmail, validateName, hasStartedEmail, PASSWORD_REQUIREMENTS, EMAIL_REQUIREMENTS } from "@/lib/validation";
import { useTranslation } from "react-i18next";

// ── Email validation indicator ──
function EmailValidationIndicator({ email }: { email: string }) {
  const { t } = useTranslation();
  const validation = useMemo(() => validateEmail(email), [email]);
  const hasStarted = hasStartedEmail(email);

  const strengthLabel = useMemo(() => {
    if (!hasStarted) return "";
    if (validation.isValid) return t("auth.emailStrength.valid");
    if (validation.strength >= 2) return t("auth.emailStrength.almostThere");
    if (validation.strength >= 1) return t("auth.emailStrength.keepGoing");
    return t("auth.emailStrength.invalid");
  }, [hasStarted, validation, t]);

  const strengthColor = useMemo(() => {
    if (validation.isValid) return "bg-success";
    if (validation.strength >= 2) return "bg-warning";
    return "bg-surface-3";
  }, [validation]);

  if (!hasStarted) return null;

  const icons = { format: AtSign, domain: Mail, tld: Globe };

  return (
    <div className="mt-2 space-y-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-500 ease-out rounded-full ${strengthColor}`} style={{ width: `${(validation.strength / EMAIL_REQUIREMENTS.length) * 100}%` }} />
        </div>
        <span className={`text-[11px] font-medium min-w-[70px] text-right transition-colors duration-300 ${validation.isValid ? "text-success" : validation.strength >= 2 ? "text-warning" : "text-text-3"}`}>
          {strengthLabel}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {EMAIL_REQUIREMENTS.map((req) => {
          const passed = req.test(email);
          const Icon = icons[req.id as keyof typeof icons];
          return (
            <div key={req.id} className={`flex items-center gap-1.5 text-[11px] transition-all duration-300 ${passed ? "text-success" : "text-text-3"}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${passed ? "bg-success/15" : "bg-surface-3"}`}>
                {passed ? <Check className="w-2.5 h-2.5" /> : <Icon className="w-2.5 h-2.5" />}
              </div>
              <span className="hidden sm:inline">{t(`auth.emailRequirements.${req.id}`, { defaultValue: req.label })}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Password strength indicator ──
function PasswordStrengthIndicator({ password }: { password: string }) {
  const { t } = useTranslation();
  const strength = useMemo(() => {
    if (!password) return 0;
    return PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length;
  }, [password]);

  const strengthLabel = useMemo(() => {
    if (strength === 0) return "";
    if (strength <= 1) return t("auth.passwordStrength.weak");
    if (strength <= 2) return t("auth.passwordStrength.fair");
    if (strength <= 3) return t("auth.passwordStrength.good");
    return t("auth.passwordStrength.strong");
  }, [strength, t]);

  const strengthColor = useMemo(() => {
    if (strength <= 1) return "bg-danger";
    if (strength <= 2) return "bg-warning";
    if (strength <= 3) return "bg-accent";
    return "bg-success";
  }, [strength]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-500 ease-out rounded-full ${strengthColor}`} style={{ width: `${(strength / 4) * 100}%` }} />
        </div>
        <span className={`text-[11px] font-medium min-w-[50px] text-right transition-colors duration-300 ${strength <= 1 ? "text-danger" : strength <= 2 ? "text-warning" : strength <= 3 ? "text-accent" : "text-success"}`}>
          {strengthLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {PASSWORD_REQUIREMENTS.map((req) => {
          const passed = req.test(password);
          return (
            <div key={req.id} className={`flex items-center gap-1.5 text-[11px] transition-all duration-300 ${passed ? "text-success" : "text-text-3"}`}>
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300 ${passed ? "bg-success/15" : "bg-surface-3"}`}>
                {passed ? <Check className="w-2 h-2" /> : <X className="w-2 h-2" />}
              </div>
              {t(`auth.passwordRequirements.${req.id}`, { defaultValue: req.label })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Register Page ──
export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"LEARNER" | "CREATOR">("LEARNER");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailValidation = useMemo(() => validateEmail(email), [email]);
  const nameValidation = useMemo(() => validateName(name), [name]);
  const isPasswordValid = useMemo(() => PASSWORD_REQUIREMENTS.every((req) => req.test(password)), [password]);
  const passwordsMatch = password === confirmPassword && confirmPassword !== "";
  const isFormValid = nameValidation.isValid && emailValidation.isValid && isPasswordValid && passwordsMatch;

  const from = (location.state as any)?.from as { pathname?: string; search?: string } | undefined;
  const returnTo = from?.pathname ? `${from.pathname}${from.search || ""}` : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isFormValid) return;
    setIsLoading(true);
    try {
      const result = await register({ email: email.trim(), password, name: name.trim(), role });
      if (result.success) {
        if (returnTo) {
          navigate(returnTo, { replace: true });
        } else {
          // Creator goes to dashboard, learner goes to courses
          navigate(role === "CREATOR" ? "/dashboard" : "/courses", { replace: true });
        }
      } else {
        setError(result.error || t("auth.register.registrationFailed"));
      }
    } catch {
      setError(t("auth.genericError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8">
          <div className="flex justify-center mb-8">
            <LogoIcon size="lg" />
          </div>
          <h1 className="text-h2 font-bold text-center text-text-1 mb-2">{t("auth.register.title")}</h1>
          <p className="text-body-sm text-text-2 text-center mb-6">{t("auth.register.subtitle")}</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole("LEARNER")}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                role === "LEARNER"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-surface-3 bg-surface-1 hover:border-text-3"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                role === "LEARNER" ? "bg-primary/15 text-primary" : "bg-surface-3 text-text-3"
              }`}>
                <BookOpen className="w-5 h-5" />
              </div>
              <span className={`text-body-sm font-bold transition-colors ${
                role === "LEARNER" ? "text-primary" : "text-text-2"
              }`}>{t("auth.roles.learner")}</span>
              <span className="text-[11px] text-text-3 text-center leading-tight">{t("auth.roles.learnerDesc")}</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("CREATOR")}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                role === "CREATOR"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-surface-3 bg-surface-1 hover:border-text-3"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                role === "CREATOR" ? "bg-primary/15 text-primary" : "bg-surface-3 text-text-3"
              }`}>
                <PenTool className="w-5 h-5" />
              </div>
              <span className={`text-body-sm font-bold transition-colors ${
                role === "CREATOR" ? "text-primary" : "text-text-2"
              }`}>{t("auth.roles.creator")}</span>
              <span className="text-[11px] text-text-3 text-center leading-tight">{t("auth.roles.creatorDesc")}</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("auth.fullName")}</Label>
              <div className="relative">
                <Input id="name" type="text" placeholder={t("auth.fullNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name"
                  className={nameValidation.isValid ? "border-success focus:border-success focus:ring-success/20 pr-10" : ""}
                />
                {nameValidation.isValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                    <Check className="w-3 h-3 text-success" />
                  </div>
                )}
              </div>
              {name.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] animate-fade-in">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${nameValidation.isValid ? "bg-success/15" : "bg-surface-3"}`}>
                    <Check className={`w-2.5 h-2.5 transition-colors duration-300 ${nameValidation.isValid ? "text-success" : "text-text-3"}`} />
                  </div>
                  <span className={`transition-colors duration-300 ${nameValidation.isValid ? "text-success" : "text-text-3"}`}>{t("auth.nameMinChars")}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("common.email")}</Label>
              <div className="relative">
                <Input id="email" type="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                  className={emailValidation.isValid ? "border-success focus:border-success focus:ring-success/20 pr-10" : ""}
                />
                {emailValidation.isValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                    <Check className="w-3 h-3 text-success" />
                  </div>
                )}
              </div>
              <EmailValidationIndicator email={email} />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <PasswordInput id="password" placeholder={t("auth.register.passwordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password"
                className={isPasswordValid ? "border-success focus:border-success focus:ring-success/20" : ""}
              />
              <PasswordStrengthIndicator password={password} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
              <PasswordInput id="confirmPassword" placeholder={t("auth.register.confirmPasswordPlaceholder")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password"
                className={confirmPassword && passwordsMatch ? "border-success focus:border-success focus:ring-success/20" : ""}
              />
              {confirmPassword.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] animate-fade-in">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${passwordsMatch ? "bg-success/15" : "bg-surface-3"}`}>
                    <Check className={`w-2.5 h-2.5 transition-colors duration-300 ${passwordsMatch ? "text-success" : "text-text-3"}`} />
                  </div>
                  <span className={`transition-colors duration-300 ${passwordsMatch ? "text-success" : "text-text-3"}`}>{t("auth.passwordsMatch")}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-danger text-center p-3 bg-danger/5 rounded-xl border border-danger/20 animate-fade-in">{error}</div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isLoading || !isFormValid}>
              {isLoading ? t("auth.register.creatingAccount") : t("auth.register.createAccount")}
            </Button>
          </form>

          <p className="mt-6 text-body-sm text-text-2 text-center">
            {t("auth.register.haveAccount")} {" "}
            <Link to="/login" state={location.state} className="text-primary font-semibold hover:underline">{t("auth.login.signIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
