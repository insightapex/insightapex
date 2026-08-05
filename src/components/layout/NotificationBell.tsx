"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBell } from "@/components/dashboard/DashboardIcons";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: "QUIZ_RESULT" | "BILLING" | "SYSTEM" | "LECTURER_MESSAGE";
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

const TYPE_STYLES: Record<NotificationItem["type"], string> = {
  QUIZ_RESULT: "bg-emerald-50 text-emerald-700",
  BILLING: "bg-brand-50 text-brand-700",
  SYSTEM: "bg-slate-100 text-slate-600",
  LECTURER_MESSAGE: "bg-sky-50 text-sky-700",
};

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function paperHintFromTitle(title: string): string | null {
  const match = title.match(/check-in:\s*([A-Z0-9]+)/i) ?? title.match(/\b([A-Z]{2,4})\b/);
  return match?.[1] ?? null;
}

export function NotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lecturerMessage, setLecturerMessage] = useState<NotificationItem | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return;
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silent fail — bell stays usable on retry.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 60_000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (open) void loadNotifications();
  }, [open, loadNotifications]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all" }),
    });
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    setUnreadCount(0);
  }

  async function handleNotificationClick(notification: NotificationItem) {
    if (!notification.readAt) {
      await markRead(notification.id);
    }
    setOpen(false);

    if (notification.type === "LECTURER_MESSAGE") {
      setLecturerMessage(notification);
      return;
    }

    if (notification.href) {
      router.push(notification.href);
    }
  }

  function closeLecturerModal() {
    setLecturerMessage(null);
  }

  function goToPractice() {
    const href = lecturerMessage?.href && lecturerMessage.href !== "/dashboard"
      ? lecturerMessage.href
      : "/dashboard/quiz";
    setLecturerMessage(null);
    router.push(href);
  }

  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);
  const paperHint = lecturerMessage ? paperHintFromTitle(lecturerMessage.title) : null;

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:h-10 sm:w-10"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          aria-expanded={open}
        >
          <IconBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-gradient-brand px-1 text-[9px] font-bold text-white ring-2 ring-white">
              {badgeLabel}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-float sm:w-80">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-ink-900">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
                <Spinner className="h-4 w-4 text-brand-600" />
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                <p className="font-medium text-slate-700">No notifications yet</p>
                <p className="mt-1 text-xs">Quiz results, billing, and lecturer messages appear here.</p>
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto py-1">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(notification)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                        !notification.readAt && "bg-brand-50/30"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                          TYPE_STYLES[notification.type]
                        )}
                      >
                        {notification.type === "QUIZ_RESULT"
                          ? "✓"
                          : notification.type === "BILLING"
                            ? "£"
                            : notification.type === "LECTURER_MESSAGE"
                              ? "✉"
                              : "i"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-ink-900">{notification.title}</span>
                          {!notification.readAt && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-slate-500">
                          {notification.message}
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(lecturerMessage)}
        onClose={closeLecturerModal}
        title="Lecturer check-in"
        size="md"
      >
        {lecturerMessage && (
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{lecturerMessage.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                From your lecturer
                {paperHint ? ` · ${paperHint}` : ""}
                {" · "}
                {formatRelativeTime(lecturerMessage.createdAt)}
              </p>
            </div>

            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {lecturerMessage.message}
            </p>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={closeLecturerModal} className="w-full sm:w-auto">
                Close
              </Button>
              <Button onClick={goToPractice} className="w-full sm:w-auto">
                Go to practice
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
