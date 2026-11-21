import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router";
import { Button } from "@/components/ui/button";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { refreshUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setErrorMsg("Confirmation link is missing a valid token.");
      return;
    }

    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    let isMounted = true;
    apiClient
      .post("/users/me/email/confirm", { token })
      .then(async () => {
        if (isMounted) {
          setIsSuccess(true);
          await refreshUser();
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMsg(getErrorMessage(err));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, refreshUser]);

  return (
    <main className="flex min-h-screen w-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        {isLoading ? (
          <div className="space-y-4">
            <Loader2 className="size-10 animate-spin text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">
              Verifying Email Change...
            </h1>
            <p className="text-sm text-muted-foreground">
              Please wait while we update your email address.
            </p>
          </div>
        ) : isSuccess ? (
          <div className="space-y-6 animate-in fade-in-50">
            <div className="size-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">
                Email Address Confirmed!
              </h1>
              <p className="text-sm text-muted-foreground">
                Your email address has been successfully updated. All prior sessions were invalidated for security.
              </p>
            </div>
            <Button asChild className="w-full gap-2">
              <Link to="/dashboard">
                Go to Dashboard <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in-50">
            <div className="size-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle className="size-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">
                Confirmation Failed
              </h1>
              <p className="text-sm text-muted-foreground">
                {errorMsg || "The verification link is invalid or has expired."}
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Return to Sign In</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
