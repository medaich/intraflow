import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { getProjectProgressPercent, type PaginatedResponse, type Project, type Team } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
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
  Folders,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2,
} from "lucide-react";

export default function ProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create project form state (Admin only)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]
  );
  const [teamId, setTeamId] = useState<number | "">("");

  // Projects query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["projects", { page, search, statusFilter }],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Project>>("/projects", {
        params: {
          page,
          limit: 9,
          search: search.trim() || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        },
      });
      return res.data;
    },
  });

  // Teams list for the assignment dropdown (Admin only)
  const { data: teamsData } = useQuery({
    queryKey: ["teams-for-project"],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Team>>("/teams", {
        params: { limit: 100 },
      });
      return res.data;
    },
    enabled: isCreateModalOpen && user?.role === "ADMIN",
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
      teamId?: number;
    }) => {
      const res = await apiClient.post<Project>("/projects", payload);
      return res.data;
    },
    onSuccess: (newProj) => {
      toast.success("Project Created", {
        description: `Project "${newProj.name}" has been initialized.`,
      });
      setIsCreateModalOpen(false);
      setProjectName("");
      setProjectDesc("");
      setTeamId("");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      toast.error("Failed to Create Project", {
        description: getErrorMessage(err),
      });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    createProjectMutation.mutate({
      name: projectName.trim(),
      description: projectDesc.trim() || undefined,
      startDate,
      endDate,
      teamId: teamId ? Number(teamId) : undefined,
    });
  };

  const projects = data?.data || [];
  const meta = data?.meta;
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Folders className="size-6 text-primary" /> Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Oversee and create organizational projects across all teams."
              : "Projects and deliverables assigned to your team."}
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 cursor-pointer shrink-0"
          >
            <Plus className="size-4" /> New Project
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-card"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const).map(
            (st) => (
              <Button
                key={st}
                size="sm"
                variant={statusFilter === st ? "default" : "outline"}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className="text-xs h-8 cursor-pointer"
              >
                {st === "ALL" ? "All Statuses" : st.replace("_", " ")}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center text-destructive space-y-2">
          <AlertTriangle className="size-8 mx-auto" />
          <p className="text-sm font-medium">Failed to load projects</p>
          <p className="text-xs text-muted-foreground">{getErrorMessage(error)}</p>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Folders className="size-6" />}
          title="No projects found"
          description={
            search || statusFilter !== "ALL"
              ? "No projects match your current filters."
              : isAdmin
              ? "Get started by creating your organization's first project."
              : "No projects are currently visible for your team."
          }
          action={
            isAdmin ? (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                size="sm"
                className="gap-2"
              >
                <Plus className="size-4" /> Create Project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => {
            const isFinished = proj.status === "COMPLETED";
            const isHold = proj.status === "ON_HOLD";
            const isArchived = proj.status === "ARCHIVED";

            return (
              <Card
                key={proj.projectId}
                className="flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-xs group"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {proj.name}
                    </h2>
                    <Badge
                      variant={
                        isFinished
                          ? "success"
                          : isHold
                          ? "warning"
                          : isArchived
                          ? "secondary"
                          : "default"
                      }
                      className="text-[10px] shrink-0 uppercase tracking-wider"
                    >
                      {proj.status.replace("_", " ")}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                    {proj.description || "No description provided."}
                  </p>

                  {/* Progress Indicator */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-semibold text-foreground">
                        {Math.round(getProjectProgressPercent(proj.progress))}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={
                          isFinished
                            ? "h-full bg-emerald-500 rounded-full transition-all"
                            : "h-full bg-primary rounded-full transition-all"
                        }
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, getProjectProgressPercent(proj.progress))
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Date range & Overdue Badge */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      {new Date(proj.startDate).toLocaleDateString()} –{" "}
                      {new Date(proj.endDate).toLocaleDateString()}
                    </span>

                    {proj.isOverdue && (
                      <Badge variant="destructive" className="text-[10px] py-0">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </CardContent>

                <div className="p-3 bg-muted/20 border-t border-border rounded-b-lg flex items-center justify-between">
                  <Button asChild size="sm" variant="ghost" className="text-xs gap-1">
                    <Link to={`/dashboard/projects/${proj.projectId}/tasks`}>
                      Tasks List
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="text-xs gap-1">
                    <Link to={`/dashboard/projects/${proj.projectId}/board`}>
                      Open Board <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border rounded-lg border-border text-xs text-muted-foreground bg-card">
          <span>
            Showing page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> ({meta.total} total projects)
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

      {/* Create Project Modal (Admin only) */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Initialize a project deliverable and assign it to an operational team.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="pName" className="text-sm font-medium">
                Project Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="pName"
                placeholder="e.g. NextGen Microservices Platform"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="pDesc" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="pDesc"
                placeholder="Key goals, scope, and target outcomes"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="pStartDate" className="text-sm font-medium">
                  Start Date
                </label>
                <Input
                  id="pStartDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="pEndDate" className="text-sm font-medium">
                  End Date
                </label>
                <Input
                  id="pEndDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="pTeam" className="text-sm font-medium">
                Owning Team (Optional)
              </label>
              <select
                id="pTeam"
                value={teamId}
                onChange={(e) => setTeamId(Number(e.target.value))}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- No team assigned yet --</option>
                {(teamsData?.data || []).map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createProjectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProjectMutation.isPending || !projectName.trim()}
                className="gap-2"
              >
                {createProjectMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
