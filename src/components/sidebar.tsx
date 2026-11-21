import { useSidebar } from "@/contexts/SidebarContext";
import { MAX_SIDEBAR_SIZE, MIN_SIDEBAR_SIZE } from "@/lib/consts";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ChartColumnIncreasing,
  FolderKanban,
  Folders,
  LayoutDashboard,
  ListTodo,
  PanelRightOpen,
  Settings,
  SquareKanban,
  Users,
  Shield,
  Plus,
} from "lucide-react";
import CollabNLogo from "./collap-n-logo";
import SidebarNavLink from "./sidebar-nav-link";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PaginatedResponse, Project } from "@/types";
import { Link } from "react-router";

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const { isOpen, close, resize, size } = useSidebar();
  const { user } = useAuth();

  // Dynamically load projects visible to this user
  const { data: projectsData } = useQuery({
    queryKey: ["projects", { limit: 8 }],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Project>>("/projects", {
        params: { limit: 8 },
      });
      return res.data;
    },
    enabled: !!user,
  });

  const projects = projectsData?.data || [];

  if (!isOpen) return null;

  function onMouseMove(e: MouseEvent) {
    const x = e.clientX;
    if (x < MIN_SIDEBAR_SIZE || x > MAX_SIDEBAR_SIZE) return;
    resize(e.clientX);
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    e.preventDefault();
  }

  return (
    <div
      className={cn("flex bg-sidebar border-r border-border relative select-none", className)}
      style={{ width: `${size}px` }}
    >
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="h-16 flex items-center border-b-2 border-accent px-4 shrink-0">
          <CollabNLogo Icon={PanelRightOpen} show={isOpen} onClick={close} />
        </div>
        <nav className="flex-1 p-3 flex flex-col justify-between space-y-4">
          <div className="flex gap-6 flex-col">
            {/* Overview */}
            <ul className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase px-2 mb-1 tracking-wider">
                Overview
              </p>
              <SidebarNavLink to="/dashboard">
                <LayoutDashboard className="size-4" /> Dashboard
              </SidebarNavLink>
            </ul>

            {/* Workflow */}
            <ul className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase px-2 mb-1 tracking-wider">
                Workflow
              </p>
              <SidebarNavLink to="/dashboard/board">
                <SquareKanban className="size-4" /> Kanban Board
              </SidebarNavLink>
              <SidebarNavLink to="/dashboard/tasks">
                <ListTodo className="size-4" /> {user?.role === "ADMIN" ? "All Tasks" : "My Tasks"}
              </SidebarNavLink>
            </ul>

            {/* Projects */}
            <ul className="space-y-1">
              <div className="flex items-center justify-between px-2 mb-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Projects
                </p>
                <Link
                  to="/dashboard/projects"
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                  title="View all projects"
                >
                  <Plus className="size-3" />
                </Link>
              </div>
              <SidebarNavLink to="/dashboard/projects">
                <Folders className="size-4" /> All Projects
              </SidebarNavLink>
              {projects.map((proj) => (
                <SidebarNavLink
                  key={proj.projectId}
                  to={`/dashboard/projects/${proj.projectId}/board`}
                >
                  <FolderKanban className="size-4" />
                  <span className="truncate">{proj.name}</span>
                </SidebarNavLink>
              ))}
            </ul>

            {/* Analytics */}
            <ul className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase px-2 mb-1 tracking-wider">
                Tracking
              </p>
              <SidebarNavLink to="/dashboard/stats">
                <ChartColumnIncreasing className="size-4" /> Analytics & Stats
              </SidebarNavLink>
              <SidebarNavLink to="/dashboard/calendar">
                <Calendar className="size-4" /> Schedule Calendar
              </SidebarNavLink>
            </ul>

            {/* Teams Management */}
            <ul className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase px-2 mb-1 tracking-wider">
                Organization
              </p>
              {user?.role === "ADMIN" && (
                <SidebarNavLink to="/dashboard/teams">
                  <Shield className="size-4" /> Manage Teams
                </SidebarNavLink>
              )}
              {user?.membership?.teamId && (
                <SidebarNavLink to="/dashboard/my-team">
                  <Users className="size-4" /> My Team Roster
                </SidebarNavLink>
              )}
              {user?.role === "ADMIN" && (
                <SidebarNavLink to="/dashboard/users">
                  <Users className="size-4" /> All Users
                </SidebarNavLink>
              )}
            </ul>
          </div>

          {/* Account Settings */}
          <ul className="pt-2 border-t border-border">
            <SidebarNavLink to="/dashboard/profile">
              <Settings className="size-4" /> Account Settings
            </SidebarNavLink>
          </ul>
        </nav>
      </div>

      {/* Resize Drag Handle */}
      <div
        className="h-full absolute w-3 -right-1.5 cursor-col-resize group flex justify-center z-20"
        onMouseDown={onMouseDown}
      >
        <div className="h-full w-0.5 group-hover:bg-primary transition-colors" />
      </div>
    </div>
  );
};

export default Sidebar;
