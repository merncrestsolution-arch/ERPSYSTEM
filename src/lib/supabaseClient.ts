import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hashPassword, verifyPassword, isHashed } from './crypto';

const RAW_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Normalize the URL to the project base. The Supabase client appends `/rest/v1`
// itself, so a value that already includes a trailing `/rest/v1` (or a stray
// trailing slash) would produce a malformed `/rest/v1/rest/v1/...` 404.
function normalizeSupabaseUrl(url: string | undefined): string {
  if (!url) return '';
  return url
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '')
    .replace(/\/+$/, '');
}

const SUPABASE_URL = normalizeSupabaseUrl(RAW_SUPABASE_URL);

/** True when local/server env is missing — used to show a setup screen instead of a blank white page. */
export const supabaseConfigError =
  !SUPABASE_URL || !SUPABASE_ANON_KEY
    ? 'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the server/build environment, then redeploy.'
    : null;

if (supabaseConfigError) {
  console.error(supabaseConfigError);
}

// Avoid crashing the whole SPA when env vars are missing (createClient throws on empty URL).
export const supabase: SupabaseClient = supabaseConfigError
  ? (null as unknown as SupabaseClient)
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY as string);

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
    const { items, ...grnInfo } = grnData;
    const totalMeters = (items || []).reduce((sum: number, item: any) => sum + (Number(item.total_meters) || 0), 0);
    const { data: grn } = await supabase
      .from('grns')
      .insert([{
        ...grnInfo,
        status: grnInfo.status || 'Received',
        total_meters: totalMeters,
        received_at: new Date().toISOString(),
      }])
      .select()
      .single();
    if (!grn) return null;

    for (const item of items) {
      const stockUnits = Number(item.stock_units != null ? item.stock_units : item.quantity) || 0;
      const meters = Number(item.total_meters) || 0;
      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
      const balanceBefore = product?.stock_quantity || 0;

      await supabase.from('grn_items').insert([{
        product_id: item.product_id,
        quantity: item.quantity,
        cost_price: item.cost_price,
        total_price: item.total_price,
        packaging_type: item.packaging_type || null,
        quantity_meters: item.quantity_meters ?? null,
        total_meters: meters,
        item_status: 'Added to Inventory',
        added_to_inventory_at: new Date().toISOString(),
        grn_id: grn.id,
      }]);

      if (product) {
        await supabase.from('products').update({
          stock_quantity: balanceBefore + stockUnits,
          cost_price: item.cost_price,
        }).eq('id', item.product_id);
      }

      await supabase.from('stock_movements').insert([{
        product_id: item.product_id,
        movement_type: 'GRN_Received',
        quantity_units: stockUnits,
        quantity_meters: meters,
        reference: grnInfo.grn_number,
        notes: `${item.quantity} x ${item.packaging_type || 'unit'}`,
        balance_before: balanceBefore,
        balance_after: balanceBefore + stockUnits,
        created_by: grnInfo.created_by || 'SYSTEM',
      }]);
    }

    const { data: supplier } = await supabase.from('suppliers').select('balance').eq('id', grnInfo.supplier_id).single();
    if (supplier) {
      await supabase.from('suppliers').update({ balance: (supplier.balance || 0) + grnInfo.total_amount }).eq('id', grnInfo.supplier_id);
    }

    return { grnId: grn.id, totalMeters, itemsProcessed: items.length };
  },
  getGrnDetails: async (id: number) => {
    const { data: grn } = await supabase.from('grns').select('*').eq('id', id).single();
    if (!grn) return null;
    const { data: items } = await supabase.from('grn_items').select('*').eq('grn_id', id);
    return { ...grn, items: items || [] };
  },
  getGrtns: async () => {
    const { data } = await supabase.from('grtns').select('*, customers(shop_name)');
    return (data || []).map(d => ({ ...d, customer_name: d.customers?.shop_name }));
  },
  addGrtn: async (grtnData: any) => {
    const { items, ...grtnInfo } = grtnData;
    const { data: grtn } = await supabase.from('grtns').insert([grtnInfo]).select().single();
    if (!grtn) return null;

    for (const item of items) {
      await supabase.from('grtn_items').insert([{ ...item, grtn_id: grtn.id }]);
      if (grtnInfo.status !== 'Pending Approval') {
        const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
        if (product) {
          await supabase.from('products').update({ stock_quantity: (product.stock_quantity || 0) + item.quantity }).eq('id', item.product_id);
        }
      }
    }

    if (grtnInfo.status !== 'Pending Approval') {
      const { data: customer } = await supabase.from('customers').select('outstanding_balance').eq('id', grtnInfo.customer_id).single();
      if (customer) {
        await supabase.from('customers').update({ outstanding_balance: (customer.outstanding_balance || 0) - grtnInfo.total_amount }).eq('id', grtnInfo.customer_id);
      }
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
    // Defer stock/balance effects while the sale awaits approval; they are
    // applied later in approveItem when the sale is finalized.
    const isPending = typeof saleInfo.status === 'string' && saleInfo.status.startsWith('Pending');
    const { data: sale } = await supabase.from('sales').insert([saleInfo]).select().single();
    if (!sale) return null;

    for (const item of items) {
      await supabase.from('sale_items').insert([{ ...item, sale_id: sale.id }]);
      if (!isPending) {
        const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
        if (product) {
          await supabase.from('products').update({ stock_quantity: (product.stock_quantity || 0) - item.quantity }).eq('id', item.product_id);
        }
      }
    }

    if (saleInfo.sale_type === 'Credit' && !isPending) {
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
    let { data, error } = await supabase.from('cheques').insert([chequeData]).select().single();
    // Gracefully degrade if the optional `received_from` column hasn't been
    // added to the database yet (run supabase_migration.sql to enable it).
    if (error && /received_from/i.test(error.message || '')) {
      const { received_from, ...rest } = chequeData;
      ({ data, error } = await supabase.from('cheques').insert([rest]).select().single());
    }
    if (error) {
      console.error('addCheque error', error);
      return null;
    }
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
  syncToCloud: async () => {
    const result = await supabaseAPI.flushSyncOutbox();
    return result;
  },
  getUsers: async () => {
    const { data } = await supabase.from('users').select('*');
    return data || [];
  },
  loginUser: async ({ username, password }: any) => {
    const cleanedUsername = (username || '').trim();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', cleanedUsername)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase login error', error);
      return null;
    }
    if (!data) return null;

    const ok = await verifyPassword(password, data.password);
    if (!ok) return null;

    // Transparently upgrade legacy plaintext passwords to a hash on first login.
    if (!isHashed(data.password)) {
      const hashed = await hashPassword(password);
      await supabase.from('users').update({ password: hashed }).eq('id', data.id);
    }

    return { id: data.id, username: data.username, role: data.role, full_name: data.full_name };
  },
  addUser: async (userData: any) => {
    const hashed = await hashPassword(userData.password);
    const { data } = await supabase.from('users').insert([{ ...userData, password: hashed }]).select().single();
    return data?.id;
  },
  deleteUser: async (id: number) => {
    await supabase.from('users').delete().eq('id', id);
    return true;
  },
  getPendingApprovals: async () => {
    // Cheques are intentionally excluded: they have their own clear/bounce
    // lifecycle on the Cheques page and are not part of the approval workflow.
    const { data: grns } = await supabase.from('grns').select('id, grn_number, total_amount, status, created_at').like('status', 'Pending%');
    const { data: grtns } = await supabase.from('grtns').select('id, grtn_number, total_amount, status, created_at').like('status', 'Pending%');
    const { data: sales } = await supabase.from('sales').select('id, invoice_number, net_amount, status, created_at').like('status', 'Pending%');
    
    const combined = [
      ...(grns || []).map(g => ({ id: g.id, reference: g.grn_number, amount: g.total_amount, status: g.status, type: 'GRN', created_at: g.created_at })),
      ...(grtns || []).map(g => ({ id: g.id, reference: g.grtn_number, amount: g.total_amount, status: g.status, type: 'GRTN', created_at: g.created_at })),
      ...(sales || []).map(s => ({ id: s.id, reference: s.invoice_number, amount: s.net_amount, status: s.status, type: 'Sale', created_at: s.created_at }))
    ];
    
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  approveItem: async ({ id, type, newStatus }: any) => {
    // GRN and GRTN stock/balance effects are applied at creation; approval is a sign-off.
    if (type === 'GRN') await supabase.from('grns').update({ status: newStatus }).eq('id', id);
    if (type === 'GRTN') await supabase.from('grtns').update({ status: newStatus }).eq('id', id);

    if (type === 'Sale') {
      const { data: sale } = await supabase.from('sales').select('*').eq('id', id).single();
      const wasPending = typeof sale?.status === 'string' && sale.status.startsWith('Pending');
      const isFinalizing = newStatus === 'Approved' || newStatus === 'Completed';

      await supabase.from('sales').update({ status: newStatus }).eq('id', id);

      // Apply inventory + balance effects exactly once: only when a pending
      // sale is finalized (these were deferred at creation time).
      if (sale && wasPending && isFinalizing) {
        const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', id);
        for (const item of (items || [])) {
          const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
          if (p) await supabase.from('products').update({ stock_quantity: (p.stock_quantity || 0) - item.quantity }).eq('id', item.product_id);
        }
        if (sale.sale_type === 'Credit') {
          const { data: c } = await supabase.from('customers').select('outstanding_balance').eq('id', sale.customer_id).single();
          if (c) await supabase.from('customers').update({ outstanding_balance: (c.outstanding_balance || 0) + sale.net_amount }).eq('id', sale.customer_id);
        }
      }
    }
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
      if (oldSale.status !== 'Pending Approval') {
        for (const item of oldItems) {
          const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
          if (p) await supabase.from('products').update({ stock_quantity: (p.stock_quantity || 0) + item.quantity }).eq('id', item.product_id);
        }
        if (oldSale.sale_type === 'Credit') {
          const { data: c } = await supabase.from('customers').select('outstanding_balance').eq('id', oldSale.customer_id).single();
          if (c) await supabase.from('customers').update({ outstanding_balance: (c.outstanding_balance || 0) - oldSale.net_amount }).eq('id', oldSale.customer_id);
        }
      }
      await supabase.from('sale_items').delete().eq('sale_id', id);
    }

    // 2. Apply new sale impacts
    const { items, ...saleInfo } = saleData;
    await supabase.from('sales').update(saleInfo).eq('id', id);

    for (const item of items) {
      await supabase.from('sale_items').insert([{ ...item, sale_id: id }]);
      if (saleInfo.status !== 'Pending Approval') {
        const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
        if (product) {
          await supabase.from('products').update({ stock_quantity: (product.stock_quantity || 0) - item.quantity }).eq('id', item.product_id);
        }
      }
    }
    if (saleInfo.sale_type === 'Credit' && saleInfo.status !== 'Pending Approval') {
      const { data: cust } = await supabase.from('customers').select('outstanding_balance').eq('id', saleInfo.customer_id).single();
      if (cust) {
        await supabase.from('customers').update({ outstanding_balance: (cust.outstanding_balance || 0) + saleInfo.net_amount }).eq('id', saleInfo.customer_id);
      }
    }
    return id;
  },
  updateGrn: async (id: number, grnData: any) => {
    const { data: oldGrn } = await supabase.from('grns').select('*').eq('id', id).single();
    const { data: oldItems } = await supabase.from('grn_items').select('*').eq('grn_id', id);

    if (oldGrn && oldItems) {
      for (const item of oldItems) {
        const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
        if (p) {
          await supabase.from('products').update({ stock_quantity: (p.stock_quantity || 0) - item.quantity }).eq('id', item.product_id);
        }
        await supabase.from('stock_movements').insert([{
          product_id: item.product_id,
          movement_type: 'GRN_Reversed',
          quantity_units: -item.quantity,
          quantity_meters: -(item.total_meters || 0),
          reference: oldGrn.grn_number,
          notes: 'GRN edit reverse',
          created_by: 'SYSTEM',
        }]);
      }
      const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', oldGrn.supplier_id).single();
      if (sup) await supabase.from('suppliers').update({ balance: (sup.balance || 0) - oldGrn.total_amount }).eq('id', oldGrn.supplier_id);
      await supabase.from('grn_items').delete().eq('grn_id', id);
    }

    const { items, ...grnInfo } = grnData;
    const totalMeters = (items || []).reduce((sum: number, item: any) => sum + (Number(item.total_meters) || 0), 0);
    await supabase.from('grns').update({
      ...grnInfo,
      status: grnInfo.status || 'Received',
      total_meters: totalMeters,
    }).eq('id', id);

    for (const item of items) {
      const stockUnits = Number(item.stock_units != null ? item.stock_units : item.quantity) || 0;
      const meters = Number(item.total_meters) || 0;
      const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
      const balanceBefore = product?.stock_quantity || 0;

      await supabase.from('grn_items').insert([{
        product_id: item.product_id,
        quantity: item.quantity,
        cost_price: item.cost_price,
        total_price: item.total_price,
        packaging_type: item.packaging_type || null,
        quantity_meters: item.quantity_meters ?? null,
        total_meters: meters,
        item_status: 'Added to Inventory',
        added_to_inventory_at: new Date().toISOString(),
        grn_id: id,
      }]);

      if (product) {
        await supabase.from('products').update({
          stock_quantity: balanceBefore + stockUnits,
          cost_price: item.cost_price,
        }).eq('id', item.product_id);
      }

      await supabase.from('stock_movements').insert([{
        product_id: item.product_id,
        movement_type: 'GRN_Received',
        quantity_units: stockUnits,
        quantity_meters: meters,
        reference: grnInfo.grn_number,
        notes: `${item.quantity} x ${item.packaging_type || 'unit'}`,
        balance_before: balanceBefore,
        balance_after: balanceBefore + stockUnits,
        created_by: grnInfo.created_by || 'SYSTEM',
      }]);
    }

    const { data: supplier } = await supabase.from('suppliers').select('balance').eq('id', grnInfo.supplier_id).single();
    if (supplier) {
      await supabase.from('suppliers').update({ balance: (supplier.balance || 0) + grnInfo.total_amount }).eq('id', grnInfo.supplier_id);
    }
    return { grnId: id, totalMeters, itemsProcessed: items.length };
  },
  getStockMovements: async (limit = 100) => {
    const { data } = await supabase
      .from('stock_movements')
      .select('*, products(name, barcode)')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data || []).map((d: any) => ({
      ...d,
      product_name: d.products?.name,
      product_sku: d.products?.barcode,
    }));
  },
  updateGrtn: async (id: number, grtnData: any) => {
    // 1. Revert old GRTN impacts
    const { data: oldGrtn } = await supabase.from('grtns').select('*').eq('id', id).single();
    const { data: oldItems } = await supabase.from('grtn_items').select('*').eq('grtn_id', id);
    
    if (oldGrtn && oldItems) {
      if (oldGrtn.status !== 'Pending Approval') {
        for (const item of oldItems) {
          const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
          if (p) await supabase.from('products').update({ stock_quantity: (p.stock_quantity || 0) - item.quantity }).eq('id', item.product_id);
        }
        const { data: cust } = await supabase.from('customers').select('outstanding_balance').eq('id', oldGrtn.customer_id).single();
        if (cust) await supabase.from('customers').update({ outstanding_balance: (cust.outstanding_balance || 0) + oldGrtn.total_amount }).eq('id', oldGrtn.customer_id);
      }
      await supabase.from('grtn_items').delete().eq('grtn_id', id);
    }

    // 2. Apply new GRTN impacts
    const { items, ...grtnInfo } = grtnData;
    await supabase.from('grtns').update(grtnInfo).eq('id', id);

    for (const item of items) {
      await supabase.from('grtn_items').insert([{ ...item, grtn_id: id }]);
      if (grtnInfo.status !== 'Pending Approval') {
        const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
        if (product) {
          await supabase.from('products').update({ stock_quantity: (product.stock_quantity || 0) + item.quantity }).eq('id', item.product_id);
        }
      }
    }

    if (grtnInfo.status !== 'Pending Approval') {
      const { data: customer } = await supabase.from('customers').select('outstanding_balance').eq('id', grtnInfo.customer_id).single();
      if (customer) {
        await supabase.from('customers').update({ outstanding_balance: (customer.outstanding_balance || 0) - grtnInfo.total_amount }).eq('id', grtnInfo.customer_id);
      }
    }
    return id;
  },
  // --- Location tracking (salesman GPS) ---
  logLocation: async (entry: any) => {
    try {
      await supabase.from('location_logs').insert([entry]);
      return true;
    } catch (e) {
      console.error('logLocation error', e);
      return false;
    }
  },
  // Latest known position per tracked user (for map markers).
  getLatestLocations: async () => {
    const { data, error } = await supabase
      .from('location_logs')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(2000);
    if (error) {
      console.error('getLatestLocations error', error);
      return [];
    }
    const latestByUser: Record<string, any> = {};
    for (const row of (data || [])) {
      const key = String(row.user_id ?? row.username);
      if (!latestByUser[key]) latestByUser[key] = row;
    }
    return Object.values(latestByUser);
  },
  // Movement trail for one user (most recent points first).
  getLocationTrail: async (userId: number, limit = 200) => {
    const { data, error } = await supabase
      .from('location_logs')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('getLocationTrail error', error);
      return [];
    }
    return data || [];
  },

  deleteCustomer: async (id: number) => {
    await supabase.from('customers').delete().eq('id', id);
    return true;
  },

  // --- Phase 1: Routes & Visits ---
  getRoutes: async () => {
    const { data } = await supabase.from('routes').select('*, users(full_name)');
    return (data || []).map((d: any) => ({ ...d, assigned_user_name: d.users?.full_name }));
  },
  addRoute: async (route: any) => {
    const { stops, ...info } = route;
    const { data } = await supabase.from('routes').insert([info]).select().single();
    if (!data) return null;
    if (stops?.length) {
      await supabase.from('route_stops').insert(stops.map((s: any, i: number) => ({
        route_id: data.id, customer_id: s.customer_id, sequence_no: s.sequence_no ?? i + 1
      })));
    }
    return data.id;
  },
  getRouteStops: async (routeId: number) => {
    const { data } = await supabase.from('route_stops').select('*, customers(shop_name, address, qr_code)').eq('route_id', routeId).order('sequence_no');
    return (data || []).map((d: any) => ({ ...d, shop_name: d.customers?.shop_name, address: d.customers?.address, qr_code: d.customers?.qr_code }));
  },
  updateRouteStops: async (routeId: number, stops: any[]) => {
    await supabase.from('route_stops').delete().eq('route_id', routeId);
    if (stops.length) {
      await supabase.from('route_stops').insert(stops.map((s, i) => ({
        route_id: routeId, customer_id: s.customer_id, sequence_no: s.sequence_no ?? i + 1
      })));
    }
    return true;
  },
  getDailySchedules: async (date?: string) => {
    let q = supabase.from('daily_schedules').select('*, routes(name)').order('schedule_date', { ascending: false }).limit(50);
    if (date) q = supabase.from('daily_schedules').select('*, routes(name)').eq('schedule_date', date);
    const { data } = await q;
    return (data || []).map((d: any) => ({ ...d, route_name: d.routes?.name }));
  },
  addDailySchedule: async (sched: any) => {
    const { data } = await supabase.from('daily_schedules').insert([sched]).select().single();
    return data?.id;
  },
  getCustomerVisits: async (filters: any = {}) => {
    let q = supabase.from('customer_visits').select('*, customers(shop_name)').order('visited_at', { ascending: false }).limit(200);
    if (filters.customer_id) q = q.eq('customer_id', filters.customer_id);
    const { data } = await q;
    return (data || []).map((d: any) => ({ ...d, shop_name: d.customers?.shop_name }));
  },
  addCustomerVisit: async (visit: any) => {
    const { data } = await supabase.from('customer_visits').insert([visit]).select().single();
    return data?.id;
  },
  ensureCustomerQr: async (customerId: number) => {
    const { data: c, error: fetchErr } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (fetchErr) {
      console.error('ensureCustomerQr fetch', fetchErr);
      throw new Error(fetchErr.message || 'Customer not found');
    }
    if (!c) throw new Error('Customer not found');
    if (c.qr_code) return c.qr_code;
    const code = `CUST-${customerId}-${Date.now().toString(36).toUpperCase()}`;
    const { error: updateErr } = await supabase.from('customers').update({ qr_code: code }).eq('id', customerId);
    if (updateErr) {
      // Column may be missing until supabase_schema_phases.sql is run — still return a code for display.
      console.warn('ensureCustomerQr update failed (showing generated code anyway):', updateErr.message);
      if (/qr_code/i.test(updateErr.message || '')) {
        console.warn('Run supabase_schema_phases.sql to add customers.qr_code');
      }
    }
    return code;
  },
  getCustomerByQr: async (qrCode: string) => {
    const { data, error } = await supabase.from('customers').select('*').eq('qr_code', qrCode).maybeSingle();
    if (error) {
      console.error('getCustomerByQr', error);
      return null;
    }
    return data;
  },
  getRouteCompletion: async (scheduleId: number) => {
    const { data: sched } = await supabase.from('daily_schedules').select('*').eq('id', scheduleId).single();
    if (!sched) return { total: 0, visited: 0, percent: 0, missed: [] };
    const { data: stops } = await supabase.from('route_stops').select('*, customers(shop_name)').eq('route_id', sched.route_id);
    const { data: visits } = await supabase.from('customer_visits').select('customer_id').eq('schedule_id', scheduleId);
    const visitedIds = new Set((visits || []).map((v: any) => v.customer_id));
    const stopList = (stops || []).map((s: any) => ({ ...s, shop_name: s.customers?.shop_name }));
    const visited = stopList.filter((s) => visitedIds.has(s.customer_id)).length;
    const missed = stopList.filter((s) => !visitedIds.has(s.customer_id));
    const percent = stopList.length ? Math.round((visited / stopList.length) * 100) : 0;
    return { total: stopList.length, visited, percent, missed };
  },

  // --- Phase 2 ---
  getCategories: async () => { const { data } = await supabase.from('categories').select('*'); return data || []; },
  addCategory: async (cat: any) => { const { data } = await supabase.from('categories').insert([cat]).select().single(); return data?.id; },
  deleteCategory: async (id: number) => { await supabase.from('categories').delete().eq('id', id); return true; },
  getBrands: async () => { const { data } = await supabase.from('brands').select('*'); return data || []; },
  addBrand: async (brand: any) => { const { data } = await supabase.from('brands').insert([brand]).select().single(); return data?.id; },
  deleteBrand: async (id: number) => { await supabase.from('brands').delete().eq('id', id); return true; },
  getWarehouses: async () => { const { data } = await supabase.from('warehouses').select('*'); return data || []; },
  addWarehouse: async (wh: any) => { const { data } = await supabase.from('warehouses').insert([wh]).select().single(); return data?.id; },
  getWarehouseStock: async () => {
    const { data } = await supabase.from('warehouse_stock').select('*, warehouses(name), products(name)');
    return (data || []).map((d: any) => ({ ...d, warehouse_name: d.warehouses?.name, product_name: d.products?.name }));
  },
  addStockTransfer: async (t: any) => {
    await supabase.from('stock_transfers').insert([t]);
    const { data: from } = await supabase.from('warehouse_stock').select('*').eq('warehouse_id', t.from_warehouse_id).eq('product_id', t.product_id).maybeSingle();
    if (from) await supabase.from('warehouse_stock').update({ quantity: (from.quantity || 0) - t.quantity }).eq('id', from.id);
    const { data: to } = await supabase.from('warehouse_stock').select('*').eq('warehouse_id', t.to_warehouse_id).eq('product_id', t.product_id).maybeSingle();
    if (to) await supabase.from('warehouse_stock').update({ quantity: (to.quantity || 0) + t.quantity }).eq('id', to.id);
    else await supabase.from('warehouse_stock').insert([{ warehouse_id: t.to_warehouse_id, product_id: t.product_id, quantity: t.quantity }]);
    return true;
  },
  getStockTransfers: async () => {
    const { data } = await supabase.from('stock_transfers').select('*, products(name), from:warehouses!stock_transfers_from_warehouse_id_fkey(name), to:warehouses!stock_transfers_to_warehouse_id_fkey(name)').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({ ...d, product_name: d.products?.name, from_name: d.from?.name, to_name: d.to?.name }));
  },
  getPurchaseOrders: async () => {
    const { data } = await supabase.from('purchase_orders').select('*, suppliers(name)').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({ ...d, supplier_name: d.suppliers?.name }));
  },
  addPurchaseOrder: async (poData: any) => {
    const { items, ...info } = poData;
    const { data: po } = await supabase.from('purchase_orders').insert([info]).select().single();
    if (!po) return null;
    for (const item of items || []) await supabase.from('purchase_order_items').insert([{ ...item, po_id: po.id }]);
    return po.id;
  },
  getPurchaseOrderDetails: async (id: number) => {
    const { data: po } = await supabase.from('purchase_orders').select('*').eq('id', id).single();
    if (!po) return null;
    const { data: items } = await supabase.from('purchase_order_items').select('*, products(name)').eq('po_id', id);
    return { ...po, items: (items || []).map((i: any) => ({ ...i, product_name: i.products?.name })) };
  },
  getPurchaseReturns: async () => {
    const { data } = await supabase.from('purchase_returns').select('*, suppliers(name)').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({ ...d, supplier_name: d.suppliers?.name }));
  },
  addPurchaseReturn: async (retData: any) => {
    const { items, ...info } = retData;
    const { data: ret } = await supabase.from('purchase_returns').insert([info]).select().single();
    if (!ret) return null;
    for (const item of items || []) {
      await supabase.from('purchase_return_items').insert([{ ...item, return_id: ret.id }]);
      const { data: p } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
      if (p) await supabase.from('products').update({ stock_quantity: (p.stock_quantity || 0) - item.quantity }).eq('id', item.product_id);
    }
    const { data: sup } = await supabase.from('suppliers').select('balance').eq('id', info.supplier_id).single();
    if (sup) await supabase.from('suppliers').update({ balance: (sup.balance || 0) - info.total_amount }).eq('id', info.supplier_id);
    return ret.id;
  },
  getLowStockProducts: async () => {
    const { data } = await supabase.from('products').select('*');
    return (data || []).filter((p: any) => (p.stock_quantity || 0) <= (p.low_stock_threshold ?? 10));
  },

  // --- Phase 3 ---
  getQuotations: async () => {
    const { data } = await supabase.from('quotations').select('*, customers(shop_name)').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({ ...d, customer_name: d.customers?.shop_name }));
  },
  addQuotation: async (qData: any) => {
    const { items, ...info } = qData;
    const { data: q } = await supabase.from('quotations').insert([info]).select().single();
    if (!q) return null;
    for (const item of items || []) await supabase.from('quotation_items').insert([{ ...item, quotation_id: q.id }]);
    return q.id;
  },
  convertQuotationToSo: async (quotationId: number) => {
    const { data: q } = await supabase.from('quotations').select('*').eq('id', quotationId).single();
    if (!q) return null;
    const { data: items } = await supabase.from('quotation_items').select('*').eq('quotation_id', quotationId);
    const soNumber = `SO-${Date.now()}`;
    const { data: so } = await supabase.from('sales_orders').insert([{
      customer_id: q.customer_id, quotation_id: quotationId, so_number: soNumber,
      total_amount: q.total_amount, discount: q.discount, net_amount: q.net_amount, status: 'Open'
    }]).select().single();
    if (!so) return null;
    for (const item of items || []) await supabase.from('sales_order_items').insert([{ so_id: so.id, product_id: item.product_id, quantity: item.quantity, selling_price: item.selling_price, total_price: item.total_price }]);
    await supabase.from('quotations').update({ status: 'Converted' }).eq('id', quotationId);
    return so.id;
  },
  getSalesOrders: async () => {
    const { data } = await supabase.from('sales_orders').select('*, customers(shop_name)').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({ ...d, customer_name: d.customers?.shop_name }));
  },
  convertSoToInvoice: async (soId: number) => {
    const { data: so } = await supabase.from('sales_orders').select('*').eq('id', soId).single();
    if (!so) return null;
    const { data: items } = await supabase.from('sales_order_items').select('*').eq('so_id', soId);
    return supabaseAPI.addSale({
      customer_id: so.customer_id, invoice_number: `INV-${Date.now()}`, sale_type: 'Credit',
      total_amount: so.total_amount, discount: so.discount, net_amount: so.net_amount, status: 'Completed',
      items: (items || []).map((i: any) => ({ product_id: i.product_id, quantity: i.quantity, selling_price: i.selling_price, total_price: i.total_price }))
    }).then(async (saleId) => {
      await supabase.from('sales_orders').update({ status: 'Invoiced' }).eq('id', soId);
      return saleId;
    });
  },
  getDeliveryNotes: async () => {
    const { data } = await supabase.from('delivery_notes').select('*, customers(shop_name)').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({ ...d, customer_name: d.customers?.shop_name }));
  },
  addDeliveryNote: async (dn: any) => {
    const { data } = await supabase.from('delivery_notes').insert([dn]).select().single();
    return data?.id;
  },
  getCustomerPayments: async () => {
    const { data } = await supabase.from('customer_payments').select('*, customers(shop_name)').order('created_at', { ascending: false });
    return (data || []).map((d: any) => ({ ...d, customer_name: d.customers?.shop_name }));
  },
  addCustomerPayment: async (payment: any) => {
    const { data } = await supabase.from('customer_payments').insert([payment]).select().single();
    if (!data) return null;
    const { data: cust } = await supabase.from('customers').select('outstanding_balance').eq('id', payment.customer_id).single();
    if (cust) await supabase.from('customers').update({ outstanding_balance: (cust.outstanding_balance || 0) - payment.amount }).eq('id', payment.customer_id);
    const method = payment.payment_method || 'Cash';
    const invoice = payment.invoice_number || null;
    const receipt = payment.receipt_number || payment.reference_number || null;
    const collectionType = payment.collection_type || 'Previous Invoice';
    const desc =
      payment.notes ||
      (invoice ? `${method} — ${invoice}` : `Payment from customer #${payment.customer_id}`);
    await supabase.from('cash_book').insert([{
      entry_type: 'Income',
      category: 'Customer Payment',
      description: desc,
      amount: payment.amount,
      entry_date: payment.date,
      payment_method: method,
      collection_type: collectionType,
      invoice_number: invoice,
      receipt_number: receipt,
      cheque_id: payment.cheque_id || null,
      cheque_reference: payment.cheque_reference || null,
      sale_id: payment.sale_id || null,
      receipt_id: payment.receipt_id || null,
    }]);
    return data.id;
  },
  getCashBook: async () => { const { data } = await supabase.from('cash_book').select('*').order('entry_date', { ascending: false }); return data || []; },
  addCashBookEntry: async (entry: any) => {
    const { data } = await supabase.from('cash_book').insert([{
      entry_type: entry.entry_type,
      category: entry.category || null,
      description: entry.description || null,
      amount: entry.amount,
      entry_date: entry.entry_date,
      payment_method: entry.payment_method || null,
      collection_type: entry.collection_type || null,
      invoice_number: entry.invoice_number || null,
      receipt_number: entry.receipt_number || null,
      cheque_id: entry.cheque_id || null,
      cheque_reference: entry.cheque_reference || null,
      sale_id: entry.sale_id || null,
      receipt_id: entry.receipt_id || null,
    }]).select().single();
    return data?.id;
  },
  getBankTransactions: async () => { const { data } = await supabase.from('bank_transactions').select('*').order('transaction_date', { ascending: false }); return data || []; },
  addBankTransaction: async (t: any) => { const { data } = await supabase.from('bank_transactions').insert([t]).select().single(); return data?.id; },
  getIncomeExpenses: async () => { const { data } = await supabase.from('income_expenses').select('*').order('entry_date', { ascending: false }); return data || []; },
  addIncomeExpense: async (e: any) => { const { data } = await supabase.from('income_expenses').insert([e]).select().single(); return data?.id; },
  getPromotions: async () => { const { data } = await supabase.from('promotions').select('*').order('id', { ascending: false }); return data || []; },
  addPromotion: async (p: any) => { const { data } = await supabase.from('promotions').insert([p]).select().single(); return data?.id; },
  getCustomerStatement: async (customerId: number) => {
    const { data: customer } = await supabase.from('customers').select('*').eq('id', customerId).single();
    const { data: sales } = await supabase.from('sales').select('*').eq('customer_id', customerId).order('created_at');
    const { data: payments } = await supabase.from('customer_payments').select('*').eq('customer_id', customerId).order('date');
    const { data: cheques } = await supabase.from('cheques').select('*').eq('customer_id', customerId).order('created_at');
    return { customer, sales: sales || [], payments: payments || [], cheques: cheques || [] };
  },
  getSupplierStatement: async (supplierId: number) => {
    const { data: supplier } = await supabase.from('suppliers').select('*').eq('id', supplierId).single();
    const { data: grns } = await supabase.from('grns').select('*').eq('supplier_id', supplierId).order('created_at');
    const { data: payments } = await supabase.from('supplier_payments').select('*').eq('supplier_id', supplierId).order('date');
    return { supplier, grns: grns || [], payments: payments || [] };
  },

  // --- Phase 4 ---
  getSyncOutbox: async () => { const { data } = await supabase.from('sync_outbox').select('*').order('created_at', { ascending: false }).limit(200); return data || []; },
  enqueueSync: async (item: any) => {
    const { data, error } = await supabase.from('sync_outbox').insert([{
      entity_type: item.entity_type, entity_id: item.entity_id, payload: item.payload, client_uuid: item.client_uuid, status: 'pending'
    }]).select().single();
    if (error && /duplicate|unique/i.test(error.message || '')) return { duplicate: true };
    return data?.id;
  },
  flushSyncOutbox: async () => {
    const { data: pending } = await supabase.from('sync_outbox').select('*').eq('status', 'pending');
    const now = new Date().toISOString();
    for (const row of pending || []) {
      await supabase.from('sync_outbox').update({ status: 'synced', synced_at: now }).eq('id', row.id);
    }
    return { success: true, synced: (pending || []).length, timestamp: now };
  },

  // --- Phase 5 ---
  getGeofences: async () => { const { data } = await supabase.from('geofences').select('*'); return data || []; },
  addGeofence: async (g: any) => { const { data } = await supabase.from('geofences').insert([g]).select().single(); return data?.id; },
  getVehicleExpenses: async (vehicleId?: number) => {
    let q = supabase.from('vehicle_expenses').select('*, vehicles(registration_number)').order('expense_date', { ascending: false });
    if (vehicleId) q = q.eq('vehicle_id', vehicleId);
    const { data } = await q;
    return (data || []).map((d: any) => ({ ...d, registration_number: d.vehicles?.registration_number }));
  },
  addVehicleExpense: async (e: any) => { const { data } = await supabase.from('vehicle_expenses').insert([e]).select().single(); return data?.id; },
  getVehicleFuel: async (vehicleId?: number) => {
    let q = supabase.from('vehicle_fuel').select('*, vehicles(registration_number)').order('fuel_date', { ascending: false });
    if (vehicleId) q = q.eq('vehicle_id', vehicleId);
    const { data } = await q;
    return (data || []).map((d: any) => ({ ...d, registration_number: d.vehicles?.registration_number }));
  },
  addVehicleFuel: async (f: any) => { const { data } = await supabase.from('vehicle_fuel').insert([f]).select().single(); return data?.id; },
  getVehicleMaintenance: async (vehicleId?: number) => {
    let q = supabase.from('vehicle_maintenance').select('*, vehicles(registration_number)').order('service_date', { ascending: false });
    if (vehicleId) q = q.eq('vehicle_id', vehicleId);
    const { data } = await q;
    return (data || []).map((d: any) => ({ ...d, registration_number: d.vehicles?.registration_number }));
  },
  addVehicleMaintenance: async (m: any) => { const { data } = await supabase.from('vehicle_maintenance').insert([m]).select().single(); return data?.id; },
  getLocationPlayback: async (userId: number, from: string, to: string) => {
    const { data } = await supabase.from('location_logs').select('*').eq('user_id', userId).gte('recorded_at', from).lte('recorded_at', to).order('recorded_at');
    return data || [];
  },

  // --- Phase 6 ---
  addAuditLog: async (log: any) => { const { data } = await supabase.from('audit_logs').insert([log]).select().single(); return data?.id; },
  getAuditLogs: async () => { const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500); return data || []; },
  getNotifications: async (userId?: number) => {
    let q = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
    if (userId) q = q.or(`user_id.is.null,user_id.eq.${userId}`);
    const { data } = await q;
    return data || [];
  },
  addNotification: async (n: any) => { const { data } = await supabase.from('notifications').insert([n]).select().single(); return data?.id; },
  markNotificationRead: async (id: number) => { await supabase.from('notifications').update({ read: true }).eq('id', id); return true; },
  backupDatabase: async () => {
    const tables = ['products', 'customers', 'suppliers', 'sales', 'users'];
    const dump: Record<string, any> = {};
    for (const t of tables) {
      const { data } = await supabase.from(t).select('*');
      dump[t] = data || [];
    }
    return { success: true, timestamp: new Date().toISOString(), dump };
  },
  getExtendedReport: async (filters: any = {}) => {
    const from = filters.from || '1970-01-01';
    const to = filters.to || '2999-12-31';
    const { data: sales } = await supabase.from('sales').select('*').gte('created_at', from).lte('created_at', to + 'T23:59:59');
    const { data: purchases } = await supabase.from('grns').select('*').gte('created_at', from).lte('created_at', to + 'T23:59:59');
    const { data: visits } = await supabase.from('customer_visits').select('*').gte('visited_at', from).lte('visited_at', to + 'T23:59:59');
    const lowStock = await supabaseAPI.getLowStockProducts();
    return {
      salesTotal: (sales || []).reduce((s: number, x: any) => s + (x.net_amount || 0), 0),
      purchaseTotal: (purchases || []).reduce((s: number, x: any) => s + (x.total_amount || 0), 0),
      visitCount: (visits || []).length,
      salesCount: (sales || []).length,
      lowStock,
      sales: sales || [],
      purchases: purchases || []
    };
  },
};
