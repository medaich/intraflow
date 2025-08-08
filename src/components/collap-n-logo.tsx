import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react";
import type { ForwardRefExoticComponent } from "react";

interface CollabNLogoProps {
  show: boolean;
  Icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  className?: string;
  onClick: () => void;
}

const CollabNLogo = ({ show, Icon, className, onClick }: CollabNLogoProps) => {
  if (show)
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <Icon className="size-5" onClick={onClick} />
        <p>LOGO</p>
      </div>
    );
};

export default CollabNLogo;
