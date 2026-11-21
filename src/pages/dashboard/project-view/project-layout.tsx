import { useState } from "react";
import { useParams, Outlet, NavLink, Link, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { getProjectProgressPercent, type Project, type ProjectStatus, type Team, type PaginatedResponse } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  SquareKanban,
  ListTodo,
  ChartColumnIncreasing,
  Calendar as CalendarIcon,
  Folders,
  Calendar,
  Settings,
  Users,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export default function ProjectLayout() {
  const { projId } = useParams<{ projId: string }>();
  const projectId = Number(projId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Project query
  const {
    data: project,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await apiClient.get<Project>(`/projects/${projectId}`);
      return res.data;
    },
    enabled: !isNaN(projectId),
  });

  // Settings modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<ProjectStatus>("ACTIVE");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [newTeamId, setNewTeamId] = useState<number | "">("");

  // Teams list for assignment (Admin only)
  const { data: teamsData } = useQuery({
    queryKey: ["teams-for-reassign"],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Team>>("/teams", {
        params: { limit: 100 },
      });
      return res.data;
    },
    enabled: isTeamModalOpen && user?.role === "ADMIN",
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (payload: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
      startDate?: string;
      endDate?: string;
    }) => {
      const res = await apiClient.patch<Project>(`/projects/${projectId}`, payload);
      return res.data;
    },
    onSuccess: (updated) => {
      toast.success("Project Updated", {
        description: `Project status and details have been updated.`,
      });
      setIsEditModalOpen(false);
      queryClient.setQueryData(["project", projectId], updated);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      toast.error("Failed to Update Project", {
        description: getErrorMessage(err),
      });
    },
  });

  // Reassign team mutation (Admin only)
  const setTeamMutation = useMutation({
    mutationFn: async (assignedTeamId: number | null) => {
      const res = await apiClient.put<Project>(`/projects/${projectId}/team`, {
        teamId: assignedTeamId,
      });
      return res.data;
    },
    onSuccess: (updated) => {
      toast.success("Team Assigned", {
        description: `Project team ownership has been updated.`,
      });
      setIsTeamModalOpen(false);
      queryClient.setQueryData(["project", projectId], updated);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      toast.error("Cannot Reassign Team", {
        description: getErrorMessage(err),
      });
    },
  });

  // Delete project mutation (Admin only)
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      toast.success("Project Deleted", {
        description: "The project has been removed successfully.",
      });
      setIsDeleteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate("/dashboard/projects", { replace: true });
    },
    onError: (err) => {
      toast.error("Cannot Delete Project", {
        description: getErrorMessage(err),
      });
      setIsDeleteModalOpen(false);
    },
  });

  const openEditModal = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDesc(project.description || "");
    setEditStatus(project.status);
    setEditStartDate(project.startDate.split("T")[0]);
    setEditEndDate(project.endDate.split("T")[0]);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      if (!editName.trim()) return;
      updateProjectMutation.mutate({
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        status: editStatus,
        startDate: editStartDate || undefined,
        endDate: editEndDate || undefined,
      });
    } else {
      // Moderator update: backend forbids modifying name, and status can only be set to COMPLETED
      const payload: {
        description?: string;
        status?: ProjectStatus;
        startDate?: string;
        endDate?: string;
      } = {
        description: editDesc.trim() || undefined,
        startDate: editStartDate || undefined,
        endDate: editEndDate || undefined,
      };
      if (editStatus === "COMPLETED" && project?.status !== "COMPLETED") {
        payload.status = "COMPLETED";
      }
      updateProjectMutation.mutate(payload);
    }
  };

  const isAdmin = user?.role === "ADMIN";
  const isModerator =
    user?.membership?.teamId === project?.teamId &&
    user?.membership?.role === "MODERATOR";
  const canManageProject = isAdmin || isModerator;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-10 w-80 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Project Not Found</h2>
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        <Button asChild variant="outline">
          <Link to="/dashboard/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Project Header Card */}
      <Card className="border border-border">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <Folders className="size-5 text-primary shrink-0" />
                <h1 className="text-xl font-bold text-foreground">
                  {project.name}
                </h1>
                <Badge
                  variant={
                    project.status === "COMPLETED"
                      ? "success"
                      : project.status === "ON_HOLD"
                      ? "warning"
                      : project.status === "ARCHIVED"
                      ? "secondary"
                      : "default"
                  }
                  className="text-xs uppercase"
                >
                  {project.status.replace("_", " ")}
                </Badge>
                {project.isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    Overdue
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl">
                {project.description || "No project description provided."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canManageProject && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openEditModal}
                  className="gap-1.5 cursor-pointer text-xs"
                >
                  <Settings className="size-3.5" /> Project Settings
                </Button>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewTeamId(project.teamId || "");
                    setIsTeamModalOpen(true);
                  }}
                  className="gap-1.5 cursor-pointer text-xs"
                >
                  <Users className="size-3.5" /> Team Ownership
                </Button>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Delete Project"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Metadata bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {new Date(project.startDate).toLocaleDateString()} –{" "}
                {new Date(project.endDate).toLocaleDateString()}
              </span>
              {project.teamId && (
                <Badge variant="secondary" className="font-normal text-[11px]">
                  Team #{project.teamId}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 min-w-[180px]">
              <span className="shrink-0">Progress:</span>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, getProjectProgressPercent(project.progress))
                    )}%`,
                  }}
                />
              </div>
              <span className="font-semibold text-foreground shrink-0">
                {Math.round(getProjectProgressPercent(project.progress))}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto">
        <NavLink
          to={`/dashboard/projects/${projectId}/board`}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px shrink-0",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )
          }
        >
          <SquareKanban className="size-4" /> Kanban Board
        </NavLink>
        <NavLink
          to={`/dashboard/projects/${projectId}/tasks`}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px shrink-0",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )
          }
        >
          <ListTodo className="size-4" /> Task List
        </NavLink>
        <NavLink
          to={`/dashboard/projects/${projectId}/stats`}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px shrink-0",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )
          }
        >
          <ChartColumnIncreasing className="size-4" /> Statistics
        </NavLink>
        <NavLink
          to={`/dashboard/projects/${projectId}/calendar`}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px shrink-0",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )
          }
        >
          <CalendarIcon className="size-4" /> Calendar
        </NavLink>
      </div>

      {/* Child Views Outlet (passes project context down) */}
      <Outlet context={{ project }} />

      {/* Edit Project Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>
              Update project information, timeline dates, and status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="editPName" className="text-sm font-medium">
                Project Name
              </label>
              <Input
                id="editPName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={!isAdmin}
                className={!isAdmin ? "bg-muted/40" : undefined}
                required={isAdmin}
              />
              {!isAdmin && (
                <p className="text-[11px] text-muted-foreground">
                  Only platform administrators can rename projects.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="editPDesc" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="editPDesc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="editPStatus" className="text-sm font-medium">
                Project Status
              </label>
              {isAdmin ? (
                <select
                  id="editPStatus"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="COMPLETED">
                    COMPLETED (Requires all tasks to be completed)
                  </option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              ) : (
                <select
                  id="editPStatus"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                  disabled={project?.status === "COMPLETED" || project?.status === "ARCHIVED"}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                >
                  <option value={project?.status}>{project?.status} (Current)</option>
                  {project?.status !== "COMPLETED" && (
                    <option value="COMPLETED">
                      COMPLETED (Requires all project tasks to be completed)
                    </option>
                  )}
                </select>
              )}
              {!isAdmin && (
                <p className="text-[11px] text-muted-foreground">
                  Team moderators can only transition projects to COMPLETED once all tasks are finished.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="editPStart" className="text-sm font-medium">
                  Start Date
                </label>
                <Input
                  id="editPStart"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="editPEnd" className="text-sm font-medium">
                  End Date
                </label>
                <Input
                  id="editPEnd"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={updateProjectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProjectMutation.isPending || !editName.trim()}
                className="gap-2"
              >
                {updateProjectMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Save Settings
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Team Assignment Modal (Admin only) */}
      <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Project Team</DialogTitle>
            <DialogDescription>
              Reassign project ownership to another team. Note: Fails if the project currently has assigned tasks conflicting with the new team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="teamSelectReassign" className="text-sm font-medium">
                Choose Team
              </label>
              <select
                id="teamSelectReassign"
                value={newTeamId}
                onChange={(e) => setNewTeamId(Number(e.target.value))}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- No Team (Unassign) --</option>
                {(teamsData?.data || []).map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTeamModalOpen(false)}
              disabled={setTeamMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => setTeamMutation.mutate(newTeamId ? Number(newTeamId) : null)}
              disabled={setTeamMutation.isPending}
              className="gap-2"
            >
              {setTeamMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Modal (Admin only) */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" /> Delete Project
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? A project cannot be deleted if it has associated tasks. You must delete all tasks first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProjectMutation.mutate()}
              disabled={deleteProjectMutation.isPending}
              className="gap-2"
            >
              {deleteProjectMutation.isPending && (
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
