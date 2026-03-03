import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "@/components/shared/logo";
import { apiClient, ApiError, InviteAcceptResponse } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

export default function InvitePage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  const inviteToken = useMemo(() => {
    return new URLSearchParams(location.search).get("token");
  }, [location.search]);

  const [status, setStatus] = useState<"idle" | "accepting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteAcceptResponse | null>(null);

  const acceptOnceRef = useRef(false);

  const returnState = useMemo(() => {
    return { from: { pathname: "/invite", search: location.search } };
  }, [location.search]);

  useEffect(() => {
    if (acceptOnceRef.current) return;
    if (isLoading) return;
    if (!inviteToken) return;
    if (!isAuthenticated) return;

    acceptOnceRef.current = true;
    setStatus("accepting");
    setError(null);

    apiClient.invites
      .accept(inviteToken)
      .then((res) => {
        setResult(res);
        setStatus("success");
      })
      .catch((err) => {
        const message =
          err instanceof ApiError
            ? (err as ApiError).message
            : err instanceof Error
              ? err.message
              : t("invite.failed");
        setError(message);
        setStatus("error");
      });
  }, [inviteToken, isAuthenticated, isLoading]);

  const handleSignOutAndRetry = () => {
    logout();
    acceptOnceRef.current = false;
    navigate("/login", { state: returnState });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8">
          <div className="flex justify-center mb-6">
            <LogoIcon size="lg" />
          </div>

          <h1 className="text-h2 font-bold text-center text-text-1 mb-2">{t("invite.title")}</h1>
          <p className="text-body-sm text-text-2 text-center mb-6">
            {t("invite.subtitle")}
          </p>

          {!inviteToken && (
            <div className="text-sm text-danger text-center p-3 bg-danger/5 rounded-xl border border-danger/20">
              {t("invite.missingToken")}
            </div>
          )}

          {inviteToken && !isAuthenticated && !isLoading && (
            <div className="space-y-4">
              <div className="text-sm text-text-2 text-center p-3 bg-muted/40 rounded-xl border border-border/60">
                {t("invite.signInRequired")}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button asChild size="lg" className="w-full">
                  <Link to="/login" state={returnState}>
                    {t("invite.signIn")}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link to="/register" state={returnState}>
                    {t("invite.createAccount")}
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {inviteToken && isAuthenticated && (
            <div className="space-y-4">
              <div className="text-sm text-text-2 text-center p-3 bg-muted/40 rounded-xl border border-border/60">
                {t("invite.signedInAs")} <span className="font-semibold text-text-1">{user?.email}</span>
              </div>

              {status === "accepting" && (
                <div className="text-sm text-text-2 text-center p-3 bg-primary/5 rounded-xl border border-primary/15">
                  {t("invite.accepting")}
                </div>
              )}

              {status === "success" && result && (
                <div className="space-y-3">
                  <div className="text-sm text-success text-center p-3 bg-success/10 rounded-xl border border-success/20">
                    {t("invite.successMessage")} <span className="font-semibold">{result.courseTitle}</span>.
                  </div>

                  <Button asChild size="lg" className="w-full">
                    <Link to={`/course/${result.courseId}`}>{t("invite.goToCourse")}</Link>
                  </Button>
                </div>
              )}

              {status === "error" && (
                <div className="space-y-3">
                  <div className="text-sm text-danger text-center p-3 bg-danger/5 rounded-xl border border-danger/20">
                    {error || t("invite.failed")}
                  </div>

                  <Button variant="outline" size="lg" className="w-full" onClick={handleSignOutAndRetry}>
                    {t("invite.differentAccount")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="text-sm text-text-2 text-center p-3 bg-muted/40 rounded-xl border border-border/60">
              {t("invite.loading")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
