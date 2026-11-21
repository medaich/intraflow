import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";
import type { ForwardRefExoticComponent } from "react";
import { Link } from "react-router";

interface CollabNLogoProps {
  show: boolean;
  Icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  className?: string;
  onClick: () => void;
}

const CollabNLogo = ({ show, Icon, className, onClick }: CollabNLogoProps) => {
  if (!show) return null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        onClick={onClick}
        className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        title="Toggle sidebar"
      >
        <Icon className="size-5" />
      </button>
      <Link to="/dashboard" className="flex items-center gap-2 font-bold tracking-tight text-foreground">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-black shadow-xs">
          IF
        </span>
        <span className="text-base font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Intraflow
        </span>
      </Link>
    </div>
  );
};

export default CollabNLogo;
