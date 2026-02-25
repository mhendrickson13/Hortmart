import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface AdminErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
  backLabel?: string;
  variant?: "error" | "warning" | "not-found";
}

export function AdminErrorState({
  title,
  message,
  onRetry,
  onBack,
  backLabel,
  variant = "error",
}: AdminErrorStateProps) {
  const { t } = useTranslation();
  const Icon = variant === "warning" ? AlertTriangle : AlertCircle;
  const iconColor = variant === "warning" ? "text-warning" : "text-danger";
  
  const defaultTitle = {
    error: t("admin.errorState.somethingWentWrong"),
    warning: t("admin.errorState.actionRequired"),
    "not-found": t("admin.errorState.notFound"),
  }[variant];

  const defaultMessage = {
    error: t("admin.errorState.errorMessage"),
    warning: t("admin.errorState.warningMessage"),
    "not-found": t("admin.errorState.notFoundMessage"),
  }[variant];

  return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
      <div className={`w-16 h-16 rounded-2xl bg-muted flex items-center justify-center`}>
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>
      <div className="text-center">
        <h3 className="text-h3 font-bold text-text-1 mb-2">
          {title || defaultTitle}
        </h3>
        <p className="text-body-sm text-text-2 max-w-sm">
          {message || defaultMessage}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("admin.errorState.tryAgain")}
          </Button>
        )}
        {onBack && (
          <Button onClick={onBack}>
            {backLabel || t("admin.errorState.goBack")}
          </Button>
        )}
      </div>
    </div>
  );
}
