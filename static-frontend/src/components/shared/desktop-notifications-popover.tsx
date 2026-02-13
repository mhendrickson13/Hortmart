import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { cn, formatRelativeTime } from "@/lib/utils";
import { 
  Bell, 
  BellOff,
  MessageSquare, 
  Star, 
  UserPlus,
  BookOpen,
  Award,
  Settings,
  Trash2,
  Check,
} from "lucide-react";

interface Notification {
  id: string;
  type: "course" | "message" | "review" | "follow" | "achievement" | "system";
  title: string;
  description: string;
  time: Date;
  read: boolean;
  link?: string;
}

interface DesktopNotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

// Notifications are loaded dynamically - starts empty
const initialNotifications: Notification[] = [];

const notificationIcons = {
  course: BookOpen,
  message: MessageSquare,
  review: Star,
  follow: UserPlus,
  achievement: Award,
  system: Bell,
};

const notificationColors = {
  course: "bg-primary/10 text-primary",
  message: "bg-blue-500/10 text-blue-500",
  review: "bg-yellow-500/10 text-yellow-500",
  follow: "bg-green-500/10 text-green-500",
  achievement: "bg-purple-500/10 text-purple-500",
  system: "bg-text-3/10 text-text-2",
};

export function DesktopNotificationsPopover({ isOpen, onClose }: DesktopNotificationsPopoverProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-[380px] rounded-xl bg-card border border-border shadow-xl z-50 animate-fade-in-up overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-body-sm font-bold text-text-1">Notifications</h3>
          {unreadCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 bg-danger rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{unreadCount}</span>
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-caption font-medium text-primary hover:underline flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <BellOff className="w-5 h-5 text-text-3" />
            </div>
            <h4 className="text-body-sm font-semibold text-text-1 mb-1">All caught up!</h4>
            <p className="text-caption text-text-3">You have no new notifications</p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type];
              const colorClass = notificationColors[notification.type];
              
              const NotificationContent = (
                <div 
                  className={cn(
                    "flex gap-3 p-3 transition-all hover:bg-muted/50 group",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                    colorClass
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={cn(
                        "text-caption text-text-1 line-clamp-1",
                        !notification.read && "font-semibold"
                      )}>
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="w-6 h-6 rounded flex items-center justify-center text-text-3 hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center text-text-3 hover:bg-danger/10 hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-text-3 line-clamp-2 mt-0.5">
                      {notification.description}
                    </p>
                    <p className="text-[10px] text-text-3 mt-1">
                      {formatRelativeTime(notification.time)}
                    </p>
                  </div>
                </div>
              );
              
              if (notification.link) {
                return (
                  <Link 
                    key={notification.id} 
                    to={notification.link}
                    onClick={onClose}
                  >
                    {NotificationContent}
                  </Link>
                );
              }
              
              return (
                <div key={notification.id}>
                  {NotificationContent}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border bg-muted/30">
        <Link
          to="/settings?tab=notifications"
          onClick={onClose}
          className="flex items-center justify-center gap-2 text-caption font-medium text-text-2 hover:text-primary transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Notification Settings
        </Link>
      </div>
    </div>
  );
}
