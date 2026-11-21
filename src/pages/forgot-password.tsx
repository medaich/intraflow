import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { emailReg, errorMessages } from "@/lib/consts";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailReg.test(val)) {
      setEmailError(errorMessages.email);
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateEmail(email)) return;

    try {
      setIsLoading(true);
      await apiClient.post("/auth/forgot-password", { email });
      setIsSubmitted(true);
      toast.success("Request Received", {
        description: "If an account matches that email, a reset link was sent.",
      });
    } catch (error) {
      toast.error("Request Failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center space-y-2">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2 font-bold text-xl tracking-wider">
            IF
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Forgot Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to receive a password reset link
          </p>
        </div>

        {isSubmitted ? (
          <div className="space-y-6 text-center animate-in fade-in-50">
            <div className="size-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                Check Your Inbox
              </h2>
              <p className="text-sm text-muted-foreground">
                If an account with <strong className="text-foreground">{email}</strong> exists, you will find instructions in your email (or Mailpit on port 8025 in development).
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login" className="gap-2">
                <ArrowLeft className="size-4" /> Back to Sign In
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground block"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={(e) => validateEmail(e.target.value)}
                  disabled={isLoading}
                  className="pl-9"
                  required
                />
              </div>
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full gap-2 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Send Password Reset Link"
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
