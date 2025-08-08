import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Monitor, SunMoon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export default function ThemeMenu() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size={"icon"} asChild>
          <SunMoon className="!size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => setTheme("SYSTEM")}
            className={cn("transition-colors duration-150 ease-in", {
              "bg-primary/10 focus:bg-primary/20 border-r-2 border-primary focus:text-primary text-primary":
                theme === "SYSTEM",
            })}
          >
            <Monitor
              className={cn("!size-4", {
                "text-primary": theme === "SYSTEM",
              })}
            />
            System
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme("LIGHT")}
            className={cn("transition-colors duration-150 ease-in", {
              "bg-primary/10 focus:bg-primary/20 border-r-2 border-primary focus:text-primary text-primary":
                theme === "LIGHT",
            })}
          >
            <Sun
              className={cn("size-4", {
                "text-primary": theme === "LIGHT",
              })}
            />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme("DARK")}
            className={cn("transition-colors duration-150 ease-in", {
              "bg-primary/10 focus:bg-primary/20 border-r-2 border-primary focus:text-primary text-primary":
                theme === "DARK",
            })}
          >
            <Moon
              className={cn("size-4", {
                "text-primary": theme === "DARK",
              })}
            />
            Dark
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
