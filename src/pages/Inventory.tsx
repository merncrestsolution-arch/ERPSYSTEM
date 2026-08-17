import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Layers, TrendingUp, TrendingDown, Ruler } from 'lucide-react';
import {
  parseUnitFromName,
  stripUnitFromName,
  stockToMeters,
  metersToRolls,
  unitLabel,
  unitShort,
} from '../data/sierraCablesCatalog';

export default function Inventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [logTab, setLogTab] = useState<'movements' | 'adjustments'>('movements');
  const [isAddModalOpen, setAddModalOpen] = useState(false);

  const [productId, setProductId] = useState('');
  const [type, setType] = useState('Addition');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Physical Count Correction');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const [prodData, adjData] = await Promise.all([
          // @ts-ignore
          window.electronAPI.getProducts(),
          // @ts-ignore
          window.electronAPI.getStockAdjustments(),
        ]);
        setProducts(prodData);
        setAdjustments(adjData);
        // @ts-ignore
        if (window.electronAPI.getStockMovements) {
          // @ts-ignore
          setMovements(await window.electronAPI.getStockMovements(80));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const inventoryRows = useMemo(() => {
    return products.map((p) => {
      const { unit, customMeters } = parseUnitFromName(p.name);
      const meters = stockToMeters(p.stock_quantity || 0, unit, customMeters);
      // Cost/sell values use packaging unit prices × stock qty
      const packCostValue = (p.stock_quantity || 0) * (p.cost_price || 0);
      const packSellValue = (p.stock_quantity || 0) * (p.selling_price || 0);
      return {
        ...p,
        unit,
        customMeters,
        meters,
        rolls: metersToRolls(meters),
        costValue: packCostValue,
        sellingValue: packSellValue,
        displayName: stripUnitFromName(p.name),
        unitLabel: unitLabel(unit, customMeters),
      };
    });
  }, [products]);

  const kpis = useMemo(() => {
    const totalMeters = inventoryRows.reduce((s, r) => s + r.meters, 0);
    const costValue = inventoryRows.reduce((s, r) => s + r.costValue, 0);
    const sellingValue = inventoryRows.reduce((s, r) => s + r.sellingValue, 0);
    return {
      totalMeters,
      costValue,
      sellingValue,
      profit: sellingValue - costValue,
      lowStock: products.filter((p) => p.stock_quantity < (p.low_stock_threshold ?? 20)).length,
    };
  }, [inventoryRows, products]);

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      alert('Please select a product');
      return;
    }

    const newAdj = {
      product_id: parseInt(productId, 10),
      adjustment_type: type,
      quantity: parseInt(quantity, 10),
      reason: reason,
    };

    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.addStockAdjustment(newAdj);
        await loadData();
        setAddModalOpen(false);
        setProductId('');
        setType('Addition');
        setQuantity('');
        setReason('Physical Count Correction');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to adjust stock');
    }
  };

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sierra Cables Inventory</h2>
          <p className="text-slate-500">Stock meters, values, GRN movements, and manual adjustments.</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto"
        >
          <Plus size={20} />
          New Adjustment
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-1 text-slate-600 text-sm font-medium">
            <Ruler className="text-blue-500" size={18} /> Total Stock
          </div>
          <p className="text-xl font-bold text-slate-800">{kpis.totalMeters.toLocaleString()} m</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-1 text-slate-600 text-sm font-medium">
            <Layers className="text-amber-500" size={18} /> Cost Value
          </div>
          <p className="text-xl font-bold text-slate-800">LKR {kpis.costValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-1 text-slate-600 text-sm font-medium">
            <TrendingUp className="text-green-500" size={18} /> Selling Value
          </div>
          <p className="text-xl font-bold text-slate-800">LKR {kpis.sellingValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-1 text-red-600 text-sm font-medium">
            <TrendingDown className="text-red-500" size={18} /> Low Stock
          </div>
          <p className="text-xl font-bold text-slate-800">{kpis.lowStock}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-bold text-slate-700">Stock by Product</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search SKU or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-md outline-none text-sm"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">SKU</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">Product</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">Pack</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">Stock</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">Meters</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">~Rolls</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">Cost Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventoryRows
                .filter(
                  (r) =>
                    r.displayName.toLowerCase().includes(search.toLowerCase()) ||
                    (r.barcode || '').toLowerCase().includes(search.toLowerCase())
                )
                .map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-sm font-mono text-slate-600">{r.barcode || '—'}</td>
                    <td className="px-4 py-2 text-sm font-medium text-slate-800">{r.displayName}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{r.unitLabel}</td>
                    <td className="px-4 py-2 text-sm">
                      {r.stock_quantity} {unitShort(r.unit)}
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold">{r.meters.toLocaleString()} m</td>
                    <td className="px-4 py-2 text-sm text-slate-600">{r.rolls}</td>
                    <td className="px-4 py-2 text-sm">LKR {r.costValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              {inventoryRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No products yet. Add from Products (Sierra catalog) then receive via GRN.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[240px]">
        <div className="p-4 border-b border-slate-200 flex gap-2 bg-slate-50">
          <button
            type="button"
            onClick={() => setLogTab('movements')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              logTab === 'movements' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Stock Movements (GRN)
          </button>
          <button
            type="button"
            onClick={() => setLogTab('adjustments')}
            className={`px-3 py-1.5 rounded text-sm font-medium ${
              logTab === 'adjustments' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Manual Adjustments
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {logTab === 'movements' ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">Product</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">Type</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">Units</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">Meters</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {stripUnitFromName(m.product_name || '')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {m.movement_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{m.quantity_units}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{m.quantity_meters} m</td>
                    <td className="px-4 py-3 text-sm text-blue-600">{m.reference}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500 text-sm">
                      No GRN stock movements yet. Confirm a GRN to auto-add inventory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Product</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Type</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Qty</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {adjustments
                  .filter(
                    (a) =>
                      a.product_name?.toLowerCase().includes(search.toLowerCase()) ||
                      a.reason?.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-600">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{a.product_name}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            a.adjustment_type === 'Addition' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {a.adjustment_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {a.adjustment_type === 'Addition' ? '+' : '-'}
                        {a.quantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{a.reason}</td>
                    </tr>
                  ))}
                {adjustments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No adjustments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800">New Stock Adjustment</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddAdjustment} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                  required
                >
                  <option value="">Select Product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {stripUnitFromName(p.name)} (Stock: {p.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Addition">Addition (+)</option>
                    <option value="Deduction">Deduction (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <input
                  required
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium">
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
