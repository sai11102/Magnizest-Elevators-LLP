/*
# Create initial database schema for MAGNIZEST ELEVATORS LLP

1. New Tables
- `customers`: Stores customer details (name, mobile, email, location with lat/lng for maps)
- `sites`: Stores site details linked to customers (site name, address with lat/lng)
- `lifts`: Stores lift details linked to sites (auto-generated lift ID, floors, capacity, type, door type)
- `amc_contracts`: Stores AMC contract details linked to lifts (AMC number, start/end dates, handover date)
- `service_schedules`: Stores service schedules linked to AMC contracts (date, remarks, status)
- `notifications`: Stores auto-generated notifications for AMC expiry and service reminders

2. Relationships
- sites.customer_id → customers.id (CASCADE DELETE)
- lifts.site_id → sites.id (CASCADE DELETE)
- amc_contracts.lift_id → lifts.id (CASCADE DELETE)
- service_schedules.amc_contract_id → amc_contracts.id (CASCADE DELETE)

3. Security
- RLS enabled on all tables
- All tables use authenticated-only CRUD policies (admin-only access)
- user_id column with DEFAULT auth.uid() on all tables for ownership tracking

4. Important Notes
- Lift IDs are auto-generated using a sequence (LF-0001 format)
- AMC end dates are mandatory for expiry tracking
- Notifications are generated from AMC end dates and service schedule dates
- Latitude/longitude stored for Google Maps integration
*/

-- Create sequence for lift IDs
CREATE SEQUENCE IF NOT EXISTS lift_id_seq START WITH 1 INCREMENT BY 1;

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  mobile text NOT NULL,
  email text,
  address text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_customers" ON customers;
CREATE POLICY "select_own_customers" ON customers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_customers" ON customers;
CREATE POLICY "insert_own_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_customers" ON customers;
CREATE POLICY "update_own_customers" ON customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_customers" ON customers;
CREATE POLICY "delete_own_customers" ON customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  site_name text NOT NULL,
  site_address text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sites" ON sites;
CREATE POLICY "select_own_sites" ON sites FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM customers WHERE customers.id = sites.customer_id AND customers.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_sites" ON sites;
CREATE POLICY "insert_own_sites" ON sites FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM customers WHERE customers.id = sites.customer_id AND customers.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_sites" ON sites;
CREATE POLICY "update_own_sites" ON sites FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM customers WHERE customers.id = sites.customer_id AND customers.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM customers WHERE customers.id = sites.customer_id AND customers.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_sites" ON sites;
CREATE POLICY "delete_own_sites" ON sites FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM customers WHERE customers.id = sites.customer_id AND customers.user_id = auth.uid()));

-- Lifts table
CREATE TABLE IF NOT EXISTS lifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  lift_id text NOT NULL DEFAULT ('LF-' || lpad(nextval('lift_id_seq')::text, 4, '0')),
  number_of_floors text NOT NULL,
  lift_capacity text NOT NULL,
  lift_type text NOT NULL,
  door_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_lifts" ON lifts;
CREATE POLICY "select_own_lifts" ON lifts FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM sites JOIN customers ON customers.id = sites.customer_id WHERE sites.id = lifts.site_id AND customers.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_lifts" ON lifts;
CREATE POLICY "insert_own_lifts" ON lifts FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM sites JOIN customers ON customers.id = sites.customer_id WHERE sites.id = lifts.site_id AND customers.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_lifts" ON lifts;
CREATE POLICY "update_own_lifts" ON lifts FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM sites JOIN customers ON customers.id = sites.customer_id WHERE sites.id = lifts.site_id AND customers.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM sites JOIN customers ON customers.id = sites.customer_id WHERE sites.id = lifts.site_id AND customers.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_lifts" ON lifts;
CREATE POLICY "delete_own_lifts" ON lifts FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM sites JOIN customers ON customers.id = sites.customer_id WHERE sites.id = lifts.site_id AND customers.user_id = auth.uid()));

-- AMC Contracts table
CREATE TABLE IF NOT EXISTS amc_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lift_id uuid NOT NULL REFERENCES lifts(id) ON DELETE CASCADE,
  amc_number text NOT NULL,
  amc_start_date date NOT NULL,
  amc_end_date date NOT NULL,
  handover_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE amc_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_amc_contracts" ON amc_contracts;
CREATE POLICY "select_own_amc_contracts" ON amc_contracts FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM lifts JOIN sites ON sites.id = lifts.site_id JOIN customers ON customers.id = sites.customer_id WHERE lifts.id = amc_contracts.lift_id AND customers.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_amc_contracts" ON amc_contracts;
CREATE POLICY "insert_own_amc_contracts" ON amc_contracts FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM lifts JOIN sites ON sites.id = lifts.site_id JOIN customers ON customers.id = sites.customer_id WHERE lifts.id = amc_contracts.lift_id AND customers.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_amc_contracts" ON amc_contracts;
CREATE POLICY "update_own_amc_contracts" ON amc_contracts FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM lifts JOIN sites ON sites.id = lifts.site_id JOIN customers ON customers.id = sites.customer_id WHERE lifts.id = amc_contracts.lift_id AND customers.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM lifts JOIN sites ON sites.id = lifts.site_id JOIN customers ON customers.id = sites.customer_id WHERE lifts.id = amc_contracts.lift_id AND customers.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_amc_contracts" ON amc_contracts;
CREATE POLICY "delete_own_amc_contracts" ON amc_contracts FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM lifts JOIN sites ON sites.id = lifts.site_id JOIN customers ON customers.id = sites.customer_id WHERE lifts.id = amc_contracts.lift_id AND customers.user_id = auth.uid()));

-- Service Schedules table
CREATE TABLE IF NOT EXISTS service_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amc_contract_id uuid NOT NULL REFERENCES amc_contracts(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  remarks text,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'missed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_service_schedules" ON service_schedules;
CREATE POLICY "select_own_service_schedules" ON service_schedules FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM amc_contracts JOIN lifts ON lifts.id = amc_contracts.lift_id JOIN sites ON sites.id = lifts.site_id JOIN customers ON customers.id = sites.customer_id WHERE amc_contracts.id = service_schedules.amc_contract_id AND customers.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_service_schedules" ON service_schedules;
CREATE POLICY "insert_own_service_schedules" ON service_schedules FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM amc_contracts JOIN lifts ON lifts.id = amc_contracts.lift_id JOIN sites ON sites.id = lifts.site_id JOIN customers ON customers.id = sites.customer_id WHERE amc_contracts.id = service_schedules.amc_contract_id AND customers.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_service_schedules" ON service_schedules;
CREATE POLICY "update_own_service_schedules" ON service_schedules FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM amc_contracts JOIN lifts ON lifts.id = amc_contracts.lift_id JOIN sites ON sites.id = lifts.site_id JOIN customers ON customers.id = sites.customer_id WHERE amc_contracts.id = service_schedules.amc_contract_id AND customers.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM amc_contracts JOIN lifts ON lifts.id = amc_contracts.lift_id JOIN sites ON sites.id = lifts.site_id JOIN customers ON customers.id = sites.customer_id WHERE amc_contracts.id = service_schedules.amc_contract_id AND customers.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_service_schedules" ON service_schedules;
CREATE POLICY "delete_own_service_schedules" ON service_schedules FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM amc_contracts JOIN lifts ON lifts.id = amc_contracts.lift_id JOIN sites ON sites.id = lifts.site_id JOIN customers ON customers.id = sites.customer_id WHERE amc_contracts.id = service_schedules.amc_contract_id AND customers.user_id = auth.uid()));

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('amc_expiry', 'service_due')),
  reference_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'upcoming', 'active')),
  dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_sites_customer_id ON sites(customer_id);
CREATE INDEX IF NOT EXISTS idx_lifts_site_id ON lifts(site_id);
CREATE INDEX IF NOT EXISTS idx_amc_contracts_lift_id ON amc_contracts(lift_id);
CREATE INDEX IF NOT EXISTS idx_amc_contracts_end_date ON amc_contracts(amc_end_date);
CREATE INDEX IF NOT EXISTS idx_service_schedules_amc_contract_id ON service_schedules(amc_contract_id);
CREATE INDEX IF NOT EXISTS idx_service_schedules_date ON service_schedules(service_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_dismissed ON notifications(dismissed);

-- Prevent duplicate generated schedules per AMC/date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_service_schedules_amc_date'
  ) THEN
    ALTER TABLE service_schedules ADD CONSTRAINT uq_service_schedules_amc_date UNIQUE (amc_contract_id, service_date);
  END IF;
EXCEPTION WHEN duplicate_table THEN
  -- ignore if already exists
  NULL;
END$$;

-- Prevent duplicate notifications per user/type/reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_notifications_user_type_ref'
  ) THEN
    ALTER TABLE notifications ADD CONSTRAINT uq_notifications_user_type_ref UNIQUE (user_id, type, reference_id);
  END IF;
EXCEPTION WHEN duplicate_table THEN
  NULL;
END$$;

CREATE INDEX IF NOT EXISTS idx_service_schedules_amc_date_idx ON service_schedules(amc_contract_id, service_date);
CREATE INDEX IF NOT EXISTS idx_notifications_type_ref ON notifications(type, reference_id);
