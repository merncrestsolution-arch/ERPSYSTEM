-- Run this in the Supabase SQL Editor (Dashboard -> SQL -> New query -> Run).
-- It is safe to run more than once.

-- 0) Customer QR codes for visit verification stickers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS qr_code text;

CREATE UNIQUE INDEX IF NOT EXISTS customers_qr_code_uidx
  ON public.customers (qr_code)
  WHERE qr_code IS NOT NULL;

-- 1) Cheques: optional "received from / who gave" name.
ALTER TABLE public.cheques
  ADD COLUMN IF NOT EXISTS received_from text;

-- 2) Location tracking for sales officers (GPS).
CREATE TABLE IF NOT EXISTS public.location_logs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint,
  username    text,
  full_name   text,
  latitude    double precision NOT NULL,
  longitude   double precision NOT NULL,
  accuracy    double precision,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes for the live map and per-user trail.
CREATE INDEX IF NOT EXISTS location_logs_user_idx
  ON public.location_logs (user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS location_logs_recorded_idx
  ON public.location_logs (recorded_at DESC);

-- 3) IMPORTANT: the app uses the public (anon/publishable) key like every other
-- table in this project (all "UNRESTRICTED"). location_logs ended up with Row
-- Level Security ENABLED, which silently blocks the app from inserting GPS
-- points (HTTP 401). Turn RLS off so it matches the rest of the schema:
ALTER TABLE public.location_logs DISABLE ROW LEVEL SECURITY;

-- 4) Sierra Cables GRN auto-inventory (packaging + stock movements)
ALTER TABLE public.grns ADD COLUMN IF NOT EXISTS received_at timestamptz;
ALTER TABLE public.grns ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.grns ADD COLUMN IF NOT EXISTS total_meters integer DEFAULT 0;

ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS packaging_type text;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS quantity_meters integer;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS total_meters integer;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS item_status text DEFAULT 'Pending';
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS added_to_inventory_at timestamptz;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id        bigint NOT NULL,
  movement_type     text NOT NULL,
  quantity_units    double precision NOT NULL DEFAULT 0,
  quantity_meters   integer NOT NULL DEFAULT 0,
  reference         text,
  notes             text,
  balance_before    integer,
  balance_after     integer,
  created_by        text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON public.stock_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_ref_idx ON public.stock_movements (reference);

INSERT INTO public.suppliers (name, contact_person, contact_number, address)
SELECT 'Sierra Cables PLC', 'Sales Desk', '0112345678', 'Sri Lanka'
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name = 'Sierra Cables PLC');
