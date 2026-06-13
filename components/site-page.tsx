"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, type Customer, type SiteWithDetails, LIFT_CAPACITIES, LIFT_TYPES, DOOR_TYPES } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getCustomerIds, getSiteIds, getMapsUrl, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Pencil, Trash2, MapPin, Building2, ChevronDown, ChevronUp, Phone, Mail, Calendar, FileCheck, Wrench, Locate } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, format, parseISO } from "date-fns";

type SiteForm = { customer_id: string; site_name: string; site_address: string; latitude: string; longitude: string; number_of_floors: string; lift_capacity: string; lift_type: string; door_type: string; amc_number: string; amc_start_date: string; amc_end_date: string; handover_date: string; };
const emptyForm: SiteForm = { customer_id: "", site_name: "", site_address: "", latitude: "", longitude: "", number_of_floors: "", lift_capacity: "", lift_type: "", door_type: "", amc_number: "", amc_start_date: "", amc_end_date: "", handover_date: "" };

export function SitePage() {
  const { user } = useAuth();
  const [sites, setSites] = useState<SiteWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [form, setForm] = useState<SiteForm>(emptyForm);
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((f) => ({ ...f, latitude: pos.coords.latitude.toString(), longitude: pos.coords.longitude.toString() })); setLocating(false); toast.success("Location captured"); },
      () => { setLocating(false); toast.error("Could not get location"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchSites = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const customerIds = await getCustomerIds(user.id);
    if (customerIds.length === 0) { setSites([]); setLoading(false); return; }
    const siteIds = await getSiteIds(customerIds);
    if (siteIds.length === 0) { setSites([]); setLoading(false); return; }

    const { data: siteData } = await supabase.from("sites").select("*").in("id", siteIds).order("created_at", { ascending: false });
    const { data: customersData } = await supabase.from("customers").select("*").in("id", customerIds);
    const customerMap = new Map((customersData || []).map((c: any) => [c.id, c]));
    const { data: liftsData } = await supabase.from("lifts").select("*").in("site_id", siteIds);

    const liftIds = Array.from(new Set((liftsData || []).map((l: any) => l.id)));
    let amcData: any[] = [];
    if (liftIds.length > 0) { const { data } = await supabase.from("amc_contracts").select("*").in("lift_id", liftIds); amcData = data || []; }
    const amcIds = amcData.map((a: any) => a.id);
    let serviceData: any[] = [];
    if (amcIds.length > 0) { const { data } = await supabase.from("service_schedules").select("*").in("amc_contract_id", amcIds); serviceData = data || []; }

    const result: SiteWithDetails[] = (siteData || []).map((site: any) => {
      const siteLifts = (liftsData || []).filter((l: any) => l.site_id === site.id);
      const lifts = siteLifts.map((lift: any) => {
        const liftAmcs = amcData.filter((a: any) => a.lift_id === lift.id);
        const amc_contracts = liftAmcs.map((amc: any) => ({ ...amc, service_schedules: serviceData.filter((s: any) => s.amc_contract_id === amc.id) }));
        return { ...lift, amc_contracts };
      });
      return { ...site, customers: customerMap.get(site.customer_id) as Customer, lifts };
    });
    setSites(result); setLoading(false);
  }, [user]);

  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("customers").select("*").eq("user_id", user.id).order("name");
    setCustomers(data || []);
  }, [user]);

  useEffect(() => { fetchSites(); fetchCustomers(); }, [fetchSites, fetchCustomers]);

  const filtered = sites.filter((s) => {
    const q = search.toLowerCase();
    return s.site_name.toLowerCase().includes(q) || s.customers?.name.toLowerCase().includes(q) || s.customers?.mobile.includes(search) || (s.site_address || "").toLowerCase().includes(q) || s.lifts?.some((l) => l.lift_id.toLowerCase().includes(q) || l.lift_type.toLowerCase().includes(q)) || s.lifts?.some((l) => l.amc_contracts?.some((a) => a.amc_number.toLowerCase().includes(q)));
  });

  const openAdd = () => { setEditingSiteId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (site: SiteWithDetails) => {
    setEditingSiteId(site.id);
    const lift = site.lifts?.[0]; const amc = lift?.amc_contracts?.[0];
    setForm({ customer_id: site.customer_id, site_name: site.site_name, site_address: site.site_address || "", latitude: site.latitude?.toString() || "", longitude: site.longitude?.toString() || "", number_of_floors: lift?.number_of_floors || "", lift_capacity: lift?.lift_capacity || "", lift_type: lift?.lift_type || "", door_type: lift?.door_type || "", amc_number: amc?.amc_number || "", amc_start_date: amc?.amc_start_date || "", amc_end_date: amc?.amc_end_date || "", handover_date: amc?.handover_date || "" });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.customer_id || !form.site_name) { toast.error("Customer and site name are required"); return; }
    try {
      if (editingSiteId) {
        const { error: siteErr } = await supabase.from("sites").update({ site_name: form.site_name, site_address: form.site_address || null, latitude: form.latitude ? parseFloat(form.latitude) : null, longitude: form.longitude ? parseFloat(form.longitude) : null }).eq("id", editingSiteId);
        if (siteErr) throw siteErr;
        const site = sites.find((s) => s.id === editingSiteId);
        const lift = site?.lifts?.[0]; const amc = lift?.amc_contracts?.[0];
        if (lift && form.number_of_floors) {
          const { error } = await supabase.from("lifts").update({ number_of_floors: form.number_of_floors, lift_capacity: form.lift_capacity, lift_type: form.lift_type, door_type: form.door_type }).eq("id", lift.id);
          if (error) throw error;
        }
        if (amc && form.amc_number) {
          const { error } = await supabase.from("amc_contracts").update({ amc_number: form.amc_number, amc_start_date: form.amc_start_date || null, amc_end_date: form.amc_end_date || null, handover_date: form.handover_date || null }).eq("id", amc.id);
          if (error) throw error;
        }
        toast.success("Site updated");
      } else {
        const { data: siteData, error: siteErr } = await supabase.from("sites").insert({ customer_id: form.customer_id, site_name: form.site_name, site_address: form.site_address || null, latitude: form.latitude ? parseFloat(form.latitude) : null, longitude: form.longitude ? parseFloat(form.longitude) : null }).select("id").single();
        if (siteErr) throw siteErr;
        if (form.number_of_floors) {
          const { data: liftData, error: liftErr } = await supabase.from("lifts").insert({ site_id: siteData.id, number_of_floors: form.number_of_floors, lift_capacity: form.lift_capacity, lift_type: form.lift_type, door_type: form.door_type }).select("id").single();
          if (liftErr) throw liftErr;
          if (form.amc_number && form.amc_start_date && form.amc_end_date) {
            const { error: amcErr } = await supabase.from("amc_contracts").insert({ lift_id: liftData.id, amc_number: form.amc_number, amc_start_date: form.amc_start_date, amc_end_date: form.amc_end_date, handover_date: form.handover_date || null });
            if (amcErr) throw amcErr;
          }
        }
        toast.success("Site added");
      }
      setDialogOpen(false); fetchSites();
    } catch (err: any) { toast.error(err.message || "Failed to save site"); }
  };

  const deleteSite = async (id: string) => {
    const { error } = await supabase.from("sites").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Site deleted"); fetchSites();
  };

  const getAmcStatus = (endDate: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = differenceInDays(parseISO(endDate), today);
    if (d < 0) return { label: "EXPIRED", color: "bg-destructive text-white" };
    if (d <= 7) return { label: `${d}d left`, color: "bg-destructive text-white" };
    if (d <= 30) return { label: `${d}d left`, color: "bg-warning text-white" };
    return { label: "ACTIVE", color: "bg-success text-white" };
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Sites</h1><p className="text-sm text-muted-foreground">Manage sites, lifts, and AMC contracts</p></div>
        <Button onClick={openAdd} className="shrink-0"><Plus className="mr-2 h-4 w-4" /> Add Site</Button>
      </div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by site, customer, lift ID, AMC number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      : filtered.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center"><Building2 className="mb-3 h-12 w-12 text-muted-foreground/30" /><p className="text-lg font-medium text-muted-foreground">No sites found</p><p className="text-sm text-muted-foreground/70">Add your first site to get started</p></div>
      : (
        <div className="space-y-4">
          {filtered.map((site) => {
            const isExpanded = expandedSite === site.id;
            const firstAmc = site.lifts?.[0]?.amc_contracts?.[0];
            const amcStatus = firstAmc ? getAmcStatus(firstAmc.amc_end_date) : null;
            return (
              <Card key={site.id} className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="flex cursor-pointer items-center gap-4 p-4" onClick={() => setExpandedSite(isExpanded ? null : site.id)}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{site.site_name}</h3>
                        {amcStatus && <Badge className={amcStatus.color}>{amcStatus.label}</Badge>}
                        {site.lifts && site.lifts.length > 1 && <Badge variant="secondary">{site.lifts.length} lifts</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{site.customers?.name} &bull; {site.lifts?.[0]?.lift_id || "No lift"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {site.site_address && <a href={getMapsUrl(site.site_address, site.latitude, site.longitude)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80"><MapPin className="h-4 w-4" /></a>}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(site); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Site</AlertDialogTitle><AlertDialogDescription>Delete {site.site_name} and all associated lifts/AMC?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteSite(site.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3">
                      <div className="mb-4">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Info</h4>
                        <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                          <div><span className="font-medium">Name:</span> {site.customers?.name}</div>
                          <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><a href={`tel:${site.customers?.mobile}`} className="text-primary">{site.customers?.mobile}</a></div>
                          {site.customers?.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><a href={`mailto:${site.customers?.email}`} className="text-primary">{site.customers?.email}</a></div>}
                          {site.customers?.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{site.customers.address}</div>}
                        </div>
                      </div>
                      <Separator className="my-3" />
                      {site.lifts?.map((lift, idx) => {
                        const amc = lift.amc_contracts?.[0];
                        const status = amc ? getAmcStatus(amc.amc_end_date) : null;
                        return (
                          <div key={lift.id} className={cn("mb-4", idx > 0 && "mt-4 pt-4 border-t")}>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lift {idx + 1} &mdash; {lift.lift_id}</h4>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                              <div>
                                <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Lift Details</h5>
                                <div className="space-y-1.5 text-sm">
                                  <div><span className="font-medium">Lift ID:</span> <span className="font-mono text-primary">{lift.lift_id}</span></div>
                                  <div><span className="font-medium">Floors:</span> {lift.number_of_floors}</div>
                                  <div><span className="font-medium">Capacity:</span> {lift.lift_capacity}</div>
                                  <div><span className="font-medium">Type:</span> {lift.lift_type}</div>
                                  <div><span className="font-medium">Door:</span> {lift.door_type}</div>
                                </div>
                              </div>
                              <div>
                                <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">AMC Contract</h5>
                                {amc ? (
                                  <div className="space-y-1.5 text-sm">
                                    <div><span className="font-medium">AMC No:</span> <span className="font-mono">{amc.amc_number}</span></div>
                                    <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{format(parseISO(amc.amc_start_date), "dd-MM-yyyy")} to {format(parseISO(amc.amc_end_date), "dd-MM-yyyy")}</div>
                                    {amc.handover_date && <div><span className="font-medium">Handover:</span> {format(parseISO(amc.handover_date), "dd-MM-yyyy")}</div>}
                                    <div className="flex items-center gap-1.5"><FileCheck className="h-3.5 w-3.5 text-muted-foreground" /><Badge className={status?.color}>{status?.label}</Badge></div>
                                  </div>
                                ) : <p className="text-sm text-muted-foreground">No AMC contract</p>}
                              </div>
                              <div>
                                <h5 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Services</h5>
                                {amc?.service_schedules && amc.service_schedules.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">{amc.service_schedules.map((ss) => (
                                    <Badge key={ss.id} variant={ss.status === "completed" ? "secondary" : ss.status === "missed" ? "destructive" : "outline"} className="gap-1">
                                      <Wrench className="h-3 w-3" />{format(parseISO(ss.service_date), "dd-MM-yyyy")}{ss.remarks && ` - ${ss.remarks}`}
                                    </Badge>
                                  ))}</div>
                                ) : <p className="text-sm text-muted-foreground">No services scheduled</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {site.site_address && (
                        <><Separator className="my-3" />
                        <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-primary" />{site.site_address}<a href={getMapsUrl(site.site_address, site.latitude, site.longitude)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View on Map</a></div></>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingSiteId ? "Edit Site" : "Add Site"}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2"><Label>Customer *</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })} disabled={!!editingSiteId}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} - {c.mobile}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Separator />
            <div><h3 className="mb-3 text-sm font-semibold text-muted-foreground">Site Information</h3>
              <div className="space-y-3">
                <div className="space-y-2"><Label>Site Name *</Label><Input placeholder="Enter site name" value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Site Address</Label><Input placeholder="Enter full site address" value={form.site_address} onChange={(e) => setForm({ ...form, site_address: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Latitude</Label><Input type="number" step="any" placeholder="e.g. 17.3850" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Longitude</Label><Input type="number" step="any" placeholder="e.g. 78.4867" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={useCurrentLocation} disabled={locating}>
                  <Locate className={cn("h-4 w-4", locating && "animate-spin")} /> {locating ? "Detecting..." : "Use Current Location"}
                </Button>
              </div>
            </div>
            <Separator />
            <div><h3 className="mb-3 text-sm font-semibold text-muted-foreground">Lift Information</h3>
              <div className="space-y-3">
                <div className="space-y-2"><Label>Number of Floors</Label><Input placeholder="e.g. G+5, B+G+5, Stilt+5" value={form.number_of_floors} onChange={(e) => setForm({ ...form, number_of_floors: e.target.value })} /></div>
                <div className="space-y-2"><Label>Lift Capacity</Label><Select value={form.lift_capacity} onValueChange={(v) => setForm({ ...form, lift_capacity: v })}><SelectTrigger><SelectValue placeholder="Select capacity" /></SelectTrigger><SelectContent>{LIFT_CAPACITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Lift Type</Label><Select value={form.lift_type} onValueChange={(v) => setForm({ ...form, lift_type: v })}><SelectTrigger><SelectValue placeholder="Select lift type" /></SelectTrigger><SelectContent>{LIFT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Door Type</Label><Select value={form.door_type} onValueChange={(v) => setForm({ ...form, door_type: v })}><SelectTrigger><SelectValue placeholder="Select door type" /></SelectTrigger><SelectContent>{DOOR_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
              </div>
            </div>
            <Separator />
            <div><h3 className="mb-3 text-sm font-semibold text-muted-foreground">AMC Information</h3>
              <div className="space-y-3">
                <div className="space-y-2"><Label>AMC Number</Label><Input placeholder="e.g. AMC-001" value={form.amc_number} onChange={(e) => setForm({ ...form, amc_number: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>AMC Start Date</Label><Input type="date" value={form.amc_start_date} onChange={(e) => setForm({ ...form, amc_start_date: e.target.value })} /></div>
                  <div className="space-y-2"><Label>AMC End Date *</Label><Input type="date" value={form.amc_end_date} onChange={(e) => setForm({ ...form, amc_end_date: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Handover Date</Label><Input type="date" value={form.handover_date} onChange={(e) => setForm({ ...form, handover_date: e.target.value })} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={save}>{editingSiteId ? "Update" : "Add Site"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
