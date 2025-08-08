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
  User,
  Users,
} from "lucide-react";
import CollabNLogo from "./collap-n-logo";
import SidebarNavLink from "./sidebar-nav-link";

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const { isOpen, close, resize, size } = useSidebar();
  if (!isOpen) return;

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
      className={cn("flex bg-sidebar relative", className)}
      style={{ width: `${size}px` }}
    >
      <div className="flex-1 flex flex-col">
        <div className="h-16 flex items-center border-b-2 border-accent px-4">
          <CollabNLogo Icon={PanelRightOpen} show={isOpen} onClick={close} />
        </div>
        <nav className="flex-1 p-4 flex flex-col justify-between ">
          <div className="flex gap-8 flex-col">
            <ul className="space-y-2">
              <p className="text-xs px-2">Home</p>
              <SidebarNavLink to="/dashboard">
                <LayoutDashboard className="!size-4" /> Dashboard
              </SidebarNavLink>
            </ul>
            <ul className="space-y-2">
              <p className="text-xs px-2">Workflow</p>

              <SidebarNavLink to="board">
                <SquareKanban className="!size-4" /> Board
              </SidebarNavLink>
              <SidebarNavLink to="tasks">
                <ListTodo className="!size-4" /> Tasks
              </SidebarNavLink>
            </ul>

            <ul className="space-y-2">
              <p className="text-xs px-2">Projects</p>
              <SidebarNavLink to="projects">
                <Folders className="!size-4" /> Projects
              </SidebarNavLink>

              <SidebarNavLink to="projects/1">
                <FolderKanban className="!size-4" />
                Project #1
              </SidebarNavLink>

              <SidebarNavLink to="projects/2">
                <FolderKanban className="!size-4" /> Project #2
              </SidebarNavLink>
            </ul>

            <ul className="space-y-2">
              <p className="text-xs px-2">Tracking</p>
              <SidebarNavLink to="stats">
                <ChartColumnIncreasing className="!size-4" /> Stats
              </SidebarNavLink>

              <SidebarNavLink to="calendar">
                <Calendar className="!size-4" /> Calendar
              </SidebarNavLink>
            </ul>

            <ul className="space-y-2">
              <p className="text-xs px-2">Manage</p>
              <SidebarNavLink to="profile">
                <User className="!size-4" /> Profile
              </SidebarNavLink>

              <SidebarNavLink to="users">
                <Users className="!size-4" /> Users
              </SidebarNavLink>
            </ul>
          </div>
          <ul>
            <SidebarNavLink to="settings">
              <Settings className="!size-4" /> Settings
            </SidebarNavLink>
          </ul>
        </nav>
      </div>
      <div
        className="h-full absolute w-4 -right-2 cursor-e-resize group flex justify-center"
        onMouseDown={onMouseDown}
      >
        <div className="h-full w-0.5 group-hover:bg-primary transition-colors" />
      </div>
    </div>
  );
};

export default Sidebar;
