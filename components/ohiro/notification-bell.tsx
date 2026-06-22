"use client";

import { useState, useTransition } from "react";
import { Bell, X, Check, CheckCheck, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  type Notification,
} from "@/lib/notification-actions";
import { useRouter } from "next/navigation";

interface NotificationBellProps {
  notifications: Notification[];
}

export function NotificationBell({ notifications }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [localNotifs, setLocalNotifs] = useState<Notification[]>(notifications);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const unread = localNotifs.filter((n) => !n.read).length;

  async function handleMarkRead(id: string) {
    setLocalNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await markNotificationRead(id);
  }

  async function handleDismiss(id: string) {
    setLocalNotifs((prev) => prev.filter((n) => n.id !== id));
    await dismissNotification(id);
  }

  async function handleMarkAllRead() {
    setLocalNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead();
    startTransition(() => router.refresh());
  }

  const overdueNotifs = localNotifs.filter((n) => n.type === "debt_overdue");
  const dueNotifs = localNotifs.filter((n) => n.type === "debt_due");

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        className={cn(
          "relative flex items-center justify-center size-8 rounded-md border transition-colors",
          unread > 0
            ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
            : "border-border/40 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
        )}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center size-4 rounded-full bg-destructive text-[9px] font-mono font-bold text-destructive-foreground leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border/50 bg-card shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Bell className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-mono font-semibold text-foreground">
                  Notifications
                </span>
                {unread > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/20">
                    {unread} new
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="size-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto">
              {localNotifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Check className="size-8 text-muted-foreground/30" />
                  <p className="text-xs font-mono text-muted-foreground">
                    No pending notifications
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {overdueNotifs.length > 0 && (
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] font-mono text-destructive/70 tracking-widest uppercase">
                        Overdue
                      </span>
                    </div>
                  )}
                  {overdueNotifs.map((n) => (
                    <NotifItem
                      key={n.id}
                      notif={n}
                      onRead={handleMarkRead}
                      onDismiss={handleDismiss}
                    />
                  ))}
                  {dueNotifs.length > 0 && (
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] font-mono text-yellow-500/70 tracking-widest uppercase">
                        Due soon
                      </span>
                    </div>
                  )}
                  {dueNotifs.map((n) => (
                    <NotifItem
                      key={n.id}
                      notif={n}
                      onRead={handleMarkRead}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotifItem({
  notif,
  onRead,
  onDismiss,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const isOverdue = notif.type === "debt_overdue";
  return (
    <div
      className={cn(
        "flex gap-2.5 px-3 py-2.5 group transition-colors",
        !notif.read ? "bg-muted/20" : ""
      )}
      onClick={() => !notif.read && onRead(notif.id)}
      role={!notif.read ? "button" : undefined}
      tabIndex={!notif.read ? 0 : undefined}
      onKeyDown={(e) => e.key === "Enter" && !notif.read && onRead(notif.id)}
    >
      <div
        className={cn(
          "flex items-center justify-center size-7 rounded-md shrink-0 mt-0.5 border",
          isOverdue
            ? "bg-destructive/10 border-destructive/25 text-destructive"
            : "bg-yellow-500/10 border-yellow-500/25 text-yellow-500"
        )}
      >
        {isOverdue ? (
          <AlertTriangle className="size-3.5" />
        ) : (
          <Clock className="size-3.5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p
            className={cn(
              "text-[11px] font-mono font-semibold leading-tight truncate",
              !notif.read ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {notif.title}
          </p>
          {!notif.read && (
            <span className="size-1.5 rounded-full bg-primary shrink-0 mt-1" />
          )}
        </div>
        <p className="text-[10px] font-mono text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
          {notif.message}
        </p>
        <p className="text-[10px] font-mono text-muted-foreground/50 mt-1">
          {new Date(notif.createdAt).toLocaleDateString("en-US", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notif.id);
        }}
        aria-label="Dismiss notification"
        className="opacity-0 group-hover:opacity-100 flex items-center justify-center size-5 rounded hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground transition-all shrink-0 mt-0.5"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
