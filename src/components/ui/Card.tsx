import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "glass" | "elevated" | "gradient";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hover?: boolean;
}

const variants: Record<CardVariant, string> = {
  default: "border border-slate-200/80 bg-white shadow-sm",
  glass: "border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-sm",
  elevated: "border border-slate-200/80 bg-white shadow-card",
  gradient: "border border-brand-100/50 bg-gradient-brand-soft shadow-card",
};

export function Card({ className, variant = "default", hover, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl transition-all duration-200",
        variants[variant],
        hover && "hover:-translate-y-0.5 hover:shadow-panel",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-slate-100/80 px-5 py-4 sm:px-6", className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-t border-slate-100/80 px-5 py-4 sm:px-6", className)} {...props} />
  );
}
