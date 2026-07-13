/** Sierra Cables PLC — complete price list catalog (11.06.2026) for Add Product search. */

export type ProductUnit = 'meter' | 'roll';

/** Standard Sierra / trade coil length. */
export const METERS_PER_ROLL = 100;

export type SierraCatalogItem = {
  sku: string;
  name: string;
  category: string;
  listPrice: number;
  costPrice: number;
  /** Sell / stock unit — every cable is either per meter or per roll (100m). */
  unit: ProductUnit;
};

/** Top-level ERP categories (synced with Inventory → Categories). */
export const SIERRA_CATEGORIES = [
  { name: 'Power Cables', description: 'Twin flat, XLPE, earth, unarmed & armoured power cables' },
  { name: 'Automotive Cables', description: 'Auto Cable Cu/PVC per ISO 6722:2011' },
  { name: 'Control & Signal Cables', description: 'Control, telephone and coaxial cables' },
  { name: 'Specialized Cables', description: 'Battery, flex, welding and solar cables' },
  { name: 'Switch Gear & Control Wiring', description: 'Switch gear & control wiring per BS 6231' },
] as const;

const cost = (list: number) => Math.round(list * 0.7);

function p(
  sku: string,
  name: string,
  category: string,
  listPrice: number,
  unit: ProductUnit = 'meter'
): SierraCatalogItem {
  return { sku, name, category, listPrice, costPrice: cost(listPrice), unit };
}

const POWER = 'Power Cables';
const AUTO = 'Automotive Cables';
const CONTROL = 'Control & Signal Cables';
const SPEC = 'Specialized Cables';
const SWITCH = 'Switch Gear & Control Wiring';

export const SIERRA_CABLES_CATALOG: SierraCatalogItem[] = [
  // ===== 1. SINGLE CORE & TWIN FLAT (SLS 733:2016) — 15 =====
  p('SC-TF-1.13-1MM-300-500V', 'Twin Flat / Single Core 1/1.13 - 1mm² - 300/500V', POWER, 8200),
  p('SC-TF-1.38-1.5MM-300-500V', 'Twin Flat / Single Core 1/1.38 - 1.5mm² - 300/500V', POWER, 9300),
  p('SC-TF-7.0.53-1.5MM-300-500V', 'Twin Flat 7/0.53 - 1.5mm² - 300/500V', POWER, 10800),
  p('SC-TF-7.0.67-2.5MM-300-500V', 'Twin Flat 7/0.67 - 2.5mm² - 300/500V', POWER, 11950),
  p('SC-TF-7.0.67-6MM-300-500V', 'Twin Flat 7/0.67 - 6mm² - 300/500V', POWER, 13450),
  p('SC-TF-7.0.85-4MM-300-500V', 'Twin Flat 7/0.85 - 4mm² - 300/500V', POWER, 16920),
  p('SC-TF-7.0.85-10MM-300-500V', 'Twin Flat 7/0.85 - 10mm² - 300/500V', POWER, 26370),
  p('SC-TF-7.1.04-6MM-300-500V', 'Twin Flat 7/1.04 - 6mm² - 300/500V', POWER, 20870),
  p('SC-TF-7.1.04-16MM-300-500V', 'Twin Flat 7/1.04 - 16mm² - 300/500V', POWER, 28480),
  p('SC-TF-7.1.35-10MM-300-500V', 'Twin Flat 7/1.35 - 10mm² - 300/500V', POWER, 29400),
  p('SC-TF-7.1.35-25MM-300-500V', 'Twin Flat 7/1.35 - 25mm² - 300/500V', POWER, 51200),
  p('SC-TF-7.1.70-16MM-300-500V', 'Twin Flat 7/1.70 - 16mm² - 300/500V', POWER, 46050),
  p('SC-TF-7.2.14-25MM-300-500V', 'Twin Flat 7/2.14 - 25mm² - 300/500V', POWER, 69330),
  p('SC-TF-7.2.14-35MM-300-500V', 'Twin Flat 7/2.14 - 35mm² - 300/500V', POWER, 95850),
  p('SC-TF-19.1.53-35MM-300-500V', 'Twin Flat 19/1.53 - 35mm² - 300/500V', POWER, 120000),

  // ===== 2. AUTO CABLE Cu/PVC (ISO 6722:2011) — 1 =====
  p('AUTO-16.0.20-T1-300-500V', 'Auto Cable Cu/PVC 16/0.20-T1 - 300/500V', AUTO, 11450),

  // ===== 3. Cu/XLPE/PVC SINGLE CORE (SLS 2691) — 11 =====
  p('XLPE-19.1.78-50MM-600-1000V', 'Cu/XLPE/PVC Single Core 19/1.78 - 50mm² - 600/1000V', POWER, 6273),
  p('XLPE-19.2.14-70MM-600-1000V', 'Cu/XLPE/PVC Single Core 19/2.14 - 70mm² - 600/1000V', POWER, 8942),
  p('XLPE-19.2.52-95MM-600-1000V', 'Cu/XLPE/PVC Single Core 19/2.52 - 95mm² - 600/1000V', POWER, 12236),
  p('XLPE-37.2.03-95MM-600-1000V', 'Cu/XLPE/PVC Single Core 37/2.03 - 95mm² - 600/1000V', POWER, 12236),
  p('XLPE-37.2.52-120MM-600-1000V', 'Cu/XLPE/PVC Single Core 37/2.52 - 120mm² - 600/1000V', POWER, 15373),
  p('XLPE-37.2.52-185MM-600-1000V', 'Cu/XLPE/PVC Single Core 37/2.52 - 185mm² - 600/1000V', POWER, 23687),
  p('XLPE-61.2.25-240MM-600-1000V', 'Cu/XLPE/PVC Single Core 61/2.25 - 240mm² - 600/1000V', POWER, 31059),
  p('XLPE-61.2.52-300MM-600-1000V', 'Cu/XLPE/PVC Single Core 61/2.52 - 300mm² - 600/1000V', POWER, 38982),
  p('XLPE-61.2.85-400MM-600-1000V', 'Cu/XLPE/PVC Single Core 61/2.85 - 400mm² - 600/1000V', POWER, 49800),
  p('XLPE-61.3.25-500MM-600-1000V', 'Cu/XLPE/PVC Single Core 61/3.25 - 500mm² - 600/1000V', POWER, 50130),
  p('XLPE-91.3.00-630MM-600-1000V', 'Cu/XLPE/PVC Single Core 91/3.00 - 630mm² - 600/1000V', POWER, 65670),

  // ===== 4. BATTERY WIRE (BS 6004:1995) — 4 =====
  p('BATT-19.1.35-25MM-300-500V', 'Battery Wire Cu/PVC 19/1.35 - 25mm² - 300/500V', SPEC, 30130),
  p('BATT-19.1.53-35MM-300-500V', 'Battery Wire Cu/PVC 19/1.53 - 35mm² - 300/500V', SPEC, 37648),
  p('BATT-354.0.30-25MM-300-500V', 'Battery Wire Cu/PVC 354/0.30 - 25mm² - 300/500V', SPEC, 28790),
  p('BATT-495.0.30-25MM-300-500V', 'Battery Wire Cu/PVC 495/0.30 - 25mm² - 300/500V', SPEC, 60180),

  // ===== 5. PVC EARTH CABLES (BS EN 50525-2-31) — 7 =====
  p('EARTH-1.1.13-1MM-450-750V', 'PVC Earth Cable 1/1.13 - 1mm² - 450/750V', POWER, 8750),
  p('EARTH-7.0.53-1.5MM-450-750V', 'PVC Earth Cable 7/0.53 - 1.5mm² - 450/750V', POWER, 15600),
  p('EARTH-7.0.67-2.5MM-450-750V', 'PVC Earth Cable 7/0.67 - 2.5mm² - 450/750V', POWER, 24340),
  p('EARTH-7.0.85-4MM-450-750V', 'PVC Earth Cable 7/0.85 - 4mm² - 450/750V', POWER, 39670),
  p('EARTH-7.1.04-6MM-450-750V', 'PVC Earth Cable 7/1.04 - 6mm² - 450/750V', POWER, 59840),
  p('EARTH-7.1.35-10MM-450-750V', 'PVC Earth Cable 7/1.35 - 10mm² - 450/750V', POWER, 102130),
  p('EARTH-7.1.70-16MM-450-750V', 'PVC Earth Cable 7/1.70 - 16mm² - 450/750V', POWER, 160250),

  // ===== 6. FLEXIBLE CORDS (SLS 1504-2-31) — 20 listed =====
  p('FLEX-16.0.20-T1-300-300V', 'Flexible Cord 16/0.20-T1 - 300/300V', SPEC, 13340),
  p('FLEX-16.0.20-2C-300-300V', 'Flexible Cord 16/0.20-2-C - 300/300V', SPEC, 16240),
  p('FLEX-16.0.20-3C-300-300V', 'Flexible Cord 16/0.20-3-C - 300/300V', SPEC, 21940),
  p('FLEX-24.0.20-2C-300-500V', 'Flexible Cord 24/0.20-2-C - 300/500V', SPEC, 24600),
  p('FLEX-24.0.20-3C-300-500V', 'Flexible Cord 24/0.20-3-C - 300/500V', SPEC, 33010),
  p('FLEX-24.0.20-5C-300-500V', 'Flexible Cord 24/0.20-5-C - 300/500V', SPEC, 42500),
  p('FLEX-32.0.20-2C-300-500V', 'Flexible Cord 32/0.20-2-C - 300/500V', SPEC, 31630),
  p('FLEX-32.0.20-3C-300-500V', 'Flexible Cord 32/0.20-3-C - 300/500V', SPEC, 54520),
  p('FLEX-32.0.20-4C-300-500V', 'Flexible Cord 32/0.20-4-C - 300/500V', SPEC, 0),
  p('FLEX-30.0.25-2C-300-500V', 'Flexible Cord 30/0.25-2-C - 300/500V', SPEC, 43270),
  p('FLEX-30.0.25-3C-300-500V', 'Flexible Cord 30/0.25-3-C - 300/500V', SPEC, 64680),
  p('FLEX-30.0.25-4C-300-500V', 'Flexible Cord 30/0.25-4-C - 300/500V', SPEC, 79220),
  p('FLEX-30.0.25-5C-300-500V', 'Flexible Cord 30/0.25-5-C - 300/500V', SPEC, 93240),
  p('FLEX-50.0.25-2C-300-500V', 'Flexible Cord 50/0.25-2-C - 300/500V', SPEC, 69310),
  p('FLEX-50.0.25-3C-300-500V', 'Flexible Cord 50/0.25-3-C - 300/500V', SPEC, 97170),
  p('FLEX-50.0.25-4C-300-500V', 'Flexible Cord 50/0.25-4-C - 300/500V', SPEC, 119260),
  p('FLEX-56.0.30-2C-300-500V', 'Flexible Cord 56/0.30-2-C - 300/500V', SPEC, 103530),
  p('FLEX-56.0.30-3C-300-500V', 'Flexible Cord 56/0.30-3-C - 300/500V', SPEC, 103330),
  p('FLEX-56.0.30-4C-300-500V', 'Flexible Cord 56/0.30-4-C - 300/500V', SPEC, 140240),
  p('FLEX-56.0.30-5C-300-500V', 'Flexible Cord 56/0.30-5-C - 300/500V', SPEC, 163400),

  // ===== 7. TELEPHONE CABLES (BS 4808:1972) — 4 =====
  p('TEL-1-PAIR', 'Telephone Cable Single Pair Cu/PVC/PVC', CONTROL, 9300),
  p('TEL-2-PAIR', 'Telephone Cable Two Pair Cu/PVC/PVC', CONTROL, 15800),
  p('TEL-5-PAIR', 'Telephone Cable Five Pair Cu/PVC/PVC', CONTROL, 38000),
  p('TEL-10-PAIR', 'Telephone Cable Ten Pair Cu/PVC/PVC', CONTROL, 51400),

  // ===== 8. SWITCH GEAR & CONTROL WIRING (BS 6231) — 14 =====
  p('SWG-1MM-32.0.20-600-1000V', 'Switch Gear Wiring 1mm² (32/0.20) - 600/1000V', SWITCH, 174),
  p('SWG-1.5MM-30.0.25-600-1000V', 'Switch Gear Wiring 1.5mm² (30/0.25) - 600/1000V', SWITCH, 252),
  p('SWG-2.5MM-50.0.25-600-1000V', 'Switch Gear Wiring 2.5mm² (50/0.25) - 600/1000V', SWITCH, 405),
  p('SWG-4MM-56.0.30-600-1000V', 'Switch Gear Wiring 4mm² (56/0.30) - 600/1000V', SWITCH, 622),
  p('SWG-6MM-84.0.30-600-1000V', 'Switch Gear Wiring 6mm² (84/0.30) - 600/1000V', SWITCH, 920),
  p('SWG-10MM-142.0.30-600-1000V', 'Switch Gear Wiring 10mm² (142/0.30) - 600/1000V', SWITCH, 1614),
  p('SWG-16MM-234.0.30-600-1000V', 'Switch Gear Wiring 16mm² (234/0.30) - 600/1000V', SWITCH, 2512),
  p('SWG-25MM-354.0.30-600-1000V', 'Switch Gear Wiring 25mm² (354/0.30) - 600/1000V', SWITCH, 3919),
  p('SWG-35MM-495.0.30-600-1000V', 'Switch Gear Wiring 35mm² (495/0.30) - 600/1000V', SWITCH, 5605),
  p('SWG-50MM-703.0.30-600-1000V', 'Switch Gear Wiring 50mm² (703/0.30) - 600/1000V', SWITCH, 8000),
  p('SWG-70MM-988.0.30-600-1000V', 'Switch Gear Wiring 70mm² (988/0.30) - 600/1000V', SWITCH, 11210),
  p('SWG-95MM-1344.0.30-600-1000V', 'Switch Gear Wiring 95mm² (1344/0.30) - 600/1000V', SWITCH, 14900),
  p('SWG-120MM-1702.0.30-600-1000V', 'Switch Gear Wiring 120mm² (1702/0.30) - 600/1000V', SWITCH, 15900),
  p('SWG-150MM-2109.0.30-600-1000V', 'Switch Gear Wiring 150mm² (2109/0.30) - 600/1000V', SWITCH, 23500),

  // ===== 9. UNARMED POWER (IEC 60502 / BS 6346) — 10 listed =====
  p('UNARM-1.5-1C-600-1000V', 'Unarmed Power Cable 1.5mm² 1-Core - 600/1000V', POWER, 1000),
  p('UNARM-2.5-1C-600-1000V', 'Unarmed Power Cable 2.5mm² 1-Core - 600/1000V', POWER, 1200),
  p('UNARM-4-1C-600-1000V', 'Unarmed Power Cable 4mm² 1-Core - 600/1000V', POWER, 2800),
  p('UNARM-6-1C-600-1000V', 'Unarmed Power Cable 6mm² 1-Core - 600/1000V', POWER, 3600),
  p('UNARM-10-1C-600-1000V', 'Unarmed Power Cable 10mm² 1-Core - 600/1000V', POWER, 5300),
  p('UNARM-16-1C-600-1000V', 'Unarmed Power Cable 16mm² 1-Core - 600/1000V', POWER, 7300),
  p('UNARM-2.5-2C-600-1000V', 'Unarmed Power Cable 2.5mm² 2-Core - 600/1000V', POWER, 2600),
  p('UNARM-4-2C-600-1000V', 'Unarmed Power Cable 4mm² 2-Core - 600/1000V', POWER, 3300),
  p('UNARM-6-2C-600-1000V', 'Unarmed Power Cable 6mm² 2-Core - 600/1000V', POWER, 4800),
  p('UNARM-10-2C-600-1000V', 'Unarmed Power Cable 10mm² 2-Core - 600/1000V', POWER, 7400),

  // ===== 10. UNARMED Cu/XLPE/PVC (BS 5467) — priced rows =====
  p('UNARM-XLPE-16-2C-600-1000V', 'Unarmed Cu/XLPE/PVC 16mm² 2-Core - 600/1000V', POWER, 10600),
  p('UNARM-XLPE-16-4C-600-1000V', 'Unarmed Cu/XLPE/PVC 16mm² 4-Core - 600/1000V', POWER, 13200),
  p('UNARM-XLPE-35-2C-600-1000V', 'Unarmed Cu/XLPE/PVC 35mm² 2-Core - 600/1000V', POWER, 15500),
  p('UNARM-XLPE-35-4C-600-1000V', 'Unarmed Cu/XLPE/PVC 35mm² 4-Core - 600/1000V', POWER, 19700),
  p('UNARM-XLPE-50-600-1000V', 'Unarmed Cu/XLPE/PVC 50mm² - 600/1000V', POWER, 0),
  p('UNARM-XLPE-70-600-1000V', 'Unarmed Cu/XLPE/PVC 70mm² - 600/1000V', POWER, 0),
  p('UNARM-XLPE-95-600-1000V', 'Unarmed Cu/XLPE/PVC 95mm² - 600/1000V', POWER, 53100),
  p('UNARM-XLPE-120-600-1000V', 'Unarmed Cu/XLPE/PVC 120mm² - 600/1000V', POWER, 66100),

  // ===== 11. ARMOURED POWER (SLS 987 / BS 6346) — 10 listed =====
  p('ARM-1.5-1C-SWA-600-1000V', 'Armoured Power Cable 1.5mm² 1-Core SWA - 600/1000V', POWER, 1100),
  p('ARM-2.5-1C-SWA-600-1000V', 'Armoured Power Cable 2.5mm² 1-Core SWA - 600/1000V', POWER, 1300),
  p('ARM-4-1C-SWA-600-1000V', 'Armoured Power Cable 4mm² 1-Core SWA - 600/1000V', POWER, 2000),
  p('ARM-6-1C-SWA-600-1000V', 'Armoured Power Cable 6mm² 1-Core SWA - 600/1000V', POWER, 3600),
  p('ARM-10-1C-SWA-600-1000V', 'Armoured Power Cable 10mm² 1-Core SWA - 600/1000V', POWER, 5600),
  p('ARM-16-1C-SWA-600-1000V', 'Armoured Power Cable 16mm² 1-Core SWA - 600/1000V', POWER, 8200),
  p('ARM-2.5-2C-SWA-600-1000V', 'Armoured Power Cable 2.5mm² 2-Core SWA - 600/1000V', POWER, 2200),
  p('ARM-4-2C-SWA-600-1000V', 'Armoured Power Cable 4mm² 2-Core SWA - 600/1000V', POWER, 3000),
  p('ARM-6-2C-SWA-600-1000V', 'Armoured Power Cable 6mm² 2-Core SWA - 600/1000V', POWER, 3900),
  p('ARM-10-2C-SWA-600-1000V', 'Armoured Power Cable 10mm² 2-Core SWA - 600/1000V', POWER, 5600),

  // ===== 12. ARMOURED Cu/XLPE/SWA/PVC (SLS 1186) — priced rows =====
  p('ARM-XLPE-16-2C-SWA-600-1000V', 'Armoured Cu/XLPE/SWA/PVC 16mm² 2-Core - 600/1000V', POWER, 9000),
  p('ARM-XLPE-16-2C-ALT-SWA-600-1000V', 'Armoured Cu/XLPE/SWA/PVC 16mm² 2-Core (Alt) - 600/1000V', POWER, 12500),
  p('ARM-XLPE-16-4C-SWA-600-1000V', 'Armoured Cu/XLPE/SWA/PVC 16mm² 4-Core - 600/1000V', POWER, 20800),
  p('ARM-XLPE-35-2C-SWA-600-1000V', 'Armoured Cu/XLPE/SWA/PVC 35mm² 2-Core - 600/1000V', POWER, 12500),
  p('ARM-XLPE-35-4C-SWA-600-1000V', 'Armoured Cu/XLPE/SWA/PVC 35mm² 4-Core - 600/1000V', POWER, 20800),
  p('ARM-XLPE-50-2C-SWA-600-1000V', 'Armoured Cu/XLPE/SWA/PVC 50mm² 2-Core - 600/1000V', POWER, 27800),
  p('ARM-XLPE-50-4C-SWA-600-1000V', 'Armoured Cu/XLPE/SWA/PVC 50mm² 4-Core - 600/1000V', POWER, 40700),
  p('ARM-XLPE-70-SWA-600-1000V', 'Armoured Cu/XLPE/SWA/PVC 70mm² - 600/1000V', POWER, 0),
  p('ARM-XLPE-95-SWA-600-1000V', 'Armoured Cu/XLPE/SWA/PVC 95mm² - 600/1000V', POWER, 55300),
  p('ARM-XLPE-120-SWA-600-1000V', 'Armoured Cu/XLPE/SWA/PVC 120mm² - 600/1000V', POWER, 69400),

  // ===== 13. CONTROL CABLES (BS 6346) — core variants (prices from sheet where known) =====
  // Sheet listed core counts without per-line prices; include searchable 1.5mm² PVC variants (price TBD = 0)
  // plus known reference sizes so the series appears in search.
  ...Array.from({ length: 31 }, (_, i) => {
    const cores = i + 2; // 2 .. 32
    return p(
      `CTRL-${cores}C-1.5MM-600-1000V`,
      `Control Cable ${cores}-Core 1.5mm² Cu/PVC/PVC - 600/1000V`,
      CONTROL,
      0
    );
  }),
  p('CTRL-2C-2.5MM-600-1000V', 'Control Cable 2-Core 2.5mm² Cu/PVC/PVC - 600/1000V', CONTROL, 0),
  p('CTRL-3C-2.5MM-600-1000V', 'Control Cable 3-Core 2.5mm² Cu/PVC/PVC - 600/1000V', CONTROL, 0),
  p('CTRL-4C-2.5MM-600-1000V', 'Control Cable 4-Core 2.5mm² Cu/PVC/PVC - 600/1000V', CONTROL, 0),
  p('CTRL-7C-2.5MM-600-1000V', 'Control Cable 7-Core 2.5mm² Cu/PVC/PVC - 600/1000V', CONTROL, 0),
  p('CTRL-12C-2.5MM-600-1000V', 'Control Cable 12-Core 2.5mm² Cu/PVC/PVC - 600/1000V', CONTROL, 0),

  // ===== 14. WELDING CABLES (BS 638 / IS 9857) — 3 =====
  p('WELD-25MM-600V', 'Welding Cable 25mm² - 600V', SPEC, 2750),
  p('WELD-35MM-600V', 'Welding Cable 35mm² - 600V', SPEC, 3720),
  p('WELD-50MM-600V', 'Welding Cable 50mm² - 600V', SPEC, 6010),

  // ===== 15. COAXIAL (JIS C 3501 75D) — 3 =====
  p('COAX-SC2V-1.0.80-MULTI', 'Coaxial Antenna Cable 1/0.80 (SC-2V) Multi Channel', CONTROL, 27000),
  p('COAX-SC2V-1.0.80-2CH', 'Coaxial Antenna Cable 1/0.80 (SC-2V) 2 Channel', CONTROL, 39200),
  p('COAX-3C2V-1.0.50', 'Coaxial Antenna Cable 1/0.50 (3C-2V)', CONTROL, 29600),

  // ===== 16. SOLAR (SLS 1542) — sold as 500m rolls/coils =====
  p('SOLAR-4MM2-500COIL', 'Solar PV Cable 4mm² - 500m Coil (SLS 1542)', SPEC, 0, 'roll'),
  p('SOLAR-6MM2-500COIL', 'Solar PV Cable 6mm² - 500m Coil (SLS 1542)', SPEC, 0, 'roll'),
].map((item) => {
  // Price-list coil/roll series (1 roll = 100 m) vs cut-to-length meter series
  if (/^(SC-TF|AUTO|FLEX|TEL|COAX|SOLAR|EARTH|BATT)-/.test(item.sku)) {
    return { ...item, unit: 'roll' as ProductUnit };
  }
  return { ...item, unit: item.unit || 'meter' };
});

export function unitLabel(unit: ProductUnit): string {
  return unit === 'roll' ? `Roll (${METERS_PER_ROLL}m)` : 'Meter';
}

export function unitShort(unit: ProductUnit): string {
  return unit === 'roll' ? 'rolls' : 'm';
}

export function unitPriceSuffix(unit: ProductUnit): string {
  return unit === 'roll' ? `roll (${METERS_PER_ROLL}m)` : 'm';
}

/** Convert stock quantity to meters for reporting. */
export function stockToMeters(qty: number, unit: ProductUnit): number {
  return unit === 'roll' ? qty * METERS_PER_ROLL : qty;
}

/** Convert meters to rolls (floored). */
export function metersToRolls(meters: number): number {
  return Math.floor(meters / METERS_PER_ROLL);
}

/** Parse unit from a saved product name like "Cable Name [Meter]" or "[Roll]". */
export function parseUnitFromName(name: string): ProductUnit {
  if (/\[roll/i.test(name)) return 'roll';
  return 'meter';
}

export function withUnitInName(name: string, unit: ProductUnit): string {
  const base = name.replace(/\s*\[(Meter|Roll[^\]]*)\]\s*$/i, '').trim();
  // Persist stable tags; UI shows friendly "Roll (100m)" via unitLabel()
  return `${base} [${unit === 'roll' ? 'Roll' : 'Meter'}]`;
}

export function stripUnitFromName(name: string): string {
  return name.replace(/\s*\[(Meter|Roll[^\]]*)\]\s*$/i, '').trim();
}

export function searchSierraCatalog(query: string, limit = 12): SierraCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SIERRA_CABLES_CATALOG.slice(0, limit);
  return SIERRA_CABLES_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.unit.toLowerCase().includes(q)
  ).slice(0, limit);
}

export function sierraCatalogStats() {
  const byCategory: Record<string, number> = {};
  const byUnit: Record<string, number> = { meter: 0, roll: 0 };
  let withPrice = 0;
  for (const item of SIERRA_CABLES_CATALOG) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    byUnit[item.unit] = (byUnit[item.unit] || 0) + 1;
    if (item.listPrice > 0) withPrice++;
  }
  return {
    total: SIERRA_CABLES_CATALOG.length,
    withPrice,
    pricePending: SIERRA_CABLES_CATALOG.length - withPrice,
    byCategory,
    byUnit,
  };
}
