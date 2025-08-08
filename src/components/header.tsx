import { cn } from "@/lib/utils";
import SearchBar from "./search-bar";
import { PanelRightClose } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import ThemeMenu from "./theme-menu";
import CollabNLogo from "./collap-n-logo";
import ProfileMenu from "./profile-menu";

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  const { isOpen: isSidebarOpen, open: openSidebar } = useSidebar();
  return (
    <header className={cn(className)}>
      <nav className="flex px-4 py-2 items-center justify-between w-full">
        <CollabNLogo
          Icon={PanelRightClose}
          show={!isSidebarOpen}
          onClick={openSidebar}
          className="flex-1/4"
        />

        {isSidebarOpen && <div className="flex-1/4" aria-hidden />}

        <SearchBar className="flex-2/4" />
        <div className="flex-1/4 flex justify-end items-center gap-4">
          <ProfileMenu />
          <ThemeMenu />
        </div>
      </nav>
    </header>
  );
};

export default Header;
