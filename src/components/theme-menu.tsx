import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Monitor, SunMoon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
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
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={"icon"}>
          <SunMoon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setTheme("SYSTEM")}
          className={theme === "SYSTEM" ? "bbg-primary/20 text-primary" : ""}
        >
          <Monitor
            className={cn("mr-2 size-4", {
              "text-primary": theme === "SYSTEM",
            })}
          />
          System
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("LIGHT")}
          className={theme === "LIGHT" ? "bg-primary/20 text-primary" : ""}
        >
          <Sun
            className={cn("mr-2 size-4", {
              "text-primary": theme === "LIGHT",
            })}
          />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("DARK")}
          className={theme === "DARK" ? "bg-primary/20 text-primary" : ""}
        >
          <Moon
            className={cn("mr-2 size-4", {
              "text-primary": theme === "DARK",
            })}
          />
          Dark
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
