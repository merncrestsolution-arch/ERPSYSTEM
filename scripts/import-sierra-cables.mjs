/**
 * Import Sierra Cables PLC price list (11.06.2026) into Supabase products.
 * Maps to existing schema: name, barcode (SKU), cost_price, selling_price,
 * stock_quantity, category_id, brand_id.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

/** @typedef {{ sku: string, name: string, category: string, listPrice: number, costPrice: number }} SierraProduct */

/** @type {SierraProduct[]} */
const PRODUCTS = [
  // ===== SINGLE CORE & TWIN FLAT (SLS 733:2016) =====
  { sku: 'SC-TW-1.13-300-500V', name: 'Single Core Cable 1/1.13mm² - 300/500V', category: 'Power Cables', listPrice: 8200, costPrice: 5800 },
  { sku: 'SC-TF-1.38-300-500V', name: 'Twin Flat Cable 1/1.38mm² - 300/500V', category: 'Power Cables', listPrice: 9300, costPrice: 6500 },
  { sku: 'SC-TF-7.0.53-300-500V', name: 'Twin Flat Cable 7/0.53mm² - 300/500V', category: 'Power Cables', listPrice: 10800, costPrice: 7200 },
  { sku: 'SC-TF-7.0.67-300-500V', name: 'Twin Flat Cable 7/0.67mm² - 300/500V', category: 'Power Cables', listPrice: 11950, costPrice: 8100 },
  { sku: 'SC-TF-7.0.67-300-500V-6mm2', name: 'Twin Flat Cable 7/0.67mm² (6mm²) - 300/500V', category: 'Power Cables', listPrice: 13450, costPrice: 9200 },

  // ===== AUTO CABLE Cu/PVC (ISO 6722:2011) =====
  { sku: 'AUTO-16.0.20-300-500V', name: 'Auto Cable 16/0.20mm² - 300/500V', category: 'Automotive Cables', listPrice: 11450, costPrice: 8100 },

  // ===== Cu/XLPE/PVC SINGLE CORE (SLS 2691) =====
  { sku: 'XLPE-19.1.78-600-1000V', name: 'Cu/XLPE/PVC Single Core 19/1.78mm² - 600/1000V', category: 'Power Cables', listPrice: 6273, costPrice: 4200 },
  { sku: 'XLPE-37.2.03-600-1000V', name: 'Cu/XLPE/PVC Single Core 37/2.03mm² - 600/1000V', category: 'Power Cables', listPrice: 12236, costPrice: 8800 },

  // ===== BATTERY WIRE (BS 6004:1995) =====
  { sku: 'BATT-19.1.35-300-500V', name: 'Battery Wire 19/1.35mm² - 300/500V', category: 'Specialized Cables', listPrice: 30130, costPrice: 21500 },
  { sku: 'BATT-354.0.30-300-500V', name: 'Battery Wire 354/0.30mm² - 300/500V', category: 'Specialized Cables', listPrice: 37648, costPrice: 26800 },

  // ===== PVC EARTH CABLES (BS EN 50525-2-31) =====
  { sku: 'EARTH-1.1.13-450-750V', name: 'PVC Earth Cable 1/1.13mm² - 450/750V', category: 'Power Cables', listPrice: 8750, costPrice: 5900 },
  { sku: 'EARTH-7.0.53-450-750V', name: 'PVC Earth Cable 7/0.53mm² - 450/750V', category: 'Power Cables', listPrice: 15600, costPrice: 10500 },

  // ===== FLEXIBLE CORDS (SLS 1504-2-31) =====
  { sku: 'FLEX-16.0.20-300-300V', name: 'Flexible Cord 16/0.20mm² - 300/300V', category: 'Specialized Cables', listPrice: 13340, costPrice: 9000 },
  { sku: 'FLEX-32.0.20-300-500V', name: 'Flexible Cord 32/0.20-2-C - 300/500V', category: 'Specialized Cables', listPrice: 16240, costPrice: 10800 },

  // ===== TELEPHONE CABLES (BS 4808:1972) =====
  { sku: 'TEL-SINGLE-PAIR', name: 'Telephone Cable Single Pair', category: 'Control & Signal Cables', listPrice: 9300, costPrice: 6200 },
  { sku: 'TEL-TWO-PAIR', name: 'Telephone Cable Two Pair', category: 'Control & Signal Cables', listPrice: 15800, costPrice: 10600 },

  // ===== UNARMED POWER (IEC 60502) =====
  { sku: 'UNARM-1.5-600-1000V-1C', name: 'Unarmed Power Cable 1.5mm² 1-Core - 600/1000V', category: 'Power Cables', listPrice: 1000, costPrice: 650 },
  { sku: 'UNARM-2.5-600-1000V-1C', name: 'Unarmed Power Cable 2.5mm² 1-Core - 600/1000V', category: 'Power Cables', listPrice: 1200, costPrice: 800 },
  { sku: 'UNARM-6-600-1000V-4C', name: 'Unarmed Power Cable 6mm² 4-Core - 600/1000V', category: 'Power Cables', listPrice: 3600, costPrice: 2400 },

  // ===== ARMOURED POWER (SLS 987 / BS 6346) =====
  { sku: 'ARM-1.5-600-1000V-1C', name: 'Armoured Power Cable 1.5mm² 1-Core - 600/1000V SWA', category: 'Power Cables', listPrice: 1100, costPrice: 800 },
  { sku: 'ARM-6-600-1000V-4C', name: 'Armoured Power Cable 6mm² 4-Core - 600/1000V SWA', category: 'Power Cables', listPrice: 3900, costPrice: 2600 },

  // ===== CONTROL CABLES (BS 6346) =====
  { sku: 'CTRL-2-CORE-1.5', name: 'Control Cable 2-Core 1.5mm² - 600/1000V', category: 'Control & Signal Cables', listPrice: 2300, costPrice: 1500 },
  { sku: 'CTRL-7-CORE-1.5', name: 'Control Cable 7-Core 1.5mm² - 600/1000V', category: 'Control & Signal Cables', listPrice: 3200, costPrice: 2100 },

  // ===== WELDING CABLES (BS 638) =====
  { sku: 'WELD-25-600V', name: 'Welding Cable 25mm² - 600V', category: 'Specialized Cables', listPrice: 2750, costPrice: 1800 },
  { sku: 'WELD-35-600V', name: 'Welding Cable 35mm² - 600V', category: 'Specialized Cables', listPrice: 3720, costPrice: 2400 },

  // ===== COAXIAL (JIS C 3501) =====
  { sku: 'COAX-1.80-75D-MULTI', name: 'Coaxial Cable 1/0.80 75D - Multi Channel', category: 'Control & Signal Cables', listPrice: 27000, costPrice: 18000 },
  { sku: 'COAX-1.80-75D-2CH', name: 'Coaxial Cable 1/0.80 75D - 2 Channel', category: 'Control & Signal Cables', listPrice: 39200, costPrice: 26000 },

  // ===== SOLAR (SLS 1542) — list price TBD on price list =====
  { sku: 'SOLAR-4MM2-500COIL', name: 'Solar PV Cable 4mm² - 500m Coil', category: 'Specialized Cables', listPrice: 0, costPrice: 0 },
  { sku: 'SOLAR-6MM2-500COIL', name: 'Solar PV Cable 6mm² - 500m Coil', category: 'Specialized Cables', listPrice: 0, costPrice: 0 },
];

const CATEGORY_META = {
  'Power Cables': 'Single core, twin flat, XLPE, earth, unarmed & armoured power cables',
  'Automotive Cables': 'Auto Cable Cu/PVC per ISO 6722:2011',
  'Control & Signal Cables': 'Control, telephone and coaxial cables',
  'Specialized Cables': 'Battery, flex, welding and solar cables',
};

async function upsertCategory(name) {
  const { data: existing } = await supabase.from('categories').select('*').eq('name', name).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, description: CATEGORY_META[name] || null }])
    .select()
    .single();
  if (error) throw new Error(`category ${name}: ${error.message}`);
  return data.id;
}

async function upsertBrand() {
  const { data: existing } = await supabase.from('brands').select('*').eq('name', 'Sierra Cables').maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from('brands').insert([{ name: 'Sierra Cables' }]).select().single();
  if (error) throw new Error(`brand: ${error.message}`);
  return data.id;
}

async function upsertSupplier() {
  const { data: existing } = await supabase
    .from('suppliers')
    .select('*')
    .eq('name', 'Sierra Cables PLC')
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from('suppliers')
    .insert([
      {
        name: 'Sierra Cables PLC',
        contact_person: 'Sales Desk',
        contact_number: '0114412000',
        address: 'PO Box 6, Kaduweela | info@sierracables.lk',
        balance: 0,
      },
    ])
    .select()
    .single();
  if (error) throw new Error(`supplier: ${error.message}`);
  return data.id;
}

async function main() {
  console.log(`Importing ${PRODUCTS.length} Sierra Cables products...`);

  const brandId = await upsertBrand();
  const supplierId = await upsertSupplier();
  console.log(`Brand id=${brandId}, Supplier id=${supplierId}`);

  const categoryIds = {};
  for (const name of Object.keys(CATEGORY_META)) {
    categoryIds[name] = await upsertCategory(name);
  }
  console.log('Categories:', categoryIds);

  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors = [];

  for (const p of PRODUCTS) {
    const row = {
      name: p.name,
      barcode: p.sku,
      selling_price: p.listPrice,
      cost_price: p.costPrice,
      stock_quantity: 0,
      category_id: categoryIds[p.category] ?? null,
      brand_id: brandId,
    };

    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('barcode', p.sku)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('products').update(row).eq('id', existing.id);
      if (error) {
        failed++;
        errors.push({ sku: p.sku, reason: error.message });
      } else {
        updated++;
      }
    } else {
      const { error } = await supabase.from('products').insert([row]);
      if (error) {
        failed++;
        errors.push({ sku: p.sku, reason: error.message });
      } else {
        created++;
      }
    }
  }

  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
  const { data: sample } = await supabase
    .from('products')
    .select('barcode, name, selling_price, cost_price')
    .order('id')
    .limit(5);

  console.log(
    JSON.stringify(
      {
        created,
        updated,
        failed,
        totalInDb: count,
        errors,
        sample,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
