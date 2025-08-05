import { useSidebar } from "@/contexts/SidebarContext";
import { MAX_SIDEBAR_SIZE, MIN_SIDEBAR_SIZE } from "@/lib/consts";
import { cn } from "@/lib/utils";
import { PanelRightOpen } from "lucide-react";

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
      className={cn("flex border-r border-accent relative", className)}
      style={{ width: `${size}px` }}
    >
      <div className="flex-1 py-4 px-4">
        <div className="flex items-center gap-4">
          <p>LOGO</p>
          <PanelRightOpen onClick={close} />
        </div>
        {/* content */}
      </div>
      <div
        className="h-full absolute w-4 -right-2 cursor-e-resize"
        onMouseDown={onMouseDown}
      />
    </div>
  );
};

export default Sidebar;
