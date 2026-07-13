import { useEffect, useState } from 'react';
import { Package, Warehouse, AlertTriangle } from 'lucide-react';
import { getErpApi } from '../lib/erpApi';

export default function InventoryAdvanced() {
  const api = getErpApi();
  const [tab, setTab] = useState<'categories' | 'po' | 'warehouses' | 'returns' | 'low'>('categories');
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [catName, setCatName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [whName, setWhName] = useState('');
  const [poSupplier, setPoSupplier] = useState('');
  const [poProduct, setPoProduct] = useState('');
  const [poQty, setPoQty] = useState('1');
  const [poCost, setPoCost] = useState('0');
  const [fromWh, setFromWh] = useState('');
  const [toWh, setToWh] = useState('');
  const [transferProduct, setTransferProduct] = useState('');
  const [transferQty, setTransferQty] = useState('1');
  const [retSupplier, setRetSupplier] = useState('');
  const [retProduct, setRetProduct] = useState('');
  const [retQty, setRetQty] = useState('1');
  const [retCost, setRetCost] = useState('0');

  const load = async () => {
    setCategories(await api.getCategories());
    setBrands(await api.getBrands());
    setSuppliers(await api.getSuppliers());
    setProducts(await api.getProducts());
    setPos(await api.getPurchaseOrders());
    setWarehouses(await api.getWarehouses());
    setTransfers(await api.getStockTransfers());
    setReturns(await api.getPurchaseReturns());
    setLowStock(await api.getLowStockProducts());
  };

  useEffect(() => { load(); }, []);

  const tabs = [
    { id: 'categories', label: 'Categories & Brands' },
    { id: 'po', label: 'Purchase Orders' },
    { id: 'warehouses', label: 'Warehouses' },
    { id: 'returns', label: 'Purchase Returns' },
    { id: 'low', label: 'Low Stock' },
  ] as const;

  return (
    <div className="p-4 md:p-8 space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Package /> Purchasing & Inventory</h2>
        <p className="text-slate-500">Categories, POs, warehouses, transfers, and supplier returns.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Categories</h3>
            <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); await api.addCategory({ name: catName }); setCatName(''); load(); }}>
              <input required value={catName} onChange={(e) => setCatName(e.target.value)} className="flex-1 border rounded-md px-3 py-2" placeholder="Category name" />
              <button className="bg-blue-600 text-white px-3 rounded-md">Add</button>
            </form>
            <ul className="divide-y text-sm">{categories.map((c) => (
              <li key={c.id} className="py-2 flex justify-between"><span>{c.name}</span><button className="text-red-600" onClick={async () => { await api.deleteCategory(c.id); load(); }}>Delete</button></li>
            ))}</ul>
          </div>
          <div className="bg-white border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Brands</h3>
            <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); await api.addBrand({ name: brandName }); setBrandName(''); load(); }}>
              <input required value={brandName} onChange={(e) => setBrandName(e.target.value)} className="flex-1 border rounded-md px-3 py-2" placeholder="Brand name" />
              <button className="bg-blue-600 text-white px-3 rounded-md">Add</button>
            </form>
            <ul className="divide-y text-sm">{brands.map((b) => (
              <li key={b.id} className="py-2 flex justify-between"><span>{b.name}</span><button className="text-red-600" onClick={async () => { await api.deleteBrand(b.id); load(); }}>Delete</button></li>
            ))}</ul>
          </div>
        </div>
      )}

      {tab === 'po' && (
        <div className="space-y-4">
          <form className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={async (e) => {
            e.preventDefault();
            const qty = parseInt(poQty) || 1;
            const cost = parseFloat(poCost) || 0;
            await api.addPurchaseOrder({
              supplier_id: Number(poSupplier),
              po_number: `PO-${Date.now()}`,
              total_amount: qty * cost,
              status: 'Ordered',
              items: [{ product_id: Number(poProduct), quantity: qty, cost_price: cost, total_price: qty * cost }]
            });
            load();
          }}>
            <select required value={poSupplier} onChange={(e) => setPoSupplier(e.target.value)} className="border rounded-md px-3 py-2"><option value="">Supplier</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select required value={poProduct} onChange={(e) => setPoProduct(e.target.value)} className="border rounded-md px-3 py-2"><option value="">Product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input type="number" value={poQty} onChange={(e) => setPoQty(e.target.value)} className="border rounded-md px-3 py-2" placeholder="Qty" />
            <input type="number" value={poCost} onChange={(e) => setPoCost(e.target.value)} className="border rounded-md px-3 py-2" placeholder="Cost" />
            <button className="bg-blue-600 text-white rounded-md">Create PO</button>
          </form>
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="text-left px-4 py-2">PO #</th><th className="text-left px-4 py-2">Supplier</th><th className="text-left px-4 py-2">Amount</th><th className="text-left px-4 py-2">Status</th></tr></thead>
              <tbody className="divide-y">{pos.map((p) => <tr key={p.id}><td className="px-4 py-2">{p.po_number}</td><td className="px-4 py-2">{p.supplier_name}</td><td className="px-4 py-2">{p.total_amount}</td><td className="px-4 py-2">{p.status}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'warehouses' && (
        <div className="space-y-4">
          <form className="bg-white border rounded-xl p-4 flex gap-2" onSubmit={async (e) => { e.preventDefault(); await api.addWarehouse({ name: whName, location: '', is_default: false }); setWhName(''); load(); }}>
            <input required value={whName} onChange={(e) => setWhName(e.target.value)} className="flex-1 border rounded-md px-3 py-2" placeholder="Warehouse name" />
            <button className="bg-blue-600 text-white px-4 rounded-md flex items-center gap-1"><Warehouse size={16} /> Add</button>
          </form>
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Warehouses</h3>
            <ul className="text-sm space-y-1">{warehouses.map((w) => <li key={w.id}>{w.name} {w.is_default ? '(Default)' : ''}</li>)}</ul>
          </div>
          <form className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={async (e) => {
            e.preventDefault();
            await api.addStockTransfer({ from_warehouse_id: Number(fromWh), to_warehouse_id: Number(toWh), product_id: Number(transferProduct), quantity: parseInt(transferQty) || 1 });
            load();
          }}>
            <select required value={fromWh} onChange={(e) => setFromWh(e.target.value)} className="border rounded-md px-3 py-2"><option value="">From</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            <select required value={toWh} onChange={(e) => setToWh(e.target.value)} className="border rounded-md px-3 py-2"><option value="">To</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            <select required value={transferProduct} onChange={(e) => setTransferProduct(e.target.value)} className="border rounded-md px-3 py-2"><option value="">Product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input type="number" value={transferQty} onChange={(e) => setTransferQty(e.target.value)} className="border rounded-md px-3 py-2" />
            <button className="bg-emerald-600 text-white rounded-md">Transfer</button>
          </form>
          <div className="bg-white border rounded-xl overflow-hidden text-sm">
            <table className="w-full"><thead className="bg-slate-50"><tr><th className="text-left px-4 py-2">Product</th><th className="text-left px-4 py-2">From</th><th className="text-left px-4 py-2">To</th><th className="text-left px-4 py-2">Qty</th></tr></thead>
              <tbody className="divide-y">{transfers.map((t) => <tr key={t.id}><td className="px-4 py-2">{t.product_name}</td><td className="px-4 py-2">{t.from_name}</td><td className="px-4 py-2">{t.to_name}</td><td className="px-4 py-2">{t.quantity}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'returns' && (
        <div className="space-y-4">
          <form className="bg-white border rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={async (e) => {
            e.preventDefault();
            const qty = parseInt(retQty) || 1;
            const cost = parseFloat(retCost) || 0;
            await api.addPurchaseReturn({
              supplier_id: Number(retSupplier), return_number: `PR-${Date.now()}`, total_amount: qty * cost, reason: 'Defect', status: 'Completed',
              items: [{ product_id: Number(retProduct), quantity: qty, cost_price: cost, total_price: qty * cost }]
            });
            load();
          }}>
            <select required value={retSupplier} onChange={(e) => setRetSupplier(e.target.value)} className="border rounded-md px-3 py-2"><option value="">Supplier</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select required value={retProduct} onChange={(e) => setRetProduct(e.target.value)} className="border rounded-md px-3 py-2"><option value="">Product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <input type="number" value={retQty} onChange={(e) => setRetQty(e.target.value)} className="border rounded-md px-3 py-2" />
            <input type="number" value={retCost} onChange={(e) => setRetCost(e.target.value)} className="border rounded-md px-3 py-2" />
            <button className="bg-amber-600 text-white rounded-md">Return</button>
          </form>
          <div className="bg-white border rounded-xl overflow-hidden text-sm">
            <table className="w-full"><thead className="bg-slate-50"><tr><th className="text-left px-4 py-2">#</th><th className="text-left px-4 py-2">Supplier</th><th className="text-left px-4 py-2">Amount</th></tr></thead>
              <tbody className="divide-y">{returns.map((r) => <tr key={r.id}><td className="px-4 py-2">{r.return_number}</td><td className="px-4 py-2">{r.supplier_name}</td><td className="px-4 py-2">{r.total_amount}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'low' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 text-amber-800 font-medium flex items-center gap-2"><AlertTriangle size={16} /> Low stock alerts</div>
          <table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="text-left px-4 py-2">Product</th><th className="text-left px-4 py-2">Stock</th><th className="text-left px-4 py-2">Threshold</th></tr></thead>
            <tbody className="divide-y">{lowStock.map((p) => <tr key={p.id}><td className="px-4 py-2">{p.name}</td><td className="px-4 py-2 text-red-600 font-medium">{p.stock_quantity}</td><td className="px-4 py-2">{p.low_stock_threshold ?? 10}</td></tr>)}
              {lowStock.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No low stock items</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
