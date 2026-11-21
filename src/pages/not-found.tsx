import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen w-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Compass className="size-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Page Not Found
          </h1>
          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist or has been moved to another location.
          </p>
        </div>
        <Button asChild className="w-full gap-2">
          <Link to="/dashboard">
            <ArrowLeft className="size-4" /> Return to Dashboard
          </Link>
        </Button>
      </div>
    </main>
  );
}
