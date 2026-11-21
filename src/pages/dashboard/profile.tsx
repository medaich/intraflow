import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { pwReg, emailReg, errorMessages } from "@/lib/consts";
import {
  User as UserIcon,
  Shield,
  KeyRound,
  Mail,
  Users,
  Calendar,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  // Name update state
  const [name, setName] = useState(user?.name || "");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Password update state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [pwError, setPwError] = useState("");

  // Email update state
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailSentNotice, setEmailSentNotice] = useState(false);

  if (!user) return null;

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setIsUpdatingName(true);
      await apiClient.patch("/users/me", { name: name.trim() });
      await refreshUser();
      toast.success("Profile Updated", {
        description: "Your display name has been saved.",
      });
    } catch (err) {
      toast.error("Failed to Update Name", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }
    if (!pwReg.test(newPassword)) {
      setPwError(errorMessages.password);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      await apiClient.patch("/users/me/password", {
        currentPassword,
        newPassword,
      });
      toast.success("Password Changed", {
        description: "Your password was updated. Other active device sessions were revoked.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPwError("");
    } catch (err) {
      toast.error("Password Change Failed", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailCurrentPassword) {
      toast.error("Current password is required to request an email change");
      return;
    }
    if (!emailReg.test(newEmail)) {
      toast.error("Please provide a valid new email address");
      return;
    }

    try {
      setIsUpdatingEmail(true);
      await apiClient.post("/users/me/email", {
        currentPassword: emailCurrentPassword,
        newEmail: newEmail.trim(),
      });
      setEmailSentNotice(true);
      toast.success("Verification Email Sent", {
        description: `Please click the confirmation link sent to ${newEmail}.`,
      });
      setEmailCurrentPassword("");
      setNewEmail("");
    } catch (err) {
      toast.error("Email Change Failed", {
        description: getErrorMessage(err),
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <UserIcon className="size-6 text-primary" /> Account Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal profile, credentials, and email security preferences.
        </p>
      </div>

      {/* Account Overview Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-2xl bg-primary/10 text-primary font-bold text-xl flex items-center justify-center">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                  <Badge
                    variant={user.role === "ADMIN" ? "purple" : "secondary"}
                    className="text-xs"
                  >
                    {user.role === "ADMIN" && <Shield className="size-3 mr-1" />}
                    {user.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end text-xs text-muted-foreground space-y-1">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                {user.membership
                  ? `Team #${user.membership.teamId} (${user.membership.role})`
                  : "No Team Assigned"}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserIcon className="size-4 text-primary" /> Display Profile
            </CardTitle>
            <CardDescription>
              Update your public name displayed on assigned tasks and comments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="profileName" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="profileName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Current Email (Managed Below)
                </label>
                <Input value={user.email} disabled className="bg-muted/40" />
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={isUpdatingName || name === user.name || !name.trim()}
                className="gap-2"
              >
                {isUpdatingName && <Loader2 className="size-3.5 animate-spin" />}
                Save Profile
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <KeyRound className="size-4 text-primary" /> Change Password
            </CardTitle>
            <CardDescription>
              Update your credentials. Revokes all other active device sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="currPw" className="text-sm font-medium">
                  Current Password
                </label>
                <Input
                  id="currPw"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="newPw" className="text-sm font-medium">
                  New Password
                </label>
                <Input
                  id="newPw"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (pwError) setPwError("");
                  }}
                  required
                />
                {pwError && <p className="text-xs text-destructive">{pwError}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmNewPw" className="text-sm font-medium">
                  Confirm New Password
                </label>
                <Input
                  id="confirmNewPw"
                  type="password"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={isUpdatingPassword || !currentPassword || !newPassword}
                className="gap-2"
              >
                {isUpdatingPassword && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Two-Step Email Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Mail className="size-4 text-primary" /> Change Email Address (Two-Step Verification)
          </CardTitle>
          <CardDescription>
            Request an update to your login and contact email. A verification link will be sent to the new address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSentNotice ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-400 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-5" /> Verification Email Dispatched
              </div>
              <p className="text-xs leading-relaxed">
                Please check the inbox of your new email address. Click the confirmation link to finalize the change. (In local development, check Mailpit at <strong>http://localhost:8025</strong>).
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEmailSentNotice(false)}
                className="text-xs mt-2"
              >
                Submit another request
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <label htmlFor="newEmailInput" className="text-sm font-medium">
                  New Email Address
                </label>
                <Input
                  id="newEmailInput"
                  type="email"
                  placeholder="new.email@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="emailPwVerify" className="text-sm font-medium">
                  Current Password (For Security Verification)
                </label>
                <Input
                  id="emailPwVerify"
                  type="password"
                  placeholder="••••••••"
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={isUpdatingEmail || !newEmail || !emailCurrentPassword}
                className="gap-2"
              >
                {isUpdatingEmail && <Loader2 className="size-3.5 animate-spin" />}
                Send Verification Link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
