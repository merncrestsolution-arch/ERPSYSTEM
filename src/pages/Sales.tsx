import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, ShoppingCart, UserCheck, Percent, Edit } from 'lucide-react';

export default function Sales() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [search, setSearch] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [saleType, setSaleType] = useState('Cash');
  const [discount, setDiscount] = useState<number>(0);
  const [saleItems, setSaleItems] = useState<{product_id: string, quantity: number, selling_price: number}[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // @ts-ignore
      if (window.electronAPI) {
        // @ts-ignore
        const [salesData, custData, prodData] = await Promise.all([
          // @ts-ignore
          window.electronAPI.getSales(),
          // @ts-ignore
          window.electronAPI.getCustomers(),
          // @ts-ignore
          window.electronAPI.getProducts()
        ]);
        setSales(salesData);
        setCustomers(custData);
        setProducts(prodData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItem = () => {
    setSaleItems([...saleItems, { product_id: '', quantity: 1, selling_price: 0 }]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...saleItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSaleItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...saleItems];
    newItems.splice(index, 1);
    setSaleItems(newItems);
  };

  const openAddModal = () => {
    setEditingSaleId(null);
    setCustomerId('');
    setSaleType('Cash');
    setDiscount(0);
    setSaleItems([]);
    setModalOpen(true);
  };

  const openEditModal = async (sale: any) => {
    try {
      // @ts-ignore
      const details = await window.electronAPI.getSaleDetails(sale.id);
      if (details) {
        setEditingSaleId(sale.id);
        setCustomerId(details.customer_id.toString());
        setSaleType(details.sale_type);
        setDiscount(details.discount);
        setSaleItems(details.items.map((i: any) => ({
          product_id: i.product_id.toString(),
          quantity: i.quantity,
          selling_price: i.selling_price
        })));
        setModalOpen(true);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load sale details');
    }
  };

  const subTotal = saleItems.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);
  const netAmount = subTotal - (discount || 0);

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saleItems.length === 0) {
      alert("Please add at least one item to sell");
      return;
    }
    if (!customerId) {
      alert("Please select a customer");
      return;
    }
    if (netAmount < 0) {
      alert("Discount cannot exceed subtotal");
      return;
    }

    // Preserve original invoice number if editing
    const invoiceNumber = editingSaleId 
      ? sales.find(s => s.id === editingSaleId)?.invoice_number 
      : `INV-${Date.now().toString().slice(-6)}`;

    const salePayload = {
      customer_id: parseInt(customerId),
      invoice_number: invoiceNumber,
      sale_type: saleType,
      total_amount: subTotal,
      discount: discount || 0,
      net_amount: netAmount,
      items: saleItems.map(item => ({
        product_id: parseInt(item.product_id),
        quantity: item.quantity,
        selling_price: item.selling_price,
        total_price: item.quantity * item.selling_price
      }))
    };

    try {
      // @ts-ignore
      if (window.electronAPI) {
        if (editingSaleId) {
          // @ts-ignore
          await window.electronAPI.updateSale(editingSaleId, salePayload);
        } else {
          // @ts-ignore
          await window.electronAPI.addSale(salePayload);
        }
        await loadData();
        setModalOpen(false);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to process sale');
    }
  };

  return (
    <div className="p-8 w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sales & Invoicing</h2>
          <p className="text-slate-500">Create new sales, edit invoices, and manage customer credit.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={20} />
          New Sale
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search invoice number or customer..." 
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
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Invoice No</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Net Amount</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sales.filter(s => s.invoice_number.toLowerCase().includes(search.toLowerCase()) || s.customer_name?.toLowerCase().includes(search.toLowerCase())).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">{s.invoice_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">{s.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.sale_type === 'Cash' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                      {s.sale_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">LKR {s.net_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">{s.status}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right flex justify-end items-center gap-2">
                    <button onClick={() => openEditModal(s)} className="text-slate-600 hover:text-blue-600 transition-colors p-1" title="Edit">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => navigate(`/invoice/${s.id}`)} className="text-blue-600 hover:text-blue-800 font-medium text-sm border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors">
                      Print
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No Sales found. Click "New Sale" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-blue-50">
              <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <ShoppingCart /> {editingSaleId ? 'Edit Sale / Bill' : 'Point of Sale Checkout'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 flex gap-6">
              {/* Left Column: Items */}
              <div className="flex-1">
                <div className="mb-4 flex justify-between items-center">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">Sale Items</h4>
                  <button onClick={handleAddItem} type="button" className="text-sm bg-slate-100 text-blue-600 px-3 py-1 rounded hover:bg-slate-200 font-medium">+ Add Item Line</button>
                </div>

                <table className="w-full text-left border-collapse border border-slate-200 rounded-md overflow-hidden">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-xs font-semibold text-slate-600">Product</th>
                      <th className="px-4 py-2 text-xs font-semibold text-slate-600 w-24">Qty</th>
                      <th className="px-4 py-2 text-xs font-semibold text-slate-600 w-32">Unit Price</th>
                      <th className="px-4 py-2 text-xs font-semibold text-slate-600 w-32">Total</th>
                      <th className="px-4 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleItems.map((item, index) => (
                      <tr key={index} className="border-b border-slate-200">
                        <td className="p-2">
                          <select 
                            value={item.product_id}
                            onChange={e => {
                              const val = e.target.value;
                              const prod = products.find(p => p.id === parseInt(val));
                              const newItems = [...saleItems];
                              newItems[index] = { ...item, product_id: val, selling_price: prod ? prod.selling_price : 0 };
                              setSaleItems(newItems);
                            }}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded outline-none"
                            required
                          >
                            <option value="">Select Product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-slate-300 rounded outline-none" />
                        </td>
                        <td className="p-2">
                          <input type="number" step="0.01" value={item.selling_price} onChange={e => updateItem(index, 'selling_price', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-slate-300 rounded outline-none" />
                        </td>
                        <td className="p-2 font-medium text-slate-700">
                          {(item.quantity * item.selling_price).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button onClick={() => removeItem(index)} type="button" className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                    {saleItems.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-sm text-slate-500 border border-dashed border-slate-300 m-2 rounded">Cart is empty. Click "+ Add Item Line".</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Right Column: Checkout Info */}
              <div className="w-80 bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col">
                <h4 className="font-semibold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><UserCheck size={18}/> Customer Details</h4>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Customer</label>
                  <select 
                    value={customerId} 
                    onChange={e => setCustomerId(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  >
                    <option value="">Select Customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.shop_name} ({c.owner_name})</option>)}
                  </select>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sale Type</label>
                  <div className="flex bg-white border border-slate-300 rounded-md overflow-hidden">
                    <button type="button" onClick={() => setSaleType('Cash')} className={`flex-1 py-2 text-sm font-medium transition-colors ${saleType === 'Cash' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Cash</button>
                    <button type="button" onClick={() => setSaleType('Credit')} className={`flex-1 py-2 text-sm font-medium transition-colors ${saleType === 'Credit' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Credit</button>
                  </div>
                </div>

                <div className="mt-auto space-y-3 pt-4 border-t border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>LKR {subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1"><Percent size={14}/> Discount:</span>
                    <input type="number" step="0.01" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 border border-slate-300 rounded text-right outline-none" />
                  </div>
                  <div className="flex justify-between text-xl font-bold text-slate-800 pt-2 border-t border-slate-200">
                    <span>Total:</span>
                    <span>LKR {netAmount.toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={handleSaveSale} type="button" className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-bold transition-colors shadow-sm text-lg">
                  {editingSaleId ? 'Update Sale' : 'Complete Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
