import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { LogoIcon } from "@/components/shared/logo";
import { auth } from "@/lib/api-client";
import { Check, X, CheckCircle, XCircle } from "lucide-react";
import { PASSWORD_REQUIREMENTS } from "@/lib/validation";

// ── Password strength indicator (same as signup) ──
function PasswordStrengthIndicator({ password }: { password: string }) {
  const { t } = useTranslation();
  const strength = useMemo(() => {
    if (!password) return 0;
    return PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length;
  }, [password]);

  const strengthLabel = useMemo(() => {
    if (strength === 0) return "";
    if (strength <= 1) return t("resetPassword.weak");
    if (strength <= 2) return t("resetPassword.fair");
    if (strength <= 3) return t("resetPassword.good");
    return t("resetPassword.strong");
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
              {req.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const passwordValid = useMemo(() => PASSWORD_REQUIREMENTS.every((req) => req.test(password)), [password]);
  const isFormValid = passwordValid && password === confirmPassword && token.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isFormValid) return;
    setIsLoading(true);

    try {
      await auth.resetPassword({ token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || t("resetPassword.failedError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-danger" />
            </div>
            <h1 className="text-h2 font-bold text-text-1 mb-2">{t("resetPassword.invalidLink")}</h1>
            <p className="text-body-sm text-text-2 mb-6">{t("resetPassword.invalidLinkMessage")}</p>
            <Link to="/forgot-password" className="text-primary font-semibold hover:underline text-body-sm">
              {t("resetPassword.requestNewLink")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8">
          <div className="flex justify-center mb-8">
            <LogoIcon size="lg" />
          </div>

          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-h2 font-bold text-text-1 mb-2">{t("resetPassword.success")}</h1>
              <p className="text-body-sm text-text-2 mb-6">
                {t("resetPassword.successMessage")}
              </p>
              <Link to="/login">
                <Button className="w-full" size="lg">{t("resetPassword.signIn")}</Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-h2 font-bold text-center text-text-1 mb-2">{t("resetPassword.title")}</h1>
              <p className="text-body-sm text-text-2 text-center mb-8">
                {t("resetPassword.subtitle")}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("resetPassword.newPassword")}</Label>
                  <PasswordInput
                    id="password"
                    placeholder={t("resetPassword.placeholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    autoFocus
                  />
                  <PasswordStrengthIndicator password={password} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">{t("resetPassword.confirmPassword")}</Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder={t("resetPassword.confirmPlaceholder")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-danger mt-1">{t("resetPassword.passwordsDontMatch")}</p>
                  )}
                </div>

                {error && (
                  <div className="text-sm text-danger text-center p-3 bg-danger/5 rounded-xl border border-danger/20 animate-fade-in">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isLoading || !isFormValid}>
                  {isLoading ? t("resetPassword.resetting") : t("resetPassword.resetButton")}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
