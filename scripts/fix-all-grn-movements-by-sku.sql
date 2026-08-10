-- Rebuild ALL GRN stock movements from grn_items (source of truth).
-- Rule: each packaging (100M / 50M / coil / etc.) and colour = separate product + barcode.
-- This removes cross-posted packaging rows and GRN edit reverse/re-receive churn
-- for every SKU, not only Twin Flat.
--
-- Does NOT delete Sale_Invoiced / GRTN / Adjustment movements.
-- Recalculates products.stock_quantity from the full movement ledger afterward.

BEGIN;

-- 1) Drop polluted GRN receive/reverse history (all products)
DELETE FROM stock_movements
WHERE movement_type IN ('GRN_Received', 'GRN_Reversed');

-- 2) Re-post one clean receive per current GRN line → correct product_id
INSERT INTO stock_movements (
  product_id,
  movement_type,
  quantity_units,
  quantity_meters,
  reference,
  notes,
  balance_before,
  balance_after,
  created_by,
  created_at
)
SELECT
  gi.product_id,
  'GRN_Received',
  COALESCE(gi.stock_units, gi.quantity, 0)::int,
  COALESCE(gi.total_meters, 0),
  g.grn_number,
  TRIM(
    BOTH ' '
    FROM CONCAT(
      COALESCE(gi.quantity, gi.stock_units, 0)::text,
      ' x ',
      COALESCE(gi.packaging_type, 'unit')
    )
  ),
  0,
  COALESCE(gi.stock_units, gi.quantity, 0)::int,
  'SYSTEM',
  COALESCE(gi.added_to_inventory_at, g.received_at, NOW())
FROM grn_items gi
JOIN grns g ON g.id = gi.grn_id
WHERE COALESCE(gi.stock_units, gi.quantity, 0) <> 0
   OR COALESCE(gi.total_meters, 0) <> 0;

-- 3) Recalc every product stock from movement nets
UPDATE products p
SET stock_quantity = COALESCE(src.net_units, 0)
FROM (
  SELECT product_id, SUM(quantity_units)::int AS net_units
  FROM stock_movements
  GROUP BY product_id
) src
WHERE p.id = src.product_id;

UPDATE products
SET stock_quantity = 0
WHERE id NOT IN (SELECT DISTINCT product_id FROM stock_movements);

COMMIT;

\echo '=== Products after full GRN rebuild ==='
SELECT id, barcode, left(name, 50) AS name, stock_quantity
FROM products
ORDER BY id;

\echo ''
\echo '=== Misposted packaging notes remaining (must be empty) ==='
SELECT sm.id, sm.product_id, p.barcode, left(p.name, 45) AS name,
       sm.quantity_units, sm.quantity_meters, sm.reference, sm.notes
FROM stock_movements sm
JOIN products p ON p.id = sm.product_id
WHERE
  (sm.notes ILIKE '%0.5 Roll%' AND p.name NOT ILIKE '%Roll-50M%' AND p.barcode NOT ILIKE '%-50M')
  OR (sm.notes ILIKE '%1 Roll (100M)%' AND (p.name ILIKE '%Roll-50M%' OR p.barcode ILIKE '%-50M'));

\echo ''
\echo '=== Reconcile summary ==='
WITH grn AS (
  SELECT product_id, SUM(COALESCE(stock_units, quantity, 0))::int AS grn_units
  FROM grn_items GROUP BY product_id
),
sales AS (
  SELECT si.product_id, SUM(si.quantity)::int AS sold_units
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE COALESCE(s.status, '') NOT ILIKE 'Pending%'
  GROUP BY si.product_id
),
moves AS (
  SELECT product_id, SUM(quantity_units)::int AS move_units
  FROM stock_movements GROUP BY product_id
)
SELECT
  COUNT(*) FILTER (
    WHERE p.stock_quantity IS NOT DISTINCT FROM COALESCE(m.move_units, 0)
  ) AS stock_matches_moves,
  COUNT(*) FILTER (
    WHERE p.stock_quantity IS DISTINCT FROM COALESCE(m.move_units, 0)
  ) AS stock_move_mismatches,
  COUNT(*) FILTER (
    WHERE COALESCE(m.move_units, 0) IS DISTINCT FROM
          (COALESCE(g.grn_units, 0) - COALESCE(s.sold_units, 0))
  ) AS move_vs_grn_sales_gaps
FROM products p
LEFT JOIN grn g ON g.product_id = p.id
LEFT JOIN sales s ON s.product_id = p.id
LEFT JOIN moves m ON m.product_id = p.id;
