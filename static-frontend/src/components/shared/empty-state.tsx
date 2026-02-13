import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

const emptyStateConfig: Record<EmptyStateType, {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}> = {
  courses: {
    icon: GraduationCap,
    title: "No courses yet",
    description: "We're working on adding new courses. Check back soon!",
  },
  "my-courses": {
    icon: BookOpen,
    title: "No enrolled courses",
    description: "Start your learning journey by exploring our course catalog.",
    actionLabel: "Browse Courses",
    actionHref: "/courses",
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "Try adjusting your search or filters to find what you're looking for.",
  },
  users: {
    icon: Users,
    title: "No users found",
    description: "There are no users matching your criteria.",
  },
  notes: {
    icon: FileText,
    title: "No notes yet",
    description: "Add notes while watching to keep track of important concepts.",
    actionLabel: "Start Taking Notes",
  },
  questions: {
    icon: MessageSquare,
    title: "No questions yet",
    description: "Be the first to ask a question about this lesson!",
    actionLabel: "Ask a Question",
  },
  reviews: {
    icon: Star,
    title: "No reviews yet",
    description: "Be the first to review this course and help others decide.",
    actionLabel: "Write a Review",
  },
  favorites: {
    icon: Heart,
    title: "No favorites",
    description: "Courses you favorite will appear here for easy access.",
    actionLabel: "Explore Courses",
    actionHref: "/courses",
  },
  notifications: {
    icon: Bell,
    title: "All caught up!",
    description: "You have no new notifications at this time.",
  },
  default: {
    icon: Settings,
    title: "Nothing here yet",
    description: "Content will appear here once available.",
  },
};

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
