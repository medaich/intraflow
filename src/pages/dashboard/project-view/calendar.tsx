import { useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { Task, PaginatedResponse } from "@/types";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function CalendarPage() {
  const { projId } = useParams<{ projId: string }>();
  const projectId = projId ? Number(projId) : undefined;
  const { user } = useAuth();
  const isUserAdmin = user?.role === "ADMIN";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Query tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: projectId
      ? ["project-tasks-calendar", projectId]
      : ["tasks-calendar", isUserAdmin ? "all" : "my-tasks"],
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

  const tasks = tasksData?.data || [];

  // Month navigation logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Calendar days grid
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  // Filter tasks active or due on day
  const getTasksForDay = (date: Date) => {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    return tasks.filter((t) => {
      const start = new Date(t.startDate).getTime();
      const end = new Date(t.endDate).getTime();
      return (
        (start <= dayEnd && end >= dayStart) ||
        (new Date(t.endDate).toDateString() === date.toDateString())
      );
    });
  };

  const todayStr = new Date().toDateString();

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Header and Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="size-5 text-primary" /> Schedule Calendar
          </h2>
          <p className="text-xs text-muted-foreground">
            Timeline schedule mapped from scheduled task start and completion deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday} className="text-xs">
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth} className="size-8">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs font-semibold px-2 min-w-[120px] text-center">
              {monthName}
            </span>
            <Button variant="outline" size="icon" onClick={nextMonth} className="size-8">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Card */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <Skeleton className="h-[600px] w-full rounded-xl" />
          ) : (
            <div>
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-px text-center text-xs font-semibold text-muted-foreground uppercase py-2 border-b border-border">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-px bg-border/40 min-h-[550px] border-b border-border">
                {days.map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="bg-card min-h-[100px] p-2" />;
                  }

                  const dayTasks = getTasksForDay(day);
                  const isToday = day.toDateString() === todayStr;

                  return (
                    <div
                      key={day.toISOString()}
                      className={`bg-card min-h-[110px] p-1.5 flex flex-col justify-between hover:bg-muted/20 transition-colors ${
                        isToday ? "ring-1 ring-primary/40 bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold size-6 flex items-center justify-center rounded-full ${
                            isToday
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {dayTasks.length > 0 && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {dayTasks.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[80px]">
                        {dayTasks.slice(0, 3).map((task) => (
                          <button
                            key={task.taskId}
                            type="button"
                            onClick={() => setSelectedTaskId(task.taskId)}
                            className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate block transition-opacity hover:opacity-80 cursor-pointer ${
                              task.status === "COMPLETED"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : task.isBlocked
                                ? "bg-destructive/15 text-destructive border border-destructive/20"
                                : task.status === "IN_REVIEW"
                                ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                : "bg-primary/15 text-primary border border-primary/20"
                            }`}
                          >
                            #{task.taskId} {task.name}
                          </button>
                        ))}
                        {dayTasks.length > 3 && (
                          <span className="text-[9px] text-muted-foreground block text-center">
                            +{dayTasks.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
    </div>
  );
}
