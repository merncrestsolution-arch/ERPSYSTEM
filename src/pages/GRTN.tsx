import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, PackageMinus } from 'lucide-react';

export default function GRTN() {
  const [grtns, setGrtns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [reason, setReason] = useState('Damaged Goods');
  const [grtnItems, setGrtnItems] = useState<{product_id: string, quantity: number, cost_price: number}[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const [grtnData, supData, prodData] = await Promise.all([
          // @ts-ignore
          window.electronAPI.getGrtns(),
          // @ts-ignore
          window.electronAPI.getSuppliers(),
          // @ts-ignore
          window.electronAPI.getProducts()
        ]);
        setGrtns(grtnData);
        setSuppliers(supData);
        setProducts(prodData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItem = () => {
    setGrtnItems([...grtnItems, { product_id: '', quantity: 1, cost_price: 0 }]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...grtnItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setGrtnItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...grtnItems];
    newItems.splice(index, 1);
    setGrtnItems(newItems);
  };

  const handleSaveGRTN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (grtnItems.length === 0) {
      alert("Please add at least one item");
      return;
    }
    if (!supplierId) {
      alert("Please select a supplier");
      return;
    }

    const totalAmount = grtnItems.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);
    const grtnNumber = `GRTN-${Date.now().toString().slice(-6)}`;

    const newGrtn = {
      supplier_id: parseInt(supplierId),
      grtn_number: grtnNumber,
      reason: reason,
      total_amount: totalAmount,
      items: grtnItems.map(item => ({
        product_id: parseInt(item.product_id),
        quantity: item.quantity,
        cost_price: item.cost_price,
        total_price: item.quantity * item.cost_price
      }))
    };

    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        await window.electronAPI.addGrtn(newGrtn);
        await loadData();
        setAddModalOpen(false);
        setSupplierId('');
        setReason('Damaged Goods');
        setGrtnItems([]);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save GRTN');
    }
  };

  return (
    <div className="p-8 w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Goods Return Note (GRTN)</h2>
          <p className="text-slate-500">Record supplier returns and deduct inventory.</p>
        </div>
        <button 
          onClick={() => setAddModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={20} />
          Create Return
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search GRTN number or supplier..." 
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
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">GRTN No</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Return Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {grtns.filter(g => g.grtn_number.toLowerCase().includes(search.toLowerCase()) || g.supplier_name?.toLowerCase().includes(search.toLowerCase())).map((g) => (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{new Date(g.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-red-600">{g.grtn_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">{g.supplier_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{g.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">LKR {g.total_amount.toFixed(2)}</td>
                </tr>
              ))}
              {grtns.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No Returns found. Click "Create Return" to register one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Create Goods Return Note</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Return To Supplier</label>
                  <select 
                    value={supplierId} 
                    onChange={e => setSupplierId(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                    required
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Return Reason</label>
                  <select 
                    value={reason} 
                    onChange={e => setReason(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Damaged Goods">Damaged Goods</option>
                    <option value="Expired">Expired</option>
                    <option value="Overstock">Overstock</option>
                    <option value="Wrong Item">Wrong Item Received</option>
                  </select>
                </div>
              </div>

              <div className="mb-4 flex justify-between items-center">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2"><PackageMinus size={18}/> Return Items</h4>
                <button onClick={handleAddItem} type="button" className="text-sm text-red-600 hover:text-red-700 font-medium">+ Add Item Line</button>
              </div>

              <table className="w-full text-left border-collapse border border-slate-200 rounded-md overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-600">Product</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-600 w-32">Qty to Return</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-600 w-40">Cost Price (LKR)</th>
                    <th className="px-4 py-2 text-xs font-semibold text-slate-600 w-40">Line Total</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {grtnItems.map((item, index) => (
                    <tr key={index} className="border-b border-slate-200">
                      <td className="p-2">
                        <select 
                          value={item.product_id}
                          onChange={e => {
                            const val = e.target.value;
                            const prod = products.find(p => p.id === parseInt(val));
                            const newItems = [...grtnItems];
                            newItems[index] = { ...item, product_id: val, cost_price: prod ? prod.cost_price : 0 };
                            setGrtnItems(newItems);
                          }}
                          className="w-full px-2 py-1 border border-slate-300 rounded outline-none"
                          required
                        >
                          <option value="">Select Product...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</option>)}
                        </select>
                      </td>
                      <td className="p-2">
                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} className="w-full px-2 py-1 border border-slate-300 rounded outline-none" />
                      </td>
                      <td className="p-2">
                        <input type="number" step="0.01" value={item.cost_price} onChange={e => updateItem(index, 'cost_price', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border border-slate-300 rounded outline-none bg-slate-100" readOnly />
                      </td>
                      <td className="p-2 font-medium text-slate-700">
                        LKR {(item.quantity * item.cost_price).toFixed(2)}
                      </td>
                      <td className="p-2">
                        <button onClick={() => removeItem(index)} type="button" className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                  {grtnItems.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-sm text-slate-500">No items added. Click "+ Add Item Line".</td></tr>
                  )}
                </tbody>
              </table>
              <div className="mt-4 text-right">
                <p className="text-lg font-bold text-slate-800">
                  Total Deduction: LKR {grtnItems.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button type="button" onClick={() => setAddModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-md font-medium transition-colors">Cancel</button>
              <button onClick={handleSaveGRTN} type="button" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors shadow-sm">Confirm & Deduct Stock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
