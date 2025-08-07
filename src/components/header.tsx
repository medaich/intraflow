import { cn } from "@/lib/utils";
import SearchBar from "./search-bar";
import { PanelRightClose } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import ThemeMenu from "./theme-menu";

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  const { isOpen: isSidebarOpen, open: openSidebar } = useSidebar();
  return (
    <header className={cn(className)}>
      <nav className="flex px-4 py-2 items-center justify-between">
        <div className="flex-1/3 flex items-center gap-4">
          {!isSidebarOpen && (
            <>
              <PanelRightClose onClick={openSidebar} />
              <p>LOGO</p>
            </>
          )}
        </div>
        <SearchBar className="flex-1/3" />
        <div className="flex-1/3 flex justify-end items-center gap-4">
          <div>profile</div>
          <ThemeMenu />
        </div>
      </nav>
    </header>
  );
};

export default Header;
