import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { emailReg, errorMessages } from "@/lib/consts";
import { KeyRound, Mail, Loader2, ArrowRight } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const fromLocation = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate(fromLocation, { replace: true });
  }

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
    if (!password) {
      toast.error("Password Required", {
        description: "Please enter your account password.",
      });
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password);
      toast.success("Welcome back!", {
        description: "Successfully signed in to Intraflow.",
      });
      navigate(fromLocation, { replace: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Invalid email or password.";
      toast.error("Sign In Failed", {
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setEmailError("");
  };

  return (
    <main className="flex min-h-screen w-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-border bg-card p-8 shadow-sm">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2 font-bold text-xl tracking-wider">
            IF
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sign in to Intraflow
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your workspace
          </p>
        </div>

        {/* Form */}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground block"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        {/* Demo Credentials Helper */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground font-medium mb-2.5">
            Quick fill demo accounts:
          </p>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() =>
                handleDemoLogin("admin@intraflow.dev", "AdminPassword123!")
              }
              className="px-2 py-1.5 rounded-md border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors font-medium text-center"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() =>
                handleDemoLogin("mod.alpha@intraflow.dev", "DemoPassword123!")
              }
              className="px-2 py-1.5 rounded-md border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors font-medium text-center"
            >
              Moderator
            </button>
            <button
              type="button"
              onClick={() =>
                handleDemoLogin("dev.alpha@intraflow.dev", "DemoPassword123!")
              }
              className="px-2 py-1.5 rounded-md border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors font-medium text-center"
            >
              Developer
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;
