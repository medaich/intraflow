import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { Task, PaginatedResponse, TaskStatus, User, Team, Project } from "@/types";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { RejectTaskModal } from "@/components/tasks/reject-task-modal";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, SquareKanban, AlertTriangle, RefreshCw, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const KANBAN_COLUMNS: { id: TaskStatus; title: string; badge: string }[] = [
  { id: "UNASSIGNED", title: "Unassigned Backlog", badge: "Backlog" },
  { id: "PENDING", title: "Pending Start", badge: "Ready" },
  { id: "IN_PROGRESS", title: "In Progress", badge: "Active" },
  { id: "IN_REVIEW", title: "In Review", badge: "Review" },
  { id: "COMPLETED", title: "Completed", badge: "Done" },
];

export default function KanbanBoard() {
  const { projId } = useParams<{ projId: string }>();
  const projectId = projId ? Number(projId) : undefined;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [rejectingTask, setRejectingTask] = useState<Task | null>(null);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);
  const [unassigningTask, setUnassigningTask] = useState<Task | null>(null);
  const [validatingTask, setValidatingTask] = useState<Task | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | "">("");
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isUserAdmin = user?.role === "ADMIN";
  const isModerator = user?.membership?.role === "MODERATOR";
  const canCreateTask = isUserAdmin || (isModerator && projectId !== undefined);

  // Query tasks
  const {
    data: tasksData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: projectId
      ? ["project-tasks", projectId]
      : ["tasks", isUserAdmin ? "all" : "my-tasks"],
    queryFn: async () => {
      if (projectId) {
        const res = await apiClient.get<PaginatedResponse<Task>>(
          `/projects/${projectId}/tasks`,
          { params: { limit: 100 } }
        );
        return res.data;
      } else {
        const endpoint = isUserAdmin ? "/tasks" : "/tasks/my-tasks";
        const res = await apiClient.get<PaginatedResponse<Task>>(endpoint, {
          params: { limit: 100 },
        });
        return res.data;
      }
    },
  });

  const {
    data: assignmentProject,
    isLoading: isAssignmentProjectLoading,
    isError: isAssignmentProjectError,
    error: assignmentProjectError,
  } = useQuery({
    queryKey: ["assignment-project", assigningTask?.projectId],
    queryFn: async () => {
      const res = await apiClient.get<Project>(`/projects/${assigningTask?.projectId}`);
      return res.data;
    },
    enabled: assigningTask !== null && assigningTask.projectId !== null,
  });

  const assignmentContextKnown =
    assigningTask !== null &&
    (assigningTask.projectId === null || assignmentProject !== undefined);
  const assignmentTeamId = assignmentProject?.teamId ?? null;
  const canAssignToTask =
    isUserAdmin ||
    (isModerator && assignmentTeamId !== null && assignmentTeamId === user?.membership?.teamId);

  // Assignment choices are loaded for the task's own project team, never from a global list.
  const {
    data: teamData,
    isLoading: isAssignmentTeamLoading,
    isError: isAssignmentTeamError,
    error: assignmentTeamError,
  } = useQuery({
    queryKey: ["team-for-kanban-assignment", assignmentTeamId],
    queryFn: async () => {
      const res = await apiClient.get<Team>(`/teams/${assignmentTeamId}`);
      return res.data;
    },
    enabled: assigningTask !== null && canAssignToTask && assignmentTeamId !== null,
  });

  const {
    data: usersData,
    isLoading: isAssignmentUsersLoading,
    isError: isAssignmentUsersError,
    error: assignmentUsersError,
  } = useQuery({
    queryKey: ["users-for-kanban-standalone-assignment"],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<User>>("/users", {
        params: { limit: 100 },
      });
      return res.data;
    },
    enabled:
      assigningTask !== null &&
      isUserAdmin &&
      assignmentContextKnown &&
      assignmentTeamId === null,
  });

  const isAssignmentOptionsLoading =
    assigningTask !== null &&
    (isAssignmentProjectLoading ||
      (assignmentTeamId !== null && canAssignToTask && isAssignmentTeamLoading) ||
      (isUserAdmin && assignmentContextKnown && assignmentTeamId === null && isAssignmentUsersLoading));

  const assignmentOptionsError = isAssignmentProjectError
    ? `Unable to load task project: ${getErrorMessage(assignmentProjectError)}`
    : assignmentTeamId !== null && canAssignToTask && isAssignmentTeamError
      ? `Unable to load this project's team members: ${getErrorMessage(assignmentTeamError)}`
      : isUserAdmin && assignmentContextKnown && assignmentTeamId === null && isAssignmentUsersError
        ? `Unable to load eligible users: ${getErrorMessage(assignmentUsersError)}`
        : null;

  const eligibleAssignees = assignmentTeamId !== null && canAssignToTask
    ? (teamData?.members || [])
        .filter((member) => member.user?.role !== "ADMIN")
        .map((member) => ({
          userId: member.userId,
          name: member.user?.name || member.name || `User #${member.userId}`,
          email: member.email || "",
        }))
    : isUserAdmin
      ? (usersData?.data || [])
          .filter((candidate) => candidate.role !== "ADMIN")
          .map((candidate) => ({
            userId: candidate.userId,
            name: candidate.name,
            email: candidate.email,
          }))
      : [];

  useEffect(() => {
    setSelectedAssigneeId("");
  }, [assigningTask?.taskId, assignmentTeamId]);

  const tasks = tasksData?.data || [];

  // Drag and drop lifecycle transition mutations
  const startMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiClient.post(`/tasks/my-tasks/${taskId}/start`);
    },
    onSuccess: () => {
      toast.success("Task Started", { description: "Work has begun on this task." });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Start Task", { description: getErrorMessage(err) });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiClient.post(`/tasks/my-tasks/${taskId}/submit`);
    },
    onSuccess: () => {
      toast.success("Submitted for Review", {
        description: "Task is now awaiting moderator validation.",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Submit Task", { description: getErrorMessage(err) });
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiClient.post(`/tasks/${taskId}/validate`);
    },
    onSuccess: () => {
      toast.success("Task Approved & Completed", {
        description: "The task has been successfully verified.",
      });
      setValidatingTask(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Validate Task", { description: getErrorMessage(err) });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiClient.post(`/tasks/${taskId}/unassign`);
    },
    onSuccess: () => {
      toast.success("Task Unassigned", {
        description: "Task moved back to the unassigned backlog.",
      });
      setUnassigningTask(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Unassign Task", { description: getErrorMessage(err) });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: number; userId: number }) => {
      await apiClient.post(`/tasks/${taskId}/assign`, { userId });
    },
    onSuccess: () => {
      toast.success("Task Assigned", {
        description: "Task has been assigned and moved to Pending Start.",
      });
      setAssigningTask(null);
      setSelectedAssigneeId("");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Assign Task", { description: getErrorMessage(err) });
    },
  });

  const isBoardMutationPending =
    startMutation.isPending ||
    submitMutation.isPending ||
    validateMutation.isPending ||
    unassignMutation.isPending ||
    assignMutation.isPending;

  const handleCardDrop = (targetStatus: TaskStatus, rawData: string) => {
    try {
      const data = JSON.parse(rawData);
      const taskId = Number(data.taskId);
      if (!taskId) return;

      const task = tasks.find((t) => t.taskId === taskId);
      if (!task) return;
      const fromStatus = task.status;
      const assignedToId = task.assignedTo?.userId;
      const isBlocked = task.isBlocked;
      if (fromStatus === targetStatus) return; // No transition is needed within the current column.

      // 1. UNASSIGNED -> PENDING: Requires assigning a team member
      if (fromStatus === "UNASSIGNED" && targetStatus === "PENDING") {
        if (!isUserAdmin && !isModerator) {
          toast.error("Permission Denied", {
            description: "Only a Team Moderator or Administrator can assign tasks.",
          });
          return;
        }
        setAssigningTask(task);
        return;
      }

      // 2. PENDING -> UNASSIGNED: Moderator/Admin unassigns task
      if (fromStatus === "PENDING" && targetStatus === "UNASSIGNED") {
        if (!isUserAdmin && !isModerator) {
          toast.error("Permission Denied", {
            description: "Only a Team Moderator or Administrator can unassign tasks.",
          });
          return;
        }
        setUnassigningTask(task);
        return;
      }

      // 3. PENDING -> IN_PROGRESS: Developer starts work
      if (fromStatus === "PENDING" && targetStatus === "IN_PROGRESS") {
        if (assignedToId !== user?.userId) {
          toast.error("Cannot Start Task", {
            description: "Only the assigned developer can start working on this task.",
          });
          return;
        }
        if (isBlocked) {
          toast.error("Task Blocked", {
            description: "This task cannot be started because it is blocked by incomplete dependencies.",
          });
          return;
        }
        startMutation.mutate(taskId);
        return;
      }

      // 4. IN_PROGRESS -> IN_REVIEW: Developer submits for review
      if (fromStatus === "IN_PROGRESS" && targetStatus === "IN_REVIEW") {
        if (assignedToId !== user?.userId) {
          toast.error("Cannot Submit Task", {
            description: "Only the assigned developer can submit this task for review.",
          });
          return;
        }
        submitMutation.mutate(taskId);
        return;
      }

      // 5. IN_REVIEW -> COMPLETED: Moderator/Admin validates task
      if (fromStatus === "IN_REVIEW" && targetStatus === "COMPLETED") {
        if (!isUserAdmin && !isModerator) {
          toast.error("Permission Denied", {
            description: "Only a Team Moderator or Administrator can validate and complete tasks.",
          });
          return;
        }
        setValidatingTask(task);
        return;
      }

      // 6. IN_REVIEW -> IN_PROGRESS: Backward drag triggers Rejection Modal
      if (fromStatus === "IN_REVIEW" && targetStatus === "IN_PROGRESS") {
        if (!isUserAdmin && !isModerator) {
          toast.error("Permission Denied", {
            description: "Only a Team Moderator or Administrator can reject tasks back to In Progress.",
          });
          return;
        }
        setRejectingTask(task);
        return;
      }

      // Disallow all other non-sequential or illegal transitions
      const statusLabels: Record<TaskStatus, string> = {
        UNASSIGNED: "Unassigned Backlog",
        PENDING: "Pending Start",
        IN_PROGRESS: "In Progress",
        IN_REVIEW: "In Review",
        COMPLETED: "Completed",
      };

      toast.error("Invalid Workflow Transition", {
        description: `Tasks cannot move directly from "${statusLabels[fromStatus]}" to "${statusLabels[targetStatus]}". Intraflow enforces strict lifecycle progression.`,
      });
    } catch {
      // Invalid drag data
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in-50">
      {/* Board Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <SquareKanban className="size-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">
            {projectId ? "Project Workflow Board" : "Personal & Operational Kanban Board"}
          </h2>
          <Badge variant="outline" className="text-xs">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {canCreateTask && (
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Plus className="size-3.5" /> Add Task
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Use the task actions to move work with a keyboard or touch screen. Dragging is optional.
      </p>

      {/* Kanban Columns Horizontal Scrolling Canvas */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[600px] w-[290px] shrink-0 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center text-destructive space-y-2">
          <AlertTriangle className="size-8 mx-auto" />
          <p className="text-sm font-medium">Failed to load tasks</p>
          <p className="text-xs text-muted-foreground">{getErrorMessage(error)}</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[calc(100vh-220px)] scrollbar-thin">
          {KANBAN_COLUMNS.map((column) => {
            const columnTasks = tasks.filter((t) => t.status === column.id);
            const isTarget = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverColumn !== column.id) {
                    setDragOverColumn(column.id);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverColumn((curr) => (curr === column.id ? null : curr));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverColumn(null);
                  const raw = e.dataTransfer.getData("application/json");
                  if (raw) {
                    handleCardDrop(column.id, raw);
                  }
                }}
                className={cn(
                  "w-[290px] sm:w-[310px] shrink-0 flex flex-col rounded-xl border transition-all duration-150 min-h-[520px] max-h-[calc(100vh-210px)] overflow-hidden",
                  isTarget
                    ? "border-primary/60 ring-2 ring-primary/25 bg-primary/5 shadow-sm"
                    : "border-border bg-muted/20"
                )}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-border bg-card/75 flex items-center justify-between shrink-0 select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {column.title}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold">
                      {columnTasks.length}
                    </Badge>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {column.badge}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1 min-h-[350px]">
                  {columnTasks.length === 0 ? (
                    <div
                      className={cn(
                        "h-32 flex flex-col items-center justify-center text-xs italic border border-dashed rounded-lg transition-colors p-3 text-center",
                        isTarget
                          ? "border-primary/50 bg-primary/10 text-primary font-medium"
                          : "border-border/60 text-muted-foreground/60"
                      )}
                    >
                      {isTarget ? "Drop here to move" : `No tasks in ${column.title.toLowerCase()}`}
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.taskId}
                        task={task}
                        onOpenDetails={(id) => setSelectedTaskId(id)}
                        onOpenReject={(t) => setRejectingTask(t)}
                        onOpenAssign={(t) => setAssigningTask(t)}
                        onOpenUnassign={(t) => setUnassigningTask(t)}
                        onStart={(t) => startMutation.mutate(t.taskId)}
                        onSubmit={(t) => submitMutation.mutate(t.taskId)}
                        onOpenValidate={(t) => setValidatingTask(t)}
                        actionsDisabled={isBoardMutationPending}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Task Modal (triggered via Drag to Pending or Assign Button) */}
      {/* Task assignment dialog (eligibility is resolved from the task's project). */}
      <Dialog
        open={assigningTask !== null}
        onOpenChange={(open) => {
          if (!open && !assignMutation.isPending) {
            setAssigningTask(null);
            setSelectedAssigneeId("");
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />
              Assign Task #{assigningTask?.taskId}
            </DialogTitle>
            <DialogDescription>
              Assign &quot;{assigningTask?.name}&quot; to an eligible member to move it to Pending Start.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="assigneeSelect" className="text-sm font-medium">
                Eligible assignee <span className="text-destructive">*</span>
              </label>
              <select
                id="assigneeSelect"
                className="w-full min-h-11 px-3 rounded-md border border-input bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedAssigneeId}
                disabled={
                  isAssignmentOptionsLoading ||
                  !!assignmentOptionsError ||
                  eligibleAssignees.length === 0 ||
                  assignMutation.isPending
                }
                onChange={(e) =>
                  setSelectedAssigneeId(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">
                  {isAssignmentOptionsLoading ? "Loading eligible members…" : "-- Select an assignee --"}
                </option>
                {eligibleAssignees.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name} {u.email ? `(${u.email})` : ""}
                  </option>
                ))}
              </select>
              {assignmentOptionsError ? (
                <p role="alert" className="text-xs text-destructive">
                  {assignmentOptionsError}
                </p>
              ) : !isAssignmentOptionsLoading && eligibleAssignees.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {!isUserAdmin && assignmentTeamId === null
                    ? "Only administrators can assign standalone or team-less tasks."
                    : !isUserAdmin && !canAssignToTask
                      ? "You can assign tasks only in your own team's projects."
                      : "No eligible non-admin members were found."}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              disabled={assignMutation.isPending}
              onClick={() => {
                setAssigningTask(null);
                setSelectedAssigneeId("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                !selectedAssigneeId ||
                assignMutation.isPending ||
                isAssignmentOptionsLoading ||
                !!assignmentOptionsError ||
                eligibleAssignees.length === 0
              }
              onClick={() => {
                if (assigningTask && selectedAssigneeId) {
                  assignMutation.mutate({
                    taskId: assigningTask.taskId,
                    userId: Number(selectedAssigneeId),
                  });
                }
              }}
            >
              {assignMutation.isPending && (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              )}
              Assign Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={unassigningTask !== null}
        onOpenChange={(open) => {
          if (!open && !unassignMutation.isPending) setUnassigningTask(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Return task to the backlog?</DialogTitle>
            <DialogDescription>
              &quot;{unassigningTask?.name}&quot; will become unassigned and return to the backlog.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={unassignMutation.isPending}
              onClick={() => setUnassigningTask(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!unassigningTask || unassignMutation.isPending}
              onClick={() => {
                if (unassigningTask) unassignMutation.mutate(unassigningTask.taskId);
              }}
            >
              {unassignMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Return to backlog
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={validatingTask !== null}
        onOpenChange={(open) => {
          if (!open && !validateMutation.isPending) setValidatingTask(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Complete this task?</DialogTitle>
            <DialogDescription>
              Approving &quot;{validatingTask?.name}&quot; moves it to Completed. Completed tasks cannot be reopened.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={validateMutation.isPending}
              onClick={() => setValidatingTask(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!validatingTask || validateMutation.isPending}
              onClick={() => {
                if (validatingTask) validateMutation.mutate(validatingTask.taskId);
              }}
            >
              {validateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Approve and complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Details Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        projectTasks={tasks}
      />

      {/* Rejection Modal */}
      <RejectTaskModal
        task={rejectingTask}
        isOpen={rejectingTask !== null}
        onClose={() => setRejectingTask(null)}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        projectId={projectId}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
