import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { users as usersApi, uploads as uploadsApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useAppPreferences,
  languageNames,
  type Theme,
  type Language,
} from "@/lib/theme-context";
import {
  Loader2,
  User,
  Lock,
  Palette,
  LogOut,
  Bell,
  Shield,
  Camera,
  Check,
  Sun,
  Moon,
  Monitor,
  ArrowLeft,
  ChevronRight,
  Edit,
  Settings,
  Mail,
  FileText,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

/* ──────────────────── Constants ──────────────────── */

const TAB_KEYS = ["profile", "account", "notifications", "appearance", "legal"] as const;
type TabKey = (typeof TAB_KEYS)[number];

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
] as const;

/* ──────────────────── Reusable Sub-components ──────────────────── */

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-text-3/20 border border-border"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-sm transition-transform ${
          checked
            ? "translate-x-5 bg-white"
            : "translate-x-0 bg-text-3"
        }`}
      />
    </button>
  );
}

function SettingsItem({
  icon: Icon,
  title,
  description,
  iconActive = true,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  iconActive?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            iconActive ? "bg-primary/10" : "bg-surface-3"
          }`}
        >
          <Icon
            className={`w-4 h-4 ${iconActive ? "text-primary" : "text-text-2"}`}
          />
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

function DesktopSettingsItem({
  icon: Icon,
  title,
  description,
  iconActive = true,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  iconActive?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            iconActive ? "bg-primary/10 text-primary" : "bg-surface-3 text-text-2"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-text-1">{title}</div>
          <p className="mt-0.5 text-[12px] font-medium text-text-3">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

/* ──────────────────── Main Component ──────────────────── */

export default function SettingsPage() {
  const { user, token, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, setTheme, language, setLanguage, timezone, setTimezone, t, translations: tr } =
    useAppPreferences();

  const TAB_TITLES: Record<TabKey, string> = {
    profile: t("settings.profile"),
    account: t("settings.account"),
    notifications: t("settings.notifications"),
    appearance: t("settings.appearance"),
    legal: "Contact & Privacy",
  };

  const tabParam = searchParams.get("tab") as TabKey | null;
  const resolveTab = (value?: string | null): TabKey =>
    value && (TAB_KEYS as readonly string[]).includes(value) ? (value as TabKey) : "profile";
  const [activeTab, setActiveTab] = useState<TabKey>(() => resolveTab(tabParam));

  const isCreator = user?.role === "CREATOR" || user?.role === "ADMIN";

  // Fetch profile from backend
  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: () => usersApi.getProfile(),
    enabled: !!user,
  });

  const profile = profileData?.user;

  // Profile form
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Notification prefs (persisted to localStorage)
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});

  // Security toggles
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [autoSaveNotes, setAutoSaveNotes] = useState(true);

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Delete account
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Time display
  const [currentTime, setCurrentTime] = useState(new Date());

  // Seed form values from API profile
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  // Sync tab param
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
      if (savedNotifications) setNotifPrefs(JSON.parse(savedNotifications));
      if (savedAutoSave !== null) setAutoSaveNotes(JSON.parse(savedAutoSave));
      if (saved2FA !== null) setTwoFactorEnabled(JSON.parse(saved2FA));
    } catch (e) {
      console.error("Failed to load preferences:", e);
    }
  }, []);

  /* ──── Handlers ──── */

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "error" });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await usersApi.updateProfile(
        { name: name.trim(), bio: bio.trim() || null } as any,
        token ?? undefined
      );
      updateUser({ name: res.user?.name ?? name.trim() });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated", description: "Your profile has been successfully updated.", variant: "success" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    setPasswordError("");
    setSavingPassword(true);
    try {
      await usersApi.changePassword(
        { currentPassword, newPassword },
        token ?? undefined
      );
      toast({ title: "Password updated", description: "Your password has been successfully changed.", variant: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setPasswordError(error.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      if (user?.id) await usersApi.delete(user.id, token ?? undefined);
      toast({ title: "Account deleted", description: "Your account has been permanently deleted.", variant: "success" });
      logout();
      navigate("/login");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "error" });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5 MB", variant: "error" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const imageUrl = await uploadsApi.uploadFile(file, "image");
      await usersApi.updateProfile({ image: imageUrl } as any, token ?? undefined);
      updateUser({ image: imageUrl } as any);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Avatar updated", variant: "success" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "error" });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNotificationToggle = useCallback((key: string, enabled: boolean) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: enabled };
      localStorage.setItem("notificationPrefs", JSON.stringify(next));
      return next;
    });
  }, []);

  const handleAutoSaveToggle = (enabled: boolean) => {
    setAutoSaveNotes(enabled);
    localStorage.setItem("autoSaveNotes", JSON.stringify(enabled));
    toast({
      title: enabled ? "Auto-save enabled" : "Auto-save disabled",
      description: enabled ? "Notes saved automatically" : "Auto-save turned off",
      variant: "success",
    });
  };

  const handleTwoFactorToggle = (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    localStorage.setItem("twoFactorEnabled", JSON.stringify(enabled));
    toast({
      title: enabled ? "2FA Enabled" : "2FA Disabled",
      description: enabled ? "Two-factor authentication active" : "Two-factor authentication disabled",
      variant: enabled ? "success" : "default",
    });
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    toast({
      title: t("settings.themeUpdated"),
      description: `${t("settings.switchedTo")} ${newTheme} ${t("settings.mode")}`,
      variant: "success",
    });
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    toast({
      title: t("settings.languageUpdated"),
      description: `${t("settings.languageChangedTo")} ${languageNames[newLang]}`,
      variant: "success",
    });
  };

  const handleTimezoneChange = (newTz: string) => {
    setTimezone(newTz);
    const tzInfo = TIMEZONES.find((tz) => tz.value === newTz);
    toast({
      title: t("settings.timezoneUpdated"),
      description: `${t("settings.timezoneChangedTo")} ${tzInfo?.label || newTz}`,
      variant: "success",
    });
  };

  /* ──── Computed ──── */

  const getCurrentTimeInTimezone = () => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(currentTime);
    } catch {
      return currentTime.toLocaleTimeString();
    }
  };

  const getCurrentDateInTimezone = () => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(currentTime);
    } catch {
      return currentTime.toLocaleDateString();
    }
  };

  const notificationItems = isCreator
    ? [
        { key: "newEnrollments", title: "New Enrollments", description: "Get notified when someone enrolls in your course", defaultEnabled: true },
        { key: "courseReviews", title: "Course Reviews", description: "Get notified when someone leaves a review", defaultEnabled: true },
        { key: "qaActivity", title: "Q&A Activity", description: "Get notified about questions on your courses", defaultEnabled: false },
        { key: "weeklyReports", title: "Weekly Reports", description: "Receive weekly analytics reports via email", defaultEnabled: true },
        { key: "marketing", title: "Marketing Updates", description: "Receive tips and platform updates", defaultEnabled: false },
      ]
    : [
        { key: "courseUpdates", title: "Course Updates", description: "Get notified when courses you're enrolled in are updated", defaultEnabled: true },
        { key: "newCourses", title: "New Courses", description: "Get notified about new courses in your interests", defaultEnabled: true },
        { key: "learningReminders", title: "Learning Reminders", description: "Receive reminders to continue your courses", defaultEnabled: true },
        { key: "achievements", title: "Achievements", description: "Get notified when you earn badges or complete courses", defaultEnabled: true },
        { key: "marketing", title: "Marketing Updates", description: "Receive tips and platform updates", defaultEnabled: false },
      ];

  const mobileMenuItems = [
    { tab: "profile" as TabKey, icon: User, label: "Edit Profile", description: "Update your name, bio, and avatar" },
    { tab: "account" as TabKey, icon: Lock, label: "Account & Security", description: "Password, 2FA, and danger zone" },
    { tab: "notifications" as TabKey, icon: Bell, label: "Notifications", description: "Manage your notification preferences" },
    { tab: "appearance" as TabKey, icon: Palette, label: "Appearance", description: "Theme, language, and timezone" },
    { tab: "legal" as TabKey, icon: Shield, label: "Contact & Privacy", description: "Support, terms, and privacy policy" },
  ];

  const themeOptions = [
    { id: "light" as Theme, label: "Light", icon: Sun },
    { id: "dark" as Theme, label: "Dark", icon: Moon },
    { id: "system" as Theme, label: "System", icon: Monitor },
  ];

  /* ──── Render ──── */

  return (
    <>
      {/* ═══════ Mobile Layout ═══════ */}
      <div className="lg:hidden -mx-4 -my-4">
        {/* Sub-page header with back button (only when on a tab) */}
        {tabParam && (
          <div className="sticky top-0 z-10 bg-white/95 dark:bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                to="/settings"
                className="w-10 h-10 rounded-2xl border border-border/95 bg-white/95 dark:bg-card/95 flex items-center justify-center text-text-2 hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-lg font-bold text-text-1">
                {TAB_TITLES[activeTab]}
              </h1>
            </div>
          </div>
        )}

        {/* Mobile Content */}
        <div className="px-4 py-4">
          {!tabParam ? (
            /* ─── Mobile Menu ─── */
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 mb-3 px-1">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-text-1">{t("settings.title")}</h2>
              </div>

              {mobileMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.tab}
                    to={`/settings?tab=${item.tab}`}
                    className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-border/95 bg-white/95 dark:bg-card/95 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-text-1">
                          {item.label}
                        </div>
                        <div className="text-xs text-text-3 truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-text-3 flex-shrink-0" />
                  </Link>
                );
              })}

              <div className="pt-4 space-y-3">
                <Button
                  variant="secondary"
                  onClick={handleLogout}
                  className="w-full justify-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("nav.signOut")}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteDialog(true)}
                  className="w-full justify-center"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          ) : (
            /* ─── Mobile Tab Content ─── */
            <div className="space-y-4">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <Card className="p-5">
                  <h2 className="text-h3 font-semibold text-text-1 mb-4">
                    Profile Information
                  </h2>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="relative">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={user?.image ?? undefined} />
                        <AvatarFallback className="text-h3">
                          {getInitials(user?.name || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Camera className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div>
                      <h3 className="text-body font-semibold text-text-1">
                        {user?.name || "User"}
                      </h3>
                      <p className="text-caption text-text-3">{user?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="mobile-name">{t("settings.fullName")}</Label>
                      <Input
                        id="mobile-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mobile-bio">{t("settings.bio")}</Label>
                      <Textarea
                        id="mobile-bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={t("settings.bioPlaceholder")}
                        className="mt-2"
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveProfile()}
                      disabled={savingProfile}
                      className="w-full"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        t("settings.saveChanges")
                      )}
                    </Button>
                  </div>
                </Card>
              )}

              {/* Account Tab */}
              {activeTab === "account" && (
                <>
                  <Card className="p-5">
                    <h2 className="text-h3 font-semibold text-text-1 mb-4">
                      Security
                    </h2>
                    <div className="space-y-3">
                      <SettingsItem
                        icon={Lock}
                        title="Two-factor authentication"
                        description={
                          twoFactorEnabled
                            ? "Your account is protected"
                            : "Recommended for security"
                        }
                        iconActive={twoFactorEnabled}
                        action={
                          <ToggleSwitch
                            checked={twoFactorEnabled}
                            onChange={handleTwoFactorToggle}
                          />
                        }
                      />
                      <SettingsItem
                        icon={Edit}
                        title="Auto-save notes"
                        description="Save timestamped notes while watching"
                        iconActive={autoSaveNotes}
                        action={
                          <ToggleSwitch
                            checked={autoSaveNotes}
                            onChange={handleAutoSaveToggle}
                          />
                        }
                      />
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h2 className="text-h3 font-semibold text-text-1 mb-2">
                      {t("settings.changePassword")}
                    </h2>
                    <p className="text-body-sm text-text-2 mb-4">
                      {t("settings.passwordDescription")}
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="mobile-current">{t("settings.currentPassword")}</Label>
                        <Input
                          id="mobile-current"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mobile-new">{t("settings.newPassword")}</Label>
                        <Input
                          id="mobile-new"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mobile-confirm">
                          {t("settings.confirmPassword")}
                        </Label>
                        <Input
                          id="mobile-confirm"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      {passwordError && (
                        <p className="text-caption text-danger">
                          {passwordError}
                        </p>
                      )}
                      <Button
                        onClick={() => handleChangePassword()}
                        disabled={savingPassword}
                        className="w-full"
                      >
                        {savingPassword ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          t("settings.updatePassword")
                        )}
                      </Button>
                    </div>
                  </Card>
                  <Card className="p-5">
                    <h2 className="text-h3 font-semibold text-text-1 mb-2">
                      {t("settings.dangerZone")}
                    </h2>
                    <p className="text-body-sm text-text-2 mb-4">
                      {t("settings.dangerDescription")}
                    </p>
                    <div className="space-y-3">
                      <Button
                        variant="secondary"
                        onClick={handleLogout}
                        className="w-full"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t("nav.signOut")}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setShowDeleteDialog(true)}
                        className="w-full"
                      >
                        {t("settings.deleteAccount")}
                      </Button>
                    </div>
                  </Card>
                </>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <Card className="p-5">
                  <h2 className="text-h3 font-semibold text-text-1 mb-2">
                    {t("settings.notificationPrefs")}
                  </h2>
                  <p className="text-body-sm text-text-2 mb-4">
                    {t("settings.notificationDescription")}
                  </p>
                  <div className="space-y-3">
                    {notificationItems.map((item) => (
                      <SettingsItem
                        key={item.key}
                        icon={Bell}
                        title={item.title}
                        description={item.description}
                        action={
                          <ToggleSwitch
                            checked={
                              notifPrefs[item.key] ?? item.defaultEnabled
                            }
                            onChange={(checked) =>
                              handleNotificationToggle(item.key, checked)
                            }
                          />
                        }
                      />
                    ))}
                  </div>
                </Card>
              )}

              {/* Appearance Tab */}
              {activeTab === "appearance" && (
                <>
                  <Card className="p-5">
                    <h2 className="text-h3 font-semibold text-text-1 mb-2">
                      {t("settings.theme")}
                    </h2>
                    <p className="text-body-sm text-text-2 mb-4">
                      {t("settings.themeDescription")}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {themeOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = theme === option.id;
                        return (
                          <button
                            key={option.id}
                            onClick={() => handleThemeChange(option.id)}
                            className={`relative p-3 rounded-xl border-2 transition-all ${
                              isActive
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            {isActive && (
                              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            <Icon
                              className={`w-5 h-5 mx-auto mb-1 ${
                                isActive ? "text-primary" : "text-text-2"
                              }`}
                            />
                            <div
                              className={`text-xs font-semibold ${
                                isActive ? "text-primary" : "text-text-1"
                              }`}
                            >
                              {option.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h2 className="text-h3 font-semibold text-text-1 mb-2">
                      {t("settings.language")}
                    </h2>
                    <p className="text-body-sm text-text-2 mb-4">
                      {t("settings.languageDescription")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        Object.entries(languageNames) as [Language, string][]
                      ).map(([code, langName]) => (
                        <button
                          key={code}
                          onClick={() => handleLanguageChange(code)}
                          className={`relative p-3 rounded-xl border-2 transition-all ${
                            language === code
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {language === code && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                          <div
                            className={`text-sm font-semibold ${
                              language === code ? "text-primary" : "text-text-1"
                            }`}
                          >
                            {langName}
                          </div>
                          <div className="text-xs text-text-3 uppercase">
                            {code}
                          </div>
                        </button>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h2 className="text-h3 font-semibold text-text-1 mb-2">
                      {t("settings.timezone")}
                    </h2>
                    <p className="text-body-sm text-text-2 mb-3">
                      {t("settings.timezoneDescription")}
                    </p>
                    <div className="mb-4 p-3 rounded-xl bg-muted border border-border">
                      <div className="text-caption text-text-3 mb-1">
                        {t("settings.currentTime")}
                      </div>
                      <div className="text-h3 font-bold text-text-1 font-mono">
                        {getCurrentTimeInTimezone()}
                      </div>
                      <div className="text-body-sm text-text-2 mt-1">
                        {getCurrentDateInTimezone()}
                      </div>
                    </div>
                    <Label htmlFor="mobile-tz">{t("settings.selectTimezone")}</Label>
                    <select
                      id="mobile-tz"
                      value={timezone}
                      onChange={(e) => handleTimezoneChange(e.target.value)}
                      className="mt-2 w-full h-11 px-4 rounded-xl border border-border bg-card text-body-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label} (UTC{tz.offset >= 0 ? "+" : ""}
                          {tz.offset})
                        </option>
                      ))}
                    </select>
                  </Card>
                </>
              )}

              {/* Contact & Privacy Tab */}
              {activeTab === "legal" && (
                <Card className="p-5">
                  <h2 className="text-h3 font-semibold text-text-1 mb-2">
                    Contact & Privacy
                  </h2>
                  <p className="text-body-sm text-text-2 mb-4">
                    Get help and review our policies
                  </p>
                  <div className="space-y-3">
                    <a
                      href="mailto:support@cxflow.io"
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-body-sm font-semibold text-text-1">
                            Contact Support
                          </div>
                          <div className="text-caption text-text-3">
                            support@cxflow.io
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-text-3" />
                    </a>
                    <a
                      href="https://cxflow.io/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-text-2" />
                        </div>
                        <div>
                          <div className="text-body-sm font-semibold text-text-1">
                            Terms of Service
                          </div>
                          <div className="text-caption text-text-3">
                            Our terms and conditions
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-text-3" />
                    </a>
                    <a
                      href="https://cxflow.io/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-text-2" />
                        </div>
                        <div>
                          <div className="text-body-sm font-semibold text-text-1">
                            Privacy Policy
                          </div>
                          <div className="text-caption text-text-3">
                            How we handle your data
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-text-3" />
                    </a>
                  </div>
                  <div className="mt-5 pt-4 border-t border-border">
                    <div className="text-center">
                      <div className="text-caption text-text-3 mb-1">
                        App Version
                      </div>
                      <div className="text-body-sm font-semibold text-text-1">
                        1.0.0
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Desktop Layout ═══════ */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-text-1">
              {t("settings.title")}
            </h1>
            <p className="mt-1 text-xs font-medium text-text-3">
              {t("settings.subtitle")}
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              onClick={handleLogout}
              className="h-10 rounded-[16px] px-4 font-bold text-[13px]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t("nav.signOut")}
            </Button>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="flex gap-1.5 mb-4 p-1 bg-muted/50 rounded-2xl w-fit">
          {mobileMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                onClick={() => switchTab(item.tab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                  activeTab === item.tab
                    ? "bg-white dark:bg-card text-primary shadow-sm"
                    : "text-text-2 hover:text-text-1"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Desktop Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <>
                <Card className="p-5">
                  <div className="text-[12px] font-bold text-text-3 tracking-wider uppercase mb-4">
                    Profile Information
                  </div>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="relative">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={user?.image ?? undefined} />
                        <AvatarFallback className="text-h2">
                          {getInitials(user?.name || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div>
                      <h3 className="text-body font-bold text-text-1">
                        {user?.name || "User"}
                      </h3>
                      <p className="text-body-sm text-text-3">{user?.email}</p>
                      <p className="text-caption text-text-3 mt-1">
                        {user?.role === "ADMIN"
                          ? t("roles.admin")
                          : user?.role === "CREATOR"
                            ? t("roles.creator")
                            : t("roles.learner")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="desktop-name">{t("settings.fullName")}</Label>
                      <Input
                        id="desktop-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="desktop-bio">{t("settings.bio")}</Label>
                      <Textarea
                        id="desktop-bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={t("settings.bioPlaceholder")}
                        className="mt-2"
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveProfile()}
                      disabled={savingProfile}
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        t("settings.saveChanges")
                      )}
                    </Button>
                  </div>
                </Card>

                <div className="flex flex-col gap-4">
                  <Card className="p-5">
                    <div className="text-[12px] font-bold text-text-3 tracking-wider uppercase mb-4">
                      {t("settings.account")}
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-border bg-muted/30">
                        <div className="text-caption text-text-3 mb-1">
                          Email Address
                        </div>
                        <div className="font-bold text-text-1">
                          {user?.email || "email@domain.com"}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-muted/30">
                        <div className="text-caption text-text-3 mb-1">
                          Account Type
                        </div>
                        <div className="font-bold text-text-1">
                          {user?.role === "ADMIN"
                            ? t("roles.admin")
                            : user?.role === "CREATOR"
                              ? t("roles.creator")
                              : t("roles.learner")}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-muted/30">
                        <div className="text-caption text-text-3 mb-1">
                          Member Since
                        </div>
                        <div className="font-bold text-text-1">
                          {new Date().getFullYear()}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Payouts & Billing - Only for CREATOR/ADMIN */}
                  {isCreator && (
                    <Card className="p-5">
                      <div className="text-[12px] font-bold text-text-3 tracking-wider uppercase mb-4">
                        Payouts & Billing
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95">
                          <div>
                            <div className="font-bold text-text-1">
                              Payout method
                            </div>
                            <p className="mt-1 text-[12px] font-medium text-text-3">
                              Bank transfer (default)
                            </p>
                          </div>
                          <button className="h-[34px] px-3 rounded-[14px] text-[12px] font-bold border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 hover:bg-muted transition-colors">
                            Edit
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95">
                          <div>
                            <div className="font-bold text-text-1">
                              Currency
                            </div>
                            <p className="mt-1 text-[12px] font-medium text-text-3">
                              USD (US Dollar)
                            </p>
                          </div>
                          <button className="h-[34px] px-3 rounded-[14px] text-[12px] font-bold border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 hover:bg-muted transition-colors">
                            Change
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-[18px] border border-border/95 bg-white/95 dark:bg-card/95">
                          <div>
                            <div className="font-bold text-text-1">
                              Tax information
                            </div>
                            <p className="mt-1 text-[12px] font-medium text-text-3">
                              Not submitted
                            </p>
                          </div>
                          <button className="h-[34px] px-3 rounded-[14px] text-[12px] font-bold border border-primary/55 bg-primary text-white hover:bg-primary/90 transition-colors">
                            Submit
                          </button>
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
                  <div className="text-[12px] font-bold text-text-3 tracking-wider uppercase mb-4">
                    Security
                  </div>
                  <div className="space-y-3">
                    <DesktopSettingsItem
                      icon={Lock}
                      title="Two-factor authentication"
                      description={
                        twoFactorEnabled
                          ? "Your account is protected"
                          : "Recommended for security"
                      }
                      iconActive={twoFactorEnabled}
                      action={
                        <ToggleSwitch
                          checked={twoFactorEnabled}
                          onChange={handleTwoFactorToggle}
                        />
                      }
                    />
                    <DesktopSettingsItem
                      icon={Edit}
                      title="Auto-save notes"
                      description="Save timestamped notes while watching"
                      iconActive={autoSaveNotes}
                      action={
                        <ToggleSwitch
                          checked={autoSaveNotes}
                          onChange={handleAutoSaveToggle}
                        />
                      }
                    />
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="text-[12px] font-bold text-text-3 tracking-wider uppercase mb-4">
                    {t("settings.changePassword")}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="desktop-current">{t("settings.currentPassword")}</Label>
                      <Input
                        id="desktop-current"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="desktop-new">{t("settings.newPassword")}</Label>
                      <Input
                        id="desktop-new"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="desktop-confirm">
                        {t("settings.confirmPassword")}
                      </Label>
                      <Input
                        id="desktop-confirm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    {passwordError && (
                      <p className="text-caption text-danger">
                        {passwordError}
                      </p>
                    )}
                    <Button
                      onClick={() => handleChangePassword()}
                      disabled={savingPassword}
                    >
                      {savingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        t("settings.updatePassword")
                      )}
                    </Button>
                  </div>
                </Card>

                <Card className="p-5 col-span-2">
                  <div className="text-[12px] font-bold text-text-3 tracking-wider uppercase mb-4">
                    {t("settings.dangerZone")}
                  </div>
                  <p className="text-body-sm text-text-2 mb-4">
                    {t("settings.dangerDescription")}
                  </p>
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    {t("settings.deleteAccount")}
                  </Button>
                </Card>
              </>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <Card className="p-5 col-span-2">
                <div className="text-[12px] font-bold text-text-3 tracking-wider uppercase mb-4">
                  {t("settings.notificationPrefs")}
                </div>
                <p className="text-body-sm text-text-2 mb-4">
                  {t("settings.notificationDescription")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {notificationItems.map((item) => (
                    <DesktopSettingsItem
                      key={item.key}
                      icon={Bell}
                      title={item.title}
                      description={item.description}
                      action={
                        <ToggleSwitch
                          checked={
                            notifPrefs[item.key] ?? item.defaultEnabled
                          }
                          onChange={(checked) =>
                            handleNotificationToggle(item.key, checked)
                          }
                        />
                      }
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <>
                <Card className="p-5">
                  <div className="text-[12px] font-bold text-text-3 tracking-wider uppercase mb-4">
                    {t("settings.theme")}
                  </div>
                  <p className="text-body-sm text-text-2 mb-4">
                    {t("settings.themeDescription")}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((option) => {
                      const Icon = option.icon;
                      const isActive = theme === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleThemeChange(option.id)}
                          className={`relative p-4 rounded-xl border-2 transition-all ${
                            isActive
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {isActive && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <Icon
                            className={`w-6 h-6 mx-auto mb-2 ${
                              isActive ? "text-primary" : "text-text-2"
                            }`}
                          />
                          <div
                            className={`text-sm font-bold ${
                              isActive ? "text-primary" : "text-text-1"
                            }`}
                          >
                            {option.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="text-[12px] font-bold text-text-3 tracking-wider uppercase mb-4">
                    {t("settings.language")}
                  </div>
                  <p className="text-body-sm text-text-2 mb-4">
                    {t("settings.languageDescription")}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      Object.entries(languageNames) as [Language, string][]
                    ).map(([code, langName]) => (
                      <button
                        key={code}
                        onClick={() => handleLanguageChange(code)}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          language === code
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {language === code && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div
                          className={`text-sm font-bold ${
                            language === code ? "text-primary" : "text-text-1"
                          }`}
                        >
                          {langName}
                        </div>
                        <div className="text-xs text-text-3 uppercase mt-1">
                          {code}
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-5 col-span-2">
                  <div className="text-[12px] font-bold text-text-3 tracking-wider uppercase mb-4">
                    {t("settings.timezone")}
                  </div>
                  <p className="text-body-sm text-text-2 mb-4">
                    {t("settings.timezoneDescription")}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="desktop-tz">{t("settings.selectTimezone")}</Label>
                      <select
                        id="desktop-tz"
                        value={timezone}
                        onChange={(e) => handleTimezoneChange(e.target.value)}
                        className="mt-2 w-full h-11 px-4 rounded-xl border border-border bg-card text-body-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label} (UTC{tz.offset >= 0 ? "+" : ""}
                            {tz.offset})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="p-4 rounded-xl bg-muted border border-border">
                      <div className="text-caption text-text-3 mb-1">
                        {t("settings.currentTime")}
                      </div>
                      <div className="text-h3 font-bold text-text-1 font-mono">
                        {getCurrentTimeInTimezone()}
                      </div>
                      <div className="text-body-sm text-text-2 mt-1">
                        {getCurrentDateInTimezone()}
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* Contact & Privacy Tab */}
            {activeTab === "legal" && (
              <Card className="p-5 col-span-2">
                <div className="text-[12px] font-bold text-text-3 tracking-wider uppercase mb-4">
                  Contact & Privacy
                </div>
                <p className="text-body-sm text-text-2 mb-4">
                  Get help and review our policies
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <a
                    href="mailto:support@cxflow.io"
                    className="flex flex-col items-center p-6 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div className="font-bold text-text-1 mb-1">
                      Contact Support
                    </div>
                    <div className="text-caption text-text-3">
                      support@cxflow.io
                    </div>
                  </a>
                  <a
                    href="https://cxflow.io/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center p-6 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-surface-3 flex items-center justify-center mb-3">
                      <FileText className="w-6 h-6 text-text-2" />
                    </div>
                    <div className="font-bold text-text-1 mb-1">
                      Terms of Service
                    </div>
                    <div className="text-caption text-text-3">
                      Our terms and conditions
                    </div>
                  </a>
                  <a
                    href="https://cxflow.io/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center p-6 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-surface-3 flex items-center justify-center mb-3">
                      <Shield className="w-6 h-6 text-text-2" />
                    </div>
                    <div className="font-bold text-text-1 mb-1">
                      Privacy Policy
                    </div>
                    <div className="text-caption text-text-3">
                      How we handle your data
                    </div>
                  </a>
                </div>
                <div className="mt-6 pt-4 border-t border-border text-center">
                  <div className="text-caption text-text-3 mb-1">
                    App Version
                  </div>
                  <div className="text-body-sm font-bold text-text-1">
                    1.0.0
                  </div>
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
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-50 dark:bg-red-9500/20 flex items-center justify-center mb-3">
              <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-red-600 dark:text-red-400">
              {t("settings.deleteAccount")}
            </DialogTitle>
            <DialogDescription className="max-w-[280px]">
              {t("settings.deleteAccountConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2.5">
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="w-full h-12 rounded-full font-bold text-[14px]"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Yes, Delete Account"
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
              className="w-full h-12 rounded-full font-bold text-[14px] text-text-2"
            >
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
