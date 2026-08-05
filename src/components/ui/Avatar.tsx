import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes: Record<string, { className: string; px: number }> = {
  sm: { className: "h-8 w-8 text-xs", px: 32 },
  md: { className: "h-10 w-10 text-sm", px: 40 },
  lg: { className: "h-12 w-12 text-base", px: 48 },
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase();
  const sizeConfig = sizes[size];

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={sizeConfig.px}
        height={sizeConfig.px}
        unoptimized
        className={cn("rounded-xl object-cover ring-2 ring-white", sizeConfig.className, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-gradient-brand font-semibold text-white shadow-card",
        sizeConfig.className,
        className
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}
