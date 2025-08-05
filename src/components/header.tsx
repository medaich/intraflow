import { cn } from "@/lib/utils";
import SearchBar from "./search-bar";
import { PanelRightClose } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  const { isOpen, open } = useSidebar();
  return (
    <header className={cn(className)}>
      <nav className="flex px-4 py-2 items-center justify-between">
        <div className="flex-1/3 flex items-center gap-4">
          {!isOpen && (
            <>
              <PanelRightClose onClick={open} />
              <p>LOGO</p>
            </>
          )}
        </div>
        <SearchBar className="flex-1/3" />
        <div className="flex-1/3 flex justify-end items-center gap-4">
          <div>profile</div>
          <div>theme</div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
