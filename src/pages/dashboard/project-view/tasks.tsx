import { useState } from "react";
import { useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { Task, PaginatedResponse } from "@/types";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { RejectTaskModal } from "@/components/tasks/reject-task-modal";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import {
  ListTodo,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Trash2,
  Play,
  Send,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

export default function TasksPage() {
  const { projId } = useParams<{ projId: string }>();
  const projectId = projId ? Number(projId) : undefined;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [rejectingTask, setRejectingTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isUserAdmin = user?.role === "ADMIN";

  // Query tasks with pagination and filters
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "tasks-list-view",
      { projectId, page, search, statusFilter, priorityFilter },
    ],
    queryFn: async () => {
      const endpoint = projectId
        ? `/projects/${projectId}/tasks`
        : isUserAdmin
        ? "/tasks"
        : "/tasks/my-tasks";

      const res = await apiClient.get<PaginatedResponse<Task>>(endpoint, {
        params: {
          page,
          limit: 15,
          search: search.trim() || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          priority: priorityFilter === "ALL" ? undefined : priorityFilter,
        },
      });
      return res.data;
    },
  });

  // Action mutations
  const startMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiClient.post(`/tasks/my-tasks/${taskId}/start`);
    },
    onSuccess: () => {
      toast.success("Task Started");
      queryClient.invalidateQueries({ queryKey: ["tasks-list-view"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
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
      toast.success("Task Submitted for Review");
      queryClient.invalidateQueries({ queryKey: ["tasks-list-view"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
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
      toast.success("Task Approved & Completed");
      queryClient.invalidateQueries({ queryKey: ["tasks-list-view"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Validate Task", { description: getErrorMessage(err) });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiClient.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      toast.success("Task Deleted");
      queryClient.invalidateQueries({ queryKey: ["tasks-list-view"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Delete Task", { description: getErrorMessage(err) });
    },
  });

  const tasks = data?.data || [];
  const meta = data?.meta;
  const isModerator = user?.membership?.role === "MODERATOR";
  const canManageTasks = isUserAdmin || isModerator;
  const canCreateTask = isUserAdmin || (isModerator && projectId !== undefined);

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ListTodo className="size-5 text-primary" />
            {projectId ? "Project Tasks Inventory" : "All Operational Tasks"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Search, filter, and track lifecycle status across deliverables.
          </p>
        </div>

        {canCreateTask && (
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 cursor-pointer shrink-0"
          >
            <Plus className="size-4" /> Add Task
          </Button>
        )}
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-card h-9"
          />
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-card border border-input rounded-md px-3 py-1.5 text-xs text-foreground h-9"
        >
          <option value="ALL">All Statuses</option>
          <option value="UNASSIGNED">UNASSIGNED</option>
          <option value="PENDING">PENDING</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="IN_REVIEW">IN_REVIEW</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>

        {/* Priority Dropdown */}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="bg-card border border-input rounded-md px-3 py-1.5 text-xs text-foreground h-9"
        >
          <option value="ALL">All Priorities</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="URGENT">URGENT</option>
        </select>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-destructive space-y-2">
              <AlertTriangle className="size-8 mx-auto" />
              <p className="text-sm font-medium">Failed to load tasks</p>
              <p className="text-xs text-muted-foreground">{getErrorMessage(error)}</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<ListTodo className="size-6" />}
                title="No tasks found"
                description={
                  search || statusFilter !== "ALL" || priorityFilter !== "ALL"
                    ? "No tasks match your active filters."
                    : "No tasks have been scheduled yet."
                }
                action={
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="size-4" /> Add Task
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold w-16">ID</th>
                    <th className="py-3 px-4 font-semibold">Title</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Priority</th>
                    <th className="py-3 px-4 font-semibold">Assignee</th>
                    <th className="py-3 px-4 font-semibold">Due Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.map((task) => {
                    const isAssignee = task.assignedTo?.userId === user?.userId;

                    return (
                      <tr
                        key={task.taskId}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground font-semibold">
                          #{task.taskId}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          <button
                            type="button"
                            onClick={() => setSelectedTaskId(task.taskId)}
                            className="hover:text-primary hover:underline text-left cursor-pointer flex items-center gap-2 max-w-md truncate"
                          >
                            <span>{task.name}</span>
                            {task.isBlocked && (
                              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 shrink-0 gap-0.5">
                                <ShieldAlert className="size-2.5" /> Blocked
                              </Badge>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              task.status === "COMPLETED"
                                ? "success"
                                : task.status === "IN_REVIEW"
                                ? "purple"
                                : task.status === "IN_PROGRESS"
                                ? "default"
                                : "secondary"
                            }
                            className="text-[10px] uppercase font-semibold"
                          >
                            {task.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              task.priority === "URGENT"
                                ? "destructive"
                                : task.priority === "HIGH"
                                ? "warning"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {task.assignedTo ? (
                            <div className="flex items-center gap-1.5">
                              <div className="size-5 rounded-full bg-primary/10 text-primary font-semibold text-[10px] flex items-center justify-center">
                                {task.assignedTo.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[120px]">
                                {task.assignedTo.name}
                              </span>
                            </div>
                          ) : (
                            <span className="italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(task.endDate).toLocaleDateString()}
                          {task.timeState === "OVERDUE" && (
                            <span className="text-destructive font-medium ml-1">
                              (Overdue)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* START */}
                          {task.status === "PENDING" && isAssignee && (
                            <Button
                              size="sm"
                              onClick={() => startMutation.mutate(task.taskId)}
                              disabled={task.isBlocked || startMutation.isPending}
                              className="text-[11px] h-7 px-2 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Play className="size-3 fill-current" /> Start
                            </Button>
                          )}

                          {/* SUBMIT */}
                          {task.status === "IN_PROGRESS" && isAssignee && (
                            <Button
                              size="sm"
                              onClick={() => submitMutation.mutate(task.taskId)}
                              disabled={submitMutation.isPending}
                              className="text-[11px] h-7 px-2 gap-1"
                            >
                              <Send className="size-3" /> Submit
                            </Button>
                          )}

                          {/* VALIDATE */}
                          {task.status === "IN_REVIEW" && canManageTasks && (
                            <Button
                              size="sm"
                              onClick={() => validateMutation.mutate(task.taskId)}
                              disabled={validateMutation.isPending}
                              className="text-[11px] h-7 px-2 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="size-3" /> Validate
                            </Button>
                          )}

                          {/* REJECT */}
                          {task.status === "IN_REVIEW" && canManageTasks && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejectingTask(task)}
                              className="text-[11px] h-7 px-2 gap-1"
                            >
                              <RotateCcw className="size-3" /> Reject
                            </Button>
                          )}

                          {/* DETAILS */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTaskId(task.taskId)}
                            className="text-xs h-7"
                          >
                            Details
                          </Button>

                          {/* DELETE */}
                          {canManageTasks && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTaskMutation.mutate(task.taskId)}
                              disabled={deleteTaskMutation.isPending}
                              className="size-7 text-destructive hover:bg-destructive/10"
                              title="Delete task"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
              <span>
                Showing page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> ({meta.total} tasks)
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
