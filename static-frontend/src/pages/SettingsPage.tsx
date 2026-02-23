import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { users as usersApi, uploads as uploadsApi } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { useAppPreferences, type Theme } from "@/lib/theme-context";
import {
  Loader2,
  Camera,
  Check,
  Sun,
  Moon,
  Monitor,
  KeyRound,
  Shield,
  Calendar,
  Eye,
  EyeOff,
  Bell,
  User,
  Palette,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Section Header                                                    */
/* ------------------------------------------------------------------ */
function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-body-sm font-semibold text-text-1">{title}</h3>
        {description && (
          <p className="text-caption text-text-3 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle Switch                                                     */
/* ------------------------------------------------------------------ */
function ToggleSwitch({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onToggle(!checked)}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-300 ease-in-out ${
        checked
          ? "bg-primary shadow-[0_0_12px_rgba(47,111,237,0.3)]"
          : "bg-border-2 dark:bg-surface-3"
      }`}
    >
      <span
        className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${
          checked ? "left-[22px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const { user, token, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useAppPreferences();

  /* ---- Data ---- */
  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: () => usersApi.getProfile(),
    enabled: !!user,
  });
  const profile = profileData?.user;

  /* ---- Profile form ---- */
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  /* ---- Password form ---- */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  /* ---- Avatar ---- */
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  /* ---- Notification preferences ---- */
  const { data: notifData } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => usersApi.getNotificationPreferences(),
    enabled: !!user,
  });
  const notifPrefs = notifData?.preferences;

  /* ---- Effects ---- */
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  /* ---- Handlers ---- */

  const handleSaveProfile = async () => {
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
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
        variant: "success",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (!allRulesMet) {
      setPasswordError("Password does not meet all requirements");
      return;
    }
    setPasswordError("");
    setSavingPassword(true);
    try {
      await usersApi.changePassword(
        { currentPassword, newPassword },
        token ?? undefined
      );
      toast({
        title: "Password updated",
        description: "Your password has been successfully changed.",
        variant: "success",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setPasswordError(error.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
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

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    toast({
      title: "Theme updated",
      description: `Switched to ${newTheme} mode`,
      variant: "success",
    });
  };

  const handleNotifToggle = async (key: string, value: boolean) => {
    try {
      await usersApi.updateNotificationPreferences({ [key]: value });
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    } catch {
      toast({ title: "Failed to update preference", variant: "error" });
    }
  };

  /* ---- Computed ---- */
  const roleName =
    user?.role === "ADMIN"
      ? "Administrator"
      : user?.role === "CREATOR"
        ? "Creator"
        : "Learner";

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt as string).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "\u2014";

  const themeOptions = [
    {
      id: "light" as Theme,
      label: "Light",
      icon: Sun,
      desc: "Clean & bright",
      preview: "bg-white border-gray-200",
    },
    {
      id: "dark" as Theme,
      label: "Dark",
      icon: Moon,
      desc: "Easy on the eyes",
      preview: "bg-gray-900 border-gray-700",
    },
    {
      id: "system" as Theme,
      label: "System",
      icon: Monitor,
      desc: "Match your device",
      preview: "bg-gradient-to-br from-white to-gray-900 border-gray-400",
    },
  ];

  /* ---- Password validation rules ---- */
  const passwordRules = [
    { label: "8+ characters", met: newPassword.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(newPassword) },
    { label: "Lowercase", met: /[a-z]/.test(newPassword) },
    { label: "Number", met: /\d/.test(newPassword) },
    {
      label: "Special char",
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword),
    },
  ];
  const allRulesMet = passwordRules.every((r) => r.met);
  const rulesMet = passwordRules.filter((r) => r.met).length;

  const isAdmin = user?.role === "ADMIN" || user?.role === "CREATOR";

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */

  return (
    <div className="max-w-2xl mx-auto pb-10 animate-fade-in">
      {/* ────────────────────────────────────────────────────────── */}
      {/*  PROFILE HERO CARD                                        */}
      {/* ────────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl border border-border bg-card overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Gradient accent bar */}
        <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(47,111,237,0.15),_transparent_70%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
        </div>

        <div className="px-6 pb-6 -mt-10 relative">
          {/* Avatar */}
          <div className="flex items-end justify-between mb-5">
            <div className="relative">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Avatar className="w-20 h-20 ring-4 ring-card shadow-soft-2">
                <AvatarImage src={user?.image ?? undefined} />
                <AvatarFallback className="text-h2 font-bold bg-primary/10 text-primary">
                  {getInitials(user?.name || "U")}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-primary hover:shadow-primary-hover hover:scale-105 transition-all duration-200 disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Name, role, email, member since */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-h2 text-text-1">
                  {user?.name || "User"}
                </h1>
                <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-pill text-caption font-semibold bg-primary/10 text-primary border border-primary/15">
                  <Sparkles className="w-3 h-3" />
                  {roleName}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-body-sm text-text-2">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-text-3" />
                {user?.email}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-text-3" />
                Member since {memberSince}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/*  SETTINGS SECTIONS                                        */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="mt-6 space-y-5">
        {/* ═══ PROFILE DETAILS ═══ */}
        <div
          className="rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <SectionHeader
            icon={User}
            title="Profile Details"
            description="Update your personal information"
          />

          <div className="space-y-4">
            <div>
              <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                Display Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="h-11"
              />
            </div>

            <div>
              <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                Bio
              </label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="min-h-[100px] resize-none"
                rows={3}
              />
              <p className="text-caption text-text-3 mt-1.5">
                Brief description for your profile. Max 200 characters.
              </p>
            </div>

            {isAdmin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                    Email
                  </label>
                  <div className="h-11 rounded-lg border border-border bg-muted/40 px-4 flex items-center text-body-sm text-text-2 truncate">
                    {user?.email}
                  </div>
                </div>
                <div>
                  <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                    Member Since
                  </label>
                  <div className="h-11 rounded-lg border border-border bg-muted/40 px-4 flex items-center text-body-sm text-text-2">
                    {memberSince}
                  </div>
                </div>
              </div>
            )}

            {/* Save button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleSaveProfile()}
                disabled={savingProfile}
                className="h-11 px-6 rounded-xl text-body-sm font-semibold bg-primary text-white hover:bg-primary-600 shadow-primary hover:shadow-primary-hover active:scale-[0.98] transition-all duration-200 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {savingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* ═══ SECURITY — CHANGE PASSWORD ═══ */}
        <div
          className="rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <SectionHeader
            icon={Shield}
            title="Security"
            description="Keep your account safe and secure"
          />

          <div className="space-y-4">
            <div>
              <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <Input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-text-3 hover:text-text-1 transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPw ? (
                    <EyeOff className="w-[18px] h-[18px]" />
                  ) : (
                    <Eye className="w-[18px] h-[18px]" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-text-3 hover:text-text-1 transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPw ? (
                      <EyeOff className="w-[18px] h-[18px]" />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-text-3 hover:text-text-1 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPw ? (
                      <EyeOff className="w-[18px] h-[18px]" />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Password match indicator */}
            {confirmPassword && (
              <div
                className={`flex items-center gap-2 text-body-sm font-medium px-3 py-2 rounded-lg ${
                  newPassword === confirmPassword
                    ? "bg-success/10 text-success"
                    : "bg-danger/10 text-danger"
                }`}
              >
                {newPassword === confirmPassword ? (
                  <>
                    <Check className="w-4 h-4" /> Passwords match
                  </>
                ) : (
                  "Passwords do not match"
                )}
              </div>
            )}

            {/* Password strength bar + rules */}
            {newPassword && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-caption font-medium text-text-2">
                      Password strength
                    </span>
                    <span
                      className={`text-caption font-semibold ${
                        rulesMet <= 2
                          ? "text-danger"
                          : rulesMet <= 4
                            ? "text-warning"
                            : "text-success"
                      }`}
                    >
                      {rulesMet <= 2
                        ? "Weak"
                        : rulesMet <= 4
                          ? "Good"
                          : "Strong"}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        rulesMet <= 2
                          ? "bg-danger"
                          : rulesMet <= 4
                            ? "bg-warning"
                            : "bg-success"
                      }`}
                      style={{
                        width: `${(rulesMet / passwordRules.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {passwordRules.map((r) => (
                    <span
                      key={r.label}
                      className={`inline-flex items-center gap-1 h-7 px-3 rounded-lg text-caption font-medium transition-all duration-200 ${
                        r.met
                          ? "bg-success/10 text-success border border-success/20"
                          : "bg-muted text-text-3 border border-transparent"
                      }`}
                    >
                      {r.met && <Check className="w-3 h-3" />}
                      {r.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {passwordError && (
              <div className="flex items-center gap-2 text-body-sm text-danger bg-danger/8 rounded-xl px-4 py-3">
                <Shield className="w-4 h-4 flex-shrink-0" />
                {passwordError}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleChangePassword()}
                disabled={savingPassword}
                className="h-11 px-6 rounded-xl text-body-sm font-semibold border-2 border-border text-text-1 hover:bg-muted hover:border-primary/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {savingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>

        {/* ═══ NOTIFICATIONS ═══ */}
        <div
          className="rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <SectionHeader
            icon={Bell}
            title="Notifications"
            description="Choose what alerts you receive"
          />

          {notifPrefs ? (
            <div className="space-y-1">
              {[
                {
                  label: "In-App Notifications",
                  desc: "Badges & alerts inside the app",
                  key: "inApp",
                  checked: notifPrefs.inApp,
                  show: true,
                  icon: Bell,
                },
                {
                  label: "Enrollment Emails",
                  desc: isAdmin
                    ? "When a student enrolls in your course"
                    : "When you enroll in a new course",
                  key: isAdmin ? "emailNewStudent" : "emailEnrollment",
                  checked: isAdmin
                    ? notifPrefs.emailNewStudent
                    : notifPrefs.emailEnrollment,
                  show: true,
                  icon: Mail,
                },
                {
                  label: "Completion Emails",
                  desc: isAdmin
                    ? "When a student completes your course"
                    : "When you complete a course",
                  key: "emailCompletion",
                  checked: notifPrefs.emailCompletion,
                  show: true,
                  icon: Check,
                },
                {
                  label: "Review Emails",
                  desc: "When a student leaves a review",
                  key: "emailReview",
                  checked: notifPrefs.emailReview,
                  show: isAdmin,
                  icon: Sparkles,
                },
              ]
                .filter((n) => n.show)
                .map((n) => {
                  const NIcon = n.icon;
                  return (
                    <div
                      key={n.key}
                      className="flex items-center gap-4 py-4 px-4 -mx-1 rounded-xl hover:bg-muted/50 transition-colors duration-150 group"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-3 text-text-2 group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-200 flex-shrink-0">
                        <NIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-body-sm font-medium text-text-1">
                          {n.label}
                        </div>
                        <div className="text-caption text-text-3 mt-0.5">
                          {n.desc}
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={n.checked}
                        onToggle={(v) => handleNotifToggle(n.key, v)}
                      />
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-text-3" />
            </div>
          )}
        </div>

        {/* ═══ APPEARANCE ═══ */}
        <div
          className="rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <SectionHeader
            icon={Palette}
            title="Appearance"
            description="Personalize how the app looks"
          />

          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleThemeChange(opt.id)}
                  className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 group ${
                    active
                      ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(47,111,237,0.1),0_4px_16px_rgba(47,111,237,0.12)]"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  }`}
                >
                  {active && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  <div
                    className={`w-12 h-12 rounded-xl border-2 ${opt.preview} transition-transform duration-200 group-hover:scale-105`}
                  />
                  <div className="text-center">
                    <div
                      className={`text-body-sm font-semibold ${
                        active ? "text-primary" : "text-text-1"
                      }`}
                    >
                      {opt.label}
                    </div>
                    <div className="text-caption text-text-3 mt-0.5 hidden sm:block">
                      {opt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ ACCOUNT INFO (learner only) ═══ */}
        {!isAdmin && (
          <div
            className="rounded-2xl border border-border bg-card p-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <SectionHeader
              icon={User}
              title="Account"
              description="Your account information"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-3/50 border border-border/50">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-caption font-medium text-text-3 uppercase tracking-wider">
                    Email
                  </div>
                  <div className="text-body-sm font-medium text-text-1 truncate mt-0.5">
                    {user?.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-3/50 border border-border/50">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-caption font-medium text-text-3 uppercase tracking-wider">
                    Member Since
                  </div>
                  <div className="text-body-sm font-medium text-text-1 mt-0.5">
                    {memberSince}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
