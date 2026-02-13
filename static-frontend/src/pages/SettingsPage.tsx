import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { users as usersApi, uploads as uploadsApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import { useAppPreferences, type Theme } from "@/lib/theme-context";
import { Loader2, User, Lock, Palette, LogOut, Bell, Shield, Globe, Trash2, Camera } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

type TabKey = "profile" | "account" | "notifications" | "appearance" | "privacy";

export default function SettingsPage() {
  const { user, token, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, setTheme } = useAppPreferences();

  const tabParam = searchParams.get("tab") as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam || "profile");

  // Profile form
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification toggles
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [courseUpdates, setCourseUpdates] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  // Privacy
  const [showProfile, setShowProfile] = useState(true);
  const [showActivity, setShowActivity] = useState(true);

  // Language/Timezone
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam]);

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await usersApi.updateProfile({ name: name || null, bio: bio || null } as any, token || undefined);
      updateUser({ name });
      toast({ title: "Profile updated", variant: "success" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords don't match", variant: "error" });
      return;
    }
    setSavingPassword(true);
    try {
      await usersApi.changePassword({ currentPassword, newPassword }, token || undefined);
      toast({ title: "Password changed", variant: "success" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "error" });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      if (user?.id) await usersApi.delete(user.id, token || undefined);
      logout();
      navigate("/login");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Please select an image", variant: "error" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Image must be under 5MB", variant: "error" }); return; }
    setUploadingAvatar(true);
    try {
      const imageUrl = await uploadsApi.uploadFile(file, "image");
      await usersApi.updateProfile({ image: imageUrl } as any, token || undefined);
      updateUser({ image: imageUrl } as any);
      toast({ title: "Avatar updated", variant: "success" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "error" });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "profile", label: "Profile", icon: User },
    { key: "account", label: "Account", icon: Lock },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "appearance", label: "Appearance", icon: Palette },
    { key: "privacy", label: "Privacy", icon: Shield },
  ];

  return (
    <>
      <h1 className="text-h2 font-bold text-text-1">Settings</h1>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Tab Navigation */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => switchTab(t.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all ${activeTab === t.key ? "bg-primary/10 text-primary" : "text-text-2 hover:bg-muted hover:text-text-1"}`}>
                  <Icon className="w-4 h-4" />{t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "profile" && (
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user?.image || undefined} />
                    <AvatarFallback className="text-xl">{getInitials(user?.name || "U")}</AvatarFallback>
                  </Avatar>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                </div>
                <div>
                  <h3 className="text-body font-bold text-text-1">{user?.name || "User"}</h3>
                  <p className="text-caption text-text-3">{user?.email}</p>
                </div>
              </div>
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                <div><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
                <div><Label htmlFor="email">Email</Label><Input id="email" value={user?.email || ""} disabled className="mt-1.5 opacity-60" /></div>
                <div><Label htmlFor="bio">Bio</Label><Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1.5" placeholder="Tell us about yourself..." /></div>
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Changes
                </Button>
              </form>
            </Card>
          )}

          {activeTab === "account" && (
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-h3 font-semibold text-text-1 mb-4">Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                  <div><Label htmlFor="current">Current Password</Label><Input id="current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="mt-1.5" /></div>
                  <div><Label htmlFor="new">New Password</Label><Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="mt-1.5" /></div>
                  <div><Label htmlFor="confirm">Confirm New Password</Label><Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1.5" /></div>
                  <Button type="submit" disabled={savingPassword}>{savingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Change Password</Button>
                </form>
              </Card>

              <Card className="p-6">
                <h3 className="text-h3 font-semibold text-text-1 mb-2">Language &amp; Timezone</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mt-4">
                  <div>
                    <Label htmlFor="lang">Language</Label>
                    <select id="lang" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-xl border border-border bg-white text-[13px] font-medium text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="pt">Portuguese</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="tz">Timezone</Label>
                    <select id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-xl border border-border bg-white text-[13px] font-medium text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20">
                      {["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Bogota", "America/Mexico_City", "America/Sao_Paulo", "Europe/London", "Europe/Madrid", "UTC"].map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-h3 font-semibold text-text-1">Sign Out</h3>
                    <p className="text-body-sm text-text-2 mt-1">Sign out of your account on this device.</p>
                  </div>
                  <Button variant="danger" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />Sign Out</Button>
                </div>
              </Card>

              <Card className="p-6 border-red-200">
                <h3 className="text-h3 font-semibold text-danger mb-2">Delete Account</h3>
                <p className="text-body-sm text-text-2 mb-4">This action is permanent and cannot be undone. All your data will be lost.</p>
                <div className="max-w-sm">
                  <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
                  <Input id="delete-confirm" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" className="mt-1.5 border-red-200" />
                  <Button variant="danger" onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE" || deleting} className="mt-3">
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}Delete My Account
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "notifications" && (
            <Card className="p-6">
              <h3 className="text-h3 font-semibold text-text-1 mb-4">Notification Preferences</h3>
              <div className="space-y-4 max-w-lg">
                <NotifToggle label="Email Notifications" description="Receive important updates via email" checked={emailNotifications} onChange={setEmailNotifications} />
                <NotifToggle label="Course Updates" description="Get notified when courses you're enrolled in are updated" checked={courseUpdates} onChange={setCourseUpdates} />
                <NotifToggle label="Marketing Emails" description="Receive promotions and special offers" checked={marketingEmails} onChange={setMarketingEmails} />
                <NotifToggle label="Weekly Digest" description="Receive a weekly summary of your learning progress" checked={weeklyDigest} onChange={setWeeklyDigest} />
              </div>
            </Card>
          )}

          {activeTab === "appearance" && (
            <Card className="p-6">
              <h3 className="text-h3 font-semibold text-text-1 mb-4">Theme</h3>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                {(["light", "dark", "system"] as Theme[]).map((t) => (
                  <button key={t} onClick={() => setTheme(t)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${theme === t ? "border-primary bg-primary/5" : "border-border hover:border-text-3"}`}>
                    <div className="text-body-sm font-semibold text-text-1 capitalize">{t}</div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {activeTab === "privacy" && (
            <Card className="p-6">
              <h3 className="text-h3 font-semibold text-text-1 mb-4">Privacy Settings</h3>
              <div className="space-y-4 max-w-lg">
                <NotifToggle label="Public Profile" description="Allow others to see your profile" checked={showProfile} onChange={setShowProfile} />
                <NotifToggle label="Show Activity" description="Show your learning activity to course instructors" checked={showActivity} onChange={setShowActivity} />
              </div>
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-body font-semibold text-text-1 mb-2">Legal</h4>
                <div className="flex flex-wrap gap-4">
                  <a href="https://cxflow.io/privacy" target="_blank" rel="noopener noreferrer" className="text-body-sm text-primary font-medium hover:underline">Privacy Policy</a>
                  <a href="https://cxflow.io/terms" target="_blank" rel="noopener noreferrer" className="text-body-sm text-primary font-medium hover:underline">Terms of Service</a>
                  <a href="https://cxflow.io/cookies" target="_blank" rel="noopener noreferrer" className="text-body-sm text-primary font-medium hover:underline">Cookie Policy</a>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function NotifToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-white">
      <div>
        <div className="text-body-sm font-semibold text-text-1">{label}</div>
        <div className="text-caption text-text-3 mt-0.5">{description}</div>
      </div>
      <button onClick={() => onChange(!checked)} className={`w-11 h-6 rounded-full transition-colors relative ${checked ? "bg-primary" : "bg-border"}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${checked ? "translate-x-5.5 left-[1px]" : "left-[2px]"}`} style={{ transform: checked ? "translateX(21px)" : "translateX(0)" }} />
      </button>
    </div>
  );
}
