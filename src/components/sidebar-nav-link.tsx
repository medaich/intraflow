import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { NavLink } from "react-router";

interface SidebarNavLinkProps {
  to: string;
  children: ReactNode;
}

const SidebarNavLink = ({ to, children }: SidebarNavLinkProps) => {
  return (
    <li>
      <NavLink
        end
        to={to}
        className={({ isActive }) =>
          cn(
            "flex items-center text-sm px-2 py-1 gap-2 transition-colors duration-150 hover:bg-accent ease-in hover:text-accent-foreground rounded",
            {
              "bg-primary/10 hover:bg-primary/20 hover:text-primary text-primary font-semibold border-l-2 border-primary":
                isActive,
            }
          )
        }
      >
        {children}
      </NavLink>
    </li>
  );
};

export default SidebarNavLink;
