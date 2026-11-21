import { useState } from "react";
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

  // Projects list if not scoped to a project
  const { data: projectsData } = useQuery({
    queryKey: ["projects-for-task"],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Project>>("/projects", {
        params: { limit: 100 },
      });
      return res.data;
    },
    enabled: isOpen && !projectId,
  });

  // Eligible users query for assignment (Admin only)
  const { data: usersData } = useQuery({
    queryKey: ["users-for-task-assign"],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<User>>("/users", {
        params: { limit: 100 },
      });
      return res.data;
    },
    enabled: isOpen && isUserAdmin,
  });

  // Team members query for assignment (for employees / moderators)
  const { data: teamData } = useQuery({
    queryKey: ["my-team-for-task-assign"],
    queryFn: async () => {
      const res = await apiClient.get<Team>("/teams/my-team");
      return res.data;
    },
    enabled: isOpen && !isUserAdmin && !!user?.membership?.teamId,
  });

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

      // If an assignee was selected, assign the task
      if (payload.assignedToId && task?.taskId) {
        try {
          const assignRes = await apiClient.post<Task>(
            `/tasks/${task.taskId}/assign`,
            { userId: payload.assignedToId }
          );
          task = assignRes.data;
        } catch {
          // If assignment fails, task is still created in unassigned state
        }
      }

      return task;
    },
    onSuccess: (newTask) => {
      toast.success("Task Created", {
        description: `Task "${newTask.name}" has been created as ${newTask.status}.`,
      });
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

  const eligibleAssignees: Array<{ userId: number; name: string; subtitle: string }> = isUserAdmin
    ? (usersData?.data || []).map((u) => ({ userId: u.userId, name: u.name, subtitle: u.role }))
    : (teamData?.members || []).map((m) => ({
        userId: m.userId,
        name: m.user?.name || m.name || `User #${m.userId}`,
        subtitle: m.role,
      }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
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
                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                required={!isUserAdmin}
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
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="taskAssigneeSelect" className="text-sm font-medium">
                Assignee (Optional)
              </label>
              <select
                id="taskAssigneeSelect"
                value={assignedToId}
                onChange={(e) => setAssignedToId(Number(e.target.value))}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- Unassigned (Backlog) --</option>
                {eligibleAssignees.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name} ({u.subtitle})
                  </option>
                ))}
              </select>
            </div>
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
