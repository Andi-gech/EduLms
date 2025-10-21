import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { NotificationDoc } from "@/types/domain";
import { useNotifications, useMarkNotificationReadMutation } from '@/hooks/useApiData';

function relativeTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

export default function NotificationsPage() {
  const { data: liveNotifications, isLoading } = useNotifications();
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const markMutation = useMarkNotificationReadMutation();
  useEffect(() => {
    if (liveNotifications) setNotifications(liveNotifications);
  }, [liveNotifications]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const filtered = useMemo(() => notifications.filter(n => filter === "all" || !n.isRead), [notifications, filter]);

  const markAllRead = () => {
    setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
  notifications.filter(n => !n.isRead).forEach(n => markMutation.mutate({ id: n._id }));
  };
  const clearAll = () => setNotifications([]);
  const toggleRead = (id: string) => {
    setNotifications(ns => ns.map(n => n._id === id ? { ...n, isRead: !n.isRead } : n));
  markMutation.mutate({ id });
  };

  const typeBadge = (t: NotificationDoc["type"]) => {
    switch (t) {
      case "success": return <Badge variant="secondary" className="bg-green-500/90 text-white border-green-500">Success</Badge>;
      case "warning": return <Badge variant="secondary" className="bg-yellow-400 text-black">Warning</Badge>;
      case "error": return <Badge variant="destructive">Error</Badge>;
      case "info":
      default: return <Badge variant="outline" className="text-xs">Info</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Stay updated with recent activity.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
          <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>Unread</Button>
          <Separator orientation="vertical" className="h-8" />
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={!notifications.some(n => !n.isRead)}>Mark all read</Button>
          <Button variant="destructive" size="sm" onClick={clearAll} disabled={notifications.length === 0}>Clear</Button>
        </div>
      </div>

      <Card className="shadow-none border-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Inbox</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : (filtered.length === 0 ? "No notifications to show." : `${filtered.length} notification${filtered.length !== 1 ? "s" : ""}`)}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Nothing here yet.</div>
          ) : (
            <ul className="divide-y">
              {filtered.map(n => {
                const unread = !n.isRead;
                return (
                  <li key={n._id} className="py-3 flex gap-4 items-start group cursor-pointer" onClick={() => toggleRead(n._id)}>
                    <div className="flex flex-col items-center gap-2 w-3">
                      {unread && <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-background" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm leading-snug ${unread ? "font-semibold" : ""}`}>{n.description}</p>
                        {typeBadge(n.type)}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex gap-2 items-center">
                        <time dateTime={n.date}>{relativeTime(n.date)}</time>
                        {!n.isRead && <span className="text-blue-600">• Unread</span>}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition text-[10px] text-muted-foreground pr-2">
                      {n.isRead ? "Mark unread" : "Mark read"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
