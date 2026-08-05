"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DropdownItem {
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  icon?: ReactNode;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, items, align = "right", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 min-w-[180px] animate-scale-in overflow-hidden rounded-xl border border-slate-200/60 bg-white py-1 shadow-float",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item) => {
            const cls = cn(
              "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors",
              item.danger ? "text-red-600 hover:bg-red-50" : "text-slate-600 hover:bg-slate-50"
            );
            if (item.href) {
              return (
                <a key={item.label} href={item.href} className={cls} onClick={() => setOpen(false)}>
                  {item.icon}
                  {item.label}
                </a>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={cls}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
