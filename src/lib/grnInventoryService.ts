/**
 * GRN → Auto-Inventory helpers (Electron/SQLite adaptation of Prisma service design).
 * Stock units stay in product packaging; meters are calculated for audit & display.
 */

import {
  parseUnitFromName,
  unitLabel,
  unitMeters,
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
  items: { product_id: number; productName?: string; packaging_type: GrnPackagingType; quantity: number; quantity_meters?: number }[],
  productsById: Map<number, { name: string }>
): GrnProcessSummary {
  const lines: GrnProcessSummary['lines'] = [];
  let totalMetersAdded = 0;
  for (const item of items) {
    const meters = calcLineTotalMeters(item.packaging_type, item.quantity, item.quantity_meters);
    const product = productsById.get(item.product_id);
    const stockUnits = product ? metersToStockUnits(product.name, meters) : item.quantity;
    lines.push({ product_id: item.product_id, meters, stockUnits });
    totalMetersAdded += meters;
  }
  return {
    itemsProcessed: lines.length,
    totalMetersAdded,
    lines,
  };
}
