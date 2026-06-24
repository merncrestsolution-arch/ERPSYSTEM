-- Run this in the Supabase SQL Editor (Dashboard -> SQL -> New query -> Run).
-- It is safe to run more than once.

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

-- The app uses the public (anon/publishable) key, like the rest of the tables.
-- These tables are created without RLS to match the existing setup. If you later
-- enable Row Level Security project-wide, add policies allowing the anon role to
-- INSERT into location_logs and SELECT location_logs / cheques.
