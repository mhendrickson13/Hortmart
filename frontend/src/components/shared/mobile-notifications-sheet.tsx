"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { cn, formatRelativeTime } from "@/lib/utils";
import { 
  X, 
  Bell, 
  BellOff,
  CheckCircle, 
  MessageSquare, 
  Star, 
  UserPlus,
  BookOpen,
  Award,
  Settings,
  Trash2,
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

interface MobileNotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock notifications - in real app, fetch from API
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "course",
    title: "New lesson available",
    description: "Chapter 5: Advanced Concepts is now available in React Masterclass",
    time: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    read: false,
    link: "/player/course-1",
  },
  {
    id: "2",
    type: "achievement",
    title: "Achievement unlocked!",
    description: "You've completed 10 lessons this week. Keep it up!",
    time: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: false,
  },
  {
    id: "3",
    type: "message",
    title: "New answer to your question",
    description: "John Doe replied to your question in JavaScript Basics",
    time: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    read: true,
    link: "/player/course-2",
  },
  {
    id: "4",
    type: "review",
    title: "Thanks for your review!",
    description: "Your review for Python for Beginners has been published",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
  },
];

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

export function MobileNotificationsSheet({ isOpen, onClose }: MobileNotificationsSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!mounted || !isOpen) return null;

  const content = (
    <div 
      className={cn(
        "fixed inset-0 z-[100] transition-opacity duration-200",
        isClosing ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Sheet - Right side panel (matches mobile nav drawer) */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-[85%] max-w-[320px] flex flex-col transition-transform duration-200 ease-out",
          "bg-white dark:bg-card shadow-2xl",
          isClosing ? "translate-x-full" : "translate-x-0 animate-slide-in-right"
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-text-1">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-[11px] font-semibold text-danger">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <button 
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-text-2 hover:bg-muted/80 active:scale-95 transition-all touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mark all read button */}
        {unreadCount > 0 && (
          <div className="px-4 py-2 border-b border-border/30 bg-muted/30">
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary-600 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <BellOff className="w-7 h-7 text-text-3" />
              </div>
              <h3 className="text-body font-semibold text-text-1 mb-1">All caught up!</h3>
              <p className="text-body-sm text-text-3">You have no new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type];
                const colorClass = notificationColors[notification.type];
                
                const NotificationContent = (
                  <div 
                    className={cn(
                      "flex gap-3 p-4 transition-all active:bg-muted/50",
                      !notification.read && "bg-primary/5"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      colorClass
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn(
                          "text-body-sm text-text-1 line-clamp-1",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-caption text-text-3 line-clamp-2 mt-0.5">
                        {notification.description}
                      </p>
                      <p className="text-[10px] text-text-3 mt-1">
                        {formatRelativeTime(notification.time)}
                      </p>
                    </div>
                    
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-text-3 hover:bg-danger/10 hover:text-danger active:scale-95 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
                
                if (notification.link) {
                  return (
                    <Link 
                      key={notification.id} 
                      href={notification.link}
                      onClick={handleClose}
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
        <div className="p-4 border-t border-border/50" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <Link
            href="/settings?tab=notifications"
            onClick={handleClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-muted text-text-1 font-medium hover:bg-muted/80 active:scale-[0.98] transition-all"
          >
            <Settings className="w-4 h-4" />
            Notification Settings
          </Link>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
