"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, type Customer } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getMapsUrl, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Pencil, Trash2, MapPin, Phone, Mail, Users, Locate } from "lucide-react";
import { toast } from "sonner";

export function CustomerPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", address: "", latitude: "", longitude: "" });
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

  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.mobile.includes(search) || (c.email || "").toLowerCase().includes(q) || (c.address || "").toLowerCase().includes(q);
  });

  const openAdd = () => { setEditing(null); setForm({ name: "", mobile: "", email: "", address: "", latitude: "", longitude: "" }); setDialogOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, mobile: c.mobile, email: c.email || "", address: c.address || "", latitude: c.latitude?.toString() || "", longitude: c.longitude?.toString() || "" }); setDialogOpen(true); };

  const save = async () => {
    if (!form.name || !form.mobile) { toast.error("Name and mobile are required"); return; }
    if (editing) {
      const { error } = await supabase.from("customers").update({ name: form.name, mobile: form.mobile, email: form.email || null, address: form.address || null, latitude: form.latitude ? parseFloat(form.latitude) : null, longitude: form.longitude ? parseFloat(form.longitude) : null }).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Customer updated");
    } else {
const { error } = await supabase.from("customers").insert({
  user_id: user?.id,
  name: form.name,
  mobile: form.mobile,
  email: form.email || null,
  address: form.address || null,
  latitude: form.latitude ? parseFloat(form.latitude) : null,
  longitude: form.longitude ? parseFloat(form.longitude) : null
});
      if (error) { toast.error(error.message); return; }
      toast.success("Customer added");
    }
    setDialogOpen(false); fetchCustomers();
  };

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Customer deleted"); fetchCustomers();
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Customers</h1><p className="text-sm text-muted-foreground">Manage your customer records</p></div>
        <Button onClick={openAdd} className="shrink-0"><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>
      </div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, mobile, email, or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      : filtered.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center"><Users className="mb-3 h-12 w-12 text-muted-foreground/30" /><p className="text-lg font-medium text-muted-foreground">No customers found</p><p className="text-sm text-muted-foreground/70">Add your first customer to get started</p></div>
      : (
        <>
          <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Mobile</TableHead><TableHead>Email</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><a href={`tel:${c.mobile}`} className="text-primary hover:underline">{c.mobile}</a></TableCell>
                    <TableCell>{c.email ? <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[200px]">{c.address || "-"}</span>
                        {c.address && <a href={getMapsUrl(c.address, c.latitude, c.longitude)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"><MapPin className="h-3 w-3" /> Map</a>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Customer</AlertDialogTitle><AlertDialogDescription>This will permanently delete {c.name} and all associated sites, lifts, and AMC contracts.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteCustomer(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 md:hidden">
            {filtered.map((c) => (
              <Card key={c.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="font-semibold">{c.name}</h3>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Customer</AlertDialogTitle><AlertDialogDescription>Delete {c.name} and all associated data?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteCustomer(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /><a href={`tel:${c.mobile}`} className="text-primary">{c.mobile}</a></div>
                    {c.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><a href={`mailto:${c.email}`} className="text-primary">{c.email}</a></div>}
                    {c.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /><span>{c.address}</span><a href={getMapsUrl(c.address, c.latitude, c.longitude)} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary">View Map</a></div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Customer Name *</Label><Input placeholder="Enter customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Mobile Number *</Label><Input placeholder="Enter mobile number" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email ID</Label><Input type="email" placeholder="Enter email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Location / Address</Label><Input placeholder="Enter location or full address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Latitude</Label><Input type="number" step="any" placeholder="e.g. 17.3850" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></div>
              <div className="space-y-2"><Label>Longitude</Label><Input type="number" step="any" placeholder="e.g. 78.4867" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
            </div>
            <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={useCurrentLocation} disabled={locating}>
              <Locate className={cn("h-4 w-4", locating && "animate-spin")} /> {locating ? "Detecting..." : "Use Current Location"}
            </Button>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={save}>{editing ? "Update" : "Add Customer"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
