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
  Trash2,
  Camera,
  Check,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

/* ──────────────────── Constants ──────────────────── */

type TabKey = "profile" | "account" | "notifications" | "appearance" | "privacy";

const NOTIF_PREFS_KEY = "cxflow_notification_prefs";
const PRIVACY_PREFS_KEY = "cxflow_privacy_prefs";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Bogota",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Buenos_Aires",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
] as const;

interface NotificationPrefs {
  emailNotifications: boolean;
  courseUpdates: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
}

interface PrivacyPrefs {
  showProfile: boolean;
  showActivity: boolean;
}

function loadNotifPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(NOTIF_PREFS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { emailNotifications: true, courseUpdates: true, marketingEmails: false, weeklyDigest: true };
}

function loadPrivacyPrefs(): PrivacyPrefs {
  try {
    const stored = localStorage.getItem(PRIVACY_PREFS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { showProfile: true, showActivity: true };
}

/* ──────────────────── Main Component ──────────────────── */

export default function SettingsPage() {
  const { user, token, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, setTheme, language, setLanguage, timezone, setTimezone } =
    useAppPreferences();

  const tabParam = searchParams.get("tab") as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam || "profile");

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

  // Notification prefs (persisted to localStorage)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(loadNotifPrefs);

  // Privacy prefs (persisted to localStorage)
  const [privacyPrefs, setPrivacyPrefs] = useState<PrivacyPrefs>(loadPrivacyPrefs);

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Seed form values from API profile
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  // Sync tab param
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam]);

  // Persist notification prefs
  const updateNotifPref = useCallback(
    (key: keyof NotificationPrefs, value: boolean) => {
      setNotifPrefs((prev) => {
        const next = { ...prev, [key]: value };
        localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next));
        return next;
      });
      toast({ title: "Preferences saved", variant: "success" });
    },
    []
  );

  // Persist privacy prefs
  const updatePrivacyPref = useCallback(
    (key: keyof PrivacyPrefs, value: boolean) => {
      setPrivacyPrefs((prev) => {
        const next = { ...prev, [key]: value };
        localStorage.setItem(PRIVACY_PREFS_KEY, JSON.stringify(next));
        return next;
      });
      toast({ title: "Preferences saved", variant: "success" });
    },
    []
  );

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  /* ──── Handlers ──── */

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast({ title: "Profile updated", variant: "success" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "error",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "error",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "error",
      });
      return;
    }
    setSavingPassword(true);
    try {
      await usersApi.changePassword(
        { currentPassword, newPassword },
        token ?? undefined
      );
      toast({ title: "Password changed successfully", variant: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "error",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      if (user?.id) await usersApi.delete(user.id, token ?? undefined);
      logout();
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      await usersApi.updateProfile(
        { image: imageUrl } as any,
        token ?? undefined
      );
      updateUser({ image: imageUrl } as any);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Avatar updated", variant: "success" });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "error",
      });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /* ──── Tab config ──── */

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "profile", label: "Profile", icon: User },
    { key: "account", label: "Account", icon: Lock },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "appearance", label: "Appearance", icon: Palette },
    { key: "privacy", label: "Privacy", icon: Shield },
  ];

  /* ──── Render ──── */

  return (
    <>
      <h1 className="text-h2 font-bold text-text-1">Settings</h1>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Tab Navigation */}
        <nav className="lg:w-56 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => switchTab(t.key)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all ${
                    activeTab === t.key
                      ? "bg-primary/10 text-primary"
                      : "text-text-2 hover:bg-muted hover:text-text-1"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          {/* ─── Profile Tab ─── */}
          {activeTab === "profile" && (
            <Card className="p-6">
              {/* Avatar & basic info */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <Avatar className="w-20 h-20 ring-2 ring-border">
                    <AvatarImage src={user?.image ?? undefined} />
                    <AvatarFallback className="text-xl font-bold">
                      {getInitials(user?.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
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
                  <p className="text-caption text-text-3">{user?.email}</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="mt-1.5 opacity-60"
                  />
                  <p className="text-caption text-text-3 mt-1">
                    Email cannot be changed
                  </p>
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="mt-1.5"
                    placeholder="Tell us about yourself..."
                    maxLength={500}
                  />
                  <p className="text-caption text-text-3 mt-1">
                    {bio.length}/500 characters
                  </p>
                </div>
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  Save Changes
                </Button>
              </form>
            </Card>
          )}

          {/* ─── Account Tab ─── */}
          {activeTab === "account" && (
            <div className="space-y-4">
              {/* Change Password */}
              <Card className="p-6">
                <h3 className="text-h3 font-semibold text-text-1 mb-4">
                  Change Password
                </h3>
                <form
                  onSubmit={handleChangePassword}
                  className="space-y-4 max-w-lg"
                >
                  <div>
                    <Label htmlFor="current">Current Password</Label>
                    <Input
                      id="current"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new">New Password</Label>
                    <Input
                      id="new"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="mt-1.5"
                    />
                    <p className="text-caption text-text-3 mt-1">
                      Minimum 6 characters
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="confirm">Confirm New Password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="mt-1.5"
                    />
                  </div>
                  <Button type="submit" disabled={savingPassword}>
                    {savingPassword && (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    )}
                    Change Password
                  </Button>
                </form>
              </Card>

              {/* Language & Timezone */}
              <Card className="p-6">
                <h3 className="text-h3 font-semibold text-text-1 mb-4">
                  Language &amp; Timezone
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  <div>
                    <Label htmlFor="lang">Language</Label>
                    <select
                      id="lang"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="mt-1.5 w-full h-10 px-3 rounded-xl border border-border bg-card text-[13px] font-medium text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {(Object.entries(languageNames) as [Language, string][]).map(
                        ([code, label]) => (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="tz">Timezone</Label>
                    <select
                      id="tz"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="mt-1.5 w-full h-10 px-3 rounded-xl border border-border bg-card text-[13px] font-medium text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>

              {/* Sign Out */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-h3 font-semibold text-text-1">
                      Sign Out
                    </h3>
                    <p className="text-body-sm text-text-2 mt-1">
                      Sign out of your account on this device.
                    </p>
                  </div>
                  <Button variant="danger" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </Card>

              {/* Delete Account */}
              <Card className="p-6 border-red-200 dark:border-red-900/40">
                <h3 className="text-h3 font-semibold text-danger mb-2">
                  Delete Account
                </h3>
                <p className="text-body-sm text-text-2 mb-4">
                  This action is permanent and cannot be undone. All your data
                  will be lost.
                </p>
                <div className="max-w-sm">
                  <Label htmlFor="delete-confirm">
                    Type <strong>DELETE</strong> to confirm
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                    className="mt-1.5 border-red-200 dark:border-red-900/40"
                  />
                  <Button
                    variant="danger"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm !== "DELETE" || deleting}
                    className="mt-3"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete My Account
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ─── Notifications Tab ─── */}
          {activeTab === "notifications" && (
            <Card className="p-6">
              <h3 className="text-h3 font-semibold text-text-1 mb-1">
                Notification Preferences
              </h3>
              <p className="text-body-sm text-text-3 mb-5">
                Manage how you receive notifications and updates.
              </p>
              <div className="space-y-3 max-w-lg">
                <ToggleRow
                  label="Email Notifications"
                  description="Receive important updates via email"
                  checked={notifPrefs.emailNotifications}
                  onChange={(v) => updateNotifPref("emailNotifications", v)}
                />
                <ToggleRow
                  label="Course Updates"
                  description="Get notified when courses you're enrolled in are updated"
                  checked={notifPrefs.courseUpdates}
                  onChange={(v) => updateNotifPref("courseUpdates", v)}
                />
                <ToggleRow
                  label="Marketing Emails"
                  description="Receive promotions and special offers"
                  checked={notifPrefs.marketingEmails}
                  onChange={(v) => updateNotifPref("marketingEmails", v)}
                />
                <ToggleRow
                  label="Weekly Digest"
                  description="Receive a weekly summary of your learning progress"
                  checked={notifPrefs.weeklyDigest}
                  onChange={(v) => updateNotifPref("weeklyDigest", v)}
                />
              </div>
            </Card>
          )}

          {/* ─── Appearance Tab ─── */}
          {activeTab === "appearance" && (
            <Card className="p-6">
              <h3 className="text-h3 font-semibold text-text-1 mb-1">
                Theme
              </h3>
              <p className="text-body-sm text-text-3 mb-5">
                Choose how the app looks for you.
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                {(
                  [
                    { key: "light", label: "Light", icon: Sun },
                    { key: "dark", label: "Dark", icon: Moon },
                    { key: "system", label: "System", icon: Monitor },
                  ] as const
                ).map((t) => {
                  const Icon = t.icon;
                  const isActive = theme === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTheme(t.key as Theme)}
                      className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-text-3"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 mx-auto mb-2 ${isActive ? "text-primary" : "text-text-2"}`}
                      />
                      <div className="text-body-sm font-semibold text-text-1">
                        {t.label}
                      </div>
                      {isActive && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ─── Privacy Tab ─── */}
          {activeTab === "privacy" && (
            <Card className="p-6">
              <h3 className="text-h3 font-semibold text-text-1 mb-1">
                Privacy Settings
              </h3>
              <p className="text-body-sm text-text-3 mb-5">
                Control your profile visibility and data sharing.
              </p>
              <div className="space-y-3 max-w-lg">
                <ToggleRow
                  label="Public Profile"
                  description="Allow others to see your profile"
                  checked={privacyPrefs.showProfile}
                  onChange={(v) => updatePrivacyPref("showProfile", v)}
                />
                <ToggleRow
                  label="Show Activity"
                  description="Show your learning activity to course instructors"
                  checked={privacyPrefs.showActivity}
                  onChange={(v) => updatePrivacyPref("showActivity", v)}
                />
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="text-body font-semibold text-text-1 mb-3">
                  Legal
                </h4>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="https://cxflow.io/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body-sm text-primary font-medium hover:underline"
                  >
                    Privacy Policy
                  </a>
                  <a
                    href="https://cxflow.io/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body-sm text-primary font-medium hover:underline"
                  >
                    Terms of Service
                  </a>
                  <a
                    href="https://cxflow.io/cookies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body-sm text-primary font-medium hover:underline"
                  >
                    Cookie Policy
                  </a>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

/* ──────────────────── Toggle Row Component ──────────────────── */

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card">
      <div className="pr-4">
        <div className="text-body-sm font-semibold text-text-1">{label}</div>
        <div className="text-caption text-text-3 mt-0.5">{description}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
