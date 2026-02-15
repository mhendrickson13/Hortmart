import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/components/ui/toaster";
import {
  Mail,
  Plus,
  Ban,
  Shield,
  CheckCircle,
  Download,
} from "lucide-react";

// ── Header Action Buttons ──

interface UserHeaderActionsProps {
  userId: string;
  userName: string | null;
  userRole: string;
  blockedAt?: string | null;
}

export function UserHeaderActions({
  userId,
  userName,
  userRole,
  blockedAt,
}: UserHeaderActionsProps) {
  const navigate = useNavigate();
  const [blocking, setBlocking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(!!blockedAt);

  const handleMessage = () => {
    toast({
      title: "Messaging coming soon",
      description: "Direct messaging is under development.",
      variant: "info",
    });
  };

  const handleAddCourse = () => {
    toast({
      title: "Add course coming soon",
      description: "Manual course enrollment is under development.",
      variant: "info",
    });
  };

  const handleBlock = async () => {
    if (userRole === "ADMIN") {
      toast({ title: "Cannot block an admin user", variant: "error" });
      return;
    }

    const action = isBlocked ? "unblock" : "block";
    const confirmMsg = isBlocked
      ? `Unblock ${userName || "this user"}?`
      : `Block ${userName || "this user"}? They will lose access to the platform.`;

    if (!window.confirm(confirmMsg)) return;

    setBlocking(true);
    try {
      if (action === "block") {
        await apiClient.users.block(userId);
      } else {
        await apiClient.users.unblock(userId);
      }

      setIsBlocked(!isBlocked);
      toast({
        title: isBlocked ? "User unblocked" : "User blocked",
        variant: "success",
      });
      navigate(0);
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : `Failed to ${action} user`,
        variant: "error",
      });
    } finally {
      setBlocking(false);
    }
  };

  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={handleMessage}
        className="h-10 px-3.5 rounded-[16px] border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 font-black text-[13px] inline-flex items-center gap-2 shadow-[0_14px_28px_rgba(21,25,35,0.06)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.25)]"
      >
        <Mail className="w-4 h-4" />
        Message
      </button>
      <button
        onClick={handleAddCourse}
        className="h-10 px-3.5 rounded-[16px] border border-primary/55 bg-primary text-white font-black text-[13px] inline-flex items-center gap-2 shadow-[0_16px_34px_rgba(47,111,237,0.22)]"
      >
        <Plus className="w-4 h-4" />
        Add course
      </button>
      <button
        onClick={handleBlock}
        disabled={blocking}
        className={`h-10 px-3.5 rounded-[16px] border font-black text-[13px] inline-flex items-center gap-2 transition-colors disabled:opacity-50 ${
          isBlocked
            ? "border-success/50 bg-card text-success hover:bg-success/5"
            : "border-red-300 dark:border-red-800 bg-card text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
        }`}
      >
        {isBlocked ? (
          <>
            <CheckCircle className="w-4 h-4" />
            {blocking ? "Unblocking..." : "Unblock"}
          </>
        ) : (
          <>
            <Ban className="w-4 h-4" />
            {blocking ? "Blocking..." : "Block"}
          </>
        )}
      </button>
    </div>
  );
}

// ── Edit Permissions Button ──

interface EditPermissionsProps {
  userId: string;
  currentRole: string;
}

export function EditPermissionsButton({
  userId,
  currentRole,
}: EditPermissionsProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (role === currentRole) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await apiClient.users.update(userId, { role } as never);
      toast({ title: "Role updated", variant: "success" });
      setEditing(false);
      navigate(0);
    } catch {
      toast({ title: "Failed to update role", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-[30px] px-2 rounded-[12px] text-[11px] font-black border border-border/95 bg-white/95 dark:bg-card/95 text-text-1"
        >
          <option value="LEARNER">Learner</option>
          <option value="CREATOR">Creator</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-[30px] px-2.5 rounded-[12px] text-[11px] font-black border border-primary/55 bg-primary text-white disabled:opacity-50"
        >
          {saving ? "..." : "Save"}
        </button>
        <button
          onClick={() => {
            setRole(currentRole);
            setEditing(false);
          }}
          className="h-[30px] px-2.5 rounded-[12px] text-[11px] font-black border border-border/95 bg-white/95 dark:bg-card/95 text-text-1"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="h-[30px] px-2.5 rounded-[12px] text-[11px] font-black border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 hover:bg-muted transition-colors"
    >
      Edit
    </button>
  );
}

// ── Review Refund Button ──

export function ReviewRefundButton() {
  return (
    <button
      onClick={() =>
        toast({
          title: "Refund review coming soon",
          description: "Refund management is under development.",
          variant: "info",
        })
      }
      className="h-[30px] px-2.5 rounded-[12px] text-[11px] font-black border border-border/95 bg-white/95 dark:bg-card/95 text-text-1 hover:bg-muted transition-colors"
    >
      Review
    </button>
  );
}

// ── Download Certificate Button ──

export function DownloadCertificateButton() {
  return (
    <button
      onClick={() =>
        toast({
          title: "Certificates coming soon",
          description: "Certificate generation is under development.",
          variant: "info",
        })
      }
      className="mt-1 h-[26px] px-2 rounded-[12px] text-[11px] font-black bg-primary/10 border border-primary/14 text-primary-600 inline-flex items-center gap-1 hover:bg-primary/15 transition-colors"
    >
      <Download className="w-3 h-3" />
      Download
    </button>
  );
}
