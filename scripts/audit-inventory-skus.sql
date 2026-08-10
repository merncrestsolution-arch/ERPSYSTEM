-- Full inventory SKU audit: packaging/color must be separate products.
-- Run on production: psql -h 127.0.0.1 -U erp -d erp -f audit-inventory-skus.sql

\echo '=== 1) FULL PRODUCT LIST ==='
SELECT id, barcode, name, stock_quantity, cost_price, selling_price
FROM products
ORDER BY id;

\echo ''
\echo '=== 2) DUPLICATE BARCODES (must be empty) ==='
SELECT barcode, COUNT(*) AS cnt, array_agg(id) AS ids
FROM products
GROUP BY barcode
HAVING COUNT(*) > 1;

\echo ''
\echo '=== 3) PACKAGING / COLOUR FAMILY GROUPS ==='
SELECT
  regexp_replace(barcode, '-(50M|10M|500M|perM|C[0-9]+M)$', '') AS catalog_base,
  COUNT(*) AS sku_count,
  string_agg(barcode || ' => ' || left(name, 40), ' | ' ORDER BY barcode) AS variants
FROM products
GROUP BY 1
HAVING COUNT(*) > 1
ORDER BY 1;

\echo ''
\echo '=== 4) GRN-20260730-026 LINES ==='
SELECT gi.id, gi.product_id, p.barcode, left(p.name, 50) AS name,
       gi.packaging_type, gi.quantity, gi.stock_units, gi.total_meters
FROM grn_items gi
JOIN products p ON p.id = gi.product_id
JOIN grns g ON g.id = gi.grn_id
WHERE g.grn_number = 'GRN-20260730-026'
ORDER BY gi.id;

\echo ''
\echo '=== 5) RECONCILE stock vs GRN-sales vs movements ==='
WITH grn AS (
  SELECT product_id,
         SUM(COALESCE(stock_units, quantity, 0))::int AS grn_units,
         SUM(COALESCE(total_meters, 0)) AS grn_meters
  FROM grn_items
  GROUP BY product_id
),
sales AS (
  SELECT si.product_id, SUM(si.quantity)::int AS sold_units
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE COALESCE(s.status, '') NOT ILIKE 'Pending%'
  GROUP BY si.product_id
),
moves AS (
  SELECT product_id,
         SUM(quantity_units)::int AS move_units,
         SUM(COALESCE(quantity_meters, 0)) AS move_meters
  FROM stock_movements
  GROUP BY product_id
)
SELECT p.id, p.barcode, left(p.name, 50) AS name, p.stock_quantity,
       COALESCE(g.grn_units, 0) AS grn_units,
       COALESCE(s.sold_units, 0) AS sold_units,
       COALESCE(g.grn_units, 0) - COALESCE(s.sold_units, 0) AS expected_from_grn_sales,
       COALESCE(m.move_units, 0) AS move_net_units,
       COALESCE(g.grn_meters, 0) AS grn_meters,
       COALESCE(m.move_meters, 0) AS move_net_meters,
       CASE
         WHEN p.stock_quantity IS DISTINCT FROM (COALESCE(g.grn_units, 0) - COALESCE(s.sold_units, 0))
           AND p.stock_quantity IS DISTINCT FROM COALESCE(m.move_units, 0)
           THEN 'STOCK_AND_MOVE_MISMATCH'
         WHEN p.stock_quantity IS DISTINCT FROM (COALESCE(g.grn_units, 0) - COALESCE(s.sold_units, 0))
           THEN 'STOCK_NE_GRN_SALES'
         WHEN p.stock_quantity IS DISTINCT FROM COALESCE(m.move_units, 0)
           THEN 'STOCK_NE_MOVEMENTS'
         WHEN COALESCE(m.move_units, 0) IS DISTINCT FROM (COALESCE(g.grn_units, 0) - COALESCE(s.sold_units, 0))
           THEN 'MOVES_NE_GRN_SALES'
         ELSE 'OK'
       END AS status
FROM products p
LEFT JOIN grn g ON g.product_id = p.id
LEFT JOIN sales s ON s.product_id = p.id
LEFT JOIN moves m ON m.product_id = p.id
ORDER BY
  CASE WHEN
    p.stock_quantity IS DISTINCT FROM (COALESCE(g.grn_units, 0) - COALESCE(s.sold_units, 0))
    OR p.stock_quantity IS DISTINCT FROM COALESCE(m.move_units, 0)
    OR COALESCE(m.move_units, 0) IS DISTINCT FROM (COALESCE(g.grn_units, 0) - COALESCE(s.sold_units, 0))
  THEN 0 ELSE 1 END,
  p.id;

\echo ''
\echo '=== 6) MISPOSTED MOVEMENTS (packaging notes on wrong SKU) ==='
SELECT sm.id, sm.product_id, p.barcode, left(p.name, 45) AS name,
       sm.movement_type, sm.quantity_units, sm.quantity_meters,
       sm.reference, sm.notes
FROM stock_movements sm
JOIN products p ON p.id = sm.product_id
WHERE
  (sm.notes ILIKE '%0.5 Roll%' AND p.name NOT ILIKE '%Roll-50M%' AND p.barcode NOT ILIKE '%-50M')
  OR (sm.notes ILIKE '%1 Roll (100M)%' AND (p.name ILIKE '%Roll-50M%' OR p.barcode ILIKE '%-50M'))
  OR (sm.notes ILIKE '%Coil (10M)%' AND p.name NOT ILIKE '%Coil-10M%' AND p.barcode NOT ILIKE '%-10M')
ORDER BY sm.id;

\echo ''
\echo '=== 7) TWIN FLAT 7/0.67 DETAIL ==='
SELECT id, barcode, name, stock_quantity FROM products
WHERE name ILIKE '%Twin Flat 7/0.67%' OR barcode ILIKE 'SC-T-7.0.67%'
ORDER BY id;

SELECT sm.id, sm.product_id, sm.movement_type, sm.quantity_units, sm.quantity_meters,
       sm.reference, sm.notes, sm.created_at
FROM stock_movements sm
JOIN products p ON p.id = sm.product_id
WHERE p.name ILIKE '%Twin Flat 7/0.67%' OR p.barcode ILIKE 'SC-T-7.0.67%'
ORDER BY sm.product_id, sm.id;

\echo ''
\echo '=== 8) STATUS COUNTS ==='
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
),
recon AS (
  SELECT
    CASE
      WHEN p.stock_quantity IS DISTINCT FROM (COALESCE(g.grn_units, 0) - COALESCE(s.sold_units, 0))
        OR p.stock_quantity IS DISTINCT FROM COALESCE(m.move_units, 0)
        THEN 'MISMATCH'
      ELSE 'OK'
    END AS status
  FROM products p
  LEFT JOIN grn g ON g.product_id = p.id
  LEFT JOIN sales s ON s.product_id = p.id
  LEFT JOIN moves m ON m.product_id = p.id
)
SELECT status, COUNT(*) FROM recon GROUP BY status ORDER BY status;
