-- Fix Twin Flat 7/0.67 movements so 100M and 50M stay separate SKUs.
-- Safe target from GRN-20260730-026 + user ledger outs:
--   product 5  [Roll-100M] SC-T-7.0.67     : GRN +5/+500m ; Outs -5/-500m ; stock 0
--   product 14 [Roll-50M]  SC-T-7.0.67-50M : GRN +5/+250m ; keep existing sales ; stock from nets
--
-- Run AFTER reviewing audit-inventory-skus.sql output.

BEGIN;

-- ---------------------------------------------------------------------------
-- Twin Flat 100M (product 5)
-- ---------------------------------------------------------------------------
DELETE FROM stock_movements
WHERE product_id = 5
  AND reference = 'GRN-20260730-026'
  AND movement_type IN ('GRN_Received', 'GRN_Reversed');

INSERT INTO stock_movements (
  product_id, movement_type, quantity_units, quantity_meters,
  reference, notes, balance_before, balance_after, created_by, created_at
) VALUES (
  5, 'GRN_Received', 5, 500,
  'GRN-20260730-026', '5 x 1 Roll (100M)',
  0, 5, 'SYSTEM', '2026-07-30 16:21:09+00'
);

-- Restore three Out lines totaling -5 / -500m (user screenshot).
-- Remove current sale movements for product 5, then re-insert canonical outs.
DELETE FROM stock_movements
WHERE product_id = 5
  AND movement_type = 'Sale_Invoiced';

INSERT INTO stock_movements (
  product_id, movement_type, quantity_units, quantity_meters,
  reference, notes, created_by, created_at
) VALUES
  (5, 'Sale_Invoiced', -1, -100, 'INV-248151', 'Invoice INV-248151', 'SYSTEM', '2026-08-04 10:10:48+00'),
  (5, 'Sale_Invoiced', -2, -200, 'INV-322330', 'Invoice INV-322330', 'SYSTEM', '2026-08-04 10:45:23+00'),
  (5, 'Sale_Invoiced', -2, -200, 'INV-322330', 'Invoice INV-322330', 'SYSTEM', '2026-08-04 11:45:24+00');

-- ---------------------------------------------------------------------------
-- Twin Flat 50M (product 14) — ensure one clean GRN receive on THIS SKU only
-- ---------------------------------------------------------------------------
DELETE FROM stock_movements
WHERE product_id = 14
  AND reference = 'GRN-20260730-026'
  AND movement_type IN ('GRN_Received', 'GRN_Reversed');

INSERT INTO stock_movements (
  product_id, movement_type, quantity_units, quantity_meters,
  reference, notes, balance_before, balance_after, created_by, created_at
) VALUES (
  14, 'GRN_Received', 5, 250,
  'GRN-20260730-026', '5 x 0.5 Roll (50M)',
  0, 5, 'SYSTEM', '2026-07-30 16:21:09.01+00'
);

-- ---------------------------------------------------------------------------
-- Recalc stock for these two SKUs from movement nets
-- ---------------------------------------------------------------------------
UPDATE products p
SET stock_quantity = COALESCE(src.net_units, 0)
FROM (
  SELECT product_id, SUM(quantity_units)::int AS net_units
  FROM stock_movements
  WHERE product_id IN (5, 14)
  GROUP BY product_id
) src
WHERE p.id = src.product_id;

COMMIT;

\echo '=== Twin Flat after fix ==='
SELECT id, barcode, left(name, 45) AS name, stock_quantity
FROM products WHERE id IN (5, 14) ORDER BY id;

SELECT product_id, movement_type, quantity_units, quantity_meters, reference, notes
FROM stock_movements
WHERE product_id IN (5, 14)
ORDER BY product_id, id;

SELECT product_id,
       SUM(quantity_units) AS net_units,
       SUM(quantity_meters) AS net_meters
FROM stock_movements
WHERE product_id IN (5, 14)
GROUP BY product_id
ORDER BY product_id;
