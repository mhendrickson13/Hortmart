"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Plus, Eye, Mail, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { getInitials, formatRelativeTime, cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserData {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
    createdAt: string;
  };
  enrolledCount: number;
  completedCoursesCount: number;
  lastActive: string | null;
}

interface UsersListProps {
  allUsers: UserData[];
  activeUsers: UserData[];
  completedUsers: UserData[];
  totalCount: number;
  activeCount: number;
  completedCount: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function getUserStatus(userData: UserData): "ACTIVE" | "BLOCKED" | "NEW" {
  const now = Date.now();
  const createdAt = new Date(userData.user.createdAt).getTime();

  // NEW: created within last 3 days
  if (now - createdAt <= THREE_DAYS_MS) return "NEW";

  // ACTIVE: has recent activity within 7 days
  if (userData.lastActive) {
    const lastActiveTime = new Date(userData.lastActive).getTime();
    if (now - lastActiveTime <= SEVEN_DAYS_MS) return "ACTIVE";
  }

  return "ACTIVE"; // Default to active (no BLOCKED without backend support yet)
}

function getStatusVariant(
  status: "ACTIVE" | "BLOCKED" | "NEW"
): "success" | "error" | "primary" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "BLOCKED":
      return "error";
    case "NEW":
      return "primary";
  }
}

export function UsersList({
  allUsers,
  activeUsers,
  completedUsers,
  totalCount,
  activeCount,
  completedCount,
}: UsersListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ email: "", password: "", name: "", role: "LEARNER" });
  const [addingUser, setAddingUser] = useState(false);

  const filterUsers = (users: UserData[]) => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (userData) =>
        userData.user.name?.toLowerCase().includes(query) ||
        userData.user.email.toLowerCase().includes(query)
    );
  };

  // Compute blocked users (none yet, placeholder)
  const blockedUsers: UserData[] = [];

  const filteredAllUsers = useMemo(
    () => filterUsers(allUsers),
    [allUsers, searchQuery]
  );
  const filteredActiveUsers = useMemo(
    () => filterUsers(activeUsers),
    [activeUsers, searchQuery]
  );
  const filteredBlockedUsers = useMemo(
    () => filterUsers(blockedUsers),
    [blockedUsers, searchQuery]
  );

  const handleAddUser = async () => {
    if (!addUserForm.email || !addUserForm.password) {
      toast({ title: "Email and password are required", variant: "error" });
      return;
    }
    setAddingUser(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(addUserForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed to create user");
      }
      toast({ title: "User created successfully", variant: "success" });
      setShowAddUser(false);
      setAddUserForm({ email: "", password: "", name: "", role: "LEARNER" });
      window.location.reload();
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to create user",
        variant: "error",
      });
    } finally {
      setAddingUser(false);
    }
  };

  return (
    <>
      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[22px] bg-white border border-border/95 shadow-[0_24px_48px_rgba(21,25,35,0.12)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-black text-text-1">Add new user</h2>
              <button
                onClick={() => setShowAddUser(false)}
                className="w-8 h-8 rounded-xl hover:bg-muted grid place-items-center"
              >
                <X className="w-4 h-4 text-text-3" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="add-email">Email *</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="add-name">Name</Label>
                <Input
                  id="add-name"
                  value={addUserForm.name}
                  onChange={(e) => setAddUserForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="add-password">Password *</Label>
                <Input
                  id="add-password"
                  type="password"
                  value={addUserForm.password}
                  onChange={(e) => setAddUserForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 characters"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="add-role">Role</Label>
                <select
                  id="add-role"
                  value={addUserForm.role}
                  onChange={(e) => setAddUserForm((f) => ({ ...f, role: e.target.value }))}
                  className="mt-1.5 w-full h-10 px-3 rounded-lg border border-border text-body-sm text-text-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="LEARNER">Learner</option>
                  <option value="CREATOR">Creator</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 mt-5">
              <Button
                variant="secondary"
                onClick={() => setShowAddUser(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={addingUser || !addUserForm.email || !addUserForm.password}
              >
                {addingUser ? "Creating..." : "Create user"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header - matches design: Title, subtitle, search, segmented control, Add user */}
      <div className="flex items-center justify-between gap-3 h-14 flex-shrink-0">
        <div>
          <h1 className="text-[22px] font-black tracking-tight text-text-1">
            Users
          </h1>
          <p className="text-[12px] font-extrabold text-text-3 mt-0.5">
            Manage learners and access
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="hidden sm:flex h-10 w-[380px] rounded-[16px] border border-border/95 bg-white/95 items-center gap-2.5 px-3.5 text-text-3 font-bold text-[13px]">
            <Search className="w-4 h-4 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none placeholder:text-text-3 text-text-1"
            />
          </div>

          {/* Add user button */}
          <Button
            onClick={() => setShowAddUser(true)}
            className="h-10 rounded-[16px] px-3.5 gap-2 font-black text-[13px] shadow-[0_16px_34px_rgba(47,111,237,0.24)]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add user</span>
          </Button>
        </div>
      </div>

      {/* Tabs - All / Active / Blocked matching design */}
      <Tabs defaultValue="all" className="flex-1">
        <TabsList>
          <TabsTrigger value="all">
            All{" "}
            <span className="ml-1.5 text-text-3">
              ({filteredAllUsers.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active{" "}
            <span className="ml-1.5 text-text-3">
              ({filteredActiveUsers.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="blocked">
            Blocked{" "}
            <span className="ml-1.5 text-text-3">
              ({filteredBlockedUsers.length})
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <UserList users={filteredAllUsers} searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <UserList users={filteredActiveUsers} searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="blocked" className="mt-4">
          <UserList users={filteredBlockedUsers} searchQuery={searchQuery} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function UserList({
  users,
  searchQuery,
}: {
  users: UserData[];
  searchQuery: string;
}) {
  if (users.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-h3 font-semibold text-text-1 mb-2">
          {searchQuery ? "No users found" : "No users yet"}
        </h3>
        <p className="text-body-sm text-text-2">
          {searchQuery
            ? `No users matching "${searchQuery}"`
            : "Users will appear here once they enroll in your courses."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-3.5">
      {/* Table Header - matches design */}
      <div className="hidden sm:grid grid-cols-[1.4fr_0.8fr_0.6fr_0.6fr_0.6fr] gap-2.5 items-center px-3 py-2.5 text-[11px] font-black text-text-3 uppercase tracking-[0.3px]">
        <div>User</div>
        <div>Courses</div>
        <div>Last active</div>
        <div>Status</div>
        <div className="text-right">Actions</div>
      </div>

      {/* User Rows */}
      <div>
        {users.map(({ user, enrolledCount, lastActive, completedCoursesCount }) => {
          const status = getUserStatus({
            user,
            enrolledCount,
            lastActive,
            completedCoursesCount: completedCoursesCount ?? 0,
          });
          const statusVariant = getStatusVariant(status);

          return (
            <div
              key={user.id}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_0.8fr_0.6fr_0.6fr_0.6fr] gap-2.5 items-center p-3 rounded-[18px] border border-border/95 bg-white/95 mt-2.5 first:mt-0"
            >
              {/* User Info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="w-10 h-10 rounded-[16px] border border-border/95 flex-shrink-0">
                  <AvatarImage src={user.image || undefined} />
                  <AvatarFallback className="rounded-[16px] bg-[rgba(21,25,35,0.04)]">
                    {getInitials(user.name || user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-[13px] font-black text-text-1 truncate">
                    {user.email}
                  </div>
                  <div className="text-[12px] font-extrabold text-text-3 mt-1">
                    {user.name || "Unnamed User"}
                  </div>
                </div>
              </div>

              {/* Courses Count */}
              <div className="hidden sm:block">
                <span className="font-black text-text-1">{enrolledCount}</span>
              </div>

              {/* Last Active */}
              <div className="hidden sm:block">
                <span className="font-black text-text-1">
                  {lastActive ? formatRelativeTime(lastActive) : "—"}
                </span>
              </div>

              {/* Status - ACTIVE / BLOCKED / NEW pills */}
              <div className="hidden sm:block">
                <Pill variant={statusVariant}>{status}</Pill>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 justify-end">
                <Link
                  href={`/users/${user.id}`}
                  className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center text-[12px] font-black bg-primary/10 border border-primary/14 text-primary-600 hover:bg-primary/15 transition-colors"
                >
                  View
                </Link>
                {status === "NEW" ? (
                  <button
                    onClick={() =>
                      toast({
                        title: "Invite sent",
                        description: `Invitation email feature is under development.`,
                        variant: "info",
                      })
                    }
                    className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center gap-1.5 text-[12px] font-black bg-white/95 border border-border/95 text-text-1 hover:bg-muted transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Invite
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      toast({
                        title: "Messaging coming soon",
                        description: "Direct messaging is under development.",
                        variant: "info",
                      })
                    }
                    className="hidden sm:inline-flex h-[34px] px-3 rounded-[14px] items-center gap-1.5 text-[12px] font-black bg-white/95 border border-border/95 text-text-1 hover:bg-muted transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Message
                  </button>
                )}
                <Link
                  href={`/users/${user.id}`}
                  className="sm:hidden h-8 w-8 rounded-xl flex items-center justify-center bg-primary/10 text-primary"
                >
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
