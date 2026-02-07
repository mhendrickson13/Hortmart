"use client";

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
  backLabel = "Go Back",
  variant = "error",
}: AdminErrorStateProps) {
  const Icon = variant === "warning" ? AlertTriangle : AlertCircle;
  const iconColor = variant === "warning" ? "text-warning" : "text-danger";
  
  const defaultTitle = {
    error: "Something went wrong",
    warning: "Action required",
    "not-found": "Not found",
  }[variant];

  const defaultMessage = {
    error: "An error occurred while loading. Please try again.",
    warning: "Please review the information and try again.",
    "not-found": "The resource you're looking for doesn't exist.",
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
            Try Again
          </Button>
        )}
        {onBack && (
          <Button onClick={onBack}>
            {backLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
