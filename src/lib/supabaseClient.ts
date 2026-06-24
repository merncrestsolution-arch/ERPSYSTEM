import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hmqmrdfnrjqusvkbljqn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qrMpfcUrjlhtNAfM5AUHvg_jLNXE2Dg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabaseAPI = {
  getProducts: async () => {
    const { data } = await supabase.from('products').select('*');
    return data || [];
  },
  addProduct: async (product: any) => {
    const { data } = await supabase.from('products').insert([product]).select().single();
    return data;
  },
  getCustomers: async () => {
    const { data } = await supabase.from('customers').select('*');
    return data || [];
  },
  addCustomer: async (customer: any) => {
    const { data } = await supabase.from('customers').insert([customer]).select().single();
    return data;
  },
  getSuppliers: async () => {
    const { data } = await supabase.from('suppliers').select('*');
    return data || [];
  },
  addSupplier: async (supplier: any) => {
    const { data } = await supabase.from('suppliers').insert([supplier]).select().single();
    return data;
  },
  getVehicles: async () => {
    const { data } = await supabase.from('vehicles').select('*');
    return data || [];
  },
  addVehicle: async (vehicle: any) => {
    const { data } = await supabase.from('vehicles').insert([vehicle]).select().single();
    return data;
  },
  getGrns: async () => {
    const { data } = await supabase.from('grns').select('*, suppliers(name)');
    return (data || []).map(d => ({ ...d, supplier_name: d.suppliers?.name }));
  },
  addGrn: async (grnData: any) => {
    // Transaction-like behavior
    const { items, ...grnInfo } = grnData;
    const { data: grn } = await supabase.from('grns').insert([grnInfo]).select().single();
    if (!grn) return null;
    
    for (const item of items) {
      await supabase.from('grn_items').insert([{ ...item, grn_id: grn.id }]);
      // Update stock/cost
      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
      if (product) {
        await supabase.from('products').update({ 
          stock_quantity: (product.stock_quantity || 0) + item.quantity,
          cost_price: item.cost_price 
        }).eq('id', item.product_id);
      }
    }
    
    // Update supplier balance
    const { data: supplier } = await supabase.from('suppliers').select('balance').eq('id', grnInfo.supplier_id).single();
    if (supplier) {
      await supabase.from('suppliers').update({ balance: (supplier.balance || 0) + grnInfo.total_amount }).eq('id', grnInfo.supplier_id);
    }
    
    return grn.id;
  },
  getGrnDetails: async (id: number) => {
    const { data: grn } = await supabase.from('grns').select('*').eq('id', id).single();
    if (!grn) return null;
    const { data: items } = await supabase.from('grn_items').select('*').eq('grn_id', id);
    return { ...grn, items: items || [] };
  },
  getGrtns: async () => {
    const { data } = await supabase.from('grtns').select('*, suppliers(name)');
    return (data || []).map(d => ({ ...d, supplier_name: d.suppliers?.name }));
  },
  addGrtn: async (grtnData: any) => {
    const { items, ...grtnInfo } = grtnData;
    const { data: grtn } = await supabase.from('grtns').insert([grtnInfo]).select().single();
    if (!grtn) return null;

    for (const item of items) {
      await supabase.from('grtn_items').insert([{ ...item, grtn_id: grtn.id }]);
      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
      if (product) {
        await supabase.from('products').update({ stock_quantity: (product.stock_quantity || 0) - item.quantity }).eq('id', item.product_id);
      }
    }

    const { data: supplier } = await supabase.from('suppliers').select('balance').eq('id', grtnInfo.supplier_id).single();
    if (supplier) {
      await supabase.from('suppliers').update({ balance: (supplier.balance || 0) - grtnInfo.total_amount }).eq('id', grtnInfo.supplier_id);
    }

    return grtn.id;
  },
  getGrtnDetails: async (id: number) => {
    const { data: grtn } = await supabase.from('grtns').select('*').eq('id', id).single();
    if (!grtn) return null;
    const { data: items } = await supabase.from('grtn_items').select('*').eq('grtn_id', id);
    return { ...grtn, items: items || [] };
  },
  getStockAdjustments: async () => {
    const { data } = await supabase.from('stock_adjustments').select('*, products(name)');
    return (data || []).map(d => ({ ...d, product_name: d.products?.name }));
  },
  addStockAdjustment: async (adj: any) => {
    const { data } = await supabase.from('stock_adjustments').insert([adj]).select().single();
    if (!data) return null;
    
    const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', adj.product_id).single();
    if (product) {
      let newQty = (product.stock_quantity || 0);
      if (adj.adjustment_type === 'Addition') newQty += adj.quantity;
      else newQty -= adj.quantity;
      await supabase.from('products').update({ stock_quantity: newQty }).eq('id', adj.product_id);
    }
    return data.id;
  },
  getSales: async () => {
    const { data } = await supabase.from('sales').select('*, customers(shop_name)').order('created_at', { ascending: false });
    return (data || []).map(d => ({ ...d, customer_name: d.customers?.shop_name }));
  },
  getSaleDetails: async (id: number) => {
    const { data: sale } = await supabase.from('sales').select('*, customers(shop_name, address, contact_number)').eq('id', id).single();
    if (!sale) return null;
    
    const { data: items } = await supabase.from('sale_items').select('*, products(name)').eq('sale_id', id);
    const formattedItems = (items || []).map(i => ({ ...i, product_name: i.products?.name }));
    
    return { ...sale, customer_name: sale.customers?.shop_name, address: sale.customers?.address, contact_number: sale.customers?.contact_number, items: formattedItems };
  },
  addSale: async (saleData: any) => {
    const { items, ...saleInfo } = saleData;
    const { data: sale } = await supabase.from('sales').insert([saleInfo]).select().single();
    if (!sale) return null;

    for (const item of items) {
      await supabase.from('sale_items').insert([{ ...item, sale_id: sale.id }]);
      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
      if (product) {
        await supabase.from('products').update({ stock_quantity: (product.stock_quantity || 0) - item.quantity }).eq('id', item.product_id);
      }
    }

    if (saleInfo.sale_type === 'Credit') {
      const { data: cust } = await supabase.from('customers').select('outstanding_balance').eq('id', saleInfo.customer_id).single();
      if (cust) {
        await supabase.from('customers').update({ outstanding_balance: (cust.outstanding_balance || 0) + saleInfo.net_amount }).eq('id', saleInfo.customer_id);
      }
    }

    return sale.id;
  },
  getCheques: async () => {
    const { data } = await supabase.from('cheques').select('*, customers(shop_name)');
    return (data || []).map(d => ({ ...d, customer_name: d.customers?.shop_name }));
  },
  addCheque: async (chequeData: any) => {
    const { data } = await supabase.from('cheques').insert([chequeData]).select().single();
    if (!data) return null;

    const { data: cust } = await supabase.from('customers').select('outstanding_balance').eq('id', chequeData.customer_id).single();
    if (cust) {
      await supabase.from('customers').update({ outstanding_balance: (cust.outstanding_balance || 0) - chequeData.amount }).eq('id', chequeData.customer_id);
    }
    return data.id;
  },
  updateChequeStatus: async ({ id, status, customer_id, amount }: any) => {
    await supabase.from('cheques').update({ status }).eq('id', id);
    if (status === 'Bounced') {
      const { data: cust } = await supabase.from('customers').select('outstanding_balance').eq('id', customer_id).single();
      if (cust) {
        await supabase.from('customers').update({ outstanding_balance: (cust.outstanding_balance || 0) + amount }).eq('id', customer_id);
      }
    }
    return true;
  },
  getSupplierPayments: async () => {
    const { data } = await supabase.from('supplier_payments').select('*, suppliers(name)');
    return (data || []).map(d => ({ ...d, supplier_name: d.suppliers?.name }));
  },
  addSupplierPayment: async (paymentData: any) => {
    const { data } = await supabase.from('supplier_payments').insert([paymentData]).select().single();
    if (!data) return null;

    const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', paymentData.supplier_id).single();
    if (sup) {
      await supabase.from('suppliers').update({ balance: (sup.balance || 0) - paymentData.amount }).eq('id', paymentData.supplier_id);
    }
    return data.id;
  },
  getReportData: async () => {
    const { data: sales } = await supabase.from('sales').select('net_amount, created_at');
    const { data: customers } = await supabase.from('customers').select('outstanding_balance');
    const { data: suppliers } = await supabase.from('suppliers').select('balance');
    const { data: saleItems } = await supabase.from('sale_items').select('quantity, total_price, products(name)');
    
    const totalSales = (sales || []).reduce((sum, s) => sum + s.net_amount, 0);
    const totalCustomerDebt = (customers || []).reduce((sum, c) => sum + c.outstanding_balance, 0);
    const totalSupplierDebt = (suppliers || []).reduce((sum, s) => sum + s.balance, 0);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = (sales || []).filter(s => s.created_at.startsWith(todayStr)).reduce((sum, s) => sum + s.net_amount, 0);

    const salesChartMap: Record<string, number> = {};
    (sales || []).forEach(s => {
      const date = s.created_at.split('T')[0];
      salesChartMap[date] = (salesChartMap[date] || 0) + s.net_amount;
    });
    
    const salesChart = Object.keys(salesChartMap)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 7)
      .map(date => ({ date, total: salesChartMap[date] }))
      .reverse();

    const productMap: Record<string, any> = {};
    (saleItems || []).forEach((i: any) => {
      const name = i.products?.name || 'Unknown';
      if (!productMap[name]) productMap[name] = { name, qty_sold: 0, revenue: 0 };
      productMap[name].qty_sold += i.quantity;
      productMap[name].revenue += i.total_price;
    });
    
    const topProducts = Object.values(productMap).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);

    return { totalSales, totalCustomerDebt, totalSupplierDebt, todaySales, salesChart, topProducts };
  },
  getCloudSettings: async () => null, // Deprecated now
  saveCloudSettings: async () => true, // Deprecated now
  syncToCloud: async () => ({ success: true, timestamp: new Date().toISOString() }), // Deprecated now
  getUsers: async () => {
    const { data } = await supabase.from('users').select('*');
    return data || [];
  },
  loginUser: async ({ username, password }: any) => {
    const { data } = await supabase.from('users').select('*').eq('username', username).eq('password', password).single();
    return data || null;
  },
  addUser: async (userData: any) => {
    const { data } = await supabase.from('users').insert([userData]).select().single();
    return data?.id;
  },
  deleteUser: async (id: number) => {
    await supabase.from('users').delete().eq('id', id);
    return true;
  },
  getPendingApprovals: async () => {
    const { data: grns } = await supabase.from('grns').select('id, grn_number, total_amount, status, created_at').like('status', 'Pending%');
    const { data: cheques } = await supabase.from('cheques').select('id, cheque_number, amount, status, created_at').like('status', 'Pending%');
    const { data: grtns } = await supabase.from('grtns').select('id, grtn_number, total_amount, status, created_at').like('status', 'Pending%');
    
    const combined = [
      ...(grns || []).map(g => ({ id: g.id, reference: g.grn_number, amount: g.total_amount, status: g.status, type: 'GRN', created_at: g.created_at })),
      ...(cheques || []).map(c => ({ id: c.id, reference: c.cheque_number, amount: c.amount, status: c.status, type: 'Cheque', created_at: c.created_at })),
      ...(grtns || []).map(g => ({ id: g.id, reference: g.grtn_number, amount: g.total_amount, status: g.status, type: 'GRTN', created_at: g.created_at }))
    ];
    
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  approveItem: async ({ id, type, newStatus }: any) => {
    if (type === 'GRN') await supabase.from('grns').update({ status: newStatus }).eq('id', id);
    if (type === 'Cheque') await supabase.from('cheques').update({ status: newStatus }).eq('id', id);
    if (type === 'GRTN') await supabase.from('grtns').update({ status: newStatus }).eq('id', id);
    return true;
  },
  updateProduct: async (id: number, data: any) => {
    const { data: result } = await supabase.from('products').update(data).eq('id', id).select().single();
    return result;
  },
  updateCustomer: async (id: number, data: any) => {
    const { data: result } = await supabase.from('customers').update(data).eq('id', id).select().single();
    return result;
  },
  updateSupplier: async (id: number, data: any) => {
    const { data: result } = await supabase.from('suppliers').update(data).eq('id', id).select().single();
    return result;
  },
  updateVehicle: async (id: number, data: any) => {
    const { data: result } = await supabase.from('vehicles').update(data).eq('id', id).select().single();
    return result;
  },
  updateSale: async (id: number, saleData: any) => {
    // 1. Revert old sale impacts
    const { data: oldSale } = await supabase.from('sales').select('*').eq('id', id).single();
    const { data: oldItems } = await supabase.from('sale_items').select('*').eq('sale_id', id);
    
    if (oldSale && oldItems) {
      for (const item of oldItems) {
        const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
        if (p) await supabase.from('products').update({ stock_quantity: (p.stock_quantity || 0) + item.quantity }).eq('id', item.product_id);
      }
      if (oldSale.sale_type === 'Credit') {
        const { data: c } = await supabase.from('customers').select('outstanding_balance').eq('id', oldSale.customer_id).single();
        if (c) await supabase.from('customers').update({ outstanding_balance: (c.outstanding_balance || 0) - oldSale.net_amount }).eq('id', oldSale.customer_id);
      }
      await supabase.from('sale_items').delete().eq('sale_id', id);
    }

    // 2. Apply new sale impacts
    const { items, ...saleInfo } = saleData;
    await supabase.from('sales').update(saleInfo).eq('id', id);

    for (const item of items) {
      await supabase.from('sale_items').insert([{ ...item, sale_id: id }]);
      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
      if (product) {
        await supabase.from('products').update({ stock_quantity: (product.stock_quantity || 0) - item.quantity }).eq('id', item.product_id);
      }
    }
    if (saleInfo.sale_type === 'Credit') {
      const { data: cust } = await supabase.from('customers').select('outstanding_balance').eq('id', saleInfo.customer_id).single();
      if (cust) {
        await supabase.from('customers').update({ outstanding_balance: (cust.outstanding_balance || 0) + saleInfo.net_amount }).eq('id', saleInfo.customer_id);
      }
    }
    return id;
  },
  updateGrn: async (id: number, grnData: any) => {
    // 1. Revert old GRN impacts
    const { data: oldGrn } = await supabase.from('grns').select('*').eq('id', id).single();
    const { data: oldItems } = await supabase.from('grn_items').select('*').eq('grn_id', id);
    
    if (oldGrn && oldItems) {
      for (const item of oldItems) {
        const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
        if (p) await supabase.from('products').update({ stock_quantity: (p.stock_quantity || 0) - item.quantity }).eq('id', item.product_id);
      }
      const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', oldGrn.supplier_id).single();
      if (sup) await supabase.from('suppliers').update({ balance: (sup.balance || 0) - oldGrn.total_amount }).eq('id', oldGrn.supplier_id);
      
      await supabase.from('grn_items').delete().eq('grn_id', id);
    }

    // 2. Apply new GRN impacts
    const { items, ...grnInfo } = grnData;
    await supabase.from('grns').update(grnInfo).eq('id', id);

    for (const item of items) {
      await supabase.from('grn_items').insert([{ ...item, grn_id: id }]);
      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
      if (product) {
        await supabase.from('products').update({ 
          stock_quantity: (product.stock_quantity || 0) + item.quantity,
          cost_price: item.cost_price 
        }).eq('id', item.product_id);
      }
    }
    
    const { data: supplier } = await supabase.from('suppliers').select('balance').eq('id', grnInfo.supplier_id).single();
    if (supplier) {
      await supabase.from('suppliers').update({ balance: (supplier.balance || 0) + grnInfo.total_amount }).eq('id', grnInfo.supplier_id);
    }
    return id;
  },
  updateGrtn: async (id: number, grtnData: any) => {
    // 1. Revert old GRTN impacts
    const { data: oldGrtn } = await supabase.from('grtns').select('*').eq('id', id).single();
    const { data: oldItems } = await supabase.from('grtn_items').select('*').eq('grtn_id', id);
    
    if (oldGrtn && oldItems) {
      for (const item of oldItems) {
        const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
        if (p) await supabase.from('products').update({ stock_quantity: (p.stock_quantity || 0) + item.quantity }).eq('id', item.product_id);
      }
      const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', oldGrtn.supplier_id).single();
      if (sup) await supabase.from('suppliers').update({ balance: (sup.balance || 0) + oldGrtn.total_amount }).eq('id', oldGrtn.supplier_id);
      
      await supabase.from('grtn_items').delete().eq('grtn_id', id);
    }

    // 2. Apply new GRTN impacts
    const { items, ...grtnInfo } = grtnData;
    await supabase.from('grtns').update(grtnInfo).eq('id', id);

    for (const item of items) {
      await supabase.from('grtn_items').insert([{ ...item, grtn_id: id }]);
      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
      if (product) {
        await supabase.from('products').update({ stock_quantity: (product.stock_quantity || 0) - item.quantity }).eq('id', item.product_id);
      }
    }

    const { data: supplier } = await supabase.from('suppliers').select('balance').eq('id', grtnInfo.supplier_id).single();
    if (supplier) {
      await supabase.from('suppliers').update({ balance: (supplier.balance || 0) - grtnInfo.total_amount }).eq('id', grtnInfo.supplier_id);
    }
    return id;
  }
};
