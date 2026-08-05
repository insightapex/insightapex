import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-sm", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <div key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg className="h-3.5 w-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast ? (
              <span className="font-medium text-ink-900" aria-current="page">
                {item.label}
              </span>
            ) : item.href ? (
              <Link href={item.href} className="text-slate-500 transition-colors hover:text-brand-600">
                {item.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="text-slate-500 transition-colors hover:text-brand-600"
              >
                {item.label}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
