import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, Package, Edit2 } from 'lucide-react';
import {
  stripUnitFromName,
  unitShort,
  parseUnitFromName,
  stockToMeters,
} from '../data/sierraCablesCatalog';
import {
  GRN_PACKAGING_OPTIONS,
  calcLineTotalMeters,
  defaultPackagingForProduct,
  metersToStockUnits,
  describeProductPackaging,
  type GrnPackagingType,
} from '../lib/grnInventoryService';

type GrnLine = {
  product_id: string;
  packaging_type: GrnPackagingType;
  quantity: number;
  quantity_meters: number;
  cost_price: number;
};

export default function GRN() {
  const [grns, setGrns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [grnItems, setGrnItems] = useState<GrnLine[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [poId, setPoId] = useState('');
  const [lastResult, setLastResult] = useState<string>('');

  const productById = (id: string) => products.find((p) => String(p.id) === String(id));

  const lineCalc = (item: GrnLine) => {
    const totalMeters = calcLineTotalMeters(item.packaging_type, item.quantity, item.quantity_meters);
    const product = productById(item.product_id);
    const stockUnits = product ? metersToStockUnits(product.name, totalMeters) : item.quantity;
    return { totalMeters, stockUnits, lineTotal: item.quantity * item.cost_price };
  };

  const totals = useMemo(() => {
    return grnItems.reduce(
      (acc, item) => {
        const c = lineCalc(item);
        acc.amount += c.lineTotal;
        acc.meters += c.totalMeters;
        return acc;
      },
      { amount: 0, meters: 0 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grnItems, products]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const [grnData, supData, prodData] = await Promise.all([
          // @ts-ignore
          window.electronAPI.getGrns(),
          // @ts-ignore
          window.electronAPI.getSuppliers(),
          // @ts-ignore
          window.electronAPI.getProducts(),
        ]);
        setGrns(grnData);
        setSuppliers(supData);
        setProducts(prodData);
        // Prefer Sierra Cables when creating
        const sierra = (supData || []).find((s: any) => /sierra/i.test(s.name));
        if (sierra && !supplierId) setSupplierId(String(sierra.id));
        // @ts-ignore
        if (window.electronAPI.getPurchaseOrders) {
          // @ts-ignore
          setPurchaseOrders(await window.electronAPI.getPurchaseOrders());
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadFromPo = async (id: string) => {
    setPoId(id);
    if (!id) return;
    try {
      // @ts-ignore
      const details = await window.electronAPI.getPurchaseOrderDetails(Number(id));
      if (!details) return;
      setSupplierId(String(details.supplier_id));
      setGrnItems(
        (details.items || []).map((i: any) => {
          const product = products.find((p) => p.id === i.product_id);
          const pack = product
            ? defaultPackagingForProduct(product.name)
            : { packagingType: '1 Roll (100M)' as GrnPackagingType, quantityMeters: 100 };
          return {
            product_id: String(i.product_id),
            packaging_type: pack.packagingType,
            quantity: i.quantity,
            quantity_meters: pack.quantityMeters,
            cost_price: i.cost_price,
          };
        })
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItem = () => {
    setGrnItems([
      ...grnItems,
      {
        product_id: '',
        packaging_type: '1 Roll (100M)',
        quantity: 1,
        quantity_meters: 100,
        cost_price: 0,
      },
    ]);
  };

  const patchItem = (index: number, patch: Partial<GrnLine>) => {
    const next = [...grnItems];
    next[index] = { ...next[index], ...patch };
    setGrnItems(next);
  };

  const removeItem = (index: number) => {
    setGrnItems(grnItems.filter((_, i) => i !== index));
  };

  const openAddModal = () => {
    setEditingId(null);
    setInvoiceNo('');
    setNotes('Sierra Cables product receipt');
    setGrnItems([]);
    setPoId('');
    setLastResult('');
    const sierra = suppliers.find((s) => /sierra/i.test(s.name));
    setSupplierId(sierra ? String(sierra.id) : '');
    setModalOpen(true);
  };

  const openEditModal = async (grn: any) => {
    try {
      // @ts-ignore
      const details = await window.electronAPI.getGrnDetails(grn.id);
      if (details) {
        setEditingId(grn.id);
        setSupplierId(details.supplier_id.toString());
        setInvoiceNo(details.supplier_invoice_no || '');
        setNotes(details.notes || '');
        setGrnItems(
          details.items.map((i: any) => ({
            product_id: i.product_id.toString(),
            packaging_type: (i.packaging_type || '1 Roll (100M)') as GrnPackagingType,
            quantity: i.quantity,
            quantity_meters: i.quantity_meters || i.total_meters || 100,
            cost_price: i.cost_price,
          }))
        );
        setLastResult('');
        setModalOpen(true);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load GRN details');
    }
  };

  const handleSaveGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (grnItems.length === 0) {
      alert('Please add at least one item');
      return;
    }
    if (!supplierId) {
      alert('Please select a supplier');
      return;
    }
    if (grnItems.some((i) => !i.product_id)) {
      alert('Select a product for every line');
      return;
    }

    const grnNumber = editingId
      ? grns.find((g) => g.id === editingId)?.grn_number
      : `GRN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-3)}`;

    const items = grnItems.map((item) => {
      const c = lineCalc(item);
      return {
        product_id: parseInt(item.product_id, 10),
        quantity: item.quantity,
        cost_price: item.cost_price,
        total_price: c.lineTotal,
        packaging_type: item.packaging_type,
        quantity_meters: item.packaging_type === 'Custom Meters' ? item.quantity_meters : null,
        total_meters: c.totalMeters,
        stock_units: c.stockUnits,
      };
    });

    const payload = {
      supplier_id: parseInt(supplierId, 10),
      grn_number: grnNumber,
      supplier_invoice_no: invoiceNo,
      total_amount: totals.amount,
      po_id: poId ? parseInt(poId, 10) : null,
      status: 'Received',
      notes,
      items,
    };

    try {
      // @ts-ignore
      if (window.electronAPI) {
        let result: any;
        if (editingId) {
          // @ts-ignore
          result = await window.electronAPI.updateGrn(editingId, payload);
        } else {
          // @ts-ignore
          result = await window.electronAPI.addGrn(payload);
        }
        const meters = result?.totalMeters ?? totals.meters;
        const count = result?.itemsProcessed ?? items.length;
        setLastResult(`GRN ${grnNumber}: ${count} lines auto-added · ${meters}m to inventory`);
        await loadData();
        setModalOpen(false);
        alert(`Stock received.\n${count} items · ${meters} meters added to inventory.`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save GRN');
    }
  };

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Goods Received Note (GRN)</h2>
          <p className="text-slate-500">
            Confirm receipt → auto-add inventory (1 Roll=100M · 0.5 Roll=50M · Custom bobbin).
          </p>
          {lastResult && <p className="text-sm text-emerald-700 mt-1">{lastResult}</p>}
        </div>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto"
        >
          <Plus size={20} />
          Create GRN
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search GRN number or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">GRN No</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Meters</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {grns
                .filter(
                  (g) =>
                    g.grn_number.toLowerCase().includes(search.toLowerCase()) ||
                    g.supplier_name?.toLowerCase().includes(search.toLowerCase())
                )
                .map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(g.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">{g.grn_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">{g.supplier_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {g.total_meters != null ? `${g.total_meters} m` : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                      LKR {Number(g.total_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        {g.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <button onClick={() => openEditModal(g)} className="text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              {grns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No GRNs found. Click &quot;Create GRN&quot; to receive Sierra stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-blue-50 shrink-0">
              <h3 className="text-lg font-bold text-blue-900">
                {editingId ? 'Edit GRN' : 'Create GRN — Auto Inventory'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Purchase Order</label>
                  <select
                    value={poId}
                    onChange={(e) => loadFromPo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                    disabled={!!editingId}
                  >
                    <option value="">Manual GRN (no PO)</option>
                    {purchaseOrders
                      .filter((p) => p.status !== 'Received')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.po_number} — {p.supplier_name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                    required
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Invoice No.</label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="mb-3 flex justify-between items-center">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Package size={18} /> Receive Items
                </h4>
                <button onClick={handleAddItem} type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  + Add Item Line
                </button>
              </div>

              <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Status becomes <strong>Received</strong> on save — stock, cost, supplier balance, and stock-movement audit
                update automatically.
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-xs font-semibold text-slate-600">Product</th>
                      <th className="px-3 py-2 text-xs font-semibold text-slate-600">Packaging</th>
                      <th className="px-3 py-2 text-xs font-semibold text-slate-600">Qty</th>
                      <th className="px-3 py-2 text-xs font-semibold text-slate-600">Custom m</th>
                      <th className="px-3 py-2 text-xs font-semibold text-slate-600">Total m</th>
                      <th className="px-3 py-2 text-xs font-semibold text-slate-600">Cost / unit</th>
                      <th className="px-3 py-2 text-xs font-semibold text-slate-600">Line total</th>
                      <th className="px-3 py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {grnItems.map((item, index) => {
                      const c = lineCalc(item);
                      const product = productById(item.product_id);
                      return (
                        <tr key={index} className="border-b border-slate-200">
                          <td className="p-2">
                            <select
                              value={item.product_id}
                              onChange={(e) => {
                                const id = e.target.value;
                                const prod = productById(id);
                                const pack = prod
                                  ? defaultPackagingForProduct(prod.name)
                                  : { packagingType: '1 Roll (100M)' as GrnPackagingType, quantityMeters: 100 };
                                patchItem(index, {
                                  product_id: id,
                                  cost_price: prod ? Number(prod.cost_price) || 0 : 0,
                                  packaging_type: pack.packagingType,
                                  quantity_meters: pack.quantityMeters,
                                });
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm outline-none"
                              required
                            >
                              <option value="">Select Product...</option>
                              {products.map((p) => {
                                const { unit, customMeters } = parseUnitFromName(p.name);
                                return (
                                  <option key={p.id} value={p.id}>
                                    {p.barcode ? `${p.barcode} — ` : ''}
                                    {stripUnitFromName(p.name)} (Stock: {p.stock_quantity} {unitShort(unit)} /{' '}
                                    {stockToMeters(p.stock_quantity, unit, customMeters)}m)
                                  </option>
                                );
                              })}
                            </select>
                            {product && (
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Product pack: {describeProductPackaging(product.name)} · adds {c.stockUnits} stock units
                              </p>
                            )}
                          </td>
                          <td className="p-2">
                            <select
                              value={item.packaging_type}
                              onChange={(e) =>
                                patchItem(index, { packaging_type: e.target.value as GrnPackagingType })
                              }
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm outline-none"
                            >
                              {GRN_PACKAGING_OPTIONS.map((o) => (
                                <option key={o.type} value={o.type}>
                                  {o.type}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => patchItem(index, { quantity: parseInt(e.target.value, 10) || 0 })}
                              className="w-20 px-2 py-1 border border-slate-300 rounded outline-none"
                              disabled={item.packaging_type === 'Custom Meters'}
                            />
                          </td>
                          <td className="p-2">
                            {item.packaging_type === 'Custom Meters' ? (
                              <input
                                type="number"
                                min={1}
                                value={item.quantity_meters}
                                onChange={(e) =>
                                  patchItem(index, { quantity_meters: parseInt(e.target.value, 10) || 0, quantity: 1 })
                                }
                                className="w-24 px-2 py-1 border border-slate-300 rounded outline-none"
                              />
                            ) : (
                              <span className="text-slate-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="p-2 text-sm font-semibold text-slate-800 whitespace-nowrap">{c.totalMeters} m</td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.cost_price}
                              onChange={(e) => patchItem(index, { cost_price: parseFloat(e.target.value) || 0 })}
                              className="w-28 px-2 py-1 border border-slate-300 rounded outline-none"
                            />
                          </td>
                          <td className="p-2 text-sm font-medium text-slate-700 whitespace-nowrap">
                            LKR {c.lineTotal.toFixed(2)}
                          </td>
                          <td className="p-2">
                            <button onClick={() => removeItem(index)} type="button" className="text-red-500 hover:text-red-700">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {grnItems.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-sm text-slate-500">
                          No items. Click &quot;+ Add Item Line&quot;.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
                <p className="text-sm text-slate-600">
                  Total meters to inventory:{' '}
                  <span className="font-semibold text-slate-800">{totals.meters} m</span>
                </p>
                <p className="text-lg font-bold text-slate-800">Total: LKR {totals.amount.toFixed(2)}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGRN}
                type="button"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium transition-colors shadow-sm"
              >
                {editingId ? 'Update & Re-apply Stock' : 'Confirm & Receive Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
