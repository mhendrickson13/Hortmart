import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { LogoIcon } from "@/components/shared/logo";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid = email.trim().length > 0 && password.length > 0;

  // Where to redirect after login
  const from = (location.state as any)?.from as { pathname?: string; search?: string } | undefined;
  const returnTo = from?.pathname ? `${from.pathname}${from.search || ""}` : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isFormValid) return;
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        // Use return-to path if available, otherwise redirect by role
        // After successful login, user is set in context; read from localStorage
        const storedUser = localStorage.getItem("cxflow_user");
        const userRole = storedUser ? JSON.parse(storedUser).role : null;
        if (returnTo) {
          navigate(returnTo, { replace: true });
        } else if (userRole === "ADMIN" || userRole === "CREATOR") {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/courses", { replace: true });
        }
      } else {
        setError(result.error || t("auth.login.invalidCredentials"));
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

          <h1 className="text-h2 font-bold text-center text-text-1 mb-2">{t("auth.login.title")}</h1>
          <p className="text-body-sm text-text-2 text-center mb-8">{t("auth.login.subtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input id="email" type="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <PasswordInput id="password" placeholder={t("auth.login.passwordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs text-primary font-semibold hover:underline">{t("auth.login.forgotPassword")}</Link>
              </div>
            </div>

            {error && (
              <div className="text-sm text-danger text-center p-3 bg-danger/5 rounded-xl border border-danger/20 animate-fade-in">{error}</div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={isLoading || !isFormValid}>
              {isLoading ? t("auth.login.signingIn") : t("auth.login.signIn")}
            </Button>
          </form>

          <p className="mt-6 text-body-sm text-text-2 text-center">
            {t("auth.login.noAccount")} {" "}
            <Link to="/register" state={location.state} className="text-primary font-semibold hover:underline">{t("auth.login.signUp")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
