/**
 * GRN → Auto-Inventory helpers (Electron/SQLite adaptation of Prisma service design).
 * Stock units stay in product packaging; meters are calculated for audit & display.
 */

import {
  parseUnitFromName,
  stripUnitFromName,
  unitLabel,
  unitMeters,
  withUnitInName,
  type ProductUnit,
} from '../data/sierraCablesCatalog';

export type GrnPackagingType =
  | '1 Roll (100M)'
  | '0.5 Roll (50M)'
  | 'Coil (10M)'
  | 'Coil (500M)'
  | 'Per Meter'
  | 'Custom Meters';

export const GRN_PACKAGING_OPTIONS: {
  type: GrnPackagingType;
  unit: ProductUnit;
  meters: number | null;
}[] = [
  { type: '1 Roll (100M)', unit: 'roll_100', meters: 100 },
  { type: '0.5 Roll (50M)', unit: 'roll_50', meters: 50 },
  { type: 'Coil (10M)', unit: 'coil_10', meters: 10 },
  { type: 'Coil (500M)', unit: 'coil_500', meters: 500 },
  { type: 'Per Meter', unit: 'meter', meters: 1 },
  { type: 'Custom Meters', unit: 'custom', meters: null },
];

export function packagingTypeFromUnit(unit: ProductUnit): GrnPackagingType {
  switch (unit) {
    case 'roll_100':
      return '1 Roll (100M)';
    case 'roll_50':
      return '0.5 Roll (50M)';
    case 'coil_10':
      return 'Coil (10M)';
    case 'coil_500':
      return 'Coil (500M)';
    case 'meter':
      return 'Per Meter';
    case 'custom':
      return 'Custom Meters';
  }
}

export function productUnitFromPackagingType(packagingType: GrnPackagingType): ProductUnit {
  const opt = GRN_PACKAGING_OPTIONS.find((o) => o.type === packagingType);
  return opt?.unit ?? 'roll_100';
}

export function metersPerPackage(packagingType: GrnPackagingType, customMeters?: number): number {
  const opt = GRN_PACKAGING_OPTIONS.find((o) => o.type === packagingType);
  if (!opt) return 100;
  if (opt.meters == null) return Math.max(1, customMeters || 1);
  return opt.meters;
}

/** Total meters for a GRN line. */
export function calcLineTotalMeters(
  packagingType: GrnPackagingType,
  quantity: number,
  quantityMeters?: number
): number {
  if (packagingType === 'Custom Meters') {
    return Math.max(0, quantityMeters || 0);
  }
  return Math.max(0, quantity) * metersPerPackage(packagingType);
}

/**
 * Stock units for a GRN line when the product tag matches received packaging.
 * For rolls/coils: stock units = pack qty (1 Roll → 1 unit, 0.5 Roll → 1 unit each).
 */
export function stockUnitsForGrnLine(
  packagingType: GrnPackagingType,
  quantity: number,
  totalMeters: number,
  customMeters?: number
): number {
  const unit = productUnitFromPackagingType(packagingType);
  if (unit === 'meter') return Math.round(totalMeters);
  if (unit === 'custom') {
    const per = Math.max(1, customMeters || 1);
    return Math.round(totalMeters / per);
  }
  return Math.max(0, quantity);
}

/** Product display name with unit tag from GRN packaging (e.g. 0.5 Roll → [Roll-50M]). */
export function grnLineProductName(
  baseName: string,
  packagingType: GrnPackagingType,
  customMeters?: number
): string {
  const unit = productUnitFromPackagingType(packagingType);
  const meters =
    unit === 'custom' ? Math.max(1, customMeters || 1) : unitMeters(unit, customMeters);
  return withUnitInName(stripUnitFromName(baseName), unit, meters);
}

/**
 * Convert received meters into product stock units (rolls/coils/meters).
 * Product packaging is parsed from the product name tag.
 */
export function metersToStockUnits(
  productName: string,
  totalMeters: number
): number {
  const { unit, customMeters } = parseUnitFromName(productName);
  const perUnit = unitMeters(unit, customMeters);
  if (perUnit <= 0) return Math.round(totalMeters);
  return Math.round(totalMeters / perUnit);
}

export function defaultPackagingForProduct(productName: string): {
  packagingType: GrnPackagingType;
  quantityMeters: number;
} {
  const { unit, customMeters } = parseUnitFromName(productName);
  return {
    packagingType: packagingTypeFromUnit(unit),
    quantityMeters: unit === 'custom' ? customMeters : unitMeters(unit, customMeters),
  };
}

export function describeProductPackaging(productName: string): string {
  const { unit, customMeters } = parseUnitFromName(productName);
  return unitLabel(unit, customMeters);
}

export function grnItemStockUnits(
  item: {
    stock_units?: number | null;
    total_meters?: number | null;
    quantity?: number;
    packaging_type?: GrnPackagingType | string | null;
    quantity_meters?: number | null;
  },
  productName?: string
): number {
  const meters = Number(item.total_meters) || 0;
  const packaging = item.packaging_type as GrnPackagingType | undefined;
  if (packaging && meters > 0) {
    return stockUnitsForGrnLine(
      packaging,
      Number(item.quantity) || 0,
      meters,
      item.quantity_meters ?? undefined
    );
  }
  if (item.stock_units != null) return Number(item.stock_units) || 0;
  if (meters > 0 && productName) return metersToStockUnits(productName, meters);
  return Number(item.quantity) || 0;
}

/** Find a product whose name tag matches the GRN packaging for the same cable base. */
export function findProductForPackaging(
  products: any[],
  sourceProduct: { name?: string; barcode?: string } | undefined,
  packagingType: GrnPackagingType,
  quantityMeters?: number
): any | undefined {
  if (!sourceProduct?.name) return undefined;
  const expectedName = grnLineProductName(sourceProduct.name, packagingType, quantityMeters).toLowerCase();
  const byName = products.find((p) => String(p.name || '').toLowerCase() === expectedName);
  if (byName) return byName;

  const base = stripUnitFromName(sourceProduct.name).toLowerCase();
  const unit = productUnitFromPackagingType(packagingType);
  return products.find((p) => {
    if (stripUnitFromName(String(p.name || '')).toLowerCase() !== base) return false;
    return parseUnitFromName(String(p.name || '')).unit === unit;
  });
}

/**
 * Ensure inventory has a product whose [Roll-100M]/[Roll-50M]/… tag matches packaging.
 * Creates a sibling product when the selected product has a different pack tag.
 */
export async function ensureProductMatchesPackaging(
  api: {
    addProduct: (p: any) => Promise<any>;
    updateProduct?: (id: number, p: any) => Promise<any>;
  },
  line: {
    product_id: string;
    packaging_type: GrnPackagingType;
    quantity_meters: number;
    cost_price: number;
  },
  products: any[]
): Promise<{ productId: number; products: any[] }> {
  const source = products.find((p) => String(p.id) === String(line.product_id));
  if (!source) throw new Error(`Product not found: ${line.product_id}`);

  const expectedName = grnLineProductName(source.name, line.packaging_type, line.quantity_meters);
  const existing = findProductForPackaging(products, source, line.packaging_type, line.quantity_meters);

  if (existing) {
    const patch = {
      name: expectedName,
      cost_price: line.cost_price > 0 ? line.cost_price : existing.cost_price,
    };
    if (api.updateProduct && String(existing.name) !== expectedName) {
      await api.updateProduct(Number(existing.id), patch);
    }
    const nextProducts = products.map((p) =>
      Number(p.id) === Number(existing.id) ? { ...p, ...patch } : p
    );
    return { productId: Number(existing.id), products: nextProducts };
  }

  const created = await api.addProduct({
    name: expectedName,
    barcode: source.barcode || null,
    selling_price: source.selling_price || 0,
    cost_price: line.cost_price > 0 ? line.cost_price : source.cost_price || 0,
    stock_quantity: 0,
  });

  const productId = Number(created?.id ?? created);
  if (!productId) throw new Error('Failed to create packaging variant product');

  const nextProducts = [
    ...products,
    {
      ...(created || {}),
      id: productId,
      name: expectedName,
      barcode: source.barcode || null,
      selling_price: source.selling_price || 0,
      cost_price: line.cost_price > 0 ? line.cost_price : source.cost_price || 0,
      stock_quantity: 0,
    },
  ];
  return { productId, products: nextProducts };
}

export interface GrnLineInput {
  product_id: number;
  packaging_type: GrnPackagingType;
  quantity: number;
  quantity_meters?: number;
  total_meters: number;
  cost_price: number;
  total_price: number;
}

export interface GrnProcessSummary {
  itemsProcessed: number;
  totalMetersAdded: number;
  lines: { product_id: number; meters: number; stockUnits: number }[];
}

/** Client-side preview of what Confirm & Receive will add. */
export function previewGrnInventory(
  items: {
    product_id: number;
    productName?: string;
    packaging_type: GrnPackagingType;
    quantity: number;
    quantity_meters?: number;
  }[],
  productsById: Map<number, { name: string }>
): GrnProcessSummary {
  const lines: GrnProcessSummary['lines'] = [];
  let totalMetersAdded = 0;
  for (const item of items) {
    const meters = calcLineTotalMeters(item.packaging_type, item.quantity, item.quantity_meters);
    const stockUnits = stockUnitsForGrnLine(
      item.packaging_type,
      item.quantity,
      meters,
      item.quantity_meters
    );
    lines.push({ product_id: item.product_id, meters, stockUnits });
    totalMetersAdded += meters;
  }
  return {
    itemsProcessed: lines.length,
    totalMetersAdded,
    lines,
  };
}
