import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenu,
} from "./ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router";

const ProfileMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button size={"icon"} variant={"ghost"} asChild>
          <User className="!size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Hi, Mohammed</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Link to={"/profile"} className="flex items-center gap-2">
            <User className="!size-4" /> <p>Manage your account</p>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LogOut className="!size-4" /> <p>Log out</p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
