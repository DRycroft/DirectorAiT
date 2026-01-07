import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  children: ReactNode;
  width?: 'full' | 'half' | 'third';
  className?: string;
}

export const DashboardSection = ({ children, width = 'full', className }: DashboardSectionProps) => {
  const widthClasses = {
    full: 'col-span-12',
    half: 'col-span-12 md:col-span-6',
    third: 'col-span-12 md:col-span-4'
  };

  return (
    <div className={cn(widthClasses[width], className)}>
      {children}
    </div>
  );
};

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

export const DashboardGrid = ({ children, className }: DashboardGridProps) => {
  return (
    <div className={cn("grid grid-cols-12 gap-4", className)}>
      {children}
    </div>
  );
};
