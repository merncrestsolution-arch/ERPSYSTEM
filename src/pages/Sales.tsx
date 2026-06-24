import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Search, Trash2, ShoppingCart, UserCheck, Percent, Edit, X } from 'lucide-react';

export default function Sales() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
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

  // Add a product to the cart; if it already exists, just bump the quantity.
  const addProductToCart = (product: any) => {
    const existingIndex = saleItems.findIndex(i => i.product_id === product.id.toString());
    if (existingIndex >= 0) {
      const newItems = [...saleItems];
      newItems[existingIndex] = { ...newItems[existingIndex], quantity: newItems[existingIndex].quantity + 1 };
      setSaleItems(newItems);
    } else {
      setSaleItems([...saleItems, { product_id: product.id.toString(), quantity: 1, selling_price: product.selling_price || 0 }]);
    }
    setProductSearch('');
  };

  const changeQty = (index: number, delta: number) => {
    const newItems = [...saleItems];
    const next = (newItems[index].quantity || 0) + delta;
    if (next <= 0) {
      newItems.splice(index, 1);
    } else {
      newItems[index] = { ...newItems[index], quantity: next };
    }
    setSaleItems(newItems);
  };

  const productName = (id: string) => products.find(p => p.id === parseInt(id))?.name || 'Unknown';
  const productStock = (id: string) => products.find(p => p.id === parseInt(id))?.stock_quantity ?? 0;

  const filteredPickerProducts = productSearch.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.barcode && p.barcode.toString().includes(productSearch))
      ).slice(0, 8)
    : [];

  const openAddModal = () => {
    setEditingSaleId(null);
    setCustomerId('');
    setSaleType('Cash');
    setDiscount(0);
    setSaleItems([]);
    setProductSearch('');
    setModalOpen(true);
  };

  const openEditModal = async (sale: any) => {
    try {
      // @ts-ignore
      const details = await window.electronAPI.getSaleDetails(sale.id);
      if (details) {
        setEditingSaleId(sale.id);
        setProductSearch('');
        setCustomerId(details.customer_id.toString());
        setSaleType(details.sale_type);
        setDiscount(details.total_amount ? (details.discount / details.total_amount) * 100 : 0);
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
  const discountAmount = subTotal * ((discount || 0) / 100);
  const netAmount = subTotal - discountAmount;

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

    let finalStatus = 'Completed';
    if (saleType === 'Credit') {
      const customer = customers.find(c => c.id === parseInt(customerId));
      if (customer) {
         const projectedDebt = (customer.outstanding_balance || 0) + netAmount;
         if (projectedDebt > customer.credit_limit) {
            const confirmMsg = `WARNING: Customer credit limit exceeded!\n\nLimit: LKR ${customer.credit_limit.toFixed(2)}\nCurrent Debt: LKR ${(customer.outstanding_balance || 0).toFixed(2)}\nNew Bill: LKR ${netAmount.toFixed(2)}\nProjected Debt: LKR ${projectedDebt.toFixed(2)}\n\nThis sale will be saved as "Pending Approval" and requires Super Admin approval to process.\n\nDo you want to proceed?`;
            if (!window.confirm(confirmMsg)) return;
            finalStatus = 'Pending Approval';
         }
      }
    }

    // Preserve original invoice number if editing
    const invoiceNumber = editingSaleId 
      ? sales.find(s => s.id === editingSaleId)?.invoice_number 
      : `INV-${Date.now().toString().slice(-6)}`;

    const salePayload = {
      customer_id: parseInt(customerId),
      invoice_number: invoiceNumber,
      sale_type: saleType,
      status: finalStatus,
      total_amount: subTotal,
      discount: discountAmount,
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
    <div className="p-4 md:p-8 w-full h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sales & Invoicing</h2>
          <p className="text-slate-500">Create new sales, edit invoices, and manage customer credit.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full sm:w-auto"
        >
          <Plus size={20} />
          New Sale
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-full sm:w-96">
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

        <div className="flex-1 overflow-auto table-wrapper">
          <table className="w-full text-left border-collapse table-stack">
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
                  <td data-label="Date" className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td data-label="Invoice" className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">{s.invoice_number}</td>
                  <td data-label="Customer" className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">{s.customer_name}</td>
                  <td data-label="Type" className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.sale_type === 'Cash' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                      {s.sale_type}
                    </span>
                  </td>
                  <td data-label="Net Amount" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">LKR {s.net_amount.toFixed(2)}</td>
                  <td data-label="Status" className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">{s.status}</span>
                  </td>
                  <td data-label="Actions" className="px-6 py-4 whitespace-nowrap text-sm text-right flex justify-end items-center gap-2">
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white sm:rounded-lg shadow-xl w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-blue-50 shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-blue-900 flex items-center gap-2">
                <ShoppingCart size={22} /> {editingSaleId ? 'Edit Sale' : 'New Sale'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-slate-700 p-1" aria-label="Close">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 flex flex-col lg:flex-row gap-0 lg:gap-6 lg:p-6">
              {/* Items section */}
              <div className="flex-1 p-4 lg:p-0 flex flex-col min-w-0">
                {/* Product search picker */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    inputMode="search"
                    placeholder="Search product by name or barcode..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                  />
                  {filteredPickerProducts.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                      {filteredPickerProducts.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProductToCart(p)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 active:bg-blue-100 border-b border-slate-100 last:border-0 flex justify-between items-center gap-3"
                        >
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-800 truncate">{p.name}</span>
                            <span className="block text-xs text-slate-500">Stock: {p.stock_quantity} • LKR {(p.selling_price || 0).toFixed(2)}</span>
                          </span>
                          <Plus size={18} className="text-blue-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Cart ({saleItems.length})</span>
                </div>

                {/* Cart items as cards */}
                <div className="space-y-2 flex-1">
                  {saleItems.map((item, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-3 bg-white shadow-sm">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 truncate">{productName(item.product_id)}</div>
                          <div className="text-xs text-slate-400">In stock: {productStock(item.product_id)}</div>
                        </div>
                        <button onClick={() => removeItem(index)} type="button" className="text-red-500 hover:text-red-700 p-1 shrink-0"><Trash2 size={18}/></button>
                      </div>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => changeQty(index, -1)} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"><Minus size={16}/></button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-14 text-center px-1 py-1.5 border border-slate-300 rounded outline-none"
                          />
                          <button type="button" onClick={() => changeQty(index, 1)} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"><Plus size={16}/></button>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-slate-500">@</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.selling_price}
                            onChange={e => updateItem(index, 'selling_price', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1.5 border border-slate-300 rounded text-right outline-none"
                          />
                        </div>
                        <div className="font-semibold text-slate-800 ml-auto">LKR {(item.quantity * item.selling_price).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                  {saleItems.length === 0 && (
                    <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-slate-300 rounded-lg">
                      Cart is empty. Search a product above and tap it to add.
                    </div>
                  )}
                </div>
              </div>

              {/* Checkout section */}
              <div className="w-full lg:w-80 bg-slate-50 p-4 lg:rounded-lg border-t lg:border border-slate-200 flex flex-col shrink-0">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><UserCheck size={18}/> Customer</h4>
                <div className="mb-4">
                  <select 
                    value={customerId} 
                    onChange={e => setCustomerId(e.target.value)} 
                    className="w-full px-3 py-3 border border-slate-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                    required
                  >
                    <option value="">Select Customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.shop_name} ({c.owner_name})</option>)}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sale Type</label>
                  <div className="flex bg-white border border-slate-300 rounded-md overflow-hidden">
                    <button type="button" onClick={() => setSaleType('Cash')} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${saleType === 'Cash' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Cash</button>
                    <button type="button" onClick={() => setSaleType('Credit')} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${saleType === 'Credit' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Credit</button>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <div className="flex justify-between text-slate-600 text-sm">
                    <span>Subtotal:</span>
                    <span>LKR {subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 text-sm">
                    <span className="flex items-center gap-1"><Percent size={14}/> Discount (%):</span>
                    <input type="number" step="0.01" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 border border-slate-300 rounded text-right outline-none" />
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-slate-500 text-xs">
                      <span>Discount Amount:</span>
                      <span>- LKR {discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold text-slate-800 pt-2 border-t border-slate-200">
                    <span>Total:</span>
                    <span>LKR {netAmount.toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={handleSaveSale} type="button" className="w-full mt-4 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-md font-bold transition-colors shadow-sm text-lg">
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
