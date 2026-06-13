"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, type Notification } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, X, TriangleAlert as AlertTriangle, Clock, CircleCheck as CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export function NotificationPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const active = notifications.filter((n) => !n.dismissed);
  const dismissed = notifications.filter((n) => n.dismissed);
  const amcNotifs = active.filter((n) => n.type === "amc_expiry");
  const svcNotifs = active.filter((n) => n.type === "service_due");

  const dismissNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, dismissed: true } : n));
    toast.success("Notification dismissed");
  };

  const dismissAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().in("id", active.map((n) => n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, dismissed: true })));
    toast.success("All notifications dismissed");
  };

  const severityColor = (s: string) => s === "critical" ? "border-l-destructive bg-destructive/5" : s === "upcoming" ? "border-l-warning bg-warning/5" : "border-l-success bg-success/5";
  const severityBadge = (s: string) => s === "critical" ? "bg-destructive text-white" : s === "upcoming" ? "bg-warning text-white" : "bg-success text-white";

  const renderNotification = (n: Notification) => (
    <Card key={n.id} className={cn("border-l-4 border-0 shadow-sm", severityColor(n.severity))}>
      <CardContent className="flex items-start gap-3 p-4">
        <Badge className={cn("mt-0.5 shrink-0 text-[10px]", severityBadge(n.severity))}>{n.severity.toUpperCase()}</Badge>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{n.title}</p>
          <p className="text-xs text-muted-foreground">{n.message}</p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">{format(parseISO(n.created_at), "dd MMM yyyy, hh:mm a")}</p>
        </div>
        {!n.dismissed && <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => dismissNotification(n.id)}><X className="h-3.5 w-3.5" /></Button>}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Notifications</h1><p className="text-sm text-muted-foreground">AMC expiry and service due alerts</p></div>
        {active.length > 0 && <Button variant="outline" size="sm" onClick={dismissAll}><CheckCircle2 className="mr-2 h-4 w-4" /> Dismiss All</Button>}
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      : active.length === 0 && dismissed.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center"><Bell className="mb-3 h-12 w-12 text-muted-foreground/30" /><p className="text-lg font-medium text-muted-foreground">No notifications</p><p className="text-sm text-muted-foreground/70">Notifications appear when AMC contracts expire or services are due</p></div>
      : (
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> All ({active.length})</TabsTrigger>
            <TabsTrigger value="amc" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> AMC ({amcNotifs.length})</TabsTrigger>
            <TabsTrigger value="service" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Services ({svcNotifs.length})</TabsTrigger>
            <TabsTrigger value="dismissed" className="gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Dismissed ({dismissed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all"><div className="space-y-2">{active.length === 0 ? <p className="py-8 text-center text-muted-foreground">No active notifications</p> : active.map(renderNotification)}</div></TabsContent>
          <TabsContent value="amc"><div className="space-y-2">{amcNotifs.length === 0 ? <p className="py-8 text-center text-muted-foreground">No AMC notifications</p> : amcNotifs.map(renderNotification)}</div></TabsContent>
          <TabsContent value="service"><div className="space-y-2">{svcNotifs.length === 0 ? <p className="py-8 text-center text-muted-foreground">No service notifications</p> : svcNotifs.map(renderNotification)}</div></TabsContent>
          <TabsContent value="dismissed"><div className="space-y-2">{dismissed.length === 0 ? <p className="py-8 text-center text-muted-foreground">No dismissed notifications</p> : dismissed.map(renderNotification)}</div></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
