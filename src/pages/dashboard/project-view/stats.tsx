import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { Task, PaginatedResponse, Project } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartColumnIncreasing,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

export default function StatsPage() {
  const { projId } = useParams<{ projId: string }>();
  const projectId = projId ? Number(projId) : undefined;
  const { user } = useAuth();
  const isUserAdmin = user?.role === "ADMIN";

  // Query tasks
  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: projectId
      ? ["project-tasks-stats", projectId]
      : ["tasks-stats", isUserAdmin ? "all" : "my-tasks"],
    queryFn: async () => {
      const endpoint = projectId
        ? `/projects/${projectId}/tasks`
        : isUserAdmin
        ? "/tasks"
        : "/tasks/my-tasks";

      const res = await apiClient.get<PaginatedResponse<Task>>(endpoint, {
        params: { limit: 100 },
      });
      return res.data;
    },
  });

  // Query project details if in project scope
  const { data: project } = useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await apiClient.get<Project>(`/projects/${projectId}`);
      return res.data;
    },
    enabled: !!projectId,
  });

  const tasks = tasksData?.data || [];

  // Metrics derived from real task data
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
  const inReview = tasks.filter((t) => t.status === "IN_REVIEW").length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const pending = tasks.filter((t) => t.status === "PENDING").length;
  const unassigned = tasks.filter((t) => t.status === "UNASSIGNED").length;

  const blocked = tasks.filter((t) => t.isBlocked).length;
  const overdue = tasks.filter((t) => t.timeState === "OVERDUE").length;

  const urgent = tasks.filter((t) => t.priority === "URGENT").length;
  const high = tasks.filter((t) => t.priority === "HIGH").length;
  const medium = tasks.filter((t) => t.priority === "MEDIUM").length;
  const low = tasks.filter((t) => t.priority === "LOW").length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in-50">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ChartColumnIncreasing className="size-5 text-primary" />
          {projectId
            ? `Analytics: ${project?.name || `Project #${projectId}`}`
            : "Platform Operational Analytics"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Real-time metrics calculated from active deliverable statuses and dependency DAGs.
        </p>
      </div>

      {isTasksLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 space-y-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Overall Completion Rate
                </span>
                <div className="text-2xl font-bold text-foreground">
                  {completionRate}%
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" /> Active In Flight
                </span>
                <div className="text-2xl font-bold text-foreground">
                  {inProgress + pending}
                </div>
                <p className="text-xs text-muted-foreground">
                  {inProgress} in progress, {pending} pending start
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-destructive" /> Overdue Tasks
                </span>
                <div className="text-2xl font-bold text-destructive">
                  {overdue}
                </div>
                <p className="text-xs text-muted-foreground">
                  Past scheduled deadline and not finished
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <ShieldAlert className="size-3.5 text-amber-500" /> DAG Blocked Tasks
                </span>
                <div className="text-2xl font-bold text-foreground">
                  {blocked}
                </div>
                <p className="text-xs text-muted-foreground">
                  Waiting on upstream direct dependencies
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Distribution Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Status Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown across the 5 lifecycle state machine states
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Completed", count: completed, color: "bg-emerald-500" },
                  { label: "In Review", count: inReview, color: "bg-purple-500" },
                  { label: "In Progress", count: inProgress, color: "bg-amber-500" },
                  { label: "Pending", count: pending, color: "bg-sky-500" },
                  { label: "Unassigned Backlog", count: unassigned, color: "bg-muted-foreground" },
                ].map((item) => {
                  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-foreground">{item.label}</span>
                        <span className="text-muted-foreground">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Priority Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Priority Breakdown
                </CardTitle>
                <CardDescription>
                  Work distribution organized by urgency level
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Urgent", count: urgent, color: "bg-destructive" },
                  { label: "High", count: high, color: "bg-amber-500" },
                  { label: "Medium", count: medium, color: "bg-primary" },
                  { label: "Low", count: low, color: "bg-slate-400" },
                ].map((item) => {
                  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-foreground">{item.label} Priority</span>
                        <span className="text-muted-foreground">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
