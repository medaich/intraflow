import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import type { Task } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";

interface RejectTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RejectTaskModal({
  task,
  isOpen,
  onClose,
}: RejectTaskModalProps) {
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;
      // Backend strictly requires POST /tasks/:taskId/reject with { reason }
      const res = await apiClient.post<Task>(`/tasks/${task.taskId}/reject`, {
        reason: reason.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Task Submission Rejected", {
        description: `Task has been transitioned back to In Progress. Feedback was logged as a comment.`,
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", task?.taskId] });
      queryClient.invalidateQueries({ queryKey: ["comments", task?.taskId] });
      setReason("");
      onClose();
    },
    onError: (err) => {
      toast.error("Rejection Failed", {
        description: getErrorMessage(err),
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Reason Required", {
        description: "Please specify constructive feedback for the assignee.",
      });
      return;
    }
    rejectMutation.mutate();
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5" /> Reject Task Submission
          </DialogTitle>
          <DialogDescription>
            You are rejecting "{task.name}". The task status will revert to{" "}
            <strong>IN_PROGRESS</strong> so the assignee can address your feedback. A reason is mandatory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="rejectReason" className="text-sm font-medium">
              Reviewer Feedback / Reason for Rejection <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="rejectReason"
              placeholder="e.g. Missing unit test coverage or edge case handling for invalid tokens..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={rejectMutation.isPending || !reason.trim()}
              className="gap-2"
            >
              {rejectMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
