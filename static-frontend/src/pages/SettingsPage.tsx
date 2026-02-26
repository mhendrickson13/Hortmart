import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { users as usersApi, uploads as uploadsApi, settings as settingsApi } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { useAppPreferences, type Theme } from "@/lib/theme-context";
import i18n, { LANGUAGE_OPTIONS, getLanguagePreference, setLanguagePreference } from "@/lib/i18n";
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
  Webhook,
  Send,
  AlertTriangle,
  Copy,
  RefreshCw,
  Trash2,
  Code2,
  Globe,
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
  const { t } = useTranslation();

  /* ---- Data ---- */
  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: () => usersApi.getProfile(),
    enabled: !!user,
    staleTime: 10 * 60_000,  // profile data is stable
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
    staleTime: 10 * 60_000,
  });
  const notifPrefs = notifData?.preferences;

  /* ---- Webhook / Integrations (admin only) ---- */
  const isAdminCheck = user?.role === "ADMIN" || user?.role === "CREATOR";
  const { data: settingsData } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => settingsApi.get(),
    enabled: !!user && isAdminCheck,
  });
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null);

  /* ---- API Token ---- */
  const { data: apiTokenData, refetch: refetchApiToken } = useQuery({
    queryKey: ["api-token"],
    queryFn: () => settingsApi.getApiToken(),
    enabled: !!user && isAdminCheck,
  });
  const [generatingToken, setGeneratingToken] = useState(false);
  const [revokingToken, setRevokingToken] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  /* ---- Effects ---- */
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (settingsData?.settings) {
      setWebhookUrl(settingsData.settings.webhookUrl || "");
    }
  }, [settingsData]);

  /* ---- Handlers ---- */

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast({ title: t("settings.nameRequired"), variant: "error" });
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
        title: t("settings.profileUpdated"),
        description: t("settings.profileUpdateSuccess"),
        variant: "success",
      });
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      setPasswordError(t("settings.currentPasswordRequired"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.passwordsNotMatch"));
      return;
    }
    if (!allRulesMet) {
      setPasswordError(t("settings.passwordNotMeetRequirements"));
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
        title: t("settings.passwordUpdated"),
        description: t("settings.passwordUpdateSuccess"),
        variant: "success",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setPasswordError(error.message || t("settings.failedToChangePassword"));
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
      toast({ title: t("settings.selectImageFile"), variant: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("settings.imageSizeLimit"), variant: "error" });
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
      toast({ title: t("settings.avatarUpdated"), variant: "success" });
    } catch (err: any) {
      toast({
        title: t("settings.uploadFailed"),
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
      title: t("settings.themeUpdated"),
      description: `${t("settings.switchedTo")} ${t(`settings.${newTheme}`).toLowerCase()} ${t("settings.mode")}`,
      variant: "success",
    });
  };

  const handleNotifToggle = async (key: string, value: boolean) => {
    try {
      await usersApi.updateNotificationPreferences({ [key]: value });
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    } catch {
      toast({ title: t("settings.failedToUpdatePreference"), variant: "error" });
    }
  };

  const handleSaveWebhook = async () => {
    setSavingWebhook(true);
    setWebhookTestResult(null);
    try {
      await settingsApi.update({ webhookUrl: webhookUrl.trim() });
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast({ title: t("settings.webhookSaved"), variant: "success" });
    } catch {
      toast({ title: t("settings.webhookSaveFailed"), variant: "error" });
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const res = await settingsApi.testWebhook();
      setWebhookTestResult({
        success: res.success,
        message: res.success
          ? t("settings.webhookTestSuccess", { status: res.status, statusText: res.statusText })
          : res.error || t("settings.webhookTestFailedStatus", { status: res.status }),
      });
    } catch (err: any) {
      setWebhookTestResult({ success: false, message: err.message || t("settings.webhookTestFailed") });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleGenerateApiToken = async () => {
    setGeneratingToken(true);
    try {
      await settingsApi.generateApiToken();
      await refetchApiToken();
      toast({ title: t("settings.apiTokenGenerated"), variant: "success" });
    } catch {
      toast({ title: t("settings.apiTokenGenerateFailed"), variant: "error" });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleRevokeApiToken = async () => {
    setRevokingToken(true);
    try {
      await settingsApi.revokeApiToken();
      await refetchApiToken();
      toast({ title: t("settings.apiTokenRevoked"), variant: "success" });
    } catch {
      toast({ title: t("settings.apiTokenRevokeFailed"), variant: "error" });
    } finally {
      setRevokingToken(false);
    }
  };

  const handleCopyToken = () => {
    if (apiTokenData?.apiToken) {
      navigator.clipboard.writeText(apiTokenData.apiToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  /* ---- Computed ---- */
  const roleName =
    user?.role === "ADMIN"
      ? t("roles.admin")
      : user?.role === "CREATOR"
        ? t("roles.creator")
        : t("roles.learner");

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt as string).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "\u2014";

  const themeOptions = [
    {
      id: "light" as Theme,
      label: t("settings.light"),
      icon: Sun,
      desc: t("settings.cleanAndBright"),
      preview: "bg-white border-gray-200",
    },
    {
      id: "dark" as Theme,
      label: t("settings.dark"),
      icon: Moon,
      desc: t("settings.easyOnTheEyes"),
      preview: "bg-gray-900 border-gray-700",
    },
    {
      id: "system" as Theme,
      label: t("settings.system"),
      icon: Monitor,
      desc: t("settings.matchYourDevice"),
      preview: "bg-gradient-to-br from-white to-gray-900 border-gray-400",
    },
  ];

  /* ---- Password validation rules ---- */
  const passwordRules = [
    { label: t("settings.eightPlusChars"), met: newPassword.length >= 8 },
    { label: t("settings.uppercase"), met: /[A-Z]/.test(newPassword) },
    { label: t("settings.lowercase"), met: /[a-z]/.test(newPassword) },
    { label: t("settings.number"), met: /\d/.test(newPassword) },
    {
      label: t("settings.specialChar"),
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
                  {user?.name || t("settings.user")}
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
                {t("settings.memberSince")} {memberSince}
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
            title={t("settings.profileDetails")}
            description={t("settings.updatePersonalInfo")}
          />

          <div className="space-y-4">
            <div>
              <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                {t("settings.displayName")}
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("settings.enterYourName")}
                className="h-11"
              />
            </div>

            <div>
              <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                {t("settings.bio")}
              </label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t("settings.bioPlaceholder")}
                className="min-h-[100px] resize-none"
                rows={3}
              />
              <p className="text-caption text-text-3 mt-1.5">
                {t("settings.bioHelp")}
              </p>
            </div>

            {isAdmin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                    {t("settings.email")}
                  </label>
                  <div className="h-11 rounded-lg border border-border bg-muted/40 px-4 flex items-center text-body-sm text-text-2 truncate">
                    {user?.email}
                  </div>
                </div>
                <div>
                  <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                    {t("settings.memberSince")}
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
                {savingProfile ? t("common.saving") : t("settings.saveChanges")}
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
            title={t("settings.security")}
            description={t("settings.securityDescription")}
          />

          <div className="space-y-4">
            <div>
              <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                {t("settings.currentPassword")}
              </label>
              <div className="relative">
                <Input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t("settings.enterCurrentPassword")}
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
                  {t("settings.newPassword")}
                </label>
                <div className="relative">
                  <Input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("settings.enterNewPassword")}
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
                  {t("settings.confirmPassword")}
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("settings.reenterNewPassword")}
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
                    <Check className="w-4 h-4" /> {t("settings.passwordsMatch")}
                  </>
                ) : (
                  t("settings.passwordsNotMatch")
                )}
              </div>
            )}

            {/* Password strength bar + rules */}
            {newPassword && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-caption font-medium text-text-2">
                      {t("settings.passwordStrength")}
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
                        ? t("settings.weak")
                        : rulesMet <= 4
                          ? t("settings.good")
                          : t("settings.strong")}
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
                {savingPassword ? t("common.updating") : t("settings.updatePassword")}
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
            title={t("settings.notifications")}
            description={t("settings.notificationsDescription")}
          />

          {notifPrefs ? (
            <div className="space-y-1">
              {[
                {
                  label: t("settings.inAppNotifications"),
                  desc: t("settings.inAppNotificationsDesc"),
                  key: "inApp",
                  checked: notifPrefs.inApp,
                  show: true,
                  icon: Bell,
                },
                {
                  label: t("settings.enrollmentEmails"),
                  desc: isAdmin
                    ? t("settings.enrollmentEmailsAdminDesc")
                    : t("settings.enrollmentEmailsLearnerDesc"),
                  key: isAdmin ? "emailNewStudent" : "emailEnrollment",
                  checked: isAdmin
                    ? notifPrefs.emailNewStudent
                    : notifPrefs.emailEnrollment,
                  show: true,
                  icon: Mail,
                },
                {
                  label: t("settings.completionEmails"),
                  desc: isAdmin
                    ? t("settings.completionEmailsAdminDesc")
                    : t("settings.completionEmailsLearnerDesc"),
                  key: "emailCompletion",
                  checked: notifPrefs.emailCompletion,
                  show: true,
                  icon: Check,
                },
                {
                  label: t("settings.reviewEmails"),
                  desc: t("settings.reviewEmailsDesc"),
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

        {/* ═══ INTEGRATIONS (Admin only) ═══ */}
        {isAdmin && (
          <div
            className="rounded-2xl border border-border bg-card p-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <SectionHeader
              icon={Webhook}
              title={t("settings.integrations")}
              description={t("settings.integrationsDescription")}
            />

            <div className="space-y-4">
              <div>
                <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                  {t("settings.webhookUrl")}
                </label>
                <p className="text-caption text-text-3 mb-2">
                  {t("settings.webhookUrlDescription")}
                </p>
                <Input
                  value={webhookUrl}
                  onChange={(e) => { setWebhookUrl(e.target.value); setWebhookTestResult(null); }}
                  placeholder={t("settings.webhookPlaceholder")}
                  className="h-11 font-mono text-body-sm"
                  type="url"
                />
              </div>

              {/* Webhook payload preview */}
              <div className="rounded-xl bg-muted/60 border border-border/50 p-3">
                <div className="text-[11px] font-bold text-text-3 uppercase tracking-wider mb-2">
                  {t("settings.payloadExample")}
                </div>
                <pre className="text-[11px] text-text-2 font-mono leading-relaxed overflow-x-auto whitespace-pre">
{`{
  "event": "play",
  "userId": "usr_xxx",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "lessonId": "les_xxx",
  "courseId": "crs_xxx",
  "courseName": "My Course Title",
  "currentTime": 42.5,
  "duration": 360,
  "timestamp": "2026-02-25T12:00:00.000Z"
}`}
                </pre>
              </div>

              {/* Events list */}
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                <div className="text-[11px] font-bold text-text-3 uppercase tracking-wider mb-2">
                  {t("settings.eventsSent")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["play", "pause", "ended", "timeupdate", "seeked", "ratechange", "visibilitychange"].map((evt) => (
                    <span key={evt} className="inline-flex items-center h-6 px-2.5 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary border border-primary/15">
                      {evt}
                    </span>
                  ))}
                  {["lesson.completed", "module.completed", "course.completed"].map((evt) => (
                    <span key={evt} className="inline-flex items-center h-6 px-2.5 rounded-lg text-[11px] font-semibold bg-success/10 text-success border border-success/15">
                      {evt}
                    </span>
                  ))}
                </div>
              </div>

              {/* Test result */}
              {webhookTestResult && (
                <div
                  className={`flex items-center gap-2 text-body-sm font-medium px-4 py-3 rounded-xl ${
                    webhookTestResult.success
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  {webhookTestResult.success ? (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  )}
                  {webhookTestResult.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveWebhook}
                  disabled={savingWebhook}
                  className="h-11 px-6 rounded-xl text-body-sm font-semibold bg-primary text-white hover:bg-primary-600 shadow-primary hover:shadow-primary-hover active:scale-[0.98] transition-all duration-200 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {savingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {savingWebhook ? t("common.saving") : t("common.save")}
                </button>
                <button
                  onClick={handleTestWebhook}
                  disabled={testingWebhook || !webhookUrl.trim()}
                  className="h-11 px-6 rounded-xl text-body-sm font-semibold border-2 border-border text-text-1 hover:bg-muted hover:border-primary/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {testingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {testingWebhook ? t("settings.testing") : t("settings.sendTest")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CXflow API (Admin only) ═══ */}
        {isAdmin && (
          <div
            className="rounded-2xl border border-border bg-card p-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <SectionHeader
              icon={Code2}
              title={t("settings.cxflowApi")}
              description={t("settings.cxflowApiDescription")}
            />

            <div className="space-y-4">
              {/* API Token */}
              <div>
                <label className="block text-body-sm font-medium text-text-1 mb-1.5">
                  {t("settings.apiToken")}
                </label>
                <p className="text-caption text-text-3 mb-2">
                  {t("settings.apiTokenDescription")}
                </p>

                {apiTokenData?.apiToken ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-11 px-4 rounded-xl border border-border bg-muted/60 font-mono text-body-sm text-text-2 flex items-center overflow-hidden">
                      <span className="truncate select-all">{apiTokenData.apiToken}</span>
                    </div>
                    <button
                      onClick={handleCopyToken}
                      className="h-11 w-11 flex-shrink-0 rounded-xl border-2 border-border text-text-2 hover:bg-muted hover:border-primary/30 active:scale-[0.98] transition-all duration-200 inline-flex items-center justify-center"
                      title={t("settings.copyToken")}
                    >
                      {tokenCopied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <div className="h-11 px-4 rounded-xl border border-dashed border-border bg-muted/30 text-body-sm text-text-3 flex items-center">
                    {t("settings.noApiToken")}
                  </div>
                )}
              </div>

              {/* API endpoint info */}
              <div className="rounded-xl bg-muted/60 border border-border/50 p-3">
                <div className="text-[11px] font-bold text-text-3 uppercase tracking-wider mb-2">
                  {t("settings.endpointExample")}
                </div>
                <pre className="text-[11px] text-text-2 font-mono leading-relaxed overflow-x-auto whitespace-pre">
{`POST /e/external/create-learner
Authorization: Bearer <your-api-token>
Content-Type: application/json

{
  "accountid": "${user?.id || 'your_account_id'}",
  "usrmail": "learner@example.com",
  "usrname": "John Doe",
  "suscribedcourses": ["courseId1", "courseId2"]
}`}
                </pre>
              </div>

              {/* Response example */}
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                <div className="text-[11px] font-bold text-text-3 uppercase tracking-wider mb-2">
                  {t("settings.responseExample")}
                </div>
                <pre className="text-[11px] text-text-2 font-mono leading-relaxed overflow-x-auto whitespace-pre">
{`{
  "user": { "id": "...", "email": "...", "name": "..." },
  "enrollments": [
    { "courseId": "...", "courseTitle": "...", "status": "enrolled" }
  ],
  "generatedPassword": "abc123xyz",
  "isNew": true
}`}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleGenerateApiToken}
                  disabled={generatingToken}
                  className="h-11 px-6 rounded-xl text-body-sm font-semibold bg-primary text-white hover:bg-primary-600 shadow-primary hover:shadow-primary-hover active:scale-[0.98] transition-all duration-200 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {generatingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {apiTokenData?.apiToken ? t("settings.regenerateToken") : t("settings.generateToken")}
                </button>
                {apiTokenData?.apiToken && (
                  <button
                    onClick={handleRevokeApiToken}
                    disabled={revokingToken}
                    className="h-11 px-6 rounded-xl text-body-sm font-semibold border-2 border-danger/30 text-danger hover:bg-danger/10 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {revokingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {t("settings.revokeToken")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ APPEARANCE ═══ */}
        <div
          className="rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <SectionHeader
            icon={Palette}
            title={t("settings.appearance")}
            description={t("settings.appearanceDescription")}
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

        {/* ═══ LANGUAGE ═══ */}
        <div
          className="rounded-2xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <SectionHeader
            icon={Globe}
            title={t("settings.language")}
            description={t("settings.languageDescription")}
          />

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Auto-detect option (detects from user location) */}
            {(() => {
              const pref = getLanguagePreference();
              const isAuto = pref === "auto";
              // Show the currently resolved language (may be from geolocation)
              const currentLangCode = i18n.language;
              const currentLangName = LANGUAGE_OPTIONS.find(l => l.code === currentLangCode)?.nativeName || "English";
              return (
                <button
                  key="auto"
                  onClick={() => {
                    setLanguagePreference("auto");
                    toast({
                      title: t("settings.languageUpdated"),
                      description: t("settings.languageAutoDetected"),
                      variant: "success",
                    });
                  }}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 group ${
                    isAuto
                      ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(47,111,237,0.1),0_4px_16px_rgba(47,111,237,0.12)]"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  }`}
                >
                  {isAuto && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-xl border-2 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900 dark:to-green-900 border-gray-300 dark:border-gray-600 transition-transform duration-200 group-hover:scale-105 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-text-2" />
                  </div>
                  <div className="text-center">
                    <div className={`text-body-sm font-semibold ${isAuto ? "text-primary" : "text-text-1"}`}>
                      {t("settings.autoDetect")}
                    </div>
                    <div className="text-caption text-text-3 mt-0.5">
                      {isAuto ? currentLangName : t("settings.autoDetectDesc")}
                    </div>
                  </div>
                </button>
              );
            })()}

            {/* Individual language options */}
            {LANGUAGE_OPTIONS.map((lang) => {
              const pref = getLanguagePreference();
              const active = pref === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguagePreference(lang.code);
                    toast({
                      title: t("settings.languageUpdated"),
                      description: `${t("settings.languageChangedTo")} ${lang.nativeName}`,
                      variant: "success",
                    });
                  }}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 group ${
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
                  <div className="text-center">
                    <div
                      className={`text-body-sm font-semibold ${
                        active ? "text-primary" : "text-text-1"
                      }`}
                    >
                      {lang.nativeName}
                    </div>
                    <div className="text-caption text-text-3 mt-0.5">
                      {lang.name}
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
              title={t("settings.account")}
              description={t("settings.accountDescription")}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-3/50 border border-border/50">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-caption font-medium text-text-3 uppercase tracking-wider">
                    {t("settings.email")}
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
                    {t("settings.memberSince")}
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
