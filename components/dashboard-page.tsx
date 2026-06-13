"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Notification } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getCustomerIds, getSiteIds, getLiftIds, getAmcIds } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Building2, FileCheck, TriangleAlert as AlertTriangle, Clock, Wrench, X, Bell } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { differenceInDays, isBefore, format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";

type Stats = {
  totalCustomers: number;
  totalSites: number;
  totalLifts: number;
  totalAmc: number;
  activeAmc: number;
  expiringAmc: number;
  expiredAmc: number;
  upcomingServices: number;
  overdueServices: number;
  completedServices: number;
  missedServices: number;
};

type MonthlyActivity = {
  month: string;
  completed: number;
  upcoming: number;
  missed: number;
};

export function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalSites: 0,
    totalLifts: 0,
    totalAmc: 0,
    activeAmc: 0,
    expiringAmc: 0,
    expiredAmc: 0,
    upcomingServices: 0,
    overdueServices: 0,
    completedServices: 0,
    missedServices: 0,
  });
  const [chartData, setChartData] = useState<MonthlyActivity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const customerIds = await getCustomerIds(user.id);
    const siteIds = await getSiteIds(customerIds);
    const liftIds = await getLiftIds(siteIds);
    const amcIds = await getAmcIds(liftIds);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [customersRes, amcRes, svcRes, notifRes] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact" }).eq("user_id", user.id),
      amcIds.length > 0 ? supabase.from("amc_contracts").select("id, amc_number, amc_end_date, lift_id").in("id", amcIds) : { data: [] as any[] },
      amcIds.length > 0 ? supabase.from("service_schedules").select("id, service_date, status, amc_contract_id").in("amc_contract_id", amcIds) : { data: [] as any[] },
      supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    const amcData = amcRes.data || [];
    const svcData = svcRes.data || [];
    const liftsRes = await supabase.from("lifts").select("id").in("site_id", siteIds);
    const totalLifts = (liftsRes.data || []).length;
    const activeAmc = amcData.filter((a: any) => !isBefore(new Date(a.amc_end_date), today)).length;
    const expiringAmc = amcData.filter((a: any) => {
      const d = differenceInDays(new Date(a.amc_end_date), today);
      return d >= 0 && d <= 30;
    }).length;
    const expiredAmc = amcData.length - activeAmc;
    const upcomingServices = svcData.filter(
      (s: any) => s.status === "upcoming" && differenceInDays(new Date(s.service_date), today) >= 0 && differenceInDays(new Date(s.service_date), today) <= 7
    ).length;
    const completedServices = svcData.filter((s: any) => s.status === "completed").length;
    const missedServices = svcData.filter(
      (s: any) => s.status === "missed" || (s.status === "upcoming" && isBefore(new Date(s.service_date), today))
    ).length;
    const overdueServices = missedServices;

    const monthly = Array.from({ length: 6 }, (_, index) => {
      const monthDate = subMonths(today, 5 - index);
      const startMonth = startOfMonth(monthDate);
      const endMonth = endOfMonth(monthDate);
      return {
        month: format(monthDate, "MMM"),
        completed: svcData.filter(
          (s: any) => s.status === "completed" && isWithinInterval(new Date(s.service_date), { start: startMonth, end: endMonth })
        ).length,
        upcoming: svcData.filter(
          (s: any) => s.status === "upcoming" && isWithinInterval(new Date(s.service_date), { start: startMonth, end: endMonth })
        ).length,
        missed: svcData.filter(
          (s: any) =>
            (s.status === "missed" || (s.status === "upcoming" && isBefore(new Date(s.service_date), today))) &&
            isWithinInterval(new Date(s.service_date), { start: startMonth, end: endMonth })
        ).length,
      };
    });

    setStats({
      totalCustomers: customersRes.count || 0,
      totalSites: siteIds.length,
      totalLifts,
      totalAmc: amcData.length,
      activeAmc,
      expiringAmc,
      expiredAmc,
      upcomingServices,
      overdueServices,
      completedServices,
      missedServices,
    });
    setChartData(monthly);
    setNotifications(notifRes.data || []);

    await generateNotifications(amcData, svcData, amcIds, liftIds);
    setLoading(false);
  }, [user]);

  const generateNotifications = useCallback(async (amcData: any[], svcData: any[], amcIds: string[], liftIds: string[]) => {
    if (!user || amcIds.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: liftsData } = await supabase
      .from("lifts")
      .select("id, site_id, sites(id, site_name, customers(name))")
      .in("id", liftIds);
    const { data: amcLifts } = await supabase.from("amc_contracts").select("id, lift_id").in("id", amcIds);
    const liftMap = new Map((liftsData || []).map((l: any) => [l.id, l]));

    const { data: existing } = await supabase
      .from("notifications")
      .select("reference_id, type")
      .eq("user_id", user.id)
      .eq("dismissed", false);
    const existingKeys = new Set((existing || []).map((n: any) => `${n.type}:${n.reference_id}`));
    const toInsert: any[] = [];

    for (const amc of amcData) {
      const amcLift = (amcLifts || []).find((a: any) => a.id === amc.id);
      const lift = amcLift ? liftMap.get(amcLift.lift_id) : null;
      const siteName = lift?.sites?.site_name || "Unknown Site";
      const customerName = lift?.sites?.customers?.name || "Unknown";
      const daysLeft = differenceInDays(new Date(amc.amc_end_date), today);
      let message = "";
      let severity: "critical" | "upcoming" | "active" = "active";

      if (daysLeft < 0) {
        message = `AMC ${amc.amc_number} EXPIRED (${siteName} - ${customerName})`;
        severity = "critical";
      } else if (daysLeft === 0) {
        message = `AMC ${amc.amc_number} expires TODAY (${siteName} - ${customerName})`;
        severity = "critical";
      } else if (daysLeft <= 3) {
        message = `AMC ${amc.amc_number} expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""} (${siteName} - ${customerName})`;
        severity = "critical";
      } else if (daysLeft <= 7) {
        message = `AMC ${amc.amc_number} expires in ${daysLeft} days (${siteName} - ${customerName})`;
        severity = "upcoming";
      } else if (daysLeft <= 30) {
        message = `AMC ${amc.amc_number} expires in ${daysLeft} days (${siteName} - ${customerName})`;
        severity = "active";
      }

      if (message && !existingKeys.has(`amc_expiry:${amc.id}`)) {
        toInsert.push({
          user_id: user.id,
          type: "amc_expiry",
          reference_id: amc.id,
          title: "AMC Expiry Alert",
          message,
          severity,
        });
      }
    }

    for (const svc of svcData) {
      if (svc.status === "completed") continue;
      const amc = (amcLifts || []).find((a: any) => a.id === svc.amc_contract_id);
      const lift = amc ? liftMap.get(amc.lift_id) : null;
      const siteName = lift?.sites?.site_name || "Unknown Site";
      const customerName = lift?.sites?.customers?.name || "Unknown";
      const amcNum = amcData.find((a: any) => a.id === svc.amc_contract_id)?.amc_number || "Unknown";
      const daysLeft = differenceInDays(new Date(svc.service_date), today);
      let message = "";
      let severity: "critical" | "upcoming" | "active" = "active";

      if (daysLeft < 0 || svc.status === "missed") {
        message = `Service OVERDUE for AMC ${amcNum} (${siteName} - ${customerName})`;
        severity = "critical";
      } else if (daysLeft === 0) {
        message = `Service due TODAY for AMC ${amcNum} (${siteName} - ${customerName})`;
        severity = "critical";
      } else if (daysLeft === 1) {
        message = `Service due TOMORROW for AMC ${amcNum} (${siteName} - ${customerName})`;
        severity = "critical";
      } else if (daysLeft <= 3) {
        message = `Service due in ${daysLeft} days for AMC ${amcNum} (${siteName} - ${customerName})`;
        severity = "upcoming";
      } else if (daysLeft <= 7) {
        message = `Service due in ${daysLeft} days for AMC ${amcNum} (${siteName} - ${customerName})`;
        severity = "active";
      }

      const key = `service_due:${svc.id}`;
      if (message && !existingKeys.has(key)) {
        toInsert.push({
          user_id: user.id,
          type: "service_due",
          reference_id: svc.id,
          title: "Service Due Alert",
          message,
          severity,
        });
      }
    }

    if (toInsert.length > 0) {
      await supabase.from("notifications").insert(toInsert);
      const { data: refreshed } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setNotifications(refreshed || []);
    }
  }, [user]);

  const dismissNotification = async (id: string) => {
    await supabase.from("notifications").update({ dismissed: true }).eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const severityColor = (s: string) =>
    s === "critical"
      ? "border-l-destructive bg-destructive/10"
      : s === "upcoming"
      ? "border-l-warning bg-warning/10"
      : "border-l-success bg-success/10";

  const severityBadge = (s: string) =>
    s === "critical"
      ? "bg-destructive text-white"
      : s === "upcoming"
      ? "bg-warning text-white"
      : "bg-success text-white";

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const serviceData = [
    { name: "Completed", value: stats.completedServices, color: "#22c55e" },
    { name: "Upcoming", value: stats.upcomingServices, color: "#fb923c" },
    { name: "Missed", value: stats.missedServices, color: "#f87171" },
  ];

  const expiryData = [
    { name: "Active", value: Math.max(stats.activeAmc - stats.expiringAmc, 0), color: "#38bdf8" },
    { name: "Expiring", value: stats.expiringAmc, color: "#f59e0b" },
    { name: "Expired", value: Math.max(stats.totalAmc - stats.activeAmc, 0), color: "#f87171" },
  ];

  const statCards = [
    { label: "Total Customers", value: stats.totalCustomers, icon: Users, color: "text-sky-300", bg: "bg-sky-950/40", href: "/customers" },
    { label: "Total Sites", value: stats.totalSites, icon: Building2, color: "text-emerald-300", bg: "bg-emerald-950/40", href: "/sites" },
    { label: "Total Lifts", value: stats.totalLifts, icon: FileCheck, color: "text-cyan-300", bg: "bg-cyan-950/40", href: "/sites" },
    { label: "Active AMC", value: stats.activeAmc, icon: FileCheck, color: "text-green-300", bg: "bg-green-950/40", href: "/sites" },
    { label: "Expiring AMC", value: stats.expiringAmc, icon: AlertTriangle, color: "text-amber-300", bg: "bg-amber-950/30", href: "/sites" },
    { label: "Overdue Services", value: stats.overdueServices, icon: Wrench, color: "text-red-300", bg: "bg-red-950/30", href: "/services" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glass shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.32em] text-sky-300">Welcome back</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Welcome to Magnizest Elevators LLP AMC Management System</h1>
            <p className="mt-4 text-slate-300">
              Manage AMC contracts, track service schedules, and keep every site operating safely with our modern elevator lifecycle dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {statCards.map((s) => (
              <Card key={s.label} className="cursor-pointer border border-white/10 bg-slate-950/80 shadow-glass shadow-slate-950/15 transition hover:-translate-y-0.5 hover:shadow-xl" onClick={() => router.push(s.href)}>
                <CardContent className="p-5">
                  <div className={cn("mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl", s.bg)}>
                    <s.icon className={cn("h-5 w-5", s.color)} />
                  </div>
                  <p className="text-3xl font-semibold text-white">{s.value}</p>
                  <p className="mt-2 text-sm text-slate-400">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border border-white/10 bg-white/5 shadow-glass shadow-slate-950/15">
              <CardHeader className="space-y-2 p-6">
                <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
                <CardDescription className="text-slate-400">Jump directly to the most used workflows.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 p-6">
                {[
                  { label: "Add Customer", href: "/customers", description: "Register a new customer", icon: Users, color: "text-sky-300" },
                  { label: "Add Site", href: "/sites", description: "Register a new site & lift", icon: Building2, color: "text-emerald-300" },
                  { label: "Add Service Schedule", href: "/services", description: "Create the next planned visit", icon: Wrench, color: "text-orange-300" },
                  { label: "View Notifications", href: "/notifications", description: "Review alerts and updates", icon: Bell, color: "text-amber-300" },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <button key={action.label} onClick={() => router.push(action.href)} className="group rounded-3xl border border-white/10 bg-slate-950/80 p-4 text-left transition hover:border-sky-300 hover:bg-slate-900/80">
                      <div className="flex items-center gap-3">
                        <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/80", action.color)}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-semibold text-white">{action.label}</p>
                          <p className="text-sm text-slate-400">{action.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="grid gap-6">
          <Card className="border border-white/10 bg-white/5 shadow-glass shadow-slate-950/15">
            <CardHeader className="space-y-2 p-6">
              <CardTitle className="text-lg text-white">Service Status Distribution</CardTitle>
              <CardDescription className="text-slate-400">Visualize completed, upcoming, and missed work across your service pipeline.</CardDescription>
            </CardHeader>
            <CardContent className="h-72 p-6">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={serviceData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                    {serviceData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}`, "Services"]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/5 shadow-glass shadow-slate-950/15">
            <CardHeader className="space-y-2 p-6">
              <CardTitle className="text-lg text-white">Monthly Service Activity</CardTitle>
              <CardDescription className="text-slate-400">See monthly service volume and trends for your active AMCs.</CardDescription>
            </CardHeader>
            <CardContent className="h-72 p-4">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                  <XAxis dataKey="month" tick={{ fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                  <Bar dataKey="completed" stackId="a" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="upcoming" stackId="a" fill="#fb923c" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="missed" stackId="a" fill="#f87171" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-white/10 bg-white/5 shadow-glass shadow-slate-950/15">
          <CardHeader className="space-y-2 p-6">
            <CardTitle className="text-lg text-white">AMC Expiry Overview</CardTitle>
            <CardDescription className="text-slate-400">Track active contracts, contracts nearing expiry, and expired coverage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={expiryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={4}>
                    {expiryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}`, "Contracts"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3 text-sm text-slate-300">
              <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                <p className="font-medium">Active AMC Contracts</p>
                <p className="text-slate-400">{stats.activeAmc}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                <p className="font-medium">Expiring Soon</p>
                <p className="text-slate-400">{stats.expiringAmc}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                <p className="font-medium">Expired Contracts</p>
                <p className="text-slate-400">{stats.expiredAmc}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {notifications.length > 0 && (
        <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glass shadow-slate-950/20 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2 text-slate-100">
            <Bell className="h-5 w-5 text-sky-300" />
            <h2 className="text-lg font-semibold">Notifications</h2>
            <Badge className="bg-slate-800 text-slate-200">{notifications.length}</Badge>
          </div>
          <ScrollArea className="max-h-72">
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className={cn("rounded-3xl border border-white/10 p-4", severityColor(n.severity))}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{n.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{n.message}</p>
                    </div>
                    <button onClick={() => dismissNotification(n.id)} className="rounded-full bg-slate-950/90 p-2 text-slate-400 transition hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className={cn("mt-4 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]", severityBadge(n.severity))}>
                    {n.severity}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
