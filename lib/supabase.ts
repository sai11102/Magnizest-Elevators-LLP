import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Customer = {
  id: string;
  user_id: string;
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type Site = {
  id: string;
  customer_id: string;
  site_name: string;
  site_address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  customers?: Customer;
};

export type Lift = {
  id: string;
  site_id: string;
  lift_id: string;
  number_of_floors: string;
  lift_capacity: string;
  lift_type: string;
  door_type: string;
  created_at: string;
  sites?: Site;
};

export type AmcContract = {
  id: string;
  lift_id: string;
  amc_number: string;
  amc_start_date: string;
  amc_end_date: string;
  handover_date: string | null;
  created_at: string;
  lifts?: Lift;
};

export type ServiceSchedule = {
  id: string;
  amc_contract_id: string;
  service_date: string;
  remarks: string | null;
  status: "upcoming" | "completed" | "missed";
  created_at: string;
  amc_contracts?: AmcContract;
};

export type Notification = {
  id: string;
  user_id: string;
  type: "amc_expiry" | "service_due";
  reference_id: string;
  title: string;
  message: string;
  severity: "critical" | "upcoming" | "active";
  dismissed: boolean;
  created_at: string;
};

export type SiteWithDetails = Site & {
  customers: Customer;
  lifts: (Lift & { amc_contracts: (AmcContract & { service_schedules: ServiceSchedule[] })[] })[];
};

export const LIFT_CAPACITIES = ["4 Passenger", "6 Passenger", "8 Passenger", "10 Passenger", "13 Passenger"];
export const LIFT_TYPES = ["MRL", "TRACTION", "HYDRAULIC", "MRL WITH GOODS", "MRL WITH TRACTION"];
export const DOOR_TYPES = ["Collapsible", "Left Side", "Right Side", "Center Opening"];
