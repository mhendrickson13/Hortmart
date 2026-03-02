import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  GraduationCap,
  Search,
  Users,
  FileText,
  MessageSquare,
  Star,
  Heart,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";

type EmptyStateType = 
  | "courses"
  | "my-courses"
  | "search"
  | "users"
  | "notes"
  | "questions"
  | "reviews"
  | "favorites"
  | "notifications"
  | "default";

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({
  type = "default",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon: CustomIcon,
  className,
}: EmptyStateProps) {
  const { t } = useTranslation();

  const emptyStateConfig: Record<EmptyStateType, {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
  }> = {
    courses: {
      icon: GraduationCap,
      title: t("emptyState.courses.title"),
      description: t("emptyState.courses.description"),
    },
    "my-courses": {
      icon: BookOpen,
      title: t("emptyState.myCourses.title"),
      description: t("emptyState.myCourses.description"),
      actionLabel: t("emptyState.myCourses.actionLabel"),
      actionHref: "/courses",
    },
    search: {
      icon: Search,
      title: t("emptyState.search.title"),
      description: t("emptyState.search.description"),
    },
    users: {
      icon: Users,
      title: t("emptyState.users.title"),
      description: t("emptyState.users.description"),
    },
    notes: {
      icon: FileText,
      title: t("emptyState.notes.title"),
      description: t("emptyState.notes.description"),
      actionLabel: t("emptyState.notes.actionLabel"),
    },
    questions: {
      icon: MessageSquare,
      title: t("emptyState.questions.title"),
      description: t("emptyState.questions.description"),
      actionLabel: t("emptyState.questions.actionLabel"),
    },
    reviews: {
      icon: Star,
      title: t("emptyState.reviews.title"),
      description: t("emptyState.reviews.description"),
      actionLabel: t("emptyState.reviews.actionLabel"),
    },
    favorites: {
      icon: Heart,
      title: t("emptyState.favorites.title"),
      description: t("emptyState.favorites.description"),
      actionLabel: t("emptyState.favorites.actionLabel"),
      actionHref: "/courses",
    },
    notifications: {
      icon: Bell,
      title: t("emptyState.notifications.title"),
      description: t("emptyState.notifications.description"),
    },
    default: {
      icon: Settings,
      title: t("emptyState.default.title"),
      description: t("emptyState.default.description"),
    },
  };

  const config = emptyStateConfig[type];
  const Icon = CustomIcon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayActionLabel = actionLabel || config.actionLabel;
  const displayActionHref = actionHref || config.actionHref;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-6 text-center",
      className
    )}>
      {/* Icon */}
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 animate-fade-in-up">
        <Icon className="w-9 h-9 text-primary/60" />
      </div>
      
      {/* Title */}
      <h3 className="text-body font-bold text-text-1 mb-1.5">
        {displayTitle}
      </h3>
      
      {/* Description */}
      <p className="text-body-sm text-text-3 max-w-[280px] mb-6">
        {displayDescription}
      </p>
      
      {/* Action Button */}
      {(displayActionLabel || onAction) && (
        displayActionHref ? (
          <Button asChild size="default">
            <Link to={displayActionHref}>
              {displayActionLabel}
            </Link>
          </Button>
        ) : (
          <Button onClick={onAction} size="default">
            {displayActionLabel}
          </Button>
        )
      )}
    </div>
  );
}
