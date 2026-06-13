import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMapsUrl(address: string, lat?: number | null, lng?: number | null) {
  if (lat && lng) return `https://www.google.com/maps?q=${lat},${lng}`;
  return `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
}

export async function getCustomerIds(userId: string): Promise<string[]> {
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase.from("customers").select("id").eq("user_id", userId);
  return (data || []).map((c) => c.id);
}

export async function getSiteIds(customerIds: string[]): Promise<string[]> {
  if (customerIds.length === 0) return [];
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase.from("sites").select("id").in("customer_id", customerIds);
  return (data || []).map((s) => s.id);
}

export async function getLiftIds(siteIds: string[]): Promise<string[]> {
  if (siteIds.length === 0) return [];
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase.from("lifts").select("id").in("site_id", siteIds);
  return (data || []).map((l) => l.id);
}

export async function getExistingServiceDates(amcContractId: string, startDate: string, endDate: string): Promise<string[]> {
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase
    .from("service_schedules")
    .select("service_date")
    .eq("amc_contract_id", amcContractId)
    .gte("service_date", startDate)
    .lte("service_date", endDate);
  return (data || []).map((r: any) => new Date(r.service_date).toISOString().split("T")[0]);
}

export async function getAmcIds(liftIds: string[]): Promise<string[]> {
  if (liftIds.length === 0) return [];
  const { supabase } = await import("@/lib/supabase");
  const { data } = await supabase.from("amc_contracts").select("id").in("lift_id", liftIds);
  return (data || []).map((a) => a.id);
}
