-- Cash book collection metadata columns (safe to re-run)
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS collection_type text;
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS receipt_number text;
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS cheque_id bigint;
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS cheque_reference text;
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS sale_id bigint;
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS receipt_id bigint;
