import { useState, type FormEvent } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { pwReg, emailReg, errorMessages } from "@/lib/consts";
import { User, Mail, KeyRound, Loader2, ArrowRight } from "lucide-react";

export default function Signup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const initialEmail = searchParams.get("email") || "";
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
      toast.error("Missing Invitation Token", {
        description: "An invitation token is required to register.",
      });
      return;
    }

    if (!name.trim()) {
      toast.error("Name Required", { description: "Please enter your full name." });
      return;
    }

    if (!email.trim() || !emailReg.test(email.trim())) {
      toast.error("Valid Email Required", { description: "Please enter the invited email address." });
      return;
    }

    if (!validatePassword(password)) return;

    if (password !== confirmPassword) {
      toast.error("Passwords Do Not Match", {
        description: "Please ensure both password fields match.",
      });
      return;
    }

    try {
      setIsLoading(true);
      await apiClient.post(`/auth/signup?token=${encodeURIComponent(token)}`, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      toast.success("Account Created!", {
        description: "Welcome to Intraflow. Redirecting to your workspace...",
      });

      // Hydrate auth state from the newly set session cookie
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error("Registration Failed", {
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
            Invalid Invitation Link
          </h1>
          <p className="text-sm text-muted-foreground">
            This registration page requires an invitation token provided by an administrator. Please check your invitation email.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Return to Sign In</Link>
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
            Accept Invitation
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up your profile and password to join Intraflow
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium text-foreground block"
            >
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="Sarah Connor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground block"
            >
              Invited Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground block"
            >
              Create Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
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
              Confirm Password
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
                Creating account...
              </>
            ) : (
              <>
                Complete Registration
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
