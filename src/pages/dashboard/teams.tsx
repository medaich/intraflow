import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import type { PaginatedResponse, Team } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Link } from "react-router";
import {
  Shield,
  Plus,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null);

  // Teams query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["teams", { page, search }],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Team>>("/teams", {
        params: { page, limit: 10, search: search.trim() || undefined },
      });
      return res.data;
    },
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      const res = await apiClient.post<Team>("/teams", payload);
      return res.data;
    },
    onSuccess: (newTeam) => {
      toast.success("Team Created", {
        description: `Team "${newTeam.name}" has been created successfully.`,
      });
      setIsCreateModalOpen(false);
      setTeamName("");
      setTeamDescription("");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (err) => {
      toast.error("Failed to Create Team", {
        description: getErrorMessage(err),
      });
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      await apiClient.delete(`/teams/${teamId}`);
    },
    onSuccess: () => {
      toast.success("Team Removed", {
        description: "The team has been soft-deleted successfully.",
      });
      setDeletingTeamId(null);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (err) => {
      toast.error("Cannot Delete Team", {
        description: getErrorMessage(err),
      });
      setDeletingTeamId(null);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error("Team name is required");
      return;
    }
    createTeamMutation.mutate({
      name: teamName.trim(),
      description: teamDescription.trim() || undefined,
    });
  };

  const teams = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="size-6 text-primary" /> Team Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create organizational teams, assign moderators, and manage member rosters.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2 cursor-pointer shrink-0"
        >
          <Plus className="size-4" /> Create Team
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search teams by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-card"
          />
        </div>
      </div>

      {/* Teams Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Active Teams</CardTitle>
          <CardDescription>
            All registered functional teams in Intraflow
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-destructive space-y-2">
              <AlertTriangle className="size-8 mx-auto" />
              <p className="text-sm font-medium">Failed to load teams</p>
              <p className="text-xs text-muted-foreground">{getErrorMessage(error)}</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Users className="size-6" />}
                title="No teams found"
                description={
                  search
                    ? `No teams matching "${search}"`
                    : "No teams have been created yet. Create the first team to get started."
                }
                action={
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="size-4" /> Create Team
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Team Name</th>
                    <th className="py-3 px-4 font-semibold">Description</th>
                    <th className="py-3 px-4 font-semibold">Members</th>
                    <th className="py-3 px-4 font-semibold">Created</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teams.map((team) => (
                    <tr
                      key={team.teamId}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        <Link
                          to={`/dashboard/teams/${team.teamId}`}
                          className="hover:text-primary hover:underline flex items-center gap-2"
                        >
                          <Users className="size-4 text-primary" />
                          {team.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                        {team.description || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="font-normal text-xs">
                          {team.members?.length ?? 0} members
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {new Date(team.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/dashboard/teams/${team.teamId}`}>
                            Roster & Details
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingTeamId(team.teamId)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete Team"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
              <span>
                Showing page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> ({meta.total} total teams)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Team Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Teams group employees together to own and execute projects. Team names must be unique.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="teamName" className="text-sm font-medium">
                Team Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="teamName"
                placeholder="e.g. Infrastructure Core"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="teamDesc" className="text-sm font-medium">
                Description (Optional)
              </label>
              <Input
                id="teamDesc"
                placeholder="Responsibilities and domain focus"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createTeamMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTeamMutation.isPending || !teamName.trim()}
                className="gap-2"
              >
                {createTeamMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Create Team
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Deletion Dialog */}
      <Dialog
        open={deletingTeamId !== null}
        onOpenChange={(open) => !open && setDeletingTeamId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Delete Team
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this team? A team cannot be deleted if it still contains active members or active projects. You must reassign or remove them first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingTeamId(null)}
              disabled={deleteTeamMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingTeamId && deleteTeamMutation.mutate(deletingTeamId)}
              disabled={deleteTeamMutation.isPending}
              className="gap-2"
            >
              {deleteTeamMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
