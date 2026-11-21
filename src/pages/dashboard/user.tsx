import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import type { User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Shield, Calendar, Users } from "lucide-react";

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();

  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ["user-detail", Number(userId)],
    queryFn: async () => {
      const res = await apiClient.get<User>(`/users/${userId}`);
      return res.data;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">User Not Found</h2>
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        <Button asChild variant="outline">
          <Link to="/dashboard/users">Back to Users</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
        <Link to="/dashboard/users">
          <ArrowLeft className="size-4" /> All Users
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-bold">{user.name}</CardTitle>
                <Badge
                  variant={user.role === "ADMIN" ? "purple" : "secondary"}
                  className="text-xs"
                >
                  {user.role === "ADMIN" && <Shield className="size-3 mr-1" />}
                  {user.role}
                </Badge>
              </div>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                <Users className="size-3.5" /> Team Membership
              </span>
              <p className="text-sm font-semibold text-foreground">
                {user.membership
                  ? `Team #${user.membership.teamId} (${user.membership.role})`
                  : "No Team Assigned"}
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                <Calendar className="size-3.5" /> Member Since
              </span>
              <p className="text-sm font-semibold text-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
