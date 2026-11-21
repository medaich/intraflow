import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getProjectProgressPercent, type PaginatedResponse, type Project, type Task } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "react-router";
import {
  Folders,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Shield,
  Users,
  SquareKanban,
  Plus,
} from "lucide-react";

export default function DashboardOverview() {
  const { user } = useAuth();

  // Projects query
  const { data: projectsData, isLoading: isProjectsLoading } = useQuery({
    queryKey: ["projects", { limit: 10 }],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Project>>("/projects", {
        params: { limit: 10 },
      });
      return res.data;
    },
  });

  // Tasks query: Admin gets system tasks, Employee gets my-tasks
  const isUserAdmin = user?.role === "ADMIN";
  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: ["dashboard-tasks", isUserAdmin ? "all" : "my-tasks"],
    queryFn: async () => {
      const endpoint = isUserAdmin ? "/tasks" : "/tasks/my-tasks";
      const res = await apiClient.get<PaginatedResponse<Task>>(endpoint, {
        params: { limit: 50 },
      });
      return res.data;
    },
  });

  const projects = projectsData?.data || [];
  const tasks = tasksData?.data || [];

  // Metrics derived from actual API responses
  const activeProjectsCount = projects.filter((p) => p.status === "ACTIVE").length;
  const overdueProjectsCount = projects.filter((p) => p.isOverdue).length;

  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const inReviewTasks = tasks.filter((t) => t.status === "IN_REVIEW");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
  const overdueTasks = tasks.filter((t) => t.timeState === "OVERDUE");

  return (
    <div className="space-y-8 animate-in fade-in-50">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-xl border border-border bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {user?.name}!
            </h1>
            <Badge
              variant={isUserAdmin ? "purple" : "info"}
              className="text-xs font-medium"
            >
              {isUserAdmin ? (
                <>
                  <Shield className="size-3 mr-1" /> Administrator
                </>
              ) : user?.membership?.role === "MODERATOR" ? (
                <>
                  <Users className="size-3 mr-1" /> Team Moderator
                </>
              ) : (
                <>
                  <Users className="size-3 mr-1" /> Team Member
                </>
              )}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {isUserAdmin
              ? "You have global platform oversight. Manage projects, teams, tasks, and system users."
              : "Here is a real-time summary of your current project deliverables and tasks."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/dashboard/board">
              <SquareKanban className="size-4" /> Go to Board
            </Link>
          </Button>
          {isUserAdmin && (
            <Button asChild className="gap-2">
              <Link to="/dashboard/projects">
                <Plus className="size-4" /> New Project
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
            <Folders className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isProjectsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {activeProjectsCount}
                </span>
                <span className="text-xs text-muted-foreground">
                  of {projects.length} loaded
                </span>
              </div>
            )}
            {overdueProjectsCount > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium">
                <AlertTriangle className="size-3" />
                {overdueProjectsCount} project(s) past deadline
              </p>
            )}
          </CardContent>
        </Card>

        {/* In Progress Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
            <Clock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isTasksLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {inProgressTasks.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  tasks actively worked on
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {isUserAdmin ? "Across all active teams" : "Assigned to your queue"}
            </p>
          </CardContent>
        </Card>

        {/* In Review Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Awaiting Review
            </CardTitle>
            <ListTodo className="size-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {isTasksLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {inReviewTasks.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  pending validation
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Ready for Moderator or Admin approval
            </p>
          </CardContent>
        </Card>

        {/* Completed Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Tasks
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isTasksLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {completedTasks.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  of {tasks.length} total
                </span>
              </div>
            )}
            {overdueTasks.length > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1 font-medium">
                <AlertTriangle className="size-3" />
                {overdueTasks.length} task(s) overdue
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects and Tasks Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Current Projects
              </CardTitle>
              <CardDescription>
                Overview of projects visible to your organization tier
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/dashboard/projects">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {isProjectsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))
            ) : projects.length === 0 ? (
              <EmptyState
                icon={<Folders className="size-5" />}
                title="No projects found"
                description={
                  isUserAdmin
                    ? "Get started by creating your first project."
                    : "Your team has not been assigned any active projects yet."
                }
              />
            ) : (
              projects.slice(0, 4).map((proj) => (
                <Link
                  key={proj.projectId}
                  to={`/dashboard/projects/${proj.projectId}/board`}
                  className="block p-3 rounded-lg border border-border hover:border-primary/50 transition-colors bg-muted/20 hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-sm text-foreground truncate max-w-[250px]">
                      {proj.name}
                    </span>
                    <Badge
                      variant={
                        proj.status === "ACTIVE"
                          ? "default"
                          : proj.status === "COMPLETED"
                          ? "success"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {proj.status}
                    </Badge>
                  </div>
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Completion</span>
                      <span className="font-semibold text-foreground">
                        {Math.round(getProjectProgressPercent(proj.progress))}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, getProjectProgressPercent(proj.progress))
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Priority Action Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Priority Tasks
              </CardTitle>
              <CardDescription>
                Tasks in flight or awaiting validation
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/dashboard/tasks">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isTasksLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))
            ) : tasks.length === 0 ? (
              <EmptyState
                icon={<ListTodo className="size-5" />}
                title="No tasks currently in flight"
                description="All operational tasks have been addressed or none assigned."
              />
            ) : (
              tasks.slice(0, 4).map((task) => (
                <div
                  key={task.taskId}
                  className="p-3 rounded-lg border border-border flex items-center justify-between gap-3 bg-muted/20"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {task.name}
                      </p>
                      {task.isBlocked && (
                        <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                          Blocked
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Status: {task.status}</span>
                      <span>•</span>
                      <span
                        className={
                          task.priority === "URGENT"
                            ? "text-destructive font-semibold"
                            : task.priority === "HIGH"
                            ? "text-amber-500 font-medium"
                            : ""
                        }
                      >
                        {task.priority} Priority
                      </span>
                    </div>
                  </div>

                  <Button asChild size="sm" variant="outline">
                    <Link to={`/dashboard/board`}>Inspect</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
