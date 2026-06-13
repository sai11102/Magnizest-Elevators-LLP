"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, type ServiceSchedule } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getCustomerIds, getSiteIds, getLiftIds, getAmcIds, getExistingServiceDates } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Pencil, Wrench, Clock, CircleCheck as CheckCircle2, OctagonAlert as AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

type ServiceWithInfo = ServiceSchedule & { amcNumber: string; siteName: string; customerName: string };

export function ServicePage() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceWithInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithInfo | null>(null);
  const [amcOptions, setAmcOptions] = useState<{ id: string; amc_number: string; siteName: string }[]>([]);
  const [form, setForm] = useState({
  amc_contract_id: "",
  start_date: "",
  end_date: "",
  frequency: "30",
  remarks: ""
});
  const [saving, setSaving] = useState(false);
  const fetchServices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const customerIds = await getCustomerIds(user.id);
    const siteIds = await getSiteIds(customerIds);
    const liftIds = await getLiftIds(siteIds);
    const amcIds = await getAmcIds(liftIds);
    if (amcIds.length === 0) { setServices([]); setAmcOptions([]); setLoading(false); return; }

    const { data: svcData } = await supabase.from("service_schedules").select("*").in("amc_contract_id", amcIds).order("service_date", { ascending: true });
    const { data: amcData } = await supabase.from("amc_contracts").select("id, amc_number, lift_id").in("id", amcIds);

    const liftIdsFromAmc = Array.from(new Set((amcData || []).map((a: any) => a.lift_id)));
    const { data: liftsData } = liftIdsFromAmc.length > 0 ? await supabase.from("lifts").select("id, site_id").in("id", liftIdsFromAmc) : { data: [] as any[] };
    const siteIdsFromLifts = Array.from(new Set((liftsData || []).map((l: any) => l.site_id)));
    const { data: sitesData } = siteIdsFromLifts.length > 0 ? await supabase.from("sites").select("id, site_name, customer_id").in("id", siteIdsFromLifts) : { data: [] as any[] };
    const customerIdsFromSites = Array.from(new Set((sitesData || []).map((s: any) => s.customer_id)));
    const { data: customersData } = customerIdsFromSites.length > 0 ? await supabase.from("customers").select("id, name").in("id", customerIdsFromSites) : { data: [] as any[] };

    const customerMap = new Map((customersData || []).map((c: any) => [c.id, c]));
    const siteMap = new Map((sitesData || []).map((s: any) => [s.id, { ...s, customer: customerMap.get(s.customer_id) }]));
    const liftMap = new Map((liftsData || []).map((l: any) => [l.id, siteMap.get(l.site_id)]));
    const amcMap = new Map((amcData || []).map((a: any) => [a.id, { ...a, site: liftMap.get(a.lift_id) }]));

    setAmcOptions((amcData || []).map((a: any) => ({ id: a.id, amc_number: a.amc_number, siteName: amcMap.get(a.id)?.site?.site_name || "Unknown" })));
    setServices((svcData || []).map((svc: any) => {
      const info = amcMap.get(svc.amc_contract_id);
      return { ...svc, amcNumber: info?.amc_number || "Unknown", siteName: info?.site?.site_name || "Unknown", customerName: info?.site?.customer?.name || "Unknown" };
    }));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

const today = new Date();
today.setHours(0, 0, 0, 0);

const upcoming = services.filter((s) => {
  const serviceDate = new Date(s.service_date);
  serviceDate.setHours(0, 0, 0, 0);

  return (
    s.status !== "completed" &&
    serviceDate >= today
  );
});

const completed = services.filter(
  (s) => s.status === "completed"
);

const missed = services.filter((s) => {
  const serviceDate = new Date(s.service_date);
  serviceDate.setHours(0, 0, 0, 0);

  return (
    s.status !== "completed" &&
    serviceDate < today
  );
});
  const filteredBySearch = (list: ServiceWithInfo[]) => list.filter((s) => { const q = search.toLowerCase(); return s.amcNumber.toLowerCase().includes(q) || s.siteName.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q) || (s.remarks || "").toLowerCase().includes(q); });

 const openAdd = () => {
  setEditingService(null);
  setForm({
    amc_contract_id: "",
    start_date: "",
    end_date: "",
    frequency: "30",
    remarks: ""
  });
  setDialogOpen(true);
};
   const openEdit = (s: ServiceWithInfo) => {
      setEditingService(s);
      setForm({
        amc_contract_id: s.amc_contract_id,
        start_date: s.service_date,
        end_date: s.service_date,
        frequency: "30",
        remarks: s.remarks || ""
      });
      setDialogOpen(true);
    };
  const deleteService = async (id: string) => {
    const { error } = await supabase.from("service_schedules").delete().eq("id", id);
    if (error) { toast.error((error as any).message || "Failed to delete service"); return; }
    // remove related notifications
    if (user) await supabase.from("notifications").delete().eq("type", "service_due").eq("reference_id", id).eq("user_id", user.id);
    toast.success("Service deleted");
    fetchServices();
  };
  const save = async () => {
    if (!form.amc_contract_id || !form.start_date || !form.end_date) {
      toast.error("AMC, Start Date and End Date are required");
      return;
    }

    if (new Date(form.end_date) <= new Date(form.start_date)) {
      toast.error("End date must be after start date");
      return;
    }
    if (editingService) {
      setSaving(true);
      const { error } = await supabase.from("service_schedules").update({ service_date: form.start_date, remarks: form.remarks || null }).eq("id", editingService.id);
      setSaving(false);
      if (error) { toast.error((error as any).message || "Failed to update service"); return; }
      toast.success("Service updated");
    } else {
      const schedules = [];

let current = new Date(form.start_date);
const end = new Date(form.end_date);

while (current <= end) {

  schedules.push({
    amc_contract_id: form.amc_contract_id,
    service_date: current
      .toISOString()
      .split("T")[0],
    remarks: form.remarks || null,
    status: "upcoming"
  });

  current.setDate(
    current.getDate() +
    Number(form.frequency)
  );
}
      // prevent duplicates by checking existing dates
      setSaving(true);
      const existing = await getExistingServiceDates(form.amc_contract_id, form.start_date, form.end_date);
      const existingSet = new Set(existing);
      const filtered = schedules.filter((s) => !existingSet.has(s.service_date));
      if (filtered.length === 0) {
        setSaving(false);
        toast.error("No new schedules to create (all dates already exist)");
        return;
      }

      const { error } = await supabase.from("service_schedules").insert(filtered);
      setSaving(false);
      if (error) { toast.error((error as any).message || "Failed to create schedules"); return; }

      toast.success("Schedules Generated");
    }
    setDialogOpen(false); fetchServices();
  };

  const statusIcon = (s: string) => s === "completed" ? <CheckCircle2 className="h-4 w-4 text-success" /> : s === "missed" ? <AlertOctagon className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-warning" />;
  const statusBadge = (s: string) => s === "completed" ? "bg-success/10 text-success border-success/20" : s === "missed" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-warning/10 text-warning border-warning/20";

  const renderList = (items: ServiceWithInfo[]) => {
    const filtered = filteredBySearch(items);
    if (filtered.length === 0) return <div className="py-12 text-center"><p className="text-muted-foreground">No services found</p></div>;
    return <div className="space-y-3">{filtered.map((s) => (
      <Card key={s.id} className="border-0 shadow-sm">
        <CardContent className="flex items-center gap-4 p-4">
          {statusIcon(s.status)}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{format(parseISO(s.service_date), "dd MMM yyyy")}</span>
              <Badge variant="outline" className={statusBadge(s.status !== "completed" && new Date(s.service_date) < today ? "missed" : s.status)}>{s.status !== "completed" && new Date(s.service_date) < today ? "missed" : s.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{s.siteName} &bull; {s.amcNumber} &bull; {s.customerName}</p>
            {s.remarks && <p className="mt-1 text-xs text-muted-foreground">Note: {s.remarks}</p>}
          </div>
          {s.status !== "completed" && (
  <Button
    size="sm"
    variant="outline"
    onClick={async () => {
      setSaving(true);
      await supabase
        .from("service_schedules")
        .update({ status: "completed" })
        .eq("id", s.id);
      // remove related notifications for this schedule
      if (user) await supabase.from("notifications").delete().eq("type", "service_due").eq("reference_id", s.id).eq("user_id", user.id);
      setSaving(false);

      toast.success("Service completed");
      fetchServices();
    }}
    disabled={saving}
  >
    Complete
  </Button>
)}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Service</AlertDialogTitle>
                <AlertDialogDescription>Delete this service schedule? This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteService(s.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>


          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
        </CardContent>
      </Card>
    ))}</div>;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Service Schedules</h1><p className="text-sm text-muted-foreground">Manage lift service schedules</p></div>
        <Button onClick={openAdd} className="shrink-0"><Plus className="mr-2 h-4 w-4" /> Schedule Service</Button>
      </div>
      <div className="relative mb-6"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by AMC, site, customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div>
      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div> : (
        <Tabs defaultValue="upcoming">
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Completed ({completed.length})</TabsTrigger>
            <TabsTrigger value="missed" className="gap-1.5"><AlertOctagon className="h-3.5 w-3.5" /> Missed ({missed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">{renderList(upcoming)}</TabsContent>
          <TabsContent value="completed">{renderList(completed)}</TabsContent>
          <TabsContent value="missed">{renderList(missed)}</TabsContent>
        </Tabs>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingService ? "Edit Service" : "Schedule Service"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>AMC Contract *</Label><Select value={form.amc_contract_id} onValueChange={(v) => setForm({ ...form, amc_contract_id: v })} disabled={!!editingService}><SelectTrigger><SelectValue placeholder="Select AMC contract" /></SelectTrigger><SelectContent>{amcOptions.map((a) => <SelectItem key={a.id} value={a.id}>{a.amc_number} - {a.siteName}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2">
  <Label>Start Date *</Label>

  <Input
    type="date"
    value={form.start_date}
    onChange={(e) =>
      setForm({
        ...form,
        start_date: e.target.value
      })
    }
  />
</div>

<div className="space-y-2">
  <Label>End Date *</Label>

  <Input
    type="date"
    value={form.end_date}
    onChange={(e) =>
      setForm({
        ...form,
        end_date: e.target.value
      })
    }
  />
</div>

<div className="space-y-2">
  <Label>Frequency *</Label>

  <Select
    value={form.frequency}
    onValueChange={(v) =>
      setForm({
        ...form,
        frequency: v
      })
    }
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>

    <SelectContent>
      <SelectItem value="30">
        30 Days
      </SelectItem>

      <SelectItem value="45">
        45 Days
      </SelectItem>

      <SelectItem value="60">
        60 Days
      </SelectItem>

      <SelectItem value="90">
        90 Days
      </SelectItem>
    </SelectContent>
  </Select>
</div>
            <div className="space-y-2"><Label>Remarks</Label><Input placeholder="Notes about this service" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={save}>{editingService ? "Update" : "Schedule"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
