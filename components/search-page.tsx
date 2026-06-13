"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Customer, LIFT_TYPES } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getCustomerIds, getSiteIds, getLiftIds, getAmcIds } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Building2 } from "lucide-react";

type SearchResult = { type: "customer" | "site"; id: string; title: string; subtitle: string; details: string[]; href: string };

export function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async () => {
    if (!user || !query.trim()) { setResults([]); return; }
    setSearching(true);
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    const { data: customers } = await supabase.from("customers").select("*").eq("user_id", user.id);
    for (const c of (customers || [])) {
      if (c.name.toLowerCase().includes(q) || c.mobile.includes(query) || (c.email || "").toLowerCase().includes(q) || (c.address || "").toLowerCase().includes(q))
        results.push({ type: "customer", id: c.id, title: c.name, subtitle: c.mobile, details: [c.email, c.address].filter(Boolean) as string[], href: "/customers" });
    }

    const customerIds = await getCustomerIds(user.id);
    const siteIds = await getSiteIds(customerIds);
    if (siteIds.length > 0) {
      const { data: sitesData } = await supabase.from("sites").select("*").in("id", siteIds);
      const { data: custData } = await supabase.from("customers").select("id, name").in("id", customerIds);
      const custMap = new Map((custData || []).map((c: any) => [c.id, c]));
      const liftIds = await getLiftIds(siteIds);
      const { data: liftsData } = liftIds.length > 0 ? await supabase.from("lifts").select("*").in("id", liftIds) : { data: [] as any[] };
      const amcIds = await getAmcIds(liftIds);
      const { data: amcData } = amcIds.length > 0 ? await supabase.from("amc_contracts").select("id, amc_number, lift_id").in("id", amcIds) : { data: [] as any[] };

      const liftsBySite = new Map<string, any[]>();
      for (const lift of (liftsData || [])) { const arr = liftsBySite.get(lift.site_id) || []; arr.push(lift); liftsBySite.set(lift.site_id, arr); }
      const amcByLift = new Map<string, any[]>();
      for (const amc of (amcData || [])) { const arr = amcByLift.get(amc.lift_id) || []; arr.push(amc); amcByLift.set(amc.lift_id, arr); }

      for (const site of (sitesData || [])) {
        const customer = custMap.get(site.customer_id);
        const siteLifts = liftsBySite.get(site.id) || [];
        const matchSite = site.site_name.toLowerCase().includes(q) || (site.site_address || "").toLowerCase().includes(q);
        const matchingLift = siteLifts.find((l: any) => l.lift_id.toLowerCase().includes(q) || l.lift_type.toLowerCase().includes(q));
        const matchingAmc = siteLifts.flatMap((l: any) => amcByLift.get(l.id) || []).find((a: any) => a.amc_number.toLowerCase().includes(q));
        if (matchSite || matchingLift || matchingAmc) {
          const lift = matchingLift || siteLifts[0];
          const amc = matchingAmc || (lift ? (amcByLift.get(lift.id) || [])[0] : null);
          results.push({ type: "site", id: site.id, title: site.site_name, subtitle: customer?.name || "", details: [lift ? `Lift: ${lift.lift_id} (${lift.lift_type})` : "", amc ? `AMC: ${amc.amc_number}` : "", site.site_address || ""].filter(Boolean) as string[], href: "/sites" });
        }
      }
    }
    setResults(results); setSearching(false);
  }, [user, query]);

  useEffect(() => { const d = setTimeout(() => search(), 300); return () => clearTimeout(d); }, [search]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6"><h1 className="text-2xl font-bold tracking-tight">Global Search</h1><p className="text-sm text-muted-foreground">Search across all customers, sites, lifts, and AMC records</p></div>
      <div className="relative mb-6"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by name, mobile, site, lift ID, AMC number..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-12 pl-11 text-base" autoFocus /></div>
      {searching ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      : query && results.length === 0 ? <div className="py-12 text-center"><Search className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" /><p className="text-lg font-medium text-muted-foreground">No results found</p></div>
      : results.length > 0 ? <div className="space-y-3"><p className="text-sm text-muted-foreground">{results.length} result{results.length > 1 ? "s" : ""}</p>{results.map((r) => (
        <Card key={`${r.type}-${r.id}`} className="cursor-pointer border-0 shadow-sm transition-shadow hover:shadow-md" onClick={() => router.push(r.href)}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">{r.type === "customer" ? <Users className="h-5 w-5 text-primary" /> : <Building2 className="h-5 w-5 text-primary" />}</div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="font-semibold">{r.title}</span><Badge variant="secondary" className="text-[10px]">{r.type}</Badge></div><p className="text-sm text-muted-foreground">{r.subtitle}</p>{r.details.length > 0 && <div className="mt-1 flex flex-wrap gap-2">{r.details.map((d, i) => <span key={i} className="text-xs text-muted-foreground/70">{d}</span>)}</div>}</div>
          </CardContent>
        </Card>
      ))}</div>
      : <div className="py-12 text-center"><Search className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" /><p className="text-lg font-medium text-muted-foreground">Start typing to search</p></div>
      }
    </div>
  );
}
