"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { getInitials } from "@/lib/utils";
import {
  User,
  Lock,
  Bell,
  Globe,
  LogOut,
  Camera,
  Palette,
  Moon,
  Sun,
} from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    bio: "",
  });

  const handleProfileUpdate = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would call an API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const isCreator = session?.user?.role === "ADMIN" || session?.user?.role === "CREATOR";

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-h2 sm:text-h1 font-bold text-text-1">Settings</h1>
          <p className="text-caption sm:text-body-sm text-text-2 mt-0.5 sm:mt-1">
            Manage your account and preferences
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="flex-1">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5">
            <Lock className="w-4 h-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Palette className="w-4 h-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card className="p-6">
            <h2 className="text-h3 font-semibold text-text-1 mb-4">Profile Information</h2>

            {/* Avatar Section */}
            <div className="flex items-center gap-6 mb-6">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="text-h3">
                    {getInitials(session?.user?.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-primary hover:bg-primary-600 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h3 className="text-body font-semibold text-text-1">
                  {session?.user?.name || "User"}
                </h3>
                <p className="text-caption text-text-3">{session?.user?.email}</p>
                <p className="text-caption text-primary mt-1 font-semibold">
                  {session?.user?.role === "ADMIN"
                    ? "Administrator"
                    : session?.user?.role === "CREATOR"
                    ? "Creator"
                    : "Learner"}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Profile Form */}
            <div className="space-y-4 max-w-lg">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData((p) => ({ ...p, name: e.target.value }))
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData((p) => ({ ...p, email: e.target.value }))
                  }
                  className="mt-2"
                  disabled
                />
                <p className="text-caption text-text-3 mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) =>
                    setProfileData((p) => ({ ...p, bio: e.target.value }))
                  }
                  placeholder={isCreator ? "Tell learners about yourself..." : "Tell us about yourself..."}
                  className="mt-2 w-full h-24 px-4 py-2 rounded-lg border border-border text-body-sm text-text-1 placeholder:text-text-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <Button onClick={handleProfileUpdate} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="mt-4 space-y-4">
          <Card className="p-6">
            <h2 className="text-h3 font-semibold text-text-1 mb-4">Change Password</h2>
            <div className="space-y-4 max-w-lg">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  className="mt-2"
                />
              </div>
              <Button>Update Password</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-h3 font-semibold text-text-1 mb-2">Danger Zone</h2>
            <p className="text-body-sm text-text-2 mb-4">
              Irreversible actions that affect your account
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              <Button variant="danger">Delete Account</Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-4">
          <Card className="p-6">
            <h2 className="text-h3 font-semibold text-text-1 mb-4">
              Notification Preferences
            </h2>
            <div className="space-y-4">
              {(isCreator ? [
                {
                  title: "New Enrollments",
                  description: "Get notified when someone enrolls in your course",
                  enabled: true,
                },
                {
                  title: "Course Reviews",
                  description: "Get notified when someone leaves a review",
                  enabled: true,
                },
                {
                  title: "Q&A Activity",
                  description: "Get notified about questions on your courses",
                  enabled: false,
                },
                {
                  title: "Weekly Reports",
                  description: "Receive weekly analytics reports via email",
                  enabled: true,
                },
                {
                  title: "Marketing Updates",
                  description: "Receive tips and platform updates",
                  enabled: false,
                },
              ] : [
                {
                  title: "Course Updates",
                  description: "Get notified when courses you're enrolled in are updated",
                  enabled: true,
                },
                {
                  title: "New Courses",
                  description: "Get notified about new courses in your interests",
                  enabled: true,
                },
                {
                  title: "Learning Reminders",
                  description: "Receive reminders to continue your courses",
                  enabled: true,
                },
                {
                  title: "Achievements",
                  description: "Get notified when you earn badges or complete courses",
                  enabled: true,
                },
                {
                  title: "Marketing Updates",
                  description: "Receive tips and platform updates",
                  enabled: false,
                },
              ]).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/95 bg-white/95"
                >
                  <div>
                    <div className="text-body-sm font-semibold text-text-1">
                      {item.title}
                    </div>
                    <div className="text-caption text-text-3">{item.description}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={item.enabled}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-text-3/20 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
            <Button className="mt-4">Save Preferences</Button>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="mt-4">
          <Card className="p-6">
            <h2 className="text-h3 font-semibold text-text-1 mb-4">Theme</h2>
            <div className="grid grid-cols-3 gap-3 max-w-lg">
              {[
                { id: "light", label: "Light", icon: Sun, active: true },
                { id: "dark", label: "Dark", icon: Moon, active: false },
                { id: "system", label: "System", icon: Globe, active: false },
              ].map((theme) => (
                <button
                  key={theme.id}
                  className={`p-4 rounded-xl border-2 transition-colors ${
                    theme.active
                      ? "border-primary bg-primary/5"
                      : "border-border/95 bg-white/95 hover:border-primary/50"
                  }`}
                >
                  <theme.icon
                    className={`w-6 h-6 mx-auto mb-2 ${
                      theme.active ? "text-primary" : "text-text-2"
                    }`}
                  />
                  <div
                    className={`text-caption font-semibold ${
                      theme.active ? "text-primary" : "text-text-1"
                    }`}
                  >
                    {theme.label}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6 mt-4">
            <h2 className="text-h3 font-semibold text-text-1 mb-4">Language & Region</h2>
            <div className="space-y-4 max-w-lg">
              <div>
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  className="mt-2 w-full h-10 px-4 rounded-lg border border-border bg-surface text-body-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="pt">Português</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  className="mt-2 w-full h-10 px-4 rounded-lg border border-border bg-surface text-body-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="utc">UTC (Coordinated Universal Time)</option>
                  <option value="est">EST (Eastern Standard Time)</option>
                  <option value="pst">PST (Pacific Standard Time)</option>
                  <option value="gmt">GMT (Greenwich Mean Time)</option>
                </select>
              </div>
              <Button>Save Preferences</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
