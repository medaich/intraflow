import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import type { Task } from "@/types";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function TaskPage() {
  const { taskId, projId } = useParams<{ taskId: string; projId?: string }>();
  const id = Number(taskId);
  const [isOpen, setIsOpen] = useState(true);

  const { data: task, isLoading, isError, error } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const res = await apiClient.get<Task>(`/tasks/${id}`);
      return res.data;
    },
    enabled: !isNaN(id),
  });

  const backUrl = projId
    ? `/dashboard/projects/${projId}/board`
    : "/dashboard/board";

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">Task Not Found</h2>
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        <Button asChild variant="outline">
          <Link to={backUrl}>Return to Board</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground">
        <Link to={backUrl}>
          <ArrowLeft className="size-4" /> Return to Board
        </Link>
      </Button>

      <TaskDetailModal
        taskId={id}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
