import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

const SearchBar = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Input type="text" placeholder="Search" className="pl-10" />
      <Search
        className="absolute left-[11px] text-muted-foreground"
        strokeWidth={1}
        width={20}
      />
    </div>
  );
};

export default SearchBar;
