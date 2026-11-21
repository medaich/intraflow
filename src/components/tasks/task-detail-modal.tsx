import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Task,
  TaskComment,
  TaskAttachment,
  TaskPriority,
} from "@/types";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RejectTaskModal } from "./reject-task-modal";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  User,
  Paperclip,
  MessageSquare,
  GitBranch,
  ShieldAlert,
  Download,
  Trash2,
  Send,
  CheckCircle2,
  Play,
  RotateCcw,
  UploadCloud,
  Loader2,
} from "lucide-react";

interface TaskDetailModalProps {
  taskId: number | null;
  isOpen: boolean;
  onClose: () => void;
  projectTasks?: Task[]; // Sibling tasks for DAG dependency management
}

export function TaskDetailModal({
  taskId,
  isOpen,
  onClose,
  projectTasks = [],
}: TaskDetailModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"details" | "dependencies" | "comments" | "attachments">("details");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Comments state
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // Attachments upload state
  const [isUploading, setIsUploading] = useState(false);

  // Edit task metadata state
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");

  // Query full task details
  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const res = await apiClient.get<Task>(`/tasks/${taskId}`);
      setEditName(res.data.name);
      setEditDesc(res.data.description || "");
      setEditPriority(res.data.priority);
      return res.data;
    },
    enabled: isOpen && !!taskId,
  });

  // Query comments
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ["comments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      try {
        const res = await apiClient.get<TaskComment[]>(`/tasks/${taskId}/comments`);
        return res.data;
      } catch {
        // Non-assigned moderators/employees receive 404 from backend getMyTaskComments
        return [];
      }
    },
    retry: false,
    enabled: isOpen && !!taskId,
  });

  // Query attachments
  const { data: attachments = [], isLoading: isAttachmentsLoading } = useQuery({
    queryKey: ["attachments", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const res = await apiClient.get<TaskAttachment[]>(`/tasks/${taskId}/attachments`);
      return res.data;
    },
    enabled: isOpen && !!taskId,
  });

  // Task Transitions
  const startTaskMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) return;
      await apiClient.post(`/tasks/my-tasks/${taskId}/start`);
    },
    onSuccess: () => {
      toast.success("Work Started", { description: "Task is now In Progress." });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Start Task", { description: getErrorMessage(err) });
    },
  });

  const submitTaskMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) return;
      await apiClient.post(`/tasks/my-tasks/${taskId}/submit`);
    },
    onSuccess: () => {
      toast.success("Work Submitted", { description: "Task is now In Review for moderator approval." });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Submit Task", { description: getErrorMessage(err) });
    },
  });

  const validateTaskMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) return;
      await apiClient.post(`/tasks/${taskId}/validate`);
    },
    onSuccess: () => {
      toast.success("Task Approved", { description: "Task is marked as COMPLETED." });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Validate Task", { description: getErrorMessage(err) });
    },
  });

  const unassignTaskMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) return;
      await apiClient.post(`/tasks/${taskId}/unassign`);
    },
    onSuccess: () => {
      toast.success("Task Unassigned", { description: "Task moved back to UNASSIGNED backlog." });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Cannot Unassign Task", { description: getErrorMessage(err) });
    },
  });

  // Edit task details
  const updateTaskMutation = useMutation({
    mutationFn: async (payload: { name?: string; description?: string; priority?: TaskPriority }) => {
      if (!taskId) return;
      const res = await apiClient.patch<Task>(`/tasks/${taskId}`, payload);
      return res.data;
    },
    onSuccess: (updated) => {
      toast.success("Task Updated");
      setIsEditingTask(false);
      queryClient.setQueryData(["task", taskId], updated);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Update Failed", { description: getErrorMessage(err) });
    },
  });

  // Set Dependencies mutation
  const setDependenciesMutation = useMutation({
    mutationFn: async (dependsOn: number[]) => {
      if (!taskId) return;
      const res = await apiClient.put<Task>(`/tasks/${taskId}/dependencies`, { dependsOn });
      return res.data;
    },
    onSuccess: (updated) => {
      toast.success("Dependencies Updated", { description: "Task dependency DAG saved." });
      queryClient.setQueryData(["task", taskId], updated);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: (err) => {
      toast.error("Dependency Error", { description: getErrorMessage(err) });
    },
  });

  // Comments mutations
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!taskId) return;
      await apiClient.post(`/tasks/${taskId}/comments`, { content });
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
    onError: (err) => {
      toast.error("Failed to Post Comment", { description: getErrorMessage(err) });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: number;
      content: string;
    }) => {
      if (!taskId) return;
      await apiClient.put(`/tasks/${taskId}/comments/${commentId}`, { content });
    },
    onSuccess: () => {
      toast.success("Comment Updated");
      setEditingCommentId(null);
      setEditingCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
    onError: (err) => {
      toast.error("Cannot Update Comment", { description: getErrorMessage(err) });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      if (!taskId) return;
      await apiClient.delete(`/tasks/${taskId}/comments/${commentId}`);
    },
    onSuccess: () => {
      toast.success("Comment Deleted");
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
    onError: (err) => {
      toast.error("Cannot Delete Comment", { description: getErrorMessage(err) });
    },
  });

  // Attachments upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskId) return;

    if (attachments.length >= 20) {
      toast.error("Attachment Limit Reached", { description: "Maximum of 20 attachments allowed per task." });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File Too Large", { description: "Maximum allowed file size is 10 MB." });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      // Omit application/json and let browser/Axios configure the multipart boundary automatically
      await apiClient.post(`/tasks/${taskId}/attachments`, formData, {
        headers: { "Content-Type": undefined },
      });

      toast.success("File Uploaded", { description: `${file.name} attached successfully.` });
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
    } catch (err) {
      toast.error("Upload Failed", { description: getErrorMessage(err) });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDownloadAttachment = async (attachmentId: number, originalName: string) => {
    try {
      const res = await apiClient.get<Blob>(
        `/tasks/${taskId}/attachments/${attachmentId}/download`,
        { responseType: "blob" }
      );
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error("Download Failed", { description: getErrorMessage(err) });
    }
  };

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      if (!taskId) return;
      await apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      toast.success("Attachment Deleted");
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
    },
    onError: (err) => {
      toast.error("Cannot Delete Attachment", { description: getErrorMessage(err) });
    },
  });

  if (!isOpen) return null;

  const isAdmin = user?.role === "ADMIN";
  const isAssignee = task?.assignedTo?.userId === user?.userId;
  const isModerator = user?.membership?.role === "MODERATOR";
  const canReview = isAdmin || isModerator;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogTitle className="sr-only">Task Details</DialogTitle>
          {isLoading || !task ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-6 border-b border-border bg-card shrink-0">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground font-semibold">
                        #{task.taskId}
                      </span>
                      <h2 className="text-xl font-bold text-foreground">
                        {task.name}
                      </h2>
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
                        className="text-xs uppercase"
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                      <Badge
                        variant={
                          task.priority === "URGENT"
                            ? "destructive"
                            : task.priority === "HIGH"
                            ? "warning"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {task.priority} Priority
                      </Badge>
                      {task.isBlocked && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <ShieldAlert className="size-3" /> Blocked
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created on {new Date(task.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* START WORK */}
                    {task.status === "PENDING" && isAssignee && (
                      <Button
                        size="sm"
                        onClick={() => startTaskMutation.mutate()}
                        disabled={task.isBlocked || startTaskMutation.isPending}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        title={
                          task.isBlocked
                            ? `Blocked by tasks: #${task.blockedBy.join(", #")}`
                            : "Begin work on this task"
                        }
                      >
                        <Play className="size-3.5 fill-current" /> Start Work
                      </Button>
                    )}

                    {/* SUBMIT WORK */}
                    {task.status === "IN_PROGRESS" && isAssignee && (
                      <Button
                        size="sm"
                        onClick={() => submitTaskMutation.mutate()}
                        disabled={submitTaskMutation.isPending}
                        className="gap-1.5 cursor-pointer"
                      >
                        <Send className="size-3.5" /> Submit for Review
                      </Button>
                    )}

                    {/* VALIDATE (Approve) */}
                    {task.status === "IN_REVIEW" && canReview && (
                      <Button
                        size="sm"
                        onClick={() => validateTaskMutation.mutate()}
                        disabled={validateTaskMutation.isPending}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" /> Validate
                      </Button>
                    )}

                    {/* REJECT */}
                    {task.status === "IN_REVIEW" && canReview && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setIsRejectModalOpen(true)}
                        className="gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="size-3.5" /> Reject
                      </Button>
                    )}

                    {/* UNASSIGN */}
                    {task.status === "PENDING" && canReview && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unassignTaskMutation.mutate()}
                        disabled={unassignTaskMutation.isPending}
                        className="text-xs"
                      >
                        Unassign
                      </Button>
                    )}
                  </div>
                </div>

                {/* Blocked Alert Banner */}
                {task.isBlocked && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive flex items-center gap-2">
                    <ShieldAlert className="size-4 shrink-0" />
                    <span>
                      This task cannot be started because upstream dependencies are incomplete:{" "}
                      <strong>Task #{task.blockedBy.join(", #")}</strong>.
                    </span>
                  </div>
                )}
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 px-6 border-b border-border bg-muted/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("details")}
                  className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === "details"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("dependencies")}
                  className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === "dependencies"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <GitBranch className="size-3.5" /> Dependencies ({task.dependsOn.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("comments")}
                  className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === "comments"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="size-3.5" /> Comments ({comments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("attachments")}
                  className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === "attachments"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Paperclip className="size-3.5" /> Attachments ({attachments.length})
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* 1. DETAILS TAB */}
                {activeTab === "details" && (
                  <div className="space-y-6">
                    {/* Description */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Description
                        </h4>
                        {canReview && !isEditingTask && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingTask(true)}
                            className="text-xs h-7"
                          >
                            Edit
                          </Button>
                        )}
                      </div>

                      {isEditingTask ? (
                        <div className="space-y-3">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Task title"
                          />
                          <Textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            placeholder="Detailed description..."
                            rows={3}
                          />
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium">Priority:</label>
                            <select
                              value={editPriority}
                              onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                              className="text-xs bg-background border border-input rounded px-2 py-1"
                            >
                              <option value="LOW">LOW</option>
                              <option value="MEDIUM">MEDIUM</option>
                              <option value="HIGH">HIGH</option>
                              <option value="URGENT">URGENT</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                updateTaskMutation.mutate({
                                  name: editName.trim(),
                                  description: editDesc.trim() || undefined,
                                  priority: editPriority,
                                })
                              }
                              disabled={updateTaskMutation.isPending}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIsEditingTask(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/20 p-3 rounded-md border border-border">
                          {task.description || "No description provided."}
                        </p>
                      )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                      <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <User className="size-3" /> Assignee
                        </span>
                        <p className="text-sm font-semibold text-foreground truncate">
                          {task.assignedTo?.name || "Unassigned"}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" /> Date Range
                        </span>
                        <p className="text-xs font-semibold text-foreground">
                          {new Date(task.startDate).toLocaleDateString()} –{" "}
                          {new Date(task.endDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" /> Started
                        </span>
                        <p className="text-xs font-semibold text-foreground">
                          {task.startedAt ? new Date(task.startedAt).toLocaleDateString() : "—"}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Completed
                        </span>
                        <p className="text-xs font-semibold text-foreground">
                          {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. DEPENDENCIES TAB */}
                {activeTab === "dependencies" && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Directed Acyclic Graph (DAG) Dependencies
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        This task cannot be started until all prerequisite tasks are COMPLETED.
                      </p>
                    </div>

                    {canReview ? (
                      <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/20">
                        <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          Select Prerequisite Tasks (Same Project)
                        </h5>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-border/50">
                          {projectTasks
                            .filter((t) => t.taskId !== task.taskId)
                            .map((sibling) => {
                              const isChecked = task.dependsOn.includes(sibling.taskId);
                              return (
                                <label
                                  key={sibling.taskId}
                                  className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const next = e.target.checked
                                        ? [...task.dependsOn, sibling.taskId]
                                        : task.dependsOn.filter((id) => id !== sibling.taskId);
                                      setDependenciesMutation.mutate(next);
                                    }}
                                    disabled={setDependenciesMutation.isPending}
                                    className="rounded border-border size-4 text-primary"
                                  />
                                  <span className="font-mono text-muted-foreground">
                                    #{sibling.taskId}
                                  </span>
                                  <span className="font-medium text-foreground flex-1 truncate">
                                    {sibling.name}
                                  </span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {sibling.status}
                                  </Badge>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {task.dependsOn.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No prerequisites required.</p>
                        ) : (
                          task.dependsOn.map((depId) => (
                            <div
                              key={depId}
                              className="p-2.5 rounded border border-border flex items-center justify-between text-xs"
                            >
                              <span>Prerequisite Task #{depId}</span>
                              {task.blockedBy.includes(depId) ? (
                                <Badge variant="destructive" className="text-[10px]">
                                  Not Done
                                </Badge>
                              ) : (
                                <Badge variant="success" className="text-[10px]">
                                  Completed
                                </Badge>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. COMMENTS TAB */}
                {activeTab === "comments" && (
                  <div className="space-y-4">
                    {/* Add comment box */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Write a comment or status update..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                            e.preventDefault();
                            addCommentMutation.mutate(newComment.trim());
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => addCommentMutation.mutate(newComment.trim())}
                        disabled={!newComment.trim() || addCommentMutation.isPending}
                        className="gap-1.5"
                      >
                        <Send className="size-3.5" /> Post
                      </Button>
                    </div>

                    {/* Comments Feed */}
                    <div className="space-y-3 pt-2">
                      {isCommentsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-14 w-full" />
                          <Skeleton className="h-14 w-full" />
                        </div>
                      ) : comments.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">
                          No comments yet. Start the conversation.
                        </p>
                      ) : (
                        comments.map((comment) => {
                          const isCommentAuthor = comment.user?.userId === user?.userId;
                          const canDelete =
                            isCommentAuthor || isAdmin || isModerator;

                          // System audit comment
                          if (comment.isSystem) {
                            return (
                              <div
                                key={comment.commentId}
                                className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                  <Badge variant="secondary" className="text-[10px] py-0">
                                    System Audit
                                  </Badge>
                                  <span>{new Date(comment.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-muted-foreground italic font-mono text-[11px]">
                                  {comment.content}
                                </p>
                              </div>
                            );
                          }

                          // User comment
                          const canEdit = isCommentAuthor && !comment.isSystem;
                          const isEditing = editingCommentId === comment.commentId;

                          return (
                            <div
                              key={comment.commentId}
                              className="p-3 rounded-lg border border-border bg-card space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-foreground">
                                  {comment.user?.name || "Unknown User"}
                                </span>
                                <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                                  <span>{new Date(comment.createdAt).toLocaleString()}</span>
                                  {canEdit && !isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCommentId(comment.commentId);
                                        setEditingCommentText(comment.content);
                                      }}
                                      className="text-primary hover:underline ml-1 cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {canDelete && !isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => deleteCommentMutation.mutate(comment.commentId)}
                                      className="text-destructive hover:underline ml-1 cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isEditing ? (
                                <div className="space-y-2 pt-1">
                                  <Textarea
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    rows={2}
                                    className="text-xs"
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-2 justify-end">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingCommentText("");
                                      }}
                                      className="text-xs h-7 px-2 cursor-pointer"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() =>
                                        updateCommentMutation.mutate({
                                          commentId: comment.commentId,
                                          content: editingCommentText.trim(),
                                        })
                                      }
                                      disabled={!editingCommentText.trim() || updateCommentMutation.isPending}
                                      className="text-xs h-7 px-2 cursor-pointer"
                                    >
                                      {updateCommentMutation.isPending && (
                                        <Loader2 className="size-3 animate-spin mr-1" />
                                      )}
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-foreground whitespace-pre-wrap">
                                  {comment.content}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* 4. ATTACHMENTS TAB */}
                {activeTab === "attachments" && (
                  <div className="space-y-4">
                    {/* Upload Dropzone */}
                    <div className="p-4 border-2 border-dashed border-border rounded-lg text-center hover:bg-muted/10 transition-colors">
                      <input
                        type="file"
                        id="attachmentUploadInput"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                      <label
                        htmlFor="attachmentUploadInput"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <UploadCloud className="size-8 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                          {isUploading ? "Uploading file..." : "Click to upload attachment"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Supported files up to 10 MB (Binary magic inspection enforced)
                        </span>
                      </label>
                    </div>

                    {/* Attachments List */}
                    <div className="space-y-2 pt-2">
                      {isAttachmentsLoading ? (
                        <Skeleton className="h-12 w-full" />
                      ) : attachments.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No attachments uploaded yet. Max 20 attachments per task.
                        </p>
                      ) : (
                        attachments.map((att) => (
                          <div
                            key={att.attachmentId}
                            className="p-3 rounded-lg border border-border flex items-center justify-between gap-3 bg-muted/20 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Paperclip className="size-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">
                                  {att.originalName}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {(att.size / 1024).toFixed(1)} KB • Uploaded by {att.uploadedBy.name}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8 cursor-pointer"
                                title="Download attachment"
                                onClick={() => handleDownloadAttachment(att.attachmentId, att.originalName)}
                              >
                                <Download className="size-4" />
                              </Button>
                              {(isAdmin || isModerator || att.uploadedBy.userId === user?.userId) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deleteAttachmentMutation.mutate(att.attachmentId)}
                                  className="size-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                                  title="Delete attachment"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Feedback Modal */}
      <RejectTaskModal
        task={task || null}
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
      />
    </>
  );
}
