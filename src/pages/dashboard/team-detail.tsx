import { useState } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { Team } from "@/types";
import { TeamRoster } from "@/components/teams/team-roster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Shield, ArrowLeft, Edit3, Loader2 } from "lucide-react";

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: team, isLoading, isError, error } = useQuery({
    queryKey: ["team", Number(teamId)],
    queryFn: async () => {
      const res = await apiClient.get<Team>(`/teams/${teamId}`);
      setName(res.data.name);
      setDescription(res.data.description || "");
      return res.data;
    },
    enabled: !!teamId,
  });

  const updateTeamMutation = useMutation({
    mutationFn: async (payload: { name?: string; description?: string }) => {
      const res = await apiClient.patch<Team>(`/teams/${teamId}`, payload);
      return res.data;
    },
    onSuccess: (updated) => {
      toast.success("Team Updated", {
        description: `Team details have been updated.`,
      });
      setIsEditing(false);
      queryClient.setQueryData(["team", Number(teamId)], updated);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (err) => {
      toast.error("Update Failed", {
        description: getErrorMessage(err),
      });
    },
  });

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateTeamMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  const isAdmin = user?.role === "ADMIN";
  const isModerator =
    user?.membership?.teamId === Number(teamId) &&
    user?.membership?.role === "MODERATOR";

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Team Not Found</h2>
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        <Button asChild variant="outline">
          <Link to="/dashboard/teams">Back to Teams</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
          <Link to="/dashboard/teams">
            <ArrowLeft className="size-4" /> All Teams
          </Link>
        </Button>
      </div>

      {/* Team Details Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Shield className="size-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">{team.name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                Created on {new Date(team.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {isAdmin && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-1.5"
            >
              <Edit3 className="size-3.5" /> Edit Details
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {isEditing ? (
            <form onSubmit={handleUpdateSubmit} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <label htmlFor="teamNameEdit" className="text-sm font-medium">
                  Team Name
                </label>
                <Input
                  id="teamNameEdit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="teamDescEdit" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="teamDescEdit"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateTeamMutation.isPending || !name.trim()}
                  className="gap-2"
                >
                  {updateTeamMutation.isPending && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              {team.description || "No description provided for this team."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Team Roster */}
      <TeamRoster
        team={team}
        canManageMembers={isAdmin || isModerator}
        canEditRoles={isAdmin}
      />
    </div>
  );
}
