import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { Task, User } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Play,
  Send,
  CheckCircle2,
  RotateCcw,
  UserPlus,
  ShieldAlert,
  Clock,
  Loader2,
} from "lucide-react";

interface TaskCardProps {
  task: Task;
  onOpenDetails: (taskId: number) => void;
  onOpenReject: (task: Task) => void;
  onOpenAssign?: (task: Task) => void;
  eligibleUsers?: User[];
}

export function TaskCard({
  task,
  onOpenDetails,
  onOpenReject,
  onOpenAssign,
  eligibleUsers = [],
}: TaskCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [isDragging, setIsDragging] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  const isAssignee = task.assignedTo?.userId === user?.userId;
  const isModerator = user?.membership?.role === "MODERATOR";
  const canReview = isAdmin || isModerator;

  // Transitions mutations
  const startMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/tasks/my-tasks/${task.taskId}/start`);
    },
    onSuccess: () => {
      toast.success("Work Started");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task.taskId] });
    },
    onError: (err) => {
      toast.error("Cannot Start Task", { description: getErrorMessage(err) });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/tasks/my-tasks/${task.taskId}/submit`);
    },
    onSuccess: () => {
      toast.success("Submitted for Review");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task.taskId] });
    },
    onError: (err) => {
      toast.error("Cannot Submit Task", { description: getErrorMessage(err) });
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/tasks/${task.taskId}/validate`);
    },
    onSuccess: () => {
      toast.success("Task Approved");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Validate Task", { description: getErrorMessage(err) });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (targetUserId: number) => {
      await apiClient.post(`/tasks/${task.taskId}/assign`, { userId: targetUserId });
    },
    onSuccess: () => {
      toast.success("Task Assigned");
      setIsAssignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Assign Task", { description: getErrorMessage(err) });
    },
  });

  return (
    <>
      <Card
        draggable={true}
        onDragStart={(e) => {
          setIsDragging(true);
          e.dataTransfer.setData(
            "application/json",
            JSON.stringify({
              taskId: task.taskId,
              fromStatus: task.status,
              assignedToId: task.assignedTo?.userId,
              isBlocked: task.isBlocked,
            })
          );
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => setIsDragging(false)}
        onClick={() => onOpenDetails(task.taskId)}
        className={cn(
          "border border-border/80 hover:border-primary/60 transition-all hover:shadow-xs cursor-grab active:cursor-grabbing select-none group bg-card",
          isDragging && "opacity-40 scale-[0.98] border-primary/50 shadow-md ring-2 ring-primary/20"
        )}
      >
        <CardContent className="p-3 space-y-2.5">
          {/* Header Row: Task ID & Badges */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground font-semibold">
              #{task.taskId}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant={
                  task.priority === "URGENT"
                    ? "destructive"
                    : task.priority === "HIGH"
                    ? "warning"
                    : "outline"
                }
                className="text-[10px] py-0 px-1.5 font-medium"
              >
                {task.priority}
              </Badge>
              {task.isBlocked && (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 gap-0.5">
                  <ShieldAlert className="size-2.5" /> Blocked
                </Badge>
              )}
            </div>
          </div>

          {/* Task Name */}
          <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 break-words leading-snug">
            {task.name}
          </h4>

          {/* Description snippet */}
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 break-words leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Footer Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border/60 gap-2">
            {/* Assignee Avatar */}
            <div className="flex items-center gap-1.5 min-w-0">
              {task.assignedTo ? (
                <>
                  <div className="size-5 rounded-full bg-primary/10 text-primary font-semibold text-[10px] flex items-center justify-center shrink-0">
                    {task.assignedTo.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="truncate text-[11px] max-w-[110px]" title={task.assignedTo.name}>
                    {task.assignedTo.name}
                  </span>
                </>
              ) : (
                <span className="text-[11px] italic text-muted-foreground/80">
                  Unassigned
                </span>
              )}
            </div>

            {/* Time state badge */}
            <span className="flex items-center gap-1 text-[11px] shrink-0">
              <Clock className="size-3" />
              {new Date(task.endDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          {/* Quick Action Buttons */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 pt-0.5 justify-end flex-wrap"
          >
            {/* ASSIGN (if unassigned) */}
            {task.status === "UNASSIGNED" && canReview && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onOpenAssign ? onOpenAssign(task) : setIsAssignModalOpen(true)
                }
                className="text-[11px] h-6 px-2 gap-1 cursor-pointer"
              >
                <UserPlus className="size-3" /> Assign
              </Button>
            )}

            {/* START (if pending and assigned to self) */}
            {task.status === "PENDING" && isAssignee && (
              <Button
                size="sm"
                onClick={() => startMutation.mutate()}
                disabled={task.isBlocked || startMutation.isPending}
                className="text-[11px] h-6 px-2 gap-1 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                title={task.isBlocked ? "Blocked by incomplete prerequisites" : "Start Task"}
              >
                <Play className="size-3 fill-current" /> Start
              </Button>
            )}

            {/* SUBMIT (if in progress and assigned to self) */}
            {task.status === "IN_PROGRESS" && isAssignee && (
              <Button
                size="sm"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="text-[11px] h-6 px-2 gap-1 cursor-pointer"
              >
                <Send className="size-3" /> Submit
              </Button>
            )}

            {/* VALIDATE (if in review and reviewer) */}
            {task.status === "IN_REVIEW" && canReview && (
              <Button
                size="sm"
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending}
                className="text-[11px] h-6 px-2 gap-1 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              >
                <CheckCircle2 className="size-3" /> Validate
              </Button>
            )}

            {/* REJECT (if in review and reviewer) */}
            {task.status === "IN_REVIEW" && canReview && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onOpenReject(task)}
                className="text-[11px] h-6 px-2 gap-1 cursor-pointer"
              >
                <RotateCcw className="size-3" /> Reject
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assign Member Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task #{task.taskId}</DialogTitle>
            <DialogDescription>
              Assign "{task.name}" to an eligible team member. Status will move to PENDING.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="assigneeUserSelect" className="text-sm font-medium">
                Select Member
              </label>
              <select
                id="assigneeUserSelect"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- Choose assignee --</option>
                {eligibleUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => selectedUserId && assignMutation.mutate(Number(selectedUserId))}
              disabled={assignMutation.isPending || !selectedUserId}
              className="gap-2"
            >
              {assignMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Assign Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
