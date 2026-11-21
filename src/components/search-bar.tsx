import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

const SearchBar = ({
  className,
  placeholder = "Search tasks, projects...",
  onSearch,
}: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    } else if (query.trim()) {
      navigate(`/dashboard/tasks?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className={cn("relative flex items-center w-full", className)}
    >
      <Search
        className="absolute left-3 size-4 text-muted-foreground pointer-events-none"
      />
      <Input
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-9 h-9 w-full bg-background"
      />
    </form>
  );
};

export default SearchBar;
