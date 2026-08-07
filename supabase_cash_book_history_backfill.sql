-- Backfill cash_book history columns from existing description / category text.
-- Run after supabase_cash_book_collection_migration.sql

-- Ensure columns exist
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS collection_type text;
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS receipt_number text;
ALTER TABLE public.cash_book ADD COLUMN IF NOT EXISTS cheque_reference text;

-- Invoice from "Cash — INV-406430" / "Cheque - INV-123" style descriptions
UPDATE public.cash_book
SET invoice_number = upper(substring(description from '(?i)INV[- ]?[A-Z0-9-]+'))
WHERE (invoice_number IS NULL OR invoice_number = '')
  AND description ~* 'INV[- ]?[A-Z0-9-]+';

-- Normalize INV 406430 / INV406430 → INV-406430
UPDATE public.cash_book
SET invoice_number = regexp_replace(upper(invoice_number), '^INV[ -]?', 'INV-')
WHERE invoice_number IS NOT NULL AND invoice_number !~* '^INV-';

-- Method from leading "Cash — …" / "Cheque — …"
UPDATE public.cash_book
SET payment_method = initcap(substring(description from '(?i)^(Cash|Cheque|Transfer|Card)\b'))
WHERE (payment_method IS NULL OR payment_method = '')
  AND description ~* '^(Cash|Cheque|Transfer|Card)\b';

-- Default method for customer payment rows
UPDATE public.cash_book
SET payment_method = 'Cash'
WHERE (payment_method IS NULL OR payment_method = '')
  AND entry_type = 'Income'
  AND (category ILIKE '%Customer Payment%' OR description ILIKE 'Payment from customer%');

-- Collection type
UPDATE public.cash_book
SET collection_type = 'Cheque RTN'
WHERE (collection_type IS NULL OR collection_type = '')
  AND entry_type = 'Income'
  AND (description ILIKE '%cheque rtn%' OR description ILIKE '%bounced%' OR category ILIKE '%Cheque RTN%');

UPDATE public.cash_book
SET collection_type = 'Previous Invoice'
WHERE (collection_type IS NULL OR collection_type = '')
  AND entry_type = 'Income'
  AND (
    invoice_number IS NOT NULL
    OR category ILIKE '%Customer Payment%'
    OR description ILIKE 'Payment from customer%'
    OR description ~* 'INV-'
  );

-- Receipt / payment reference from PAY-… tokens
UPDATE public.cash_book
SET receipt_number = substring(description from '(?i)PAY-[A-Z0-9-]+')
WHERE (receipt_number IS NULL OR receipt_number = '')
  AND description ~* 'PAY-[A-Z0-9-]+';

-- Cheque ref from CHQ / CHEQUE tokens
UPDATE public.cash_book
SET cheque_reference = substring(description from '(?i)(?:CHQ|CHEQUE)[-#:\s]*([A-Z0-9-]+)')
WHERE (cheque_reference IS NULL OR cheque_reference = '')
  AND description ~* '(CHQ|CHEQUE)[-#:\s]*[A-Z0-9-]+';
