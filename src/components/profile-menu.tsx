import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenu,
} from "./ui/dropdown-menu";
import { LogOut, User as UserIcon, Shield, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "./ui/badge";

const ProfileMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  const roleLabel =
    user.role === "ADMIN"
      ? "Administrator"
      : user.membership?.role === "MODERATOR"
      ? "Team Moderator"
      : user.membership
      ? "Team Member"
      : "Employee";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="size-9 rounded-full cursor-pointer">
          <div className="size-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-1">
          <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate font-normal">{user.email}</p>
          <div className="pt-1">
            <Badge
              variant={user.role === "ADMIN" ? "purple" : "info"}
              className="text-[10px] py-0"
            >
              {user.role === "ADMIN" ? (
                <Shield className="size-2.5 mr-1" />
              ) : (
                <Users className="size-2.5 mr-1" />
              )}
              {roleLabel}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard/profile" className="flex items-center gap-2 cursor-pointer">
            <UserIcon className="size-4" />
            <span>Manage Account</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="size-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
