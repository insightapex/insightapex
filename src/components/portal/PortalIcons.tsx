import { cn } from "@/lib/utils";

type IconProps = { className?: string; children: React.ReactNode };

function IconBase({ className, children }: IconProps) {
  return (
    <svg
      className={cn("h-6 w-6 shrink-0", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function PortalIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "dashboard":
      return (
        <IconBase className={className}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </IconBase>
      );
    case "analytics":
    case "attempts":
      return (
        <IconBase className={className}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15v-4" />
          <path d="M12 15V8" />
          <path d="M16 15v-6" />
        </IconBase>
      );
    case "results":
    case "check":
      return (
        <IconBase className={className}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </IconBase>
      );
    case "parts":
      return (
        <IconBase className={className}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h10" />
        </IconBase>
      );
    case "papers":
      return (
        <IconBase className={className}>
          <path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
          <path d="M14 3v5h5" />
        </IconBase>
      );
    case "categories":
      return (
        <IconBase className={className}>
          <path d="M4 4h7v7H4z" />
          <path d="M13 4h7v7h-7z" />
          <path d="M4 13h7v7H4z" />
          <path d="M16 16l2 2 4-4" />
        </IconBase>
      );
    case "subcategories":
      return (
        <IconBase className={className}>
          <circle cx="6" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <path d="M8 6h8a2 2 0 012 2v8" />
          <circle cx="18" cy="18" r="2" />
        </IconBase>
      );
    case "questions":
      return (
        <IconBase className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 015.8 1c0 2-3 2.5-3 4" />
          <path d="M12 17h.01" />
        </IconBase>
      );
    case "mock":
      return (
        <IconBase className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </IconBase>
      );
    case "plans":
    case "billing":
      return (
        <IconBase className={className}>
          <path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
          <path d="M8 11h8" />
          <path d="M8 15h5" />
        </IconBase>
      );
    case "products":
      return (
        <IconBase className={className}>
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          <path d="M3.3 7L12 12l8.7-5" />
          <path d="M12 22V12" />
        </IconBase>
      );
    case "purchases":
      return (
        <IconBase className={className}>
          <path d="M6 6h15l-1.5 9h-12z" />
          <path d="M6 6L5 3H2" />
          <circle cx="9" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
        </IconBase>
      );
    case "subscriptions":
      return (
        <IconBase className={className}>
          <path d="M4 12a8 8 0 018-8" />
          <path d="M20 12a8 8 0 01-8 8" />
          <path d="M12 4v4l2-1" />
          <path d="M12 20v-4l-2 1" />
        </IconBase>
      );
    case "students":
      return (
        <IconBase className={className}>
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </IconBase>
      );
    case "partners":
      return (
        <IconBase className={className}>
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 21v-6h6v6" />
        </IconBase>
      );
    case "settings":
      return (
        <IconBase className={className}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="M4.9 4.9l1.4 1.4" />
          <path d="M17.7 17.7l1.4 1.4" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="M4.9 19.1l1.4-1.4" />
          <path d="M17.7 6.3l1.4-1.4" />
        </IconBase>
      );
    case "reports":
      return (
        <IconBase className={className}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </IconBase>
      );
    case "classes":
      return (
        <IconBase className={className}>
          <path d="M2 7l10-4 10 4-10 4L2 7z" />
          <path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" />
        </IconBase>
      );
    case "lecturers":
      return (
        <IconBase className={className}>
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v15H6.5A2.5 2.5 0 014 14.5v-10A2.5 2.5 0 016.5 2z" />
          <path d="M10 8h6" />
          <path d="M10 12h4" />
        </IconBase>
      );
    case "earnings":
    case "billing":
      return (
        <IconBase className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10" />
          <path d="M15 9.5c0-1.1-1.3-2-3-2s-3 .9-3 2 1.3 2 3 2 3 .9 3 2-1.3 2-3 2" />
        </IconBase>
      );
    case "trend":
      return (
        <IconBase className={className}>
          <path d="M3 17l6-6 4 4 7-7" />
          <path d="M14 8h6v6" />
        </IconBase>
      );
    case "warning":
    case "alert":
      return (
        <IconBase className={className}>
          <path d="M12 3l9 16H3L12 3z" />
          <path d="M12 10v4" />
          <path d="M12 17h.01" />
        </IconBase>
      );
    case "star":
      return (
        <IconBase className={className}>
          <path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.3 6.7 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z" />
        </IconBase>
      );
    case "plus":
      return (
        <IconBase className={className}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </IconBase>
      );
    case "percent":
      return (
        <IconBase className={className}>
          <path d="M19 5L5 19" />
          <circle cx="7.5" cy="7.5" r="2.5" />
          <circle cx="16.5" cy="16.5" r="2.5" />
        </IconBase>
      );
    case "activity":
      return (
        <IconBase className={className}>
          <path d="M22 12h-4l-3 7L9 5l-3 7H2" />
        </IconBase>
      );
    case "fail":
      return (
        <IconBase className={className}>
          <path d="M12 5v14" />
          <path d="M19 12l-7 7-7-7" />
        </IconBase>
      );
    case "score":
      return (
        <IconBase className={className}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" />
        </IconBase>
      );
    case "menu":
      return (
        <IconBase className={className}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </IconBase>
      );
    case "collapse":
      return (
        <IconBase className={className}>
          <path d="M15 18l-6-6 6-6" />
        </IconBase>
      );
    case "expand":
      return (
        <IconBase className={className}>
          <path d="M9 18l6-6-6-6" />
        </IconBase>
      );
    case "logout":
      return (
        <IconBase className={className}>
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </IconBase>
      );
    case "bell":
      return (
        <IconBase className={className}>
          <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 003.4 0" />
        </IconBase>
      );
    default:
      return (
        <IconBase className={className}>
          <circle cx="12" cy="12" r="8" />
        </IconBase>
      );
  }
}
