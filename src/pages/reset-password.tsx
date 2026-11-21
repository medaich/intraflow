import { useState, type FormEvent } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { pwReg, errorMessages } from "@/lib/consts";
import { KeyRound, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pwError, setPwError] = useState("");

  const validatePassword = (val: string) => {
    if (!pwReg.test(val)) {
      setPwError(errorMessages.password);
      return false;
    }
    setPwError("");
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      toast.error("Missing Reset Token", {
        description: "The reset link is missing a valid security token.",
      });
      return;
    }

    if (!validatePassword(newPassword)) return;

    if (newPassword !== confirmPassword) {
      toast.error("Passwords Do Not Match", {
        description: "Please verify both password inputs match.",
      });
      return;
    }

    try {
      setIsLoading(true);
      await apiClient.post("/auth/reset-password", {
        token,
        password: newPassword,
      });

      setIsSuccess(true);
      toast.success("Password Updated!", {
        description: "All existing sessions were invalidated. Please sign in with your new password.",
      });
    } catch (error) {
      toast.error("Password Reset Failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="flex min-h-screen w-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            !
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Invalid Password Reset Link
          </h1>
          <p className="text-sm text-muted-foreground">
            This page requires a one-time reset token. Please request a new link from the forgot password page.
          </p>
          <Button asChild className="w-full">
            <Link to="/forgot-password">Request New Reset Link</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center space-y-2">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2 font-bold text-xl tracking-wider">
            IF
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose a strong new password for your Intraflow account
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-6 text-center animate-in fade-in-50">
            <div className="size-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                Password Successfully Reset
              </h2>
              <p className="text-sm text-muted-foreground">
                You can now log in using your new credentials.
              </p>
            </div>
            <Button
              onClick={() => navigate("/login")}
              className="w-full"
            >
              Proceed to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="newPassword"
                className="text-sm font-medium text-foreground block"
              >
                New Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (pwError) validatePassword(e.target.value);
                  }}
                  onBlur={(e) => validatePassword(e.target.value)}
                  disabled={isLoading}
                  className="pl-9"
                  required
                />
              </div>
              {pwError && (
                <p className="text-xs text-destructive">{pwError}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-foreground block"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                <ArrowLeft className="size-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
