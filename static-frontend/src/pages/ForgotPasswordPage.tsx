import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoIcon } from "@/components/shared/logo";
import { auth } from "@/lib/api-client";
import { CheckCircle, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return;
    setIsLoading(true);

    try {
      await auth.forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || t("forgotPassword.genericError"));
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

          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-h2 font-bold text-text-1 mb-2">{t("forgotPassword.checkEmail")}</h1>
              <p className="text-body-sm text-text-2 mb-6" dangerouslySetInnerHTML={{ __html: t("forgotPassword.sentMessage", { email }) }} />
              <Link to="/login" className="text-primary font-semibold hover:underline text-body-sm">
                {t("forgotPassword.backToSignIn")}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-h2 font-bold text-center text-text-1 mb-2">{t("forgotPassword.title")}</h1>
              <p className="text-body-sm text-text-2 text-center mb-8">
                {t("forgotPassword.subtitle")}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("forgotPassword.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="text-sm text-danger text-center p-3 bg-danger/5 rounded-xl border border-danger/20 animate-fade-in">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isLoading || !email.trim()}>
                  {isLoading ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
                </Button>
              </form>

              <p className="mt-6 text-body-sm text-text-2 text-center">
                <Link to="/login" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> {t("forgotPassword.backToSignIn")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
