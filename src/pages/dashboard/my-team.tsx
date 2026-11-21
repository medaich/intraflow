import { useQuery } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { Team } from "@/types";
import { TeamRoster } from "@/components/teams/team-roster";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, Shield } from "lucide-react";

export default function MyTeamPage() {
  const { user } = useAuth();

  const { data: team, isLoading, isError, error } = useQuery({
    queryKey: ["my-team"],
    queryFn: async () => {
      const res = await apiClient.get<Team>("/teams/my-team");
      return res.data;
    },
    enabled: !!user?.membership?.teamId,
  });

  const isModerator = user?.membership?.role === "MODERATOR";
  const isAdmin = user?.role === "ADMIN";

  if (!user?.membership?.teamId) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <EmptyState
          icon={<Users className="size-8" />}
          title="You Are Not in a Team"
          description="You currently have not been assigned to any operational team. An administrator can add you to a team roster."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Failed to Load Team</h2>
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Users className="size-6 text-primary" /> My Team Roster
        </h1>
        <p className="text-sm text-muted-foreground">
          View your team members, collaborate on tasks, and review workflows.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Shield className="size-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">{team.name}</CardTitle>
              <CardDescription>
                {team.description || "Active operational team"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Created on {new Date(team.createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      <TeamRoster
        team={team}
        canManageMembers={isModerator || isAdmin}
        canEditRoles={isAdmin}
      />
    </div>
  );
}
