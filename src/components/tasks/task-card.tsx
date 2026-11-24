import { useAuth } from "@/contexts/AuthContext";
import type { Task } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  Undo2,
  UserPlus,
} from "lucide-react";

interface TaskCardProps {
  task: Task;
  onOpenDetails: (taskId: number) => void;
  onOpenReject: (task: Task) => void;
  onOpenAssign: (task: Task) => void;
  onOpenUnassign: (task: Task) => void;
  onStart: (task: Task) => void;
  onSubmit: (task: Task) => void;
  onOpenValidate: (task: Task) => void;
  actionsDisabled?: boolean;
}

export function TaskCard({
  task,
  onOpenDetails,
  onOpenReject,
  onOpenAssign,
  onOpenUnassign,
  onStart,
  onSubmit,
  onOpenValidate,
  actionsDisabled = false,
}: TaskCardProps) {
  const { user } = useAuth();

  const isAdmin = user?.role === "ADMIN";
  const isAssignee = task.assignedTo?.userId === user?.userId;
  const isModerator = user?.membership?.role === "MODERATOR";
  const canReview = isAdmin || isModerator;

  return (
    <Card
      draggable={!actionsDisabled}
      onDragStart={(event) => {
        event.dataTransfer.setData(
          "application/json",
          JSON.stringify({ taskId: task.taskId })
        );
        event.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "border border-border/80 transition-all hover:border-primary/60 hover:shadow-xs select-none group bg-card",
        !actionsDisabled && "cursor-grab active:cursor-grabbing"
      )}
      role="group"
      aria-label={`Task ${task.taskId}: ${task.name}`}
    >
      <CardContent className="p-3 space-y-2.5">
        {/* Task ID and priority/blocking badges */}
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

        {/* The title is the keyboard-accessible entry point to task details. */}
        <h4 className="text-sm font-semibold leading-snug">
          <button
            type="button"
            onClick={() => onOpenDetails(task.taskId)}
            className="w-full rounded-sm text-left text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 line-clamp-2 break-words"
            aria-label={`Open task details: ${task.name}`}
          >
            {task.name}
          </button>
        </h4>

        {/* Optional task summary */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 break-words leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Assignee and due-date metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border/60 gap-2">
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
              <span className="text-[11px] italic text-muted-foreground/80">Unassigned</span>
            )}
          </div>
          <span className="flex items-center gap-1 text-[11px] shrink-0">
            <Clock className="size-3" />
            {new Date(task.endDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Status actions provide keyboard and touch alternatives to dragging. */}
        <div className="flex items-center gap-1.5 pt-0.5 justify-end flex-wrap">
          {/* ASSIGN (if unassigned) */}
          {task.status === "UNASSIGNED" && canReview && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenAssign(task)}
              disabled={actionsDisabled}
              className="h-11 sm:h-8 px-2 gap-1 text-[11px]"
            >
              <UserPlus className="size-3" /> Assign
            </Button>
          )}

          {/* UNASSIGN (if pending; confirmation is handled by the board) */}
          {task.status === "PENDING" && canReview && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenUnassign(task)}
              disabled={actionsDisabled}
              className="h-11 sm:h-8 px-2 gap-1 text-[11px]"
            >
              <Undo2 className="size-3" /> Backlog
            </Button>
          )}

          {/* START (if pending and assigned to the current user) */}
          {task.status === "PENDING" && isAssignee && (
            <Button
              type="button"
              size="sm"
              onClick={() => onStart(task)}
              disabled={task.isBlocked || actionsDisabled}
              title={task.isBlocked ? "Blocked by incomplete prerequisites" : "Start task"}
              className="h-11 sm:h-8 px-2 gap-1"
            >
              <Play className="size-3 fill-current" /> Start
            </Button>
          )}

          {/* SUBMIT (if in progress and assigned to the current user) */}
          {task.status === "IN_PROGRESS" && isAssignee && (
            <Button
              type="button"
              size="sm"
              onClick={() => onSubmit(task)}
              disabled={actionsDisabled}
              className="h-11 sm:h-8 px-2 gap-1 text-[11px]"
            >
              <Send className="size-3" /> Submit
            </Button>
          )}

          {/* VALIDATE (if in review; completion is confirmed by the board) */}
          {task.status === "IN_REVIEW" && canReview && (
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenValidate(task)}
              disabled={actionsDisabled}
              className="h-11 sm:h-8 px-2 gap-1 text-[11px]"
            >
              <CheckCircle2 className="size-3" /> Validate
            </Button>
          )}

          {/* REJECT (if in review; the rejection dialog collects feedback) */}
          {task.status === "IN_REVIEW" && canReview && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => onOpenReject(task)}
              disabled={actionsDisabled}
              className="h-11 sm:h-8 px-2 gap-1 text-[11px]"
            >
              <RotateCcw className="size-3" /> Reject
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
