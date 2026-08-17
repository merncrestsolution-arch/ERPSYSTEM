/** Sierra Cables PLC — corrected price list (11.06.2026).
 * (S) Single Core vs (T) Twin Flat clearly separated.
 * Packaging: 1 Roll (100M) | 0.5 Roll (50M) | Custom Bobbin (editable meters).
 */

/** Packaging / stock unit for inventory & GRN. */
export type ProductUnit =
  | 'roll_100'
  | 'roll_50'
  | 'coil_10'
  | 'coil_500'
  | 'meter'
  | 'custom';

/** @deprecated Prefer roll_100 — kept for older [Roll] tags. */
export type LegacyProductUnit = 'roll' | ProductUnit;

export const METERS_PER_ROLL = 100;
export const METERS_PER_HALF_ROLL = 50;
export const METERS_PER_BATTERY_COIL = 10;
export const METERS_PER_SOLAR_COIL = 500;

export type PackagingOption = {
  id: ProductUnit;
  label: string;
  meters: number | 'USER_DEFINED';
  editable: boolean;
};

export const PACKAGING_OPTIONS: PackagingOption[] = [
  { id: 'roll_100', label: '1 Roll (100M)', meters: METERS_PER_ROLL, editable: false },
  { id: 'roll_50', label: '0.5 Roll (50M)', meters: METERS_PER_HALF_ROLL, editable: false },
  { id: 'coil_10', label: '1 Coil (10M)', meters: METERS_PER_BATTERY_COIL, editable: false },
  { id: 'coil_500', label: '500m Coil', meters: METERS_PER_SOLAR_COIL, editable: false },
  { id: 'meter', label: 'Per Meter', meters: 1, editable: false },
  { id: 'custom', label: 'Custom Bobbin', meters: 'USER_DEFINED', editable: true },
];

export type SierraCatalogItem = {
  sku: string;
  name: string;
  category: string;
  /** (S) Single Core or (T) Twin Flat when applicable. */
  cableType?: 'S' | 'T';
  metricSize?: string;
  crossSection?: string;
  voltage?: string;
  cores?: string;
  /** List price for `priceBasisMeters` (usually 100m). */
  listPrice: number;
  costPrice: number;
  /** Meters the list price covers (100, 10, or 1). */
  priceBasisMeters: number;
  /** Allowed packaging when adding / receiving stock. */
  packaging: ProductUnit[];
  /** Default packaging for Add Product. */
  defaultUnit: ProductUnit;
  /** Custom bobbin meters are fully editable (flex / weld / coax). */
  editableMeters: boolean;
};

/** Top-level ERP categories (synced with Inventory filter chips). */
export const SIERRA_CATEGORIES = [
  { name: 'Single Core (S)', description: 'Single core cables SLS 733:2016 — 300/500V' },
  { name: 'Twin Flat (T)', description: 'Twin flat cables SLS 733:2016 — 300/500V' },
  { name: 'Cu/XLPE Single Core', description: 'Cu/XLPE/PVC single core SLS 2691 / IEC 60702' },
  { name: 'Automotive Cables', description: 'Auto Cable Cu/PVC ISO 6722:2011' },
  { name: 'Battery Wire', description: 'Battery wire Cu/PVC BS 6004:1995' },
  { name: 'Earth Cables', description: 'PVC insulated earth BS EN 50525-2-31' },
  { name: 'Flexible Cords', description: 'Flexible cords Cu/PVC/PVC SLS 1504 — fully editable bobbins' },
  { name: 'Telephone Cables', description: 'Telephone cables BS 4808:1972' },
  { name: 'Unarmed Power', description: 'Unarmed power IEC 60502 / BS 5467' },
  { name: 'Armoured Power', description: 'Armoured SWA / XLPE-SWA SLS 987 & SLS 1186' },
  { name: 'Welding Cables', description: 'Welding cables BS 638 / IS 9857 — per meter' },
  { name: 'Coaxial Cables', description: 'Coaxial JIS C 3501 75D — per meter' },
  { name: 'Solar Cables', description: 'Solar PV SLS 1542 / BS EN 50618 — 500m coil' },
] as const;

const cost = (list: number) => Math.round(list * 0.7);

type PackPreset = 'std_half_custom' | 'roll_custom' | 'battery' | 'meter_custom' | 'solar';

function packs(preset: PackPreset): { packaging: ProductUnit[]; defaultUnit: ProductUnit; editableMeters: boolean } {
  switch (preset) {
    case 'std_half_custom':
      return { packaging: ['roll_100', 'roll_50', 'custom'], defaultUnit: 'roll_100', editableMeters: true };
    case 'roll_custom':
      return { packaging: ['roll_100', 'custom'], defaultUnit: 'roll_100', editableMeters: true };
    case 'battery':
      return { packaging: ['coil_10', 'custom'], defaultUnit: 'coil_10', editableMeters: true };
    case 'meter_custom':
      return { packaging: ['meter', 'custom'], defaultUnit: 'meter', editableMeters: true };
    case 'solar':
      return { packaging: ['coil_500', 'custom'], defaultUnit: 'coil_500', editableMeters: true };
  }
}

function p(
  sku: string,
  name: string,
  category: string,
  listPrice: number,
  opts: {
    priceBasisMeters?: number;
    pack?: PackPreset;
    cableType?: 'S' | 'T';
    metricSize?: string;
    crossSection?: string;
    voltage?: string;
    cores?: string;
    fullyEditable?: boolean;
  } = {}
): SierraCatalogItem {
  const pack = packs(opts.pack ?? 'roll_custom');
  return {
    sku,
    name,
    category,
    cableType: opts.cableType,
    metricSize: opts.metricSize,
    crossSection: opts.crossSection,
    voltage: opts.voltage,
    cores: opts.cores,
    listPrice,
    costPrice: cost(listPrice),
    priceBasisMeters: opts.priceBasisMeters ?? 100,
    packaging: pack.packaging,
    defaultUnit: pack.defaultUnit,
    editableMeters: opts.fullyEditable ?? pack.editableMeters,
  };
}

const SC_S = 'Single Core (S)';
const SC_T = 'Twin Flat (T)';
const XLPE = 'Cu/XLPE Single Core';
const AUTO = 'Automotive Cables';
const BATT = 'Battery Wire';
const EARTH = 'Earth Cables';
const FLEX = 'Flexible Cords';
const TEL = 'Telephone Cables';
const UNARM = 'Unarmed Power';
const ARM = 'Armoured Power';
const WELD = 'Welding Cables';
const COAX = 'Coaxial Cables';
const SOLAR = 'Solar Cables';

export const SIERRA_CABLES_CATALOG: SierraCatalogItem[] = [
  // ===== SINGLE CORE & TWIN FLAT — SLS 733:2016 (BS 6004:2012) 300/500V =====
  // Source: Sierra Price List 11.06.2026 — List Price Rs. / 100m Coil
  // (S) = Single Core | (T) = Twin Flat — verified from PDF table (17 rows)

  // --- Single Core (S) — 11 ---
  p('SC-S-1.13', 'Single Core 1/1.13mm² (S)', SC_S, 8900, {
    pack: 'std_half_custom',
    cableType: 'S',
    metricSize: '1/1.13',
    crossSection: '1.0mm²',
    voltage: '300/500V',
  }),
  p('SC-S-1.38', 'Single Core 1/1.38mm² (S)', SC_S, 18120, {
    pack: 'std_half_custom',
    cableType: 'S',
    metricSize: '1/1.38',
    crossSection: '1.5mm²',
    voltage: '300/500V',
  }),
  p('SC-S-7.0.53', 'Single Core 7/0.53mm² (S)', SC_S, 18120, {
    pack: 'std_half_custom',
    cableType: 'S',
    metricSize: '7/0.53',
    crossSection: '1.5mm²',
    voltage: '300/500V',
  }),
  p('SC-S-7.0.67', 'Single Core 7/0.67mm² (S)', SC_S, 27820, {
    pack: 'std_half_custom',
    cableType: 'S',
    metricSize: '7/0.67',
    crossSection: '2.5mm²',
    voltage: '300/500V',
  }),
  p('SC-S-7.0.85', 'Single Core 7/0.85mm² (S)', SC_S, 42150, {
    pack: 'std_half_custom',
    cableType: 'S',
    metricSize: '7/0.85',
    crossSection: '4mm²',
    voltage: '300/500V',
  }),
  p('SC-S-7.1.04', 'Single Core 7/1.04mm² (S)', SC_S, 64050, {
    pack: 'std_half_custom',
    cableType: 'S',
    metricSize: '7/1.04',
    crossSection: '6mm²',
    voltage: '300/500V',
  }),
  p('SC-S-7.1.35', 'Single Core 7/1.35mm² (S)', SC_S, 107630, {
    pack: 'std_half_custom',
    cableType: 'S',
    metricSize: '7/1.35',
    crossSection: '10mm²',
    voltage: '300/500V',
  }),
  p('SC-S-7.1.70', 'Single Core 7/1.70mm² (S)', SC_S, 167450, {
    pack: 'std_half_custom',
    cableType: 'S',
    metricSize: '7/1.70',
    crossSection: '16mm²',
    voltage: '300/500V',
  }),
  p('SC-S-7.2.14', 'Single Core 7/2.14mm² (S)', SC_S, 288000, {
    pack: 'std_half_custom',
    cableType: 'S',
    metricSize: '7/2.14',
    crossSection: '25mm²',
    voltage: '300/500V',
  }),
  p('SC-S-19.1.35', 'Single Core 19/1.35mm² (S)', SC_S, 376500, {
    pack: 'std_half_custom',
    cableType: 'S',
    metricSize: '19/1.35',
    crossSection: '25mm²',
    voltage: '300/500V',
  }),
  p('SC-S-19.1.53', 'Single Core 19/1.53mm² (S)', SC_S, 470000, {
    pack: 'std_half_custom',
    cableType: 'S',
    metricSize: '19/1.53',
    crossSection: '35mm²',
    voltage: '300/500V',
  }),

  // --- Twin Flat (T) — 7 (paired sizes only; larger sizes are Single Core only) ---
  p('SC-T-7.0.53', 'Twin Flat 7/0.53mm² (T)', SC_T, 35750, {
    pack: 'std_half_custom',
    cableType: 'T',
    metricSize: '7/0.53',
    crossSection: '2×1.5mm²',
    voltage: '300/500V',
  }),
  p('SC-T-7.0.67', 'Twin Flat 7/0.67mm² (T)', SC_T, 56190, {
    pack: 'std_half_custom',
    cableType: 'T',
    metricSize: '7/0.67',
    crossSection: '2×2.5mm²',
    voltage: '300/500V',
  }),
  p('SC-T-7.0.85', 'Twin Flat 7/0.85mm² (T)', SC_T, 86870, {
    pack: 'std_half_custom',
    cableType: 'T',
    metricSize: '7/0.85',
    crossSection: '2×4mm²',
    voltage: '300/500V',
  }),
  p('SC-T-7.1.04', 'Twin Flat 7/1.04mm² (T)', SC_T, 129400, {
    pack: 'std_half_custom',
    cableType: 'T',
    metricSize: '7/1.04',
    crossSection: '2×6mm²',
    voltage: '300/500V',
  }),
  p('SC-T-7.1.35', 'Twin Flat 7/1.35mm² (T)', SC_T, 218200, {
    pack: 'std_half_custom',
    cableType: 'T',
    metricSize: '7/1.35',
    crossSection: '2×10mm²',
    voltage: '300/500V',
  }),
  p('SC-T-7.1.70', 'Twin Flat 7/1.70mm² (T)', SC_T, 337590, {
    pack: 'std_half_custom',
    cableType: 'T',
    metricSize: '7/1.70',
    crossSection: '2×16mm²',
    voltage: '300/500V',
  }),

  // ===== CU/XLPE/PVC SINGLE CORE — 11 =====
  p('XLPE-19.1.78-50', 'Cu/XLPE 19/1.78 (50mm²)', XLPE, 6273, {
    metricSize: '19/1.78',
    crossSection: '50mm²',
    voltage: '600/1000V',
  }),
  p('XLPE-19.2.14-70', 'Cu/XLPE 19/2.14 (70mm²)', XLPE, 8942, {
    metricSize: '19/2.14',
    crossSection: '70mm²',
    voltage: '600/1000V',
  }),
  p('XLPE-19.2.52-95', 'Cu/XLPE 19/2.52 (95mm²)', XLPE, 12236, {
    metricSize: '19/2.52',
    crossSection: '95mm²',
    voltage: '600/1000V',
  }),
  p('XLPE-37.2.03-95', 'Cu/XLPE 37/2.03 (95mm²)', XLPE, 12236, {
    metricSize: '37/2.03',
    crossSection: '95mm²',
    voltage: '600/1000V',
  }),
  p('XLPE-37.2.52-120', 'Cu/XLPE 37/2.52 (120mm²)', XLPE, 15373, {
    metricSize: '37/2.52',
    crossSection: '120mm²',
    voltage: '600/1000V',
  }),
  p('XLPE-37.2.52-185', 'Cu/XLPE 37/2.52 (185mm²)', XLPE, 23687, {
    metricSize: '37/2.52',
    crossSection: '185mm²',
    voltage: '600/1000V',
  }),
  p('XLPE-61.2.25-240', 'Cu/XLPE 61/2.25 (240mm²)', XLPE, 31059, {
    metricSize: '61/2.25',
    crossSection: '240mm²',
    voltage: '600/1000V',
  }),
  p('XLPE-61.2.52-300', 'Cu/XLPE 61/2.52 (300mm²)', XLPE, 38982, {
    metricSize: '61/2.52',
    crossSection: '300mm²',
    voltage: '600/1000V',
  }),
  p('XLPE-61.2.85-400', 'Cu/XLPE 61/2.85 (400mm²)', XLPE, 49800, {
    metricSize: '61/2.85',
    crossSection: '400mm²',
    voltage: '600/1000V',
  }),
  p('XLPE-61.3.25-500', 'Cu/XLPE 61/3.25 (500mm²)', XLPE, 50130, {
    metricSize: '61/3.25',
    crossSection: '500mm²',
    voltage: '600/1000V',
  }),
  p('XLPE-91.3.00-630', 'Cu/XLPE 91/3.00 (630mm²)', XLPE, 65670, {
    metricSize: '91/3.00',
    crossSection: '630mm²',
    voltage: '600/1000V',
  }),

  // ===== AUTO CABLE — 1 =====
  p('AUTO-16.0.20', 'Auto Cable 16/0.20-T1', AUTO, 11450, {
    pack: 'roll_custom',
    priceBasisMeters: 100,
    metricSize: '16/0.20-T1',
    crossSection: '250.5mm²',
    voltage: '300/500V',
  }),

  // ===== BATTERY WIRE — 4 =====
  p('BATT-19.1.35', 'Battery Wire 19/1.35 (25mm²)', BATT, 30130, {
    pack: 'battery',
    priceBasisMeters: 10,
    metricSize: '19/1.35',
    crossSection: '25mm²',
    voltage: '300/500V',
  }),
  p('BATT-19.1.53', 'Battery Wire 19/1.53 (35mm²)', BATT, 37648, {
    pack: 'battery',
    priceBasisMeters: 10,
    metricSize: '19/1.53',
    crossSection: '35mm²',
    voltage: '300/500V',
  }),
  p('BATT-354.0.30', 'Battery Wire 354/0.30 (25mm²)', BATT, 28790, {
    pack: 'battery',
    priceBasisMeters: 10,
    metricSize: '354/0.30',
    crossSection: '25mm²',
    voltage: '300/500V',
  }),
  p('BATT-495.0.30', 'Battery Wire 495/0.30 (25mm²)', BATT, 60180, {
    pack: 'battery',
    priceBasisMeters: 10,
    metricSize: '495/0.30',
    crossSection: '25mm²',
    voltage: '300/500V',
  }),

  // ===== EARTH CABLES — 7 =====
  p('EARTH-1.1.13', 'Earth Cable 1/1.13 (1mm²)', EARTH, 8750, {
    pack: 'std_half_custom',
    metricSize: '1/1.13',
    crossSection: '1mm²',
    voltage: '450/750V',
  }),
  p('EARTH-7.0.53', 'Earth Cable 7/0.53 (1.5mm²)', EARTH, 15600, {
    pack: 'std_half_custom',
    metricSize: '7/0.53',
    crossSection: '1.5mm²',
    voltage: '450/750V',
  }),
  p('EARTH-7.0.67', 'Earth Cable 7/0.67 (2.5mm²)', EARTH, 24340, {
    pack: 'std_half_custom',
    metricSize: '7/0.67',
    crossSection: '2.5mm²',
    voltage: '450/750V',
  }),
  p('EARTH-7.0.85', 'Earth Cable 7/0.85 (4mm²)', EARTH, 39670, {
    pack: 'std_half_custom',
    metricSize: '7/0.85',
    crossSection: '4mm²',
    voltage: '450/750V',
  }),
  p('EARTH-7.1.04', 'Earth Cable 7/1.04 (6mm²)', EARTH, 59840, {
    pack: 'std_half_custom',
    metricSize: '7/1.04',
    crossSection: '6mm²',
    voltage: '450/750V',
  }),
  p('EARTH-7.1.35', 'Earth Cable 7/1.35 (10mm²)', EARTH, 102130, {
    pack: 'std_half_custom',
    metricSize: '7/1.35',
    crossSection: '10mm²',
    voltage: '450/750V',
  }),
  p('EARTH-7.1.70', 'Earth Cable 7/1.70 (16mm²)', EARTH, 160250, {
    pack: 'std_half_custom',
    metricSize: '7/1.70',
    crossSection: '16mm²',
    voltage: '450/750V',
  }),

  // ===== FLEXIBLE CORDS — 19 (FULLY EDITABLE) =====
  p('FLEX-16.0.20', 'Flexible 16/0.20 Single', FLEX, 13340, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '16/0.20-T1',
    cores: '1',
    voltage: '300/300V',
  }),
  p('FLEX-16.0.20-2C', 'Flexible 16/0.20 2-Core', FLEX, 16240, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '16/0.20-2-C',
    cores: '2',
    voltage: '300/300V',
  }),
  p('FLEX-16.0.20-3C', 'Flexible 16/0.20 3-Core', FLEX, 21940, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '16/0.20-3-C',
    cores: '3',
    voltage: '300/300V',
  }),
  p('FLEX-24.0.20-2C', 'Flexible 24/0.20 2-Core', FLEX, 24600, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '24/0.20-2-C',
    cores: '2',
    voltage: '300/500V',
  }),
  p('FLEX-24.0.20-3C', 'Flexible 24/0.20 3-Core', FLEX, 33010, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '24/0.20-3-C',
    cores: '3',
    voltage: '300/500V',
  }),
  p('FLEX-24.0.20-5C', 'Flexible 24/0.20 5-Core', FLEX, 42500, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '24/0.20-5-C',
    cores: '5',
    voltage: '300/500V',
  }),
  p('FLEX-32.0.20-2C', 'Flexible 32/0.20 2-Core', FLEX, 31630, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '32/0.20-2-C',
    cores: '2',
    voltage: '300/500V',
  }),
  p('FLEX-32.0.20-3C', 'Flexible 32/0.20 3-Core', FLEX, 54520, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '32/0.20-3-C',
    cores: '3',
    voltage: '300/500V',
  }),
  p('FLEX-30.0.25-2C', 'Flexible 30/0.25 2-Core', FLEX, 43270, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '30/0.25-2-C',
    cores: '2',
    voltage: '300/500V',
  }),
  p('FLEX-30.0.25-3C', 'Flexible 30/0.25 3-Core', FLEX, 64680, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '30/0.25-3-C',
    cores: '3',
    voltage: '300/500V',
  }),
  p('FLEX-30.0.25-4C', 'Flexible 30/0.25 4-Core', FLEX, 79220, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '30/0.25-4-C',
    cores: '4',
    voltage: '300/500V',
  }),
  p('FLEX-30.0.25-5C', 'Flexible 30/0.25 5-Core', FLEX, 93240, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '30/0.25-5-C',
    cores: '5',
    voltage: '300/500V',
  }),
  p('FLEX-50.0.25-2C', 'Flexible 50/0.25 2-Core', FLEX, 69310, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '50/0.25-2-C',
    cores: '2',
    voltage: '300/500V',
  }),
  p('FLEX-50.0.25-3C', 'Flexible 50/0.25 3-Core', FLEX, 97170, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '50/0.25-3-C',
    cores: '3',
    voltage: '300/500V',
  }),
  p('FLEX-50.0.25-4C', 'Flexible 50/0.25 4-Core', FLEX, 119260, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '50/0.25-4-C',
    cores: '4',
    voltage: '300/500V',
  }),
  p('FLEX-56.0.30-2C', 'Flexible 56/0.30 2-Core', FLEX, 103530, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '56/0.30-2-C',
    cores: '2',
    voltage: '300/500V',
  }),
  p('FLEX-56.0.30-3C', 'Flexible 56/0.30 3-Core', FLEX, 103330, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '56/0.30-3-C',
    cores: '3',
    voltage: '300/500V',
  }),
  p('FLEX-56.0.30-4C', 'Flexible 56/0.30 4-Core', FLEX, 140240, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '56/0.30-4-C',
    cores: '4',
    voltage: '300/500V',
  }),
  p('FLEX-56.0.30-5C', 'Flexible 56/0.30 5-Core', FLEX, 163400, {
    pack: 'std_half_custom',
    fullyEditable: true,
    metricSize: '56/0.30-5-C',
    cores: '5',
    voltage: '300/500V',
  }),

  // ===== TELEPHONE — 4 =====
  p('TEL-1PAIR', 'Telephone Single Pair', TEL, 9300, { cores: '1 Pair', voltage: 'Standard' }),
  p('TEL-2PAIR', 'Telephone Two Pair', TEL, 15800, { cores: '2 Pair', voltage: 'Standard' }),
  p('TEL-5PAIR', 'Telephone Five Pair', TEL, 38000, { cores: '5 Pair', voltage: 'Standard' }),
  p('TEL-10PAIR', 'Telephone Ten Pair', TEL, 51400, { cores: '10 Pair', voltage: 'Standard' }),

  // ===== UNARMED POWER IEC — 10 =====
  p('UNARM-IEC-1.5-1C', 'Unarmed 1.5mm² 1-Core', UNARM, 1000, {
    crossSection: '1.5mm²',
    cores: '1C',
    voltage: '600/1000V',
  }),
  p('UNARM-IEC-2.5-1C', 'Unarmed 2.5mm² 1-Core', UNARM, 1200, {
    crossSection: '2.5mm²',
    cores: '1C',
    voltage: '600/1000V',
  }),
  p('UNARM-IEC-4-1C', 'Unarmed 4mm² 1-Core', UNARM, 2800, {
    crossSection: '4mm²',
    cores: '1C',
    voltage: '600/1000V',
  }),
  p('UNARM-IEC-6-1C', 'Unarmed 6mm² 1-Core', UNARM, 3600, {
    crossSection: '6mm²',
    cores: '1C',
    voltage: '600/1000V',
  }),
  p('UNARM-IEC-10-1C', 'Unarmed 10mm² 1-Core', UNARM, 5300, {
    crossSection: '10mm²',
    cores: '1C',
    voltage: '600/1000V',
  }),
  p('UNARM-IEC-16-1C', 'Unarmed 16mm² 1-Core', UNARM, 7300, {
    crossSection: '16mm²',
    cores: '1C',
    voltage: '600/1000V',
  }),
  p('UNARM-IEC-2.5-2C', 'Unarmed 2.5mm² 2-Core', UNARM, 2600, {
    crossSection: '2.5mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('UNARM-IEC-4-2C', 'Unarmed 4mm² 2-Core', UNARM, 3300, {
    crossSection: '4mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('UNARM-IEC-6-2C', 'Unarmed 6mm² 2-Core', UNARM, 4800, {
    crossSection: '6mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('UNARM-IEC-10-2C', 'Unarmed 10mm² 2-Core', UNARM, 7400, {
    crossSection: '10mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),

  // ===== UNARMED XLPE — 6 =====
  p('UNARM-XLPE-16-2C', 'XLPE Unarmed 16mm² 2-Core', UNARM, 10600, {
    crossSection: '16mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('UNARM-XLPE-16-4C', 'XLPE Unarmed 16mm² 4-Core', UNARM, 13200, {
    crossSection: '16mm²',
    cores: '4C',
    voltage: '600/1000V',
  }),
  p('UNARM-XLPE-35-2C', 'XLPE Unarmed 35mm² 2-Core', UNARM, 15500, {
    crossSection: '35mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('UNARM-XLPE-35-4C', 'XLPE Unarmed 35mm² 4-Core', UNARM, 19700, {
    crossSection: '35mm²',
    cores: '4C',
    voltage: '600/1000V',
  }),
  p('UNARM-XLPE-95-2C', 'XLPE Unarmed 95mm² 2-Core', UNARM, 53100, {
    crossSection: '95mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('UNARM-XLPE-120-2C', 'XLPE Unarmed 120mm² 2-Core', UNARM, 66100, {
    crossSection: '120mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),

  // ===== ARMOURED SLS 987 SWA — 10 =====
  p('ARM-SLS-1.5-1C', 'Armoured 1.5mm² 1-Core SWA', ARM, 1100, {
    crossSection: '1.5mm²',
    cores: '1C',
    voltage: '600/1000V',
  }),
  p('ARM-SLS-2.5-1C', 'Armoured 2.5mm² 1-Core SWA', ARM, 1300, {
    crossSection: '2.5mm²',
    cores: '1C',
    voltage: '600/1000V',
  }),
  p('ARM-SLS-4-1C', 'Armoured 4mm² 1-Core SWA', ARM, 2000, {
    crossSection: '4mm²',
    cores: '1C',
    voltage: '600/1000V',
  }),
  p('ARM-SLS-6-1C', 'Armoured 6mm² 1-Core SWA', ARM, 3600, {
    crossSection: '6mm²',
    cores: '1C',
    voltage: '600/1000V',
  }),
  p('ARM-SLS-10-1C', 'Armoured 10mm² 1-Core SWA', ARM, 5600, {
    crossSection: '10mm²',
    cores: '1C',
    voltage: '600/1000V',
  }),
  p('ARM-SLS-16-1C', 'Armoured 16mm² 1-Core SWA', ARM, 8200, {
    crossSection: '16mm²',
    cores: '1C',
    voltage: '600/1000V',
  }),
  p('ARM-SLS-2.5-2C', 'Armoured 2.5mm² 2-Core SWA', ARM, 2200, {
    crossSection: '2.5mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('ARM-SLS-4-2C', 'Armoured 4mm² 2-Core SWA', ARM, 3000, {
    crossSection: '4mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('ARM-SLS-6-2C', 'Armoured 6mm² 2-Core SWA', ARM, 3900, {
    crossSection: '6mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('ARM-SLS-10-2C', 'Armoured 10mm² 2-Core SWA', ARM, 5600, {
    crossSection: '10mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),

  // ===== ARMOURED XLPE/SWA — 9 =====
  p('ARM-XLPE-16-2C-V1', 'XLPE Armoured 16mm² 2-Core (Var-1)', ARM, 9000, {
    crossSection: '16mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('ARM-XLPE-16-2C-V2', 'XLPE Armoured 16mm² 2-Core (Var-2)', ARM, 12500, {
    crossSection: '16mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('ARM-XLPE-16-4C', 'XLPE Armoured 16mm² 4-Core', ARM, 20800, {
    crossSection: '16mm²',
    cores: '4C',
    voltage: '600/1000V',
  }),
  p('ARM-XLPE-35-2C', 'XLPE Armoured 35mm² 2-Core', ARM, 12500, {
    crossSection: '35mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('ARM-XLPE-35-4C', 'XLPE Armoured 35mm² 4-Core', ARM, 20800, {
    crossSection: '35mm²',
    cores: '4C',
    voltage: '600/1000V',
  }),
  p('ARM-XLPE-50-2C', 'XLPE Armoured 50mm² 2-Core', ARM, 27800, {
    crossSection: '50mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('ARM-XLPE-50-4C', 'XLPE Armoured 50mm² 4-Core', ARM, 40700, {
    crossSection: '50mm²',
    cores: '4C',
    voltage: '600/1000V',
  }),
  p('ARM-XLPE-95-2C', 'XLPE Armoured 95mm² 2-Core', ARM, 55300, {
    crossSection: '95mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),
  p('ARM-XLPE-120-2C', 'XLPE Armoured 120mm² 2-Core', ARM, 69400, {
    crossSection: '120mm²',
    cores: '2C',
    voltage: '600/1000V',
  }),

  // ===== WELDING — 3 (per meter, FULLY EDITABLE) =====
  p('WELD-25', 'Welding Cable 25mm²', WELD, 2750, {
    pack: 'meter_custom',
    priceBasisMeters: 1,
    fullyEditable: true,
    crossSection: '25mm²',
    voltage: '600V',
  }),
  p('WELD-35', 'Welding Cable 35mm²', WELD, 3720, {
    pack: 'meter_custom',
    priceBasisMeters: 1,
    fullyEditable: true,
    crossSection: '35mm²',
    voltage: '600V',
  }),
  p('WELD-50', 'Welding Cable 50mm²', WELD, 6010, {
    pack: 'meter_custom',
    priceBasisMeters: 1,
    fullyEditable: true,
    crossSection: '50mm²',
    voltage: '600V',
  }),

  // ===== COAXIAL — 3 (custom bobbin, FULLY EDITABLE; list = per 100M) =====
  p('COAX-1.80-MULTI', 'Coaxial 1/0.80 Multi Channel', COAX, 27000, {
    pack: 'meter_custom',
    priceBasisMeters: 100,
    fullyEditable: true,
    metricSize: '1/0.80',
    voltage: '75 Ohm',
  }),
  p('COAX-1.80-2CH', 'Coaxial 1/0.80 2-Channel', COAX, 39200, {
    pack: 'meter_custom',
    priceBasisMeters: 100,
    fullyEditable: true,
    metricSize: '1/0.80',
    voltage: '75 Ohm',
  }),
  p('COAX-1.50-2CH', 'Coaxial 1/0.50 2-Channel', COAX, 29600, {
    pack: 'meter_custom',
    priceBasisMeters: 100,
    fullyEditable: true,
    metricSize: '1/0.50',
    voltage: '75 Ohm',
  }),

  // ===== SOLAR — 2 =====
  p('SOLAR-4MM2', 'Solar PV Cable 4mm²', SOLAR, 0, {
    pack: 'solar',
    crossSection: '4mm²',
    voltage: 'AC 1/1KV - DC 1.5/1.5KV',
  }),
  p('SOLAR-6MM2', 'Solar PV Cable 6mm²', SOLAR, 0, {
    pack: 'solar',
    crossSection: '6mm²',
    voltage: 'AC 1/1KV - DC 1.5/1.5KV',
  }),
];

/** Fixed meters for a packaging unit (custom uses customMeters). */
export function unitMeters(unit: ProductUnit, customMeters = 1): number {
  switch (unit) {
    case 'roll_100':
      return METERS_PER_ROLL;
    case 'roll_50':
      return METERS_PER_HALF_ROLL;
    case 'coil_10':
      return METERS_PER_BATTERY_COIL;
    case 'coil_500':
      return METERS_PER_SOLAR_COIL;
    case 'meter':
      return 1;
    case 'custom':
      return Math.max(1, customMeters);
  }
}

/** Scale list/cost price from catalog basis to the chosen packaging. */
export function priceForPackaging(
  listOrCost: number,
  priceBasisMeters: number,
  unit: ProductUnit,
  customMeters = 1
): number {
  if (listOrCost <= 0 || priceBasisMeters <= 0) return listOrCost;
  const meters = unitMeters(unit, customMeters);
  return Math.round((listOrCost / priceBasisMeters) * meters * 100) / 100;
}

export function unitLabel(unit: ProductUnit, customMeters?: number): string {
  switch (unit) {
    case 'roll_100':
      return `1 Roll (${METERS_PER_ROLL}M)`;
    case 'roll_50':
      return `0.5 Roll (${METERS_PER_HALF_ROLL}M)`;
    case 'coil_10':
      return `Coil (${METERS_PER_BATTERY_COIL}M)`;
    case 'coil_500':
      return `Coil (${METERS_PER_SOLAR_COIL}M)`;
    case 'meter':
      return 'Per Meter';
    case 'custom':
      return customMeters && customMeters > 0 ? `Custom Bobbin (${customMeters}M)` : 'Custom Bobbin';
  }
}

export function unitShort(unit: ProductUnit): string {
  switch (unit) {
    case 'roll_100':
    case 'roll_50':
      return 'rolls';
    case 'coil_10':
    case 'coil_500':
      return 'coils';
    case 'meter':
      return 'm';
    case 'custom':
      return 'bobbins';
  }
}

export function unitPriceSuffix(unit: ProductUnit, customMeters?: number): string {
  return unitLabel(unit, customMeters).toLowerCase();
}

/** Convert stock quantity (of packaging units) to total meters. */
export function stockToMeters(qty: number, unit: ProductUnit, customMeters = 1): number {
  return qty * unitMeters(unit, customMeters);
}

export function metersToRolls(meters: number): number {
  return Math.floor(meters / METERS_PER_ROLL);
}

const UNIT_TAG_RE =
  /\s*\[(Meter|Roll(?:-100M)?|Roll-50M|Half-Roll|Coil-10M|Coil-500M|Custom(?:-(\d+)M)?)\]\s*$/i;

/** Parse unit (+ optional custom meters) from a saved product name. */
export function parseUnitFromName(name: string): { unit: ProductUnit; customMeters: number } {
  const m = name.match(UNIT_TAG_RE);
  if (!m) return { unit: 'meter', customMeters: 1 };
  const tag = m[1].toLowerCase();
  if (tag === 'meter') return { unit: 'meter', customMeters: 1 };
  if (tag === 'roll' || tag === 'roll-100m') return { unit: 'roll_100', customMeters: 100 };
  if (tag === 'roll-50m' || tag === 'half-roll') return { unit: 'roll_50', customMeters: 50 };
  if (tag === 'coil-10m') return { unit: 'coil_10', customMeters: 10 };
  if (tag === 'coil-500m') return { unit: 'coil_500', customMeters: 500 };
  if (tag.startsWith('custom')) {
    const meters = m[2] ? parseInt(m[2], 10) : 1;
    return { unit: 'custom', customMeters: meters || 1 };
  }
  return { unit: 'meter', customMeters: 1 };
}

export function withUnitInName(name: string, unit: ProductUnit, customMeters = 1): string {
  const base = stripUnitFromName(name);
  let tag: string;
  switch (unit) {
    case 'roll_100':
      tag = 'Roll-100M';
      break;
    case 'roll_50':
      tag = 'Roll-50M';
      break;
    case 'coil_10':
      tag = 'Coil-10M';
      break;
    case 'coil_500':
      tag = 'Coil-500M';
      break;
    case 'meter':
      tag = 'Meter';
      break;
    case 'custom':
      tag = `Custom-${Math.max(1, customMeters)}M`;
      break;
  }
  return `${base} [${tag}]`;
}

export function stripUnitFromName(name: string): string {
  return name.replace(UNIT_TAG_RE, '').trim();
}

export function packagingLabelForItem(item: SierraCatalogItem): string {
  return item.packaging.map((u) => unitLabel(u)).join(' · ');
}

export function searchSierraCatalog(query: string, limit = 12): SierraCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SIERRA_CABLES_CATALOG.slice(0, limit);
  return SIERRA_CABLES_CATALOG.filter((item) => {
    const hay = [
      item.name,
      item.sku,
      item.category,
      item.cableType ?? '',
      item.metricSize ?? '',
      item.crossSection ?? '',
      item.voltage ?? '',
      item.cores ?? '',
      item.defaultUnit,
      ...(item.cableType === 'S' ? ['single core', '(s)'] : []),
      ...(item.cableType === 'T' ? ['twin flat', '(t)'] : []),
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  }).slice(0, limit);
}

export function sierraCatalogStats() {
  const byCategory: Record<string, number> = {};
  const byUnit: Record<string, number> = {};
  let withPrice = 0;
  let singleCore = 0;
  let twinFlat = 0;
  for (const item of SIERRA_CABLES_CATALOG) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    byUnit[item.defaultUnit] = (byUnit[item.defaultUnit] || 0) + 1;
    if (item.listPrice > 0) withPrice++;
    if (item.cableType === 'S') singleCore++;
    if (item.cableType === 'T') twinFlat++;
  }
  return {
    total: SIERRA_CABLES_CATALOG.length,
    withPrice,
    pricePending: SIERRA_CABLES_CATALOG.length - withPrice,
    singleCore,
    twinFlat,
    byCategory,
    byUnit,
  };
}
