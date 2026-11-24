import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { Task, TaskPriority, PaginatedResponse, Project, User, Team } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateTaskModalProps {
  projectId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTaskModal({
  projectId,
  isOpen,
  onClose,
}: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isUserAdmin = user?.role === "ADMIN";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">(
    projectId || ""
  );
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]
  );
  const [assignedToId, setAssignedToId] = useState<number | "">("");

  const effectiveProjectId = projectId ?? (selectedProjectId || undefined);

  // Projects list if not scoped to a project
  const {
    data: projectsData,
    isLoading: isProjectsLoading,
    isError: isProjectsError,
    error: projectsError,
  } = useQuery({
    queryKey: ["projects-for-task"],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Project>>("/projects", {
        params: { limit: 100 },
      });
      return res.data;
    },
    enabled: isOpen && !projectId,
  });

  const selectedProject = projectsData?.data?.find(
    (project) => project.projectId === effectiveProjectId
  );

  // For scoped project (projectId prop), fetch the project details to get teamId
  const {
    data: scopedProject,
    isLoading: isScopedProjectLoading,
    isError: isScopedProjectError,
    error: scopedProjectError,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await apiClient.get<Project>(`/projects/${projectId}`);
      return res.data;
    },
    enabled: isOpen && projectId !== undefined,
  });

  const resolvedProject = projectId !== undefined ? scopedProject : selectedProject;
  const isProjectContextLoading =
    effectiveProjectId !== undefined &&
    !resolvedProject &&
    (projectId !== undefined ? isScopedProjectLoading : isProjectsLoading);
  const isProjectContextError = projectId !== undefined
    ? isScopedProjectError
    : isProjectsError && effectiveProjectId !== undefined;
  const projectContextError = projectId !== undefined ? scopedProjectError : projectsError;
  const isProjectContextKnown = effectiveProjectId === undefined || !!resolvedProject;
  const resolvedTeamId = resolvedProject?.teamId ?? null;

  const isModerator = user?.membership?.role === "MODERATOR";
  const canAssign = isUserAdmin || isModerator;
  const canAssignToProjectTeam =
    isUserAdmin || (isModerator && resolvedTeamId === user?.membership?.teamId);

  // Load members only for the selected project's exact team.
  const {
    data: projectTeamData,
    isLoading: isTeamLoading,
    isError: isTeamError,
    error: teamError,
  } = useQuery({
    queryKey: ["team-for-task-assignment", resolvedTeamId],
    queryFn: async () => {
      const res = await apiClient.get<Team>(`/teams/${resolvedTeamId}`);
      return res.data;
    },
    enabled: isOpen && canAssignToProjectTeam && resolvedTeamId !== null,
  });

  // Standalone tasks and team-less projects may only be assigned by an Admin.
  const {
    data: usersData,
    isLoading: isUsersLoading,
    isError: isUsersError,
    error: usersError,
  } = useQuery({
    queryKey: ["users-for-task-assign"],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<User>>("/users", {
        params: { limit: 100 },
      });
      return res.data;
    },
    enabled:
      isOpen &&
      isUserAdmin &&
      isProjectContextKnown &&
      resolvedTeamId === null,
  });

  // Reset assignee when project changes
  useEffect(() => {
    setAssignedToId("");
  }, [selectedProjectId, projectId, resolvedTeamId]);

  const createTaskMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      projectId?: number;
      priority: TaskPriority;
      startDate: string;
      endDate: string;
      assignedToId?: number;
    }) => {
      const targetProjId = projectId || (selectedProjectId ? Number(selectedProjectId) : undefined);
      const dto = {
        name: payload.name,
        description: payload.description || null,
        startDate: new Date(payload.startDate).toISOString(),
        endDate: new Date(payload.endDate).toISOString(),
        priority: payload.priority,
      };

      let task: Task;
      if (targetProjId) {
        // Project-scoped task creation
        const res = await apiClient.post<Task>(
          `/projects/${targetProjId}/tasks`,
          dto
        );
        task = res.data;
      } else {
        // Standalone task creation (Admin only)
        const res = await apiClient.post<Task>("/tasks", dto);
        task = res.data;
      }

      let assignmentError: unknown;

      // Keep task creation successful when its separate assignment request fails.
      if (payload.assignedToId && task?.taskId) {
        try {
          const assignRes = await apiClient.post<Task>(
            `/tasks/${task.taskId}/assign`,
            { userId: payload.assignedToId }
          );
          task = assignRes.data;
        } catch (error) {
          assignmentError = error;
        }
      }

      return { task, assignmentError };
    },
    onSuccess: ({ task: newTask, assignmentError }) => {
      if (assignmentError !== undefined) {
        toast.warning("Task Created Without Assignment", {
          description: `Task "${newTask.name}" exists in the unassigned backlog. Assignment failed: ${getErrorMessage(assignmentError)} Open the task on the board to assign it.`,
          duration: 10000,
        });
      } else {
        toast.success("Task Created", {
          description: `Task "${newTask.name}" has been created as ${newTask.status}.`,
        });
      }
      setName("");
      setDescription("");
      setAssignedToId("");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
    onError: (err) => {
      toast.error("Failed to Create Task", {
        description: getErrorMessage(err),
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Task title is required");
      return;
    }
    const targetProjId = projectId || (selectedProjectId ? Number(selectedProjectId) : undefined);
    if (!isUserAdmin && !targetProjId) {
      toast.error("Project Required", { description: "Tasks created by team moderators must belong to a project." });
      return;
    }
    createTaskMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      projectId: targetProjId,
      priority,
      startDate,
      endDate,
      assignedToId: assignedToId ? Number(assignedToId) : undefined,
    });
  };

  const isAssigneesLoading =
    isProjectContextLoading ||
    (resolvedTeamId !== null && canAssignToProjectTeam && isTeamLoading) ||
    (isUserAdmin && isProjectContextKnown && resolvedTeamId === null && isUsersLoading);

  const assigneeLoadError = isProjectContextError
    ? `Unable to load project assignment rules: ${getErrorMessage(projectContextError)}`
    : resolvedTeamId !== null && canAssignToProjectTeam && isTeamError
      ? `Unable to load this project's team members: ${getErrorMessage(teamError)}`
      : isUserAdmin && isProjectContextKnown && resolvedTeamId === null && isUsersError
        ? `Unable to load eligible users: ${getErrorMessage(usersError)}`
        : null;

  const eligibleAssignees: Array<{ userId: number; name: string; subtitle: string }> = (() => {
    if (resolvedTeamId !== null && canAssignToProjectTeam) {
      return (projectTeamData?.members || [])
        .filter((member) => member.user?.role !== "ADMIN")
        .map((member) => ({
          userId: member.userId,
          name: member.user?.name || member.name || `User #${member.userId}`,
          subtitle: member.role,
        }));
    }

    if (isUserAdmin && isProjectContextKnown && resolvedTeamId === null) {
      return (usersData?.data || [])
        .filter((candidate) => candidate.role !== "ADMIN")
        .map((candidate) => ({
          userId: candidate.userId,
          name: candidate.name,
          subtitle: candidate.role,
        }));
    }

    return [];
  })();

  const assigneeEmptyMessage = isModerator && effectiveProjectId === undefined
    ? "Select a team project to see eligible members."
    : isModerator && resolvedTeamId === null && isProjectContextKnown
      ? "Only administrators can assign tasks in team-less projects."
      : isModerator && resolvedTeamId !== user?.membership?.teamId
        ? "This project belongs to another team, so you cannot assign its tasks."
        : "No eligible non-admin members were found.";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !createTaskMutation.isPending) onClose();
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>
            {projectId
              ? "Add a new task to this project's Kanban backlog."
              : "Create a new task deliverable."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="taskNameInput" className="text-sm font-medium">
              Task Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="taskNameInput"
              placeholder="e.g. Implement OAuth2 Refresh Flow"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={createTaskMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="taskDescInput" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="taskDescInput"
              placeholder="Technical requirements and acceptance criteria"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={createTaskMutation.isPending}
            />
          </div>

          {!projectId && (
            <div className="space-y-2">
              <label htmlFor="projectSelectInput" className="text-sm font-medium">
                Project {!isUserAdmin && <span className="text-destructive">*</span>}
              </label>
              <select
                id="projectSelectInput"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : "")}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required={!isUserAdmin}
                disabled={createTaskMutation.isPending || isProjectsLoading}
              >
                {isUserAdmin ? (
                  <option value="">-- No project (Standalone task) --</option>
                ) : (
                  <option value="">-- Select project --</option>
                )}
                {(projectsData?.data || []).map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.name}
                  </option>
                ))}
              </select>
              {isProjectsLoading && (
                <p className="text-xs text-muted-foreground">Loading projects…</p>
              )}
              {isProjectsError && (
                <p role="alert" className="text-xs text-destructive">
                  Unable to load projects: {getErrorMessage(projectsError)}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="taskPrioritySelect" className="text-sm font-medium">
                Priority
              </label>
              <select
                id="taskPrioritySelect"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={createTaskMutation.isPending}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            {canAssign && (
              <div className="space-y-2">
                <label htmlFor="taskAssigneeSelect" className="text-sm font-medium">
                  Assignee (Optional)
                </label>
                <select
                  id="taskAssigneeSelect"
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={
                    createTaskMutation.isPending ||
                    isAssigneesLoading ||
                    !!assigneeLoadError ||
                    eligibleAssignees.length === 0
                  }
                >
                  <option value="">
                    {isAssigneesLoading ? "Loading eligible members…" : "-- Unassigned (Backlog) --"}
                  </option>
                  {eligibleAssignees.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.name} ({u.subtitle})
                    </option>
                  ))}
                </select>
                {assigneeLoadError ? (
                  <p role="alert" className="text-xs text-destructive">
                    {assigneeLoadError}
                  </p>
                ) : !isAssigneesLoading && eligibleAssignees.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {assigneeEmptyMessage}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="taskStartDateInput" className="text-sm font-medium">
                Start Date
              </label>
              <Input
                id="taskStartDateInput"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={createTaskMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="taskEndDateInput" className="text-sm font-medium">
                End Date
              </label>
              <Input
                id="taskEndDateInput"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                disabled={createTaskMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createTaskMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTaskMutation.isPending || !name.trim()}
              className="gap-2"
            >
              {createTaskMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
