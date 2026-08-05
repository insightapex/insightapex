"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { usePortalAccent } from "@/components/portal/PortalTheme";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, children, className }: PageHeaderProps) {
  const accent = usePortalAccent();
  const actionVariant = accent === "partner" ? "success" : "primary";

  return (
    <div
      className={cn(
        "mb-2 flex flex-col gap-4 sm:mb-0 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500 sm:text-base">{description}</p>
        )}
        {children}
      </div>
      {action &&
        (action.href ? (
          <Link href={action.href} className="shrink-0">
            <Button variant={actionVariant}>{action.label}</Button>
          </Link>
        ) : (
          <Button variant={actionVariant} className="shrink-0" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}
