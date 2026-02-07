"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { getInitials } from "@/lib/utils";
import {
  useAppPreferences,
  languageNames,
  type Theme,
  type Language,
} from "@/lib/theme-context";
import { translations } from "@/lib/translations";
import { users, ApiError } from "@/lib/api-client";
import {
  User,
  Lock,
  Bell,
  LogOut,
  Camera,
  Palette,
  Moon,
  Sun,
  Monitor,
  Loader2,
  AlertTriangle,
  Check,
  ArrowLeft,
  ChevronRight,
  Edit,
  Settings,
  Shield,
  Mail,
  FileText,
  ExternalLink,
  LucideIcon,
} from "lucide-react";

// =============================================================================
// CONSTANTS
// =============================================================================

const TAB_KEYS = ["profile", "account", "notifications", "appearance", "legal"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_TITLES: Record<TabKey, string> = {
  profile: "Edit Profile",
  account: "Account & Security",
  notifications: "Notifications",
  appearance: "Appearance",
  legal: "Contact & Privacy",
};

const TIMEZONES = [
  { value: "Pacific/Honolulu", label: "Hawaii (HST)", offset: -10 },
  { value: "America/Anchorage", label: "Alaska (AKST)", offset: -9 },
  { value: "America/Los_Angeles", label: "Pacific Time (PST/PDT)", offset: -8 },
  { value: "America/Denver", label: "Mountain Time (MST/MDT)", offset: -7 },
  { value: "America/Chicago", label: "Central Time (CST/CDT)", offset: -6 },
  { value: "America/New_York", label: "Eastern Time (EST/EDT)", offset: -5 },
  { value: "America/Sao_Paulo", label: "Brasília (BRT)", offset: -3 },
  { value: "UTC", label: "UTC / GMT", offset: 0 },
  { value: "Europe/London", label: "London (GMT/BST)", offset: 0 },
  { value: "Europe/Paris", label: "Paris / Berlin (CET/CEST)", offset: 1 },
  { value: "Europe/Moscow", label: "Moscow (MSK)", offset: 3 },
  { value: "Asia/Dubai", label: "Dubai (GST)", offset: 4 },
  { value: "Asia/Kolkata", label: "India (IST)", offset: 5.5 },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)", offset: 7 },
  { value: "Asia/Shanghai", label: "China / Singapore (CST/SGT)", offset: 8 },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", offset: 9 },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)", offset: 10 },
  { value: "Pacific/Auckland", label: "New Zealand (NZST/NZDT)", offset: 12 },
];

// =============================================================================
// REUSABLE COMPONENTS
// =============================================================================

// Toggle Switch Component
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md";
}

function ToggleSwitch({ checked, onChange, size = "md" }: ToggleSwitchProps) {
  const sizeClasses = size === "sm" 
    ? "w-11 h-6 after:h-5 after:w-5" 
    : "w-[46px] h-7 after:h-[22px] after:w-[22px]";
  
  return (
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className={`${sizeClasses} bg-text-3/20 border border-border rounded-full peer peer-checked:bg-primary/20 peer-checked:border-primary/25 peer-checked:after:translate-x-[18px] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-3 peer-checked:after:bg-primary after:rounded-full after:transition-all peer-checked:after:shadow-[0_10px_18px_rgba(47,111,237,0.22)]`} />
    </label>
  );
}

// Settings Item Component (for mobile)
interface SettingsItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconActive?: boolean;
  action?: ReactNode;
}

function SettingsItem({ icon: Icon, title, description, iconActive = true, action }: SettingsItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconActive ? 'bg-primary/10' : 'bg-surface-3'}`}>
          <Icon className={`w-4 h-4 ${iconActive ? 'text-primary' : 'text-text-2'}`} />
        </div>
        <div>
          <div className="text-body-sm font-semibold text-text-1">{title}</div>
          <div className="text-caption text-text-3">{description}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

// Desktop Settings Item Component
interface DesktopSettingsItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconActive?: boolean;
  action?: ReactNode;
}

function DesktopSettingsItem({ icon: Icon, title, description, iconActive = true, action }: DesktopSettingsItemProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconActive ? 'bg-primary/10 text-primary' : 'bg-surface-3 text-text-2'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="font-black text-text-1">{title}</div>
          <p className="mt-1 text-[12px] font-extrabold text-text-3">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { data: session, update: updateSession } = useSession();
  const { theme, language, timezone, setTheme, setLanguage, setTimezone } = useAppPreferences();
  const tr = translations[language];

  // Tab state
  const resolveTab = (value?: string | null): TabKey => {
    return value && TAB_KEYS.includes(value as TabKey) ? (value as TabKey) : "profile";
  };
  const [activeTab, setActiveTab] = useState<TabKey>(() => resolveTab(tabParam));

  // Form states
  const [profileData, setProfileData] = useState({ name: "", bio: "" });
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");

  // Loading states
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Preferences states
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>({});
  const [autoSaveNotes, setAutoSaveNotes] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Avatar
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Time display
  const [currentTime, setCurrentTime] = useState(new Date());

  const isCreator = session?.user?.role === "ADMIN" || session?.user?.role === "CREATOR";

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Update tab from URL
  useEffect(() => {
    setActiveTab(resolveTab(tabParam));
  }, [tabParam]);

  // Clock update
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load all preferences from localStorage
  useEffect(() => {
    try {
      const savedNotifications = localStorage.getItem("notificationPrefs");
      const savedAutoSave = localStorage.getItem("autoSaveNotes");
      const saved2FA = localStorage.getItem("twoFactorEnabled");

      if (savedNotifications) setNotificationPrefs(JSON.parse(savedNotifications));
      if (savedAutoSave !== null) setAutoSaveNotes(JSON.parse(savedAutoSave));
      if (saved2FA !== null) setTwoFactorEnabled(JSON.parse(saved2FA));
    } catch (e) {
      console.error("Failed to load preferences:", e);
    }
  }, []);

  // Fetch profile
  useEffect(() => {
    if (session?.user && session?.accessToken) {
      fetchProfile();
    }
  }, [session?.user?.id, session?.accessToken]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabKey);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  };

  const fetchProfile = async () => {
    try {
      const data = await users.getProfile(session?.accessToken);
      if (data.user) {
        setProfileData({ name: data.user.name || "", bio: data.user.bio || "" });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  const handleProfileUpdate = async () => {
    setIsLoadingProfile(true);
    try {
      await users.updateProfile(profileData, session?.accessToken);
      toast({ title: tr.settings.profileUpdated, description: tr.settings.profileUpdateSuccess, variant: "success" });
      await updateSession({ name: profileData.name });
    } catch (error) {
      toast({ title: tr.errors.generic, description: error instanceof ApiError ? error.message : tr.errors.generic, variant: "error" });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(tr.settings.passwordsNotMatch);
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError(tr.settings.passwordTooShort);
      return;
    }

    setPasswordError("");
    setIsLoadingPassword(true);

    try {
      await users.changePassword({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }, session?.accessToken);
      toast({ title: tr.settings.passwordUpdated, description: tr.settings.passwordUpdateSuccess, variant: "success" });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setPasswordError(error instanceof ApiError ? error.message : "Failed to change password");
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.user?.id) return;
    setIsDeletingAccount(true);
    try {
      await users.delete(session.user.id, session?.accessToken);
      toast({ title: tr.settings.accountDeleted, description: tr.settings.accountDeleteSuccess, variant: "success" });
      signOut({ callbackUrl: "/" });
    } catch (error) {
      toast({ title: tr.errors.generic, description: error instanceof ApiError ? error.message : tr.errors.generic, variant: "error" });
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSignOut = () => signOut({ callbackUrl: "/login" });

  const handleNotificationToggle = (key: string, enabled: boolean) => {
    const newPrefs = { ...notificationPrefs, [key]: enabled };
    setNotificationPrefs(newPrefs);
    localStorage.setItem("notificationPrefs", JSON.stringify(newPrefs));
  };

  const handleAutoSaveToggle = (enabled: boolean) => {
    setAutoSaveNotes(enabled);
    localStorage.setItem("autoSaveNotes", JSON.stringify(enabled));
    toast({ title: enabled ? "Auto-save enabled" : "Auto-save disabled", description: enabled ? "Notes saved automatically" : "Auto-save turned off", variant: "success" });
  };

  const handleTwoFactorToggle = (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    localStorage.setItem("twoFactorEnabled", JSON.stringify(enabled));
    toast({ title: enabled ? "2FA Enabled" : "2FA Disabled", description: enabled ? "Two-factor authentication active" : "Two-factor authentication disabled", variant: enabled ? "success" : "default" });
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    toast({ title: tr.settings.themeUpdated, description: `${tr.settings.switchedTo} ${newTheme === "system" ? tr.settings.system : newTheme === "dark" ? tr.settings.dark : tr.settings.light} ${tr.settings.mode}`, variant: "success" });
  };

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    const newTr = translations[newLanguage];
    toast({ title: newTr.settings.languageUpdated, description: `${newTr.settings.languageChangedTo} ${languageNames[newLanguage]}`, variant: "success" });
  };

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    const tzInfo = TIMEZONES.find((tz) => tz.value === newTimezone);
    toast({ title: tr.settings.timezoneUpdated, description: `${tr.settings.timezoneChangedTo} ${tzInfo?.label || newTimezone}`, variant: "success" });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: tr.errors.generic, variant: "error" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
        toast({ title: tr.settings.avatarPreviewSet, description: tr.settings.avatarClickSave, variant: "success" });
      };
      reader.readAsDataURL(file);
    }
  };

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const getCurrentTimeInTimezone = () => {
    try {
      return new Intl.DateTimeFormat(language, { timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(currentTime);
    } catch {
      return currentTime.toLocaleTimeString();
    }
  };

  const getCurrentDateInTimezone = () => {
    try {
      return new Intl.DateTimeFormat(language, { timeZone: timezone, weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(currentTime);
    } catch {
      return currentTime.toLocaleDateString();
    }
  };

  const notificationItems = isCreator
    ? [
        { key: "newEnrollments", title: tr.notifications.newEnrollments, description: tr.notifications.newEnrollmentsDesc, defaultEnabled: true },
        { key: "courseReviews", title: tr.notifications.courseReviews, description: tr.notifications.courseReviewsDesc, defaultEnabled: true },
        { key: "qaActivity", title: tr.notifications.qaActivity, description: tr.notifications.qaActivityDesc, defaultEnabled: false },
        { key: "weeklyReports", title: tr.notifications.weeklyReports, description: tr.notifications.weeklyReportsDesc, defaultEnabled: true },
        { key: "marketing", title: tr.notifications.marketingUpdates, description: tr.notifications.marketingUpdatesDesc, defaultEnabled: false },
      ]
    : [
        { key: "courseUpdates", title: tr.notifications.courseUpdates, description: tr.notifications.courseUpdatesDesc, defaultEnabled: true },
        { key: "newCourses", title: tr.notifications.newCourses, description: tr.notifications.newCoursesDesc, defaultEnabled: true },
        { key: "learningReminders", title: tr.notifications.learningReminders, description: tr.notifications.learningRemindersDesc, defaultEnabled: true },
        { key: "achievements", title: tr.notifications.achievements, description: tr.notifications.achievementsDesc, defaultEnabled: true },
        { key: "marketing", title: tr.notifications.marketingUpdates, description: tr.notifications.marketingUpdatesDesc, defaultEnabled: false },
      ];

  const mobileMenuItems = [
    { tab: "profile" as TabKey, icon: User, label: "Edit Profile", description: "Update your name, bio, and avatar" },
    { tab: "account" as TabKey, icon: Lock, label: "Account & Security", description: "Password, 2FA, and danger zone" },
    { tab: "notifications" as TabKey, icon: Bell, label: "Notifications", description: "Manage your notification preferences" },
    { tab: "appearance" as TabKey, icon: Palette, label: "Appearance", description: "Theme, language, and timezone" },
    { tab: "legal" as TabKey, icon: Shield, label: "Contact & Privacy", description: "Support, terms, and privacy policy" },
  ];

  const themeOptions = [
    { id: "light" as Theme, label: tr.settings.light, icon: Sun },
    { id: "dark" as Theme, label: tr.settings.dark, icon: Moon },
    { id: "system" as Theme, label: tr.settings.system, icon: Monitor },
  ];

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <>
      {/* Mobile Layout */}
      <div className="lg:hidden -mx-4 -my-4">
        {/* Sub-page header with back button (only when on a tab) */}
        {tabParam && (
          <div className="sticky top-0 z-10 bg-white/95 dark:bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <Link href="/settings" className="w-10 h-10 rounded-2xl border border-border/95 bg-white/95 dark:bg-card/95 flex items-center justify-center text-text-2 hover:bg-muted transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-lg font-black text-text-1">{TAB_TITLES[activeTab]}</h1>
            </div>
          </div>
        )}

        {/* Mobile Content */}
        <div className="px-4 py-4">
          {!tabParam ? (
            <div className="space-y-2">
              {/* Settings Title */}
              <div className="flex items-center gap-2.5 mb-3 px-1">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-black text-text-1">{tr.settings.title}</h2>
              </div>
              
              {mobileMenuItems.map((item) => (
                <Link key={item.tab} href={`/settings?tab=${item.tab}`} className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-border/95 bg-white/95 dark:bg-card/95 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-text-1">{item.label}</div>
                      <div className="text-xs text-text-3 truncate">{item.description}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-3 flex-shrink-0" />
                </Link>
              ))}
              <div className="pt-4 space-y-3">
                <Button variant="secondary" onClick={handleSignOut} className="w-full justify-center">
                  <LogOut className="w-4 h-4 mr-2" />Sign Out
                </Button>
                <Button variant="danger" onClick={() => setShowDeleteDialog(true)} className="w-full justify-center">
                  Delete Account
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <Card className="p-5">
                  <h2 className="text-h3 font-semibold text-text-1 mb-4">{tr.settings.profileInfo}</h2>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="relative">
                      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={avatarPreview || session?.user?.image || undefined} />
                        <AvatarFallback className="text-h3">{getInitials(session?.user?.name || "U")}</AvatarFallback>
                      </Avatar>
                      <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-primary hover:bg-primary-600 transition-colors">
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-body font-semibold text-text-1">{session?.user?.name || "User"}</h3>
                      <p className="text-caption text-text-3">{session?.user?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="mobile-name">{tr.settings.fullName}</Label>
                      <Input id="mobile-name" value={profileData.name} onChange={(e) => setProfileData((p) => ({ ...p, name: e.target.value }))} placeholder="Your full name" className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="mobile-bio">{tr.settings.bio}</Label>
                      <Textarea id="mobile-bio" value={profileData.bio} onChange={(e) => setProfileData((p) => ({ ...p, bio: e.target.value }))} placeholder={tr.settings.bioPlaceholder} className="mt-2" rows={3} />
                    </div>
                    <Button onClick={handleProfileUpdate} disabled={isLoadingProfile} className="w-full">
                      {isLoadingProfile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{tr.common.saving}</> : tr.settings.saveChanges}
                    </Button>
                  </div>
                </Card>
              )}

              {/* Account Tab */}
              {activeTab === "account" && (
                <>
                  <Card className="p-5">
                    <h2 className="text-h3 font-semibold text-text-1 mb-4">Security</h2>
                    <div className="space-y-3">
                      <SettingsItem icon={Lock} title="Two-factor authentication" description={twoFactorEnabled ? "Your account is protected" : "Recommended for security"} iconActive={twoFactorEnabled} action={<ToggleSwitch checked={twoFactorEnabled} onChange={handleTwoFactorToggle} size="sm" />} />
                      <SettingsItem icon={Edit} title="Auto-save notes" description="Save timestamped notes while watching" iconActive={autoSaveNotes} action={<ToggleSwitch checked={autoSaveNotes} onChange={handleAutoSaveToggle} size="sm" />} />
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h2 className="text-h3 font-semibold text-text-1 mb-2">{tr.settings.changePassword}</h2>
                    <p className="text-body-sm text-text-2 mb-4">{tr.settings.passwordDescription}</p>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="mobile-currentPassword">{tr.settings.currentPassword}</Label>
                        <Input id="mobile-currentPassword" type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))} className="mt-2" />
                      </div>
                      <div>
                        <Label htmlFor="mobile-newPassword">{tr.settings.newPassword}</Label>
                        <Input id="mobile-newPassword" type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))} className="mt-2" />
                      </div>
                      <div>
                        <Label htmlFor="mobile-confirmPassword">{tr.settings.confirmPassword}</Label>
                        <Input id="mobile-confirmPassword" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))} className="mt-2" />
                      </div>
                      {passwordError && <p className="text-caption text-danger">{passwordError}</p>}
                      <Button onClick={handlePasswordChange} disabled={isLoadingPassword} className="w-full">
                        {isLoadingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{tr.common.updating}</> : tr.settings.updatePassword}
                      </Button>
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h2 className="text-h3 font-semibold text-text-1 mb-2">{tr.settings.dangerZone}</h2>
                    <p className="text-body-sm text-text-2 mb-4">{tr.settings.dangerDescription}</p>
                    <div className="space-y-3">
                      <Button variant="secondary" onClick={handleSignOut} className="w-full"><LogOut className="w-4 h-4 mr-2" />{tr.nav.signOut}</Button>
                      <Button variant="danger" onClick={() => setShowDeleteDialog(true)} className="w-full">{tr.settings.deleteAccount}</Button>
                    </div>
                  </Card>
                </>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <Card className="p-5">
                  <h2 className="text-h3 font-semibold text-text-1 mb-2">{tr.settings.notificationPrefs}</h2>
                  <p className="text-body-sm text-text-2 mb-4">{tr.settings.notificationDescription}</p>
                  <div className="space-y-3">
                    {notificationItems.map((item) => (
                      <SettingsItem key={item.key} icon={Bell} title={item.title} description={item.description} action={<ToggleSwitch checked={notificationPrefs[item.key] ?? item.defaultEnabled} onChange={(checked) => handleNotificationToggle(item.key, checked)} size="sm" />} />
                    ))}
                  </div>
                </Card>
              )}

              {/* Appearance Tab */}
              {activeTab === "appearance" && (
                <>
                  <Card className="p-5">
                    <h2 className="text-h3 font-semibold text-text-1 mb-2">{tr.settings.theme}</h2>
                    <p className="text-body-sm text-text-2 mb-4">{tr.settings.themeDescription}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {themeOptions.map((option) => (
                        <button key={option.id} onClick={() => handleThemeChange(option.id)} className={`relative p-3 rounded-xl border-2 transition-all ${theme === option.id ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/50"}`}>
                          {theme === option.id && <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                          <option.icon className={`w-5 h-5 mx-auto mb-1 ${theme === option.id ? "text-primary" : "text-text-2"}`} />
                          <div className={`text-xs font-semibold ${theme === option.id ? "text-primary" : "text-text-1"}`}>{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h2 className="text-h3 font-semibold text-text-1 mb-2">{tr.settings.language}</h2>
                    <p className="text-body-sm text-text-2 mb-4">{tr.settings.languageDescription}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
                        <button key={code} onClick={() => handleLanguageChange(code)} className={`relative p-3 rounded-xl border-2 transition-all ${language === code ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/50"}`}>
                          {language === code && <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                          <div className={`text-sm font-semibold ${language === code ? "text-primary" : "text-text-1"}`}>{name}</div>
                          <div className="text-xs text-text-3 uppercase">{code}</div>
                        </button>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h2 className="text-h3 font-semibold text-text-1 mb-2">{tr.settings.timezone}</h2>
                    <p className="text-body-sm text-text-2 mb-3">{tr.settings.timezoneDescription}</p>
                    <div className="mb-4 p-3 rounded-xl bg-muted border border-border">
                      <div className="text-caption text-text-3 mb-1">{tr.settings.currentTime}</div>
                      <div className="text-h3 font-bold text-text-1 font-mono">{getCurrentTimeInTimezone()}</div>
                      <div className="text-body-sm text-text-2 mt-1">{getCurrentDateInTimezone()}</div>
                    </div>
                    <Label htmlFor="mobile-timezone">{tr.settings.selectTimezone}</Label>
                    <select id="mobile-timezone" value={timezone} onChange={(e) => handleTimezoneChange(e.target.value)} className="mt-2 w-full h-11 px-4 rounded-xl border border-border bg-surface text-body-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors">
                      {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label} (UTC{tz.offset >= 0 ? "+" : ""}{tz.offset})</option>)}
                    </select>
                  </Card>
                </>
              )}

              {/* Contact & Privacy Tab */}
              {activeTab === "legal" && (
                <Card className="p-5">
                  <h2 className="text-h3 font-semibold text-text-1 mb-2">Contact & Privacy</h2>
                  <p className="text-body-sm text-text-2 mb-4">Get help and review our policies</p>
                  <div className="space-y-3">
                    <a href="mailto:support@example.com" className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-body-sm font-semibold text-text-1">Contact Support</div>
                          <div className="text-caption text-text-3">support@example.com</div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-text-3" />
                    </a>
                    <a href="/terms" target="_blank" className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-text-2" />
                        </div>
                        <div>
                          <div className="text-body-sm font-semibold text-text-1">Terms of Service</div>
                          <div className="text-caption text-text-3">Our terms and conditions</div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-text-3" />
                    </a>
                    <a href="/privacy" target="_blank" className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-text-2" />
                        </div>
                        <div>
                          <div className="text-body-sm font-semibold text-text-1">Privacy Policy</div>
                          <div className="text-caption text-text-3">How we handle your data</div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-text-3" />
                    </a>
                  </div>
                  <div className="mt-5 pt-4 border-t border-border">
                    <div className="text-center">
                      <div className="text-caption text-text-3 mb-1">App Version</div>
                      <div className="text-body-sm font-semibold text-text-1">1.0.0</div>
                    </div>
                  </div>
                </Card>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
          <div>
            <h1 className="text-[22px] font-black tracking-tight text-text-1">{tr.settings.title}</h1>
            <p className="mt-1 text-xs font-extrabold text-text-3">Manage your account, preferences, and security</p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="secondary" onClick={handleSignOut} className="h-10 rounded-[16px] px-4 font-black text-[13px]">
              <LogOut className="w-4 h-4 mr-2" />Sign out
            </Button>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="flex gap-1.5 mb-4 p-1 bg-muted/50 rounded-2xl w-fit">
          {mobileMenuItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => handleTabChange(item.tab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                activeTab === item.tab
                  ? "bg-white dark:bg-card text-primary shadow-sm"
                  : "text-text-2 hover:text-text-1"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Desktop Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <>
                <Card className="p-5">
                  <div className="text-[12px] font-black text-text-3 tracking-wider uppercase mb-4">Profile Information</div>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="relative">
                      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={avatarPreview || session?.user?.image || undefined} />
                        <AvatarFallback className="text-h2">{getInitials(session?.user?.name || "U")}</AvatarFallback>
                      </Avatar>
                      <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-primary hover:bg-primary-600 transition-colors">
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-body font-bold text-text-1">{session?.user?.name || "User"}</h3>
                      <p className="text-body-sm text-text-3">{session?.user?.email}</p>
                      <p className="text-caption text-text-3 mt-1">{session?.user?.role === "ADMIN" ? "Administrator" : session?.user?.role === "CREATOR" ? "Creator" : "Learner"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="desktop-name">{tr.settings.fullName}</Label>
                      <Input id="desktop-name" value={profileData.name} onChange={(e) => setProfileData((p) => ({ ...p, name: e.target.value }))} placeholder="Your full name" className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="desktop-bio">{tr.settings.bio}</Label>
                      <Textarea id="desktop-bio" value={profileData.bio} onChange={(e) => setProfileData((p) => ({ ...p, bio: e.target.value }))} placeholder={tr.settings.bioPlaceholder} className="mt-2" rows={3} />
                    </div>
                    <Button onClick={handleProfileUpdate} disabled={isLoadingProfile}>
                      {isLoadingProfile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{tr.common.saving}</> : tr.settings.saveChanges}
                    </Button>
                  </div>
                </Card>
                <div className="flex flex-col gap-4">
                  <Card className="p-5">
                    <div className="text-[12px] font-black text-text-3 tracking-wider uppercase mb-4">Account Details</div>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-border bg-muted/30">
                        <div className="text-caption text-text-3 mb-1">Email Address</div>
                        <div className="font-bold text-text-1">{session?.user?.email || "email@domain.com"}</div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-muted/30">
                        <div className="text-caption text-text-3 mb-1">Account Type</div>
                        <div className="font-bold text-text-1">{session?.user?.role === "ADMIN" ? "Administrator" : session?.user?.role === "CREATOR" ? "Course Creator" : "Learner"}</div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-muted/30">
                        <div className="text-caption text-text-3 mb-1">Member Since</div>
                        <div className="font-bold text-text-1">{new Date().getFullYear()}</div>
                      </div>
                    </div>
                  </Card>

                  {/* Payouts & Billing - Only for CREATOR/ADMIN */}
                  {isCreator && (
                    <Card className="p-5">
                      <div className="text-[12px] font-black text-text-3 tracking-wider uppercase mb-4">Payouts & Billing</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95">
                          <div>
                            <div className="font-black text-text-1">Payout method</div>
                            <p className="mt-1 text-[12px] font-extrabold text-text-3">Bank transfer (default)</p>
                          </div>
                          <button className="h-[34px] px-3 rounded-[14px] text-[12px] font-black border border-border/95 bg-white/95 text-text-1 hover:bg-muted transition-colors">Edit</button>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95">
                          <div>
                            <div className="font-black text-text-1">Currency</div>
                            <p className="mt-1 text-[12px] font-extrabold text-text-3">USD (US Dollar)</p>
                          </div>
                          <button className="h-[34px] px-3 rounded-[14px] text-[12px] font-black border border-border/95 bg-white/95 text-text-1 hover:bg-muted transition-colors">Change</button>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95">
                          <div>
                            <div className="font-black text-text-1">Tax information</div>
                            <p className="mt-1 text-[12px] font-extrabold text-text-3">Not submitted</p>
                          </div>
                          <button className="h-[34px] px-3 rounded-[14px] text-[12px] font-black border border-primary/55 bg-primary text-white hover:bg-primary/90 transition-colors">Submit</button>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </>
            )}

            {/* Account Tab */}
            {activeTab === "account" && (
              <>
                <Card className="p-5">
                  <div className="text-[12px] font-black text-text-3 tracking-wider uppercase mb-4">Security</div>
                  <div className="space-y-3">
                    <DesktopSettingsItem icon={Lock} title="Two-factor authentication" description={twoFactorEnabled ? "Your account is protected" : "Recommended for security"} iconActive={twoFactorEnabled} action={<ToggleSwitch checked={twoFactorEnabled} onChange={handleTwoFactorToggle} />} />
                    <DesktopSettingsItem icon={Edit} title="Auto-save notes" description="Save timestamped notes while watching" iconActive={autoSaveNotes} action={<ToggleSwitch checked={autoSaveNotes} onChange={handleAutoSaveToggle} />} />
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="text-[12px] font-black text-text-3 tracking-wider uppercase mb-4">{tr.settings.changePassword}</div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="desktop-currentPassword">{tr.settings.currentPassword}</Label>
                      <Input id="desktop-currentPassword" type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))} className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="desktop-newPassword">{tr.settings.newPassword}</Label>
                      <Input id="desktop-newPassword" type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))} className="mt-2" />
                    </div>
                    <div>
                      <Label htmlFor="desktop-confirmPassword">{tr.settings.confirmPassword}</Label>
                      <Input id="desktop-confirmPassword" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))} className="mt-2" />
                    </div>
                    {passwordError && <p className="text-caption text-danger">{passwordError}</p>}
                    <Button onClick={handlePasswordChange} disabled={isLoadingPassword}>
                      {isLoadingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{tr.common.updating}</> : tr.settings.updatePassword}
                    </Button>
                  </div>
                </Card>
                <Card className="p-5 col-span-2">
                  <div className="text-[12px] font-black text-text-3 tracking-wider uppercase mb-4">{tr.settings.dangerZone}</div>
                  <p className="text-body-sm text-text-2 mb-4">{tr.settings.dangerDescription}</p>
                  <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>{tr.settings.deleteAccount}</Button>
                </Card>
              </>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <Card className="p-5 col-span-2">
                <div className="text-[12px] font-black text-text-3 tracking-wider uppercase mb-4">{tr.settings.notificationPrefs}</div>
                <p className="text-body-sm text-text-2 mb-4">{tr.settings.notificationDescription}</p>
                <div className="grid grid-cols-2 gap-3">
                  {notificationItems.map((item) => (
                    <DesktopSettingsItem key={item.key} icon={Bell} title={item.title} description={item.description} action={<ToggleSwitch checked={notificationPrefs[item.key] ?? item.defaultEnabled} onChange={(checked) => handleNotificationToggle(item.key, checked)} />} />
                  ))}
                </div>
              </Card>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <>
                <Card className="p-5">
                  <div className="text-[12px] font-black text-text-3 tracking-wider uppercase mb-4">{tr.settings.theme}</div>
                  <p className="text-body-sm text-text-2 mb-4">{tr.settings.themeDescription}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((option) => (
                      <button key={option.id} onClick={() => handleThemeChange(option.id)} className={`relative p-4 rounded-xl border-2 transition-all ${theme === option.id ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/50"}`}>
                        {theme === option.id && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                        <option.icon className={`w-6 h-6 mx-auto mb-2 ${theme === option.id ? "text-primary" : "text-text-2"}`} />
                        <div className={`text-sm font-bold ${theme === option.id ? "text-primary" : "text-text-1"}`}>{option.label}</div>
                      </button>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="text-[12px] font-black text-text-3 tracking-wider uppercase mb-4">{tr.settings.language}</div>
                  <p className="text-body-sm text-text-2 mb-4">{tr.settings.languageDescription}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
                      <button key={code} onClick={() => handleLanguageChange(code)} className={`relative p-4 rounded-xl border-2 transition-all ${language === code ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/50"}`}>
                        {language === code && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                        <div className={`text-sm font-bold ${language === code ? "text-primary" : "text-text-1"}`}>{name}</div>
                        <div className="text-xs text-text-3 uppercase mt-1">{code}</div>
                      </button>
                    ))}
                  </div>
                </Card>
                <Card className="p-5 col-span-2">
                  <div className="text-[12px] font-black text-text-3 tracking-wider uppercase mb-4">{tr.settings.timezone}</div>
                  <p className="text-body-sm text-text-2 mb-4">{tr.settings.timezoneDescription}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="desktop-timezone">{tr.settings.selectTimezone}</Label>
                      <select id="desktop-timezone" value={timezone} onChange={(e) => handleTimezoneChange(e.target.value)} className="mt-2 w-full h-11 px-4 rounded-xl border border-border bg-surface text-body-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors">
                        {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label} (UTC{tz.offset >= 0 ? "+" : ""}{tz.offset})</option>)}
                      </select>
                    </div>
                    <div className="p-4 rounded-xl bg-muted border border-border">
                      <div className="text-caption text-text-3 mb-1">{tr.settings.currentTime}</div>
                      <div className="text-h3 font-bold text-text-1 font-mono">{getCurrentTimeInTimezone()}</div>
                      <div className="text-body-sm text-text-2 mt-1">{getCurrentDateInTimezone()}</div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* Contact & Privacy Tab */}
            {activeTab === "legal" && (
              <Card className="p-5 col-span-2">
                <div className="text-[12px] font-black text-text-3 tracking-wider uppercase mb-4">Contact & Privacy</div>
                <p className="text-body-sm text-text-2 mb-4">Get help and review our policies</p>
                <div className="grid grid-cols-3 gap-4">
                  <a href="mailto:support@example.com" className="flex flex-col items-center p-6 rounded-xl border border-border bg-surface hover:bg-muted transition-colors text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div className="font-bold text-text-1 mb-1">Contact Support</div>
                    <div className="text-caption text-text-3">support@example.com</div>
                  </a>
                  <a href="/terms" target="_blank" className="flex flex-col items-center p-6 rounded-xl border border-border bg-surface hover:bg-muted transition-colors text-center">
                    <div className="w-12 h-12 rounded-xl bg-surface-3 flex items-center justify-center mb-3">
                      <FileText className="w-6 h-6 text-text-2" />
                    </div>
                    <div className="font-bold text-text-1 mb-1">Terms of Service</div>
                    <div className="text-caption text-text-3">Our terms and conditions</div>
                  </a>
                  <a href="/privacy" target="_blank" className="flex flex-col items-center p-6 rounded-xl border border-border bg-surface hover:bg-muted transition-colors text-center">
                    <div className="w-12 h-12 rounded-xl bg-surface-3 flex items-center justify-center mb-3">
                      <Shield className="w-6 h-6 text-text-2" />
                    </div>
                    <div className="font-bold text-text-1 mb-1">Privacy Policy</div>
                    <div className="text-caption text-text-3">How we handle your data</div>
                  </a>
                </div>
                <div className="mt-6 pt-4 border-t border-border text-center">
                  <div className="text-caption text-text-3 mb-1">App Version</div>
                  <div className="text-body-sm font-bold text-text-1">1.0.0</div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-3">
              <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-red-600 dark:text-red-400">{tr.settings.deleteAccount}</DialogTitle>
            <DialogDescription className="max-w-[280px]">{tr.settings.deleteAccountConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2.5">
            <Button variant="danger" onClick={handleDeleteAccount} disabled={isDeletingAccount} className="w-full h-12 rounded-full font-black text-[14px]">
              {isDeletingAccount ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{tr.common.deleting}</> : `Yes, ${tr.settings.deleteAccount}`}
            </Button>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} disabled={isDeletingAccount} className="w-full h-12 rounded-full font-black text-[14px] text-text-2">
              {tr.common.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
