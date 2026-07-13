-- Enterprise Distribution ERP — Phases 1–6 schema (safe to re-run)
-- Run in Supabase SQL Editor.

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS qr_code text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 10;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS batch_number text;
ALTER TABLE public.grns ADD COLUMN IF NOT EXISTS po_id bigint;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS assigned_user_id bigint;
ALTER TABLE public.cheques ADD COLUMN IF NOT EXISTS received_from text;

CREATE TABLE IF NOT EXISTS public.routes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  description text,
  assigned_user_id bigint,
  status text DEFAULT 'Active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.route_stops (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  route_id bigint REFERENCES public.routes(id),
  customer_id bigint REFERENCES public.customers(id),
  sequence_no integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.daily_schedules (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  route_id bigint REFERENCES public.routes(id),
  schedule_date date NOT NULL,
  assigned_user_id bigint,
  status text DEFAULT 'Planned',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_visits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id bigint REFERENCES public.customers(id),
  user_id bigint,
  schedule_id bigint,
  method text DEFAULT 'manual',
  reason text,
  latitude double precision,
  longitude double precision,
  photo_url text,
  visited_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.warehouses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text UNIQUE NOT NULL,
  location text,
  is_default boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.warehouse_stock (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  warehouse_id bigint REFERENCES public.warehouses(id),
  product_id bigint REFERENCES public.products(id),
  quantity integer DEFAULT 0,
  UNIQUE(warehouse_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_warehouse_id bigint REFERENCES public.warehouses(id),
  to_warehouse_id bigint REFERENCES public.warehouses(id),
  product_id bigint REFERENCES public.products(id),
  quantity integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id bigint REFERENCES public.suppliers(id),
  po_number text UNIQUE NOT NULL,
  total_amount double precision DEFAULT 0,
  status text DEFAULT 'Draft',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id bigint REFERENCES public.purchase_orders(id),
  product_id bigint REFERENCES public.products(id),
  quantity integer NOT NULL,
  cost_price double precision NOT NULL,
  total_price double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS public.purchase_returns (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id bigint REFERENCES public.suppliers(id),
  return_number text UNIQUE NOT NULL,
  total_amount double precision DEFAULT 0,
  reason text,
  status text DEFAULT 'Completed',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_return_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  return_id bigint REFERENCES public.purchase_returns(id),
  product_id bigint REFERENCES public.products(id),
  quantity integer NOT NULL,
  cost_price double precision NOT NULL,
  total_price double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS public.quotations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id bigint REFERENCES public.customers(id),
  quote_number text UNIQUE NOT NULL,
  total_amount double precision DEFAULT 0,
  discount double precision DEFAULT 0,
  net_amount double precision DEFAULT 0,
  status text DEFAULT 'Draft',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotation_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quotation_id bigint REFERENCES public.quotations(id),
  product_id bigint REFERENCES public.products(id),
  quantity integer NOT NULL,
  selling_price double precision NOT NULL,
  total_price double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sales_orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id bigint REFERENCES public.customers(id),
  quotation_id bigint,
  so_number text UNIQUE NOT NULL,
  total_amount double precision DEFAULT 0,
  discount double precision DEFAULT 0,
  net_amount double precision DEFAULT 0,
  status text DEFAULT 'Open',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  so_id bigint REFERENCES public.sales_orders(id),
  product_id bigint REFERENCES public.products(id),
  quantity integer NOT NULL,
  selling_price double precision NOT NULL,
  total_price double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS public.delivery_notes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id bigint,
  so_id bigint,
  dn_number text UNIQUE NOT NULL,
  customer_id bigint REFERENCES public.customers(id),
  status text DEFAULT 'Dispatched',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_payments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id bigint REFERENCES public.customers(id),
  payment_method text NOT NULL,
  reference_number text,
  amount double precision NOT NULL,
  date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cash_book (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_type text NOT NULL,
  category text,
  description text,
  amount double precision NOT NULL,
  entry_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bank_name text,
  transaction_type text NOT NULL,
  reference_number text,
  amount double precision NOT NULL,
  transaction_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.income_expenses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type text NOT NULL,
  category text,
  description text,
  amount double precision NOT NULL,
  entry_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promotions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  discount_percent double precision DEFAULT 0,
  start_date date,
  end_date date,
  active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.sync_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id text,
  payload jsonb NOT NULL,
  client_uuid text UNIQUE,
  status text DEFAULT 'pending',
  error text,
  created_at timestamptz DEFAULT now(),
  synced_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.geofences (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_meters double precision DEFAULT 100,
  customer_id bigint
);

CREATE TABLE IF NOT EXISTS public.vehicle_expenses (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id bigint REFERENCES public.vehicles(id),
  expense_type text NOT NULL,
  amount double precision NOT NULL,
  expense_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehicle_fuel (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id bigint REFERENCES public.vehicles(id),
  liters double precision NOT NULL,
  amount double precision NOT NULL,
  odometer double precision,
  fuel_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id bigint REFERENCES public.vehicles(id),
  description text NOT NULL,
  amount double precision DEFAULT 0,
  service_date date NOT NULL,
  next_service_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint,
  username text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint,
  title text NOT NULL,
  body text,
  channel text DEFAULT 'in_app',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.location_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint,
  username text,
  full_name text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.warehouses (name, location, is_default)
SELECT 'Main Warehouse', 'Head Office', true
WHERE NOT EXISTS (SELECT 1 FROM public.warehouses LIMIT 1);

-- Match project convention: unrestricted tables for anon key
ALTER TABLE public.routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_book DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_outbox DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_fuel DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_logs DISABLE ROW LEVEL SECURITY;
