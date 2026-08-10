const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

const { initDatabase, getDatabase } = require('./database.cjs');
const { hashPassword, verifyPassword, isHashed } = require('./auth.cjs');
const { ipcMain } = require('electron');

app.whenReady().then(() => {
  initDatabase();

  ipcMain.handle('get-products', () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM products').all();
  });

  ipcMain.handle('add-product', (event, product) => {
    const db = getDatabase();
    const stmt = db.prepare(
      'INSERT INTO products (name, barcode, selling_price, cost_price, stock_quantity) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      product.name,
      product.barcode,
      product.selling_price,
      product.cost_price ?? 0,
      product.stock_quantity
    );
    return { id: result.lastInsertRowid, ...product };
  });

  ipcMain.handle('get-customers', () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM customers').all();
  });

  ipcMain.handle('add-customer', (event, customer) => {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO customers (shop_name, owner_name, contact_number, address, route, credit_limit) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(customer.shop_name, customer.owner_name, customer.contact_number, customer.address, customer.route, customer.credit_limit);
    return { id: result.lastInsertRowid, ...customer };
  });

  ipcMain.handle('get-suppliers', () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM suppliers').all();
  });

  ipcMain.handle('add-supplier', (event, supplier) => {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO suppliers (name, contact_person, contact_number, address) VALUES (?, ?, ?, ?)');
    const result = stmt.run(supplier.name, supplier.contact_person, supplier.contact_number, supplier.address);
    return { id: result.lastInsertRowid, ...supplier };
  });

  ipcMain.handle('get-vehicles', () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM vehicles').all();
  });

  ipcMain.handle('add-vehicle', (event, vehicle) => {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO vehicles (registration_number, driver_name, insurance_expiry, revenue_license_expiry) VALUES (?, ?, ?, ?)');
    const result = stmt.run(vehicle.registration_number, vehicle.driver_name, vehicle.insurance_expiry, vehicle.revenue_license_expiry);
    return { id: result.lastInsertRowid, ...vehicle };
  });

  ipcMain.handle('get-grns', () => {
    const db = getDatabase();
    return db.prepare('SELECT g.*, s.name as supplier_name FROM grns g JOIN suppliers s ON g.supplier_id = s.id').all();
  });

  ipcMain.handle('add-grn', (event, grnData) => {
    const db = getDatabase();
    const transaction = db.transaction((data) => {
      const totalMeters = (data.items || []).reduce((sum, item) => sum + (Number(item.total_meters) || 0), 0);
      const grnStmt = db.prepare(
        'INSERT INTO grns (supplier_id, grn_number, supplier_invoice_no, total_amount, status, received_at, notes, total_meters, po_id) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)'
      );
      const grnResult = grnStmt.run(
        data.supplier_id,
        data.grn_number,
        data.supplier_invoice_no,
        data.total_amount,
        data.status || 'Received',
        data.notes || null,
        totalMeters,
        data.po_id || null
      );
      const grnId = grnResult.lastInsertRowid;

      const itemStmt = db.prepare(
        `INSERT INTO grn_items (
          grn_id, product_id, quantity, cost_price, total_price,
          packaging_type, quantity_meters, total_meters, item_status, added_to_inventory_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      );
      const stockStmt = db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, cost_price = ? WHERE id = ?');
      const balStmt = db.prepare('SELECT stock_quantity FROM products WHERE id = ?');
      const moveStmt = db.prepare(
        `INSERT INTO stock_movements (
          product_id, movement_type, quantity_units, quantity_meters, reference, notes,
          balance_before, balance_after, created_by
        ) VALUES (?, 'GRN_Received', ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const item of data.items) {
        const meters = Number(item.total_meters) || 0;
        const stockUnits = Number(item.stock_units != null ? item.stock_units : item.quantity) || 0;
        const before = balStmt.get(item.product_id);
        const balanceBefore = before ? before.stock_quantity : 0;

        itemStmt.run(
          grnId,
          item.product_id,
          item.quantity,
          item.cost_price,
          item.total_price,
          item.packaging_type || null,
          item.quantity_meters != null ? item.quantity_meters : null,
          meters,
          'Added to Inventory'
        );
        stockStmt.run(stockUnits, item.cost_price, item.product_id);
        moveStmt.run(
          item.product_id,
          stockUnits,
          meters,
          data.grn_number,
          `${item.quantity} x ${item.packaging_type || 'unit'}`,
          balanceBefore,
          balanceBefore + stockUnits,
          data.created_by || 'SYSTEM'
        );
      }

      db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(data.total_amount, data.supplier_id);

      return { grnId, totalMeters, itemsProcessed: data.items.length };
    });

    return transaction(grnData);
  });

  ipcMain.handle('get-grtns', () => {
    const db = getDatabase();
    return db.prepare('SELECT g.*, c.shop_name as customer_name FROM grtns g JOIN customers c ON g.customer_id = c.id').all();
  });

  ipcMain.handle('add-grtn', (event, grtnData) => {
    const db = getDatabase();
    const transaction = db.transaction((data) => {
      // Create GRTN
      const grtnStmt = db.prepare('INSERT INTO grtns (customer_id, grtn_number, reason, total_amount) VALUES (?, ?, ?, ?)');
      const grtnResult = grtnStmt.run(data.customer_id, data.grtn_number, data.reason, data.total_amount);
      const grtnId = grtnResult.lastInsertRowid;

      // Add Items and Update Stock (Add back)
      const itemStmt = db.prepare('INSERT INTO grtn_items (grtn_id, product_id, quantity, cost_price, total_price) VALUES (?, ?, ?, ?, ?)');
      const stockStmt = db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?');
      
      for (const item of data.items) {
        itemStmt.run(grtnId, item.product_id, item.quantity, item.cost_price, item.total_price);
        stockStmt.run(item.quantity, item.product_id);
      }

      // Update Customer Balance (deduct return value)
      const custStmt = db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance - ? WHERE id = ?');
      custStmt.run(data.total_amount, data.customer_id);

      return grtnId;
    });
    
    return transaction(grtnData);
  });

  ipcMain.handle('get-stock-adjustments', () => {
    const db = getDatabase();
    return db.prepare('SELECT a.*, p.name as product_name FROM stock_adjustments a JOIN products p ON a.product_id = p.id').all();
  });

  ipcMain.handle('add-stock-adjustment', (event, adjustment) => {
    const db = getDatabase();
    const transaction = db.transaction((data) => {
      // Create Adjustment Record
      const adjStmt = db.prepare('INSERT INTO stock_adjustments (product_id, adjustment_type, quantity, reason) VALUES (?, ?, ?, ?)');
      const adjResult = adjStmt.run(data.product_id, data.adjustment_type, data.quantity, data.reason);

      // Update Stock
      let stockQuery = '';
      if (data.adjustment_type === 'Addition') {
        stockQuery = 'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?';
      } else {
        stockQuery = 'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?';
      }
      db.prepare(stockQuery).run(data.quantity, data.product_id);

      return adjResult.lastInsertRowid;
    });
    
    return transaction(adjustment);
  });

  ipcMain.handle('get-sales', () => {
    const db = getDatabase();
    return db.prepare('SELECT s.*, c.shop_name as customer_name FROM sales s JOIN customers c ON s.customer_id = c.id ORDER BY s.created_at DESC').all();
  });

  ipcMain.handle('get-sale-details', (event, saleId) => {
    const db = getDatabase();
    const sale = db.prepare('SELECT s.*, c.shop_name as customer_name, c.address, c.contact_number FROM sales s JOIN customers c ON s.customer_id = c.id WHERE s.id = ?').get(saleId);
    if (!sale) return null;
    const items = db.prepare('SELECT si.*, p.name as product_name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?').all(saleId);
    return { ...sale, items };
  });

  ipcMain.handle('add-sale', (event, saleData) => {
    const db = getDatabase();
    const transaction = db.transaction((data) => {
      // Create Sale
      const saleStmt = db.prepare('INSERT INTO sales (customer_id, invoice_number, sale_type, total_amount, discount, net_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const saleResult = saleStmt.run(data.customer_id, data.invoice_number, data.sale_type, data.total_amount, data.discount, data.net_amount, data.status || 'Completed');
      const saleId = saleResult.lastInsertRowid;

      // Defer stock/balance effects while the sale awaits approval; they are
      // applied later in 'approve-item' when the sale is finalized.
      const isPending = typeof data.status === 'string' && data.status.startsWith('Pending');

      const itemStmt = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, selling_price, total_price) VALUES (?, ?, ?, ?, ?)');
      const stockStmt = db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?');
      
      for (const item of data.items) {
        itemStmt.run(saleId, item.product_id, item.quantity, item.selling_price, item.total_price);
        if (!isPending) {
          stockStmt.run(item.quantity, item.product_id);
        }
      }

      if (data.sale_type === 'Credit' && !isPending) {
        const custStmt = db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance + ? WHERE id = ?');
        custStmt.run(data.net_amount, data.customer_id);
      }

      return saleId;
    });
    
    return transaction(saleData);
  });

  ipcMain.handle('get-cheques', () => {
    const db = getDatabase();
    return db.prepare('SELECT ch.*, c.shop_name as customer_name FROM cheques ch JOIN customers c ON ch.customer_id = c.id').all();
  });

  ipcMain.handle('add-cheque', (event, chequeData) => {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO cheques (customer_id, cheque_number, bank_name, branch_name, amount, issue_date, realize_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(chequeData.customer_id, chequeData.cheque_number, chequeData.bank_name, chequeData.branch_name, chequeData.amount, chequeData.issue_date, chequeData.realize_date);
    
    // Deduct from outstanding balance immediately since it's a payment
    const custStmt = db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance - ? WHERE id = ?');
    custStmt.run(chequeData.amount, chequeData.customer_id);

    return result.lastInsertRowid;
  });

  ipcMain.handle('update-cheque-status', (event, { id, status, customer_id, amount }) => {
    const db = getDatabase();
    const transaction = db.transaction(() => {
      const stmt = db.prepare('UPDATE cheques SET status = ? WHERE id = ?');
      stmt.run(status, id);

      // If bounced, we must re-add the amount to the customer's outstanding balance
      if (status === 'Bounced') {
        const custStmt = db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance + ? WHERE id = ?');
        custStmt.run(amount, customer_id);
      }
    });
    return transaction();
  });

  ipcMain.handle('get-supplier-payments', () => {
    const db = getDatabase();
    return db.prepare('SELECT sp.*, s.name as supplier_name FROM supplier_payments sp JOIN suppliers s ON sp.supplier_id = s.id').all();
  });

  ipcMain.handle('add-supplier-payment', (event, paymentData) => {
    const db = getDatabase();
    const transaction = db.transaction((data) => {
      const stmt = db.prepare('INSERT INTO supplier_payments (supplier_id, payment_method, reference_number, amount, date) VALUES (?, ?, ?, ?, ?)');
      const result = stmt.run(data.supplier_id, data.payment_method, data.reference_number, data.amount, data.date);
      
      const supStmt = db.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?');
      supStmt.run(data.amount, data.supplier_id);

      return result.lastInsertRowid;
    });
    return transaction(paymentData);
  });

  ipcMain.handle('get-report-data', () => {
    try {
      const db = getDatabase();
      
      // Total Sales (All Time)
      const totalSalesRow = db.prepare('SELECT SUM(net_amount) as total FROM sales').get();
      
      // Outstanding Customer Debt
      const totalCustomerDebtRow = db.prepare('SELECT SUM(outstanding_balance) as total FROM customers').get();
      
      // Outstanding Supplier Debt
      const totalSupplierDebtRow = db.prepare('SELECT SUM(balance) as total FROM suppliers').get();

      // Today's Sales
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySalesRow = db.prepare('SELECT SUM(net_amount) as total FROM sales WHERE date(created_at) = ?').get(todayStr);

      // Sales by Day (Last 7 Days)
      const salesChart = db.prepare(`
        SELECT date(created_at) as date, SUM(net_amount) as total 
        FROM sales 
        GROUP BY date(created_at) 
        ORDER BY date(created_at) DESC 
        LIMIT 7
      `).all();

      // Top Selling Products
      const topProducts = db.prepare(`
        SELECT p.name, SUM(si.quantity) as qty_sold, SUM(si.total_price) as revenue
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        GROUP BY p.id
        ORDER BY revenue DESC
        LIMIT 5
      `).all();

      return {
        totalSales: totalSalesRow?.total || 0,
        totalCustomerDebt: totalCustomerDebtRow?.total || 0,
        totalSupplierDebt: totalSupplierDebtRow?.total || 0,
        todaySales: todaySalesRow?.total || 0,
        salesChart: salesChart.reverse(),
        topProducts
      };
    } catch (err) {
      console.error('get-report-data error:', err);
      return {
        totalSales: 0,
        totalCustomerDebt: 0,
        totalSupplierDebt: 0,
        todaySales: 0,
        salesChart: [],
        topProducts: []
      };
    }
  });

  ipcMain.handle('get-cloud-settings', () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM cloud_settings LIMIT 1').get() || null;
  });

  ipcMain.handle('save-cloud-settings', (event, { postgres_url }) => {
    const db = getDatabase();
    const existing = db.prepare('SELECT id FROM cloud_settings LIMIT 1').get();
    if (existing) {
      db.prepare('UPDATE cloud_settings SET postgres_url = ? WHERE id = ?').run(postgres_url, existing.id);
    } else {
      db.prepare('INSERT INTO cloud_settings (postgres_url) VALUES (?)').run(postgres_url);
    }
    return true;
  });

  ipcMain.handle('sync-to-cloud', async () => {
    // In a real scenario, this would use the 'pg' module to connect to the postgres_url
    // and execute INSERT/UPDATE statements to replicate local SQLite tables.
    // For this demonstration, we'll simulate a 2-second synchronization delay.
    return new Promise((resolve) => {
      setTimeout(() => {
        const db = getDatabase();
        const timestamp = new Date().toISOString();
        const existing = db.prepare('SELECT id FROM cloud_settings LIMIT 1').get();
        if (existing) {
          db.prepare('UPDATE cloud_settings SET last_sync = ? WHERE id = ?').run(timestamp, existing.id);
        }
        resolve({ success: true, timestamp });
      }, 2000);
    });
  });

  ipcMain.handle('get-users', () => {
    const db = getDatabase();
    return db.prepare('SELECT id, username, role, full_name, created_at FROM users').all();
  });

  ipcMain.handle('login-user', (event, { username, password }) => {
    const db = getDatabase();
    const record = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!record || !verifyPassword(password, record.password)) {
      return null;
    }

    // Transparently upgrade legacy plaintext passwords to a hash on first login.
    if (!isHashed(record.password)) {
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), record.id);
    }

    return { id: record.id, username: record.username, role: record.role, full_name: record.full_name };
  });

  ipcMain.handle('get-pending-approvals', () => {
    const db = getDatabase();
    // Cheques are intentionally excluded: they have their own clear/bounce
    // lifecycle on the Cheques page and are not part of the approval workflow.
    const grns = db.prepare('SELECT id, grn_number as reference, total_amount as amount, status, "GRN" as type, created_at FROM grns WHERE status LIKE "Pending%"').all();
    const grtns = db.prepare('SELECT id, grtn_number as reference, total_amount as amount, status, "GRTN" as type, created_at FROM grtns WHERE status LIKE "Pending%"').all();
    const sales = db.prepare('SELECT id, invoice_number as reference, net_amount as amount, status, "Sale" as type, created_at FROM sales WHERE status LIKE "Pending%"').all();
    
    return [...grns, ...grtns, ...sales].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  });

  ipcMain.handle('approve-item', (event, { id, type, newStatus }) => {
    const db = getDatabase();
    if (type === 'GRN') {
      // GRN stock/balance effects are applied at creation; approval is a sign-off.
      db.prepare('UPDATE grns SET status = ? WHERE id = ?').run(newStatus, id);
    } else if (type === 'GRTN') {
      // GRTN stock/balance effects are applied at creation; approval is a sign-off.
      db.prepare('UPDATE grtns SET status = ? WHERE id = ?').run(newStatus, id);
    } else if (type === 'Sale') {
      const transaction = db.transaction(() => {
        const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
        if (!sale) return;

        const wasPending = typeof sale.status === 'string' && sale.status.startsWith('Pending');
        const isFinalizing = newStatus === 'Approved' || newStatus === 'Completed';

        db.prepare('UPDATE sales SET status = ? WHERE id = ?').run(newStatus, id);

        // Apply inventory + balance effects exactly once: only when a pending
        // sale is finalized (these were deferred at creation time).
        if (wasPending && isFinalizing) {
          const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
          const stockStmt = db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?');
          for (const item of items) {
            stockStmt.run(item.quantity, item.product_id);
          }
          if (sale.sale_type === 'Credit') {
            db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance + ? WHERE id = ?').run(sale.net_amount, sale.customer_id);
          }
        }
      });
      transaction();
    }
    return true;
  });

  ipcMain.handle('add-user', (event, user) => {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)');
    const result = stmt.run(user.username, hashPassword(user.password), user.role, user.full_name);
    return result.lastInsertRowid;
  });

  ipcMain.handle('delete-user', (event, id) => {
    const db = getDatabase();
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return true;
  });

  // --- Phase 0: update / detail / location / delete parity ---
  ipcMain.handle('update-product', (event, id, data) => {
    const db = getDatabase();
    db.prepare(
      'UPDATE products SET name = COALESCE(?, name), barcode = COALESCE(?, barcode), selling_price = COALESCE(?, selling_price), cost_price = COALESCE(?, cost_price), stock_quantity = COALESCE(?, stock_quantity), low_stock_threshold = COALESCE(?, low_stock_threshold), category_id = COALESCE(?, category_id), brand_id = COALESCE(?, brand_id) WHERE id = ?'
    ).run(data.name, data.barcode, data.selling_price, data.cost_price, data.stock_quantity, data.low_stock_threshold, data.category_id, data.brand_id, id);
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  });

  ipcMain.handle('update-customer', (event, id, data) => {
    const db = getDatabase();
    db.prepare(
      'UPDATE customers SET shop_name = COALESCE(?, shop_name), owner_name = COALESCE(?, owner_name), contact_number = COALESCE(?, contact_number), address = COALESCE(?, address), route = COALESCE(?, route), credit_limit = COALESCE(?, credit_limit), qr_code = COALESCE(?, qr_code) WHERE id = ?'
    ).run(data.shop_name, data.owner_name, data.contact_number, data.address, data.route, data.credit_limit, data.qr_code, id);
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  });

  ipcMain.handle('delete-customer', (event, id) => {
    const db = getDatabase();
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    return true;
  });

  ipcMain.handle('update-supplier', (event, id, data) => {
    const db = getDatabase();
    db.prepare(
      'UPDATE suppliers SET name = COALESCE(?, name), contact_person = COALESCE(?, contact_person), contact_number = COALESCE(?, contact_number), address = COALESCE(?, address) WHERE id = ?'
    ).run(data.name, data.contact_person, data.contact_number, data.address, id);
    return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  });

  ipcMain.handle('update-vehicle', (event, id, data) => {
    const db = getDatabase();
    db.prepare(
      'UPDATE vehicles SET registration_number = COALESCE(?, registration_number), driver_name = COALESCE(?, driver_name), insurance_expiry = COALESCE(?, insurance_expiry), revenue_license_expiry = COALESCE(?, revenue_license_expiry), status = COALESCE(?, status), assigned_user_id = COALESCE(?, assigned_user_id) WHERE id = ?'
    ).run(data.registration_number, data.driver_name, data.insurance_expiry, data.revenue_license_expiry, data.status, data.assigned_user_id, id);
    return db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
  });

  ipcMain.handle('get-grn-details', (event, id) => {
    const db = getDatabase();
    const grn = db.prepare('SELECT * FROM grns WHERE id = ?').get(id);
    if (!grn) return null;
    const items = db.prepare('SELECT * FROM grn_items WHERE grn_id = ?').all(id);
    return { ...grn, items };
  });

  ipcMain.handle('update-grn', (event, id, grnData) => {
    const db = getDatabase();
    const transaction = db.transaction((data) => {
      const oldGrn = db.prepare('SELECT * FROM grns WHERE id = ?').get(id);
      const oldItems = db.prepare('SELECT * FROM grn_items WHERE grn_id = ?').all(id);
      if (oldGrn && oldItems) {
        for (const item of oldItems) {
          const reverseUnits = item.quantity;
          db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(reverseUnits, item.product_id);
          db.prepare(
            `INSERT INTO stock_movements (
              product_id, movement_type, quantity_units, quantity_meters, reference, notes, created_by
            ) VALUES (?, 'GRN_Reversed', ?, ?, ?, ?, 'SYSTEM')`
          ).run(item.product_id, -reverseUnits, -(item.total_meters || 0), oldGrn.grn_number, 'GRN edit reverse');
        }
        db.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?').run(oldGrn.total_amount, oldGrn.supplier_id);
        db.prepare('DELETE FROM grn_items WHERE grn_id = ?').run(id);
      }
      const { items, ...grnInfo } = data;
      const totalMeters = (items || []).reduce((sum, item) => sum + (Number(item.total_meters) || 0), 0);
      db.prepare(
        'UPDATE grns SET supplier_id = ?, grn_number = ?, supplier_invoice_no = ?, total_amount = ?, po_id = COALESCE(?, po_id), status = ?, total_meters = ?, notes = COALESCE(?, notes) WHERE id = ?'
      ).run(
        grnInfo.supplier_id,
        grnInfo.grn_number,
        grnInfo.supplier_invoice_no,
        grnInfo.total_amount,
        grnInfo.po_id || null,
        grnInfo.status || 'Received',
        totalMeters,
        grnInfo.notes || null,
        id
      );
      const itemStmt = db.prepare(
        `INSERT INTO grn_items (
          grn_id, product_id, quantity, cost_price, total_price,
          packaging_type, quantity_meters, total_meters, item_status, added_to_inventory_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      );
      const balStmt = db.prepare('SELECT stock_quantity FROM products WHERE id = ?');
      const moveStmt = db.prepare(
        `INSERT INTO stock_movements (
          product_id, movement_type, quantity_units, quantity_meters, reference, notes,
          balance_before, balance_after, created_by
        ) VALUES (?, 'GRN_Received', ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const item of items) {
        const meters = Number(item.total_meters) || 0;
        const stockUnits = Number(item.stock_units != null ? item.stock_units : item.quantity) || 0;
        const before = balStmt.get(item.product_id);
        const balanceBefore = before ? before.stock_quantity : 0;
        itemStmt.run(
          id,
          item.product_id,
          item.quantity,
          item.cost_price,
          item.total_price,
          item.packaging_type || null,
          item.quantity_meters != null ? item.quantity_meters : null,
          meters,
          'Added to Inventory'
        );
        db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, cost_price = ? WHERE id = ?').run(
          stockUnits,
          item.cost_price,
          item.product_id
        );
        moveStmt.run(
          item.product_id,
          stockUnits,
          meters,
          grnInfo.grn_number,
          `${item.quantity} x ${item.packaging_type || 'unit'}`,
          balanceBefore,
          balanceBefore + stockUnits,
          grnInfo.created_by || 'SYSTEM'
        );
      }
      db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(grnInfo.total_amount, grnInfo.supplier_id);
      return { grnId: id, totalMeters, itemsProcessed: items.length };
    });
    return transaction(grnData);
  });

  ipcMain.handle('get-stock-movements', (event, limit = 100) => {
    const db = getDatabase();
    return db
      .prepare(
        `SELECT m.*, p.name as product_name, p.barcode as product_sku
         FROM stock_movements m
         JOIN products p ON p.id = m.product_id
         ORDER BY m.created_at DESC
         LIMIT ?`
      )
      .all(limit);
  });

  ipcMain.handle('get-grtn-details', (event, id) => {
    const db = getDatabase();
    const grtn = db.prepare('SELECT * FROM grtns WHERE id = ?').get(id);
    if (!grtn) return null;
    const items = db.prepare('SELECT * FROM grtn_items WHERE grtn_id = ?').all(id);
    return { ...grtn, items };
  });

  ipcMain.handle('update-grtn', (event, id, grtnData) => {
    const db = getDatabase();
    const transaction = db.transaction((data) => {
      const oldGrtn = db.prepare('SELECT * FROM grtns WHERE id = ?').get(id);
      const oldItems = db.prepare('SELECT * FROM grtn_items WHERE grtn_id = ?').all(id);
      if (oldGrtn && oldItems) {
        if (oldGrtn.status !== 'Pending Approval') {
          for (const item of oldItems) {
            db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(item.quantity, item.product_id);
          }
          db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance + ? WHERE id = ?').run(oldGrtn.total_amount, oldGrtn.customer_id);
        }
        db.prepare('DELETE FROM grtn_items WHERE grtn_id = ?').run(id);
      }
      const { items, ...grtnInfo } = data;
      db.prepare(
        'UPDATE grtns SET customer_id = ?, grtn_number = ?, reason = ?, total_amount = ?, status = ? WHERE id = ?'
      ).run(grtnInfo.customer_id, grtnInfo.grtn_number, grtnInfo.reason, grtnInfo.total_amount, grtnInfo.status || 'Pending', id);
      const itemStmt = db.prepare('INSERT INTO grtn_items (grtn_id, product_id, quantity, cost_price, total_price) VALUES (?, ?, ?, ?, ?)');
      for (const item of items) {
        itemStmt.run(id, item.product_id, item.quantity, item.cost_price, item.total_price);
        if (grtnInfo.status !== 'Pending Approval') {
          db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(item.quantity, item.product_id);
        }
      }
      if (grtnInfo.status !== 'Pending Approval') {
        db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance - ? WHERE id = ?').run(grtnInfo.total_amount, grtnInfo.customer_id);
      }
      return id;
    });
    return transaction(grtnData);
  });

  ipcMain.handle('update-sale', (event, id, saleData) => {
    const db = getDatabase();
    const transaction = db.transaction((data) => {
      const oldSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
      const oldItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
      if (oldSale && oldItems) {
        if (oldSale.status !== 'Pending Approval' && !(typeof oldSale.status === 'string' && oldSale.status.startsWith('Pending'))) {
          for (const item of oldItems) {
            db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(item.quantity, item.product_id);
          }
          if (oldSale.sale_type === 'Credit') {
            db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance - ? WHERE id = ?').run(oldSale.net_amount, oldSale.customer_id);
          }
        }
        db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id);
      }
      const { items, ...saleInfo } = data;
      db.prepare(
        'UPDATE sales SET customer_id = ?, invoice_number = ?, sale_type = ?, total_amount = ?, discount = ?, net_amount = ?, status = ? WHERE id = ?'
      ).run(saleInfo.customer_id, saleInfo.invoice_number, saleInfo.sale_type, saleInfo.total_amount, saleInfo.discount, saleInfo.net_amount, saleInfo.status, id);
      const isPending = typeof saleInfo.status === 'string' && saleInfo.status.startsWith('Pending');
      const itemStmt = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, selling_price, total_price) VALUES (?, ?, ?, ?, ?)');
      for (const item of items) {
        itemStmt.run(id, item.product_id, item.quantity, item.selling_price, item.total_price);
        if (!isPending) {
          db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(item.quantity, item.product_id);
        }
      }
      if (saleInfo.sale_type === 'Credit' && !isPending) {
        db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance + ? WHERE id = ?').run(saleInfo.net_amount, saleInfo.customer_id);
      }
      return id;
    });
    return transaction(saleData);
  });

  ipcMain.handle('log-location', (event, entry) => {
    const db = getDatabase();
    db.prepare(
      'INSERT INTO location_logs (user_id, username, full_name, latitude, longitude, accuracy, recorded_at) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))'
    ).run(entry.user_id, entry.username, entry.full_name, entry.latitude, entry.longitude, entry.accuracy || null, entry.recorded_at || null);
    return true;
  });

  ipcMain.handle('get-latest-locations', () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM location_logs ORDER BY recorded_at DESC LIMIT 2000').all();
    const latestByUser = {};
    for (const row of rows) {
      const key = String(row.user_id ?? row.username);
      if (!latestByUser[key]) latestByUser[key] = row;
    }
    return Object.values(latestByUser);
  });

  ipcMain.handle('get-location-trail', (event, userId, limit = 200) => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM location_logs WHERE user_id = ? ORDER BY recorded_at DESC LIMIT ?').all(userId, limit);
  });

  // Fix add-cheque to include received_from
  ipcMain.removeHandler('add-cheque');
  ipcMain.handle('add-cheque', (event, chequeData) => {
    const db = getDatabase();
    const stmt = db.prepare(
      'INSERT INTO cheques (customer_id, cheque_number, bank_name, branch_name, amount, issue_date, realize_date, received_from) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      chequeData.customer_id,
      chequeData.cheque_number,
      chequeData.bank_name,
      chequeData.branch_name,
      chequeData.amount,
      chequeData.issue_date,
      chequeData.realize_date,
      chequeData.received_from || null
    );
    db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance - ? WHERE id = ?').run(chequeData.amount, chequeData.customer_id);
    return result.lastInsertRowid;
  });

  // --- Phase 1: Routes & Visits ---
  ipcMain.handle('get-routes', () => {
    const db = getDatabase();
    return db.prepare('SELECT r.*, u.full_name as assigned_user_name FROM routes r LEFT JOIN users u ON r.assigned_user_id = u.id').all();
  });
  ipcMain.handle('add-route', (event, route) => {
    const db = getDatabase();
    const result = db.prepare('INSERT INTO routes (name, description, assigned_user_id, status) VALUES (?, ?, ?, ?)').run(
      route.name, route.description || null, route.assigned_user_id || null, route.status || 'Active'
    );
    const routeId = result.lastInsertRowid;
    if (route.stops?.length) {
      const stmt = db.prepare('INSERT INTO route_stops (route_id, customer_id, sequence_no) VALUES (?, ?, ?)');
      route.stops.forEach((s, i) => stmt.run(routeId, s.customer_id, s.sequence_no ?? i + 1));
    }
    return routeId;
  });
  ipcMain.handle('get-route-stops', (event, routeId) => {
    const db = getDatabase();
    return db.prepare(
      'SELECT rs.*, c.shop_name, c.address, c.qr_code FROM route_stops rs JOIN customers c ON rs.customer_id = c.id WHERE rs.route_id = ? ORDER BY rs.sequence_no'
    ).all(routeId);
  });
  ipcMain.handle('update-route-stops', (event, routeId, stops) => {
    const db = getDatabase();
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM route_stops WHERE route_id = ?').run(routeId);
      const stmt = db.prepare('INSERT INTO route_stops (route_id, customer_id, sequence_no) VALUES (?, ?, ?)');
      stops.forEach((s, i) => stmt.run(routeId, s.customer_id, s.sequence_no ?? i + 1));
    });
    tx();
    return true;
  });
  ipcMain.handle('get-daily-schedules', (event, date) => {
    const db = getDatabase();
    if (date) {
      return db.prepare(
        'SELECT ds.*, r.name as route_name FROM daily_schedules ds JOIN routes r ON ds.route_id = r.id WHERE ds.schedule_date = ?'
      ).all(date);
    }
    return db.prepare(
      'SELECT ds.*, r.name as route_name FROM daily_schedules ds JOIN routes r ON ds.route_id = r.id ORDER BY ds.schedule_date DESC LIMIT 50'
    ).all();
  });
  ipcMain.handle('add-daily-schedule', (event, sched) => {
    const db = getDatabase();
    const result = db.prepare(
      'INSERT INTO daily_schedules (route_id, schedule_date, assigned_user_id, status) VALUES (?, ?, ?, ?)'
    ).run(sched.route_id, sched.schedule_date, sched.assigned_user_id || null, sched.status || 'Planned');
    return result.lastInsertRowid;
  });
  ipcMain.handle('get-customer-visits', (event, filters = {}) => {
    const db = getDatabase();
    let sql = 'SELECT v.*, c.shop_name FROM customer_visits v JOIN customers c ON v.customer_id = c.id WHERE 1=1';
    const params = [];
    if (filters.customer_id) { sql += ' AND v.customer_id = ?'; params.push(filters.customer_id); }
    if (filters.date) { sql += ' AND date(v.visited_at) = ?'; params.push(filters.date); }
    sql += ' ORDER BY v.visited_at DESC LIMIT 200';
    return db.prepare(sql).all(...params);
  });
  ipcMain.handle('add-customer-visit', (event, visit) => {
    const db = getDatabase();
    const result = db.prepare(
      'INSERT INTO customer_visits (customer_id, user_id, schedule_id, method, reason, latitude, longitude, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      visit.customer_id, visit.user_id || null, visit.schedule_id || null,
      visit.method || 'manual', visit.reason || null,
      visit.latitude || null, visit.longitude || null, visit.photo_url || null
    );
    return result.lastInsertRowid;
  });
  ipcMain.handle('ensure-customer-qr', (event, customerId) => {
    const db = getDatabase();
    const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    if (!c) return null;
    if (c.qr_code) return c.qr_code;
    const code = `CUST-${customerId}-${Date.now().toString(36).toUpperCase()}`;
    db.prepare('UPDATE customers SET qr_code = ? WHERE id = ?').run(code, customerId);
    return code;
  });
  ipcMain.handle('get-customer-by-qr', (event, qrCode) => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM customers WHERE qr_code = ?').get(qrCode) || null;
  });
  ipcMain.handle('get-route-completion', (event, scheduleId) => {
    const db = getDatabase();
    const sched = db.prepare('SELECT * FROM daily_schedules WHERE id = ?').get(scheduleId);
    if (!sched) return { total: 0, visited: 0, percent: 0, missed: [] };
    const stops = db.prepare('SELECT rs.*, c.shop_name FROM route_stops rs JOIN customers c ON rs.customer_id = c.id WHERE rs.route_id = ?').all(sched.route_id);
    const visits = db.prepare(
      'SELECT DISTINCT customer_id FROM customer_visits WHERE schedule_id = ? OR (date(visited_at) = ? AND user_id = ?)'
    ).all(scheduleId, sched.schedule_date, sched.assigned_user_id);
    const visitedIds = new Set(visits.map((v) => v.customer_id));
    const visited = stops.filter((s) => visitedIds.has(s.customer_id)).length;
    const missed = stops.filter((s) => !visitedIds.has(s.customer_id));
    const percent = stops.length ? Math.round((visited / stops.length) * 100) : 0;
    return { total: stops.length, visited, percent, missed };
  });

  // --- Phase 2: Categories, brands, PO, warehouses ---
  ipcMain.handle('get-categories', () => getDatabase().prepare('SELECT * FROM categories').all());
  ipcMain.handle('add-category', (event, cat) => {
    const r = getDatabase().prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(cat.name, cat.description || null);
    return r.lastInsertRowid;
  });
  ipcMain.handle('delete-category', (event, id) => {
    getDatabase().prepare('DELETE FROM categories WHERE id = ?').run(id);
    return true;
  });
  ipcMain.handle('get-brands', () => getDatabase().prepare('SELECT * FROM brands').all());
  ipcMain.handle('add-brand', (event, brand) => {
    const r = getDatabase().prepare('INSERT INTO brands (name) VALUES (?)').run(brand.name);
    return r.lastInsertRowid;
  });
  ipcMain.handle('delete-brand', (event, id) => {
    getDatabase().prepare('DELETE FROM brands WHERE id = ?').run(id);
    return true;
  });
  ipcMain.handle('get-warehouses', () => getDatabase().prepare('SELECT * FROM warehouses').all());
  ipcMain.handle('add-warehouse', (event, wh) => {
    const r = getDatabase().prepare('INSERT INTO warehouses (name, location, is_default) VALUES (?, ?, ?)').run(wh.name, wh.location || null, wh.is_default ? 1 : 0);
    return r.lastInsertRowid;
  });
  ipcMain.handle('get-warehouse-stock', () => {
    return getDatabase().prepare(
      'SELECT ws.*, w.name as warehouse_name, p.name as product_name FROM warehouse_stock ws JOIN warehouses w ON ws.warehouse_id = w.id JOIN products p ON ws.product_id = p.id'
    ).all();
  });
  ipcMain.handle('add-stock-transfer', (event, t) => {
    const db = getDatabase();
    const tx = db.transaction(() => {
      db.prepare('INSERT INTO stock_transfers (from_warehouse_id, to_warehouse_id, product_id, quantity, notes) VALUES (?, ?, ?, ?, ?)').run(
        t.from_warehouse_id, t.to_warehouse_id, t.product_id, t.quantity, t.notes || null
      );
      const dec = db.prepare('UPDATE warehouse_stock SET quantity = quantity - ? WHERE warehouse_id = ? AND product_id = ?');
      const existing = db.prepare('SELECT id FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?').get(t.from_warehouse_id, t.product_id);
      if (existing) dec.run(t.quantity, t.from_warehouse_id, t.product_id);
      const dest = db.prepare('SELECT id, quantity FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?').get(t.to_warehouse_id, t.product_id);
      if (dest) {
        db.prepare('UPDATE warehouse_stock SET quantity = quantity + ? WHERE id = ?').run(t.quantity, dest.id);
      } else {
        db.prepare('INSERT INTO warehouse_stock (warehouse_id, product_id, quantity) VALUES (?, ?, ?)').run(t.to_warehouse_id, t.product_id, t.quantity);
      }
      return true;
    });
    return tx();
  });
  ipcMain.handle('get-stock-transfers', () => {
    return getDatabase().prepare(
      `SELECT st.*, p.name as product_name, fw.name as from_name, tw.name as to_name
       FROM stock_transfers st
       JOIN products p ON st.product_id = p.id
       JOIN warehouses fw ON st.from_warehouse_id = fw.id
       JOIN warehouses tw ON st.to_warehouse_id = tw.id
       ORDER BY st.created_at DESC`
    ).all();
  });
  ipcMain.handle('get-purchase-orders', () => {
    return getDatabase().prepare(
      'SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id ORDER BY po.created_at DESC'
    ).all();
  });
  ipcMain.handle('add-purchase-order', (event, poData) => {
    const db = getDatabase();
    const tx = db.transaction((data) => {
      const { items, ...info } = data;
      const r = db.prepare(
        'INSERT INTO purchase_orders (supplier_id, po_number, total_amount, status) VALUES (?, ?, ?, ?)'
      ).run(info.supplier_id, info.po_number, info.total_amount, info.status || 'Draft');
      const poId = r.lastInsertRowid;
      const stmt = db.prepare('INSERT INTO purchase_order_items (po_id, product_id, quantity, cost_price, total_price) VALUES (?, ?, ?, ?, ?)');
      for (const item of items || []) {
        stmt.run(poId, item.product_id, item.quantity, item.cost_price, item.total_price);
      }
      return poId;
    });
    return tx(poData);
  });
  ipcMain.handle('get-purchase-order-details', (event, id) => {
    const db = getDatabase();
    const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
    if (!po) return null;
    const items = db.prepare('SELECT poi.*, p.name as product_name FROM purchase_order_items poi JOIN products p ON poi.product_id = p.id WHERE po_id = ?').all(id);
    return { ...po, items };
  });
  ipcMain.handle('get-purchase-returns', () => {
    return getDatabase().prepare(
      'SELECT pr.*, s.name as supplier_name FROM purchase_returns pr JOIN suppliers s ON pr.supplier_id = s.id ORDER BY pr.created_at DESC'
    ).all();
  });
  ipcMain.handle('add-purchase-return', (event, retData) => {
    const db = getDatabase();
    const tx = db.transaction((data) => {
      const { items, ...info } = data;
      const r = db.prepare(
        'INSERT INTO purchase_returns (supplier_id, return_number, total_amount, reason, status) VALUES (?, ?, ?, ?, ?)'
      ).run(info.supplier_id, info.return_number, info.total_amount, info.reason || null, info.status || 'Completed');
      const returnId = r.lastInsertRowid;
      const stmt = db.prepare('INSERT INTO purchase_return_items (return_id, product_id, quantity, cost_price, total_price) VALUES (?, ?, ?, ?, ?)');
      for (const item of items || []) {
        stmt.run(returnId, item.product_id, item.quantity, item.cost_price, item.total_price);
        db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(item.quantity, item.product_id);
      }
      db.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?').run(info.total_amount, info.supplier_id);
      return returnId;
    });
    return tx(retData);
  });
  ipcMain.handle('get-low-stock-products', () => {
    return getDatabase().prepare(
      'SELECT * FROM products WHERE stock_quantity <= COALESCE(low_stock_threshold, 10) ORDER BY stock_quantity ASC'
    ).all();
  });

  // --- Phase 3: Quotes, SO, DN, payments, cash book ---
  ipcMain.handle('get-quotations', () => {
    return getDatabase().prepare(
      'SELECT q.*, c.shop_name as customer_name FROM quotations q JOIN customers c ON q.customer_id = c.id ORDER BY q.created_at DESC'
    ).all();
  });
  ipcMain.handle('add-quotation', (event, qData) => {
    const db = getDatabase();
    const tx = db.transaction((data) => {
      const { items, ...info } = data;
      const r = db.prepare(
        'INSERT INTO quotations (customer_id, quote_number, total_amount, discount, net_amount, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(info.customer_id, info.quote_number, info.total_amount, info.discount || 0, info.net_amount, info.status || 'Draft');
      const qId = r.lastInsertRowid;
      const stmt = db.prepare('INSERT INTO quotation_items (quotation_id, product_id, quantity, selling_price, total_price) VALUES (?, ?, ?, ?, ?)');
      for (const item of items || []) stmt.run(qId, item.product_id, item.quantity, item.selling_price, item.total_price);
      return qId;
    });
    return tx(qData);
  });
  ipcMain.handle('convert-quotation-to-so', (event, quotationId) => {
    const db = getDatabase();
    const tx = db.transaction(() => {
      const q = db.prepare('SELECT * FROM quotations WHERE id = ?').get(quotationId);
      if (!q) return null;
      const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(quotationId);
      const soNumber = `SO-${Date.now()}`;
      const r = db.prepare(
        'INSERT INTO sales_orders (customer_id, quotation_id, so_number, total_amount, discount, net_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(q.customer_id, quotationId, soNumber, q.total_amount, q.discount, q.net_amount, 'Open');
      const soId = r.lastInsertRowid;
      const stmt = db.prepare('INSERT INTO sales_order_items (so_id, product_id, quantity, selling_price, total_price) VALUES (?, ?, ?, ?, ?)');
      for (const item of items) stmt.run(soId, item.product_id, item.quantity, item.selling_price, item.total_price);
      db.prepare('UPDATE quotations SET status = ? WHERE id = ?').run('Converted', quotationId);
      return soId;
    });
    return tx();
  });
  ipcMain.handle('get-sales-orders', () => {
    return getDatabase().prepare(
      'SELECT so.*, c.shop_name as customer_name FROM sales_orders so JOIN customers c ON so.customer_id = c.id ORDER BY so.created_at DESC'
    ).all();
  });
  ipcMain.handle('convert-so-to-invoice', (event, soId) => {
    const db = getDatabase();
    const tx = db.transaction(() => {
      const so = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(soId);
      if (!so) return null;
      const items = db.prepare('SELECT * FROM sales_order_items WHERE so_id = ?').all(soId);
      const invoice = `INV-${Date.now()}`;
      const r = db.prepare(
        'INSERT INTO sales (customer_id, invoice_number, sale_type, total_amount, discount, net_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(so.customer_id, invoice, 'Credit', so.total_amount, so.discount, so.net_amount, 'Completed');
      const saleId = r.lastInsertRowid;
      const itemStmt = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, selling_price, total_price) VALUES (?, ?, ?, ?, ?)');
      for (const item of items) {
        itemStmt.run(saleId, item.product_id, item.quantity, item.selling_price, item.total_price);
        db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(item.quantity, item.product_id);
      }
      db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance + ? WHERE id = ?').run(so.net_amount, so.customer_id);
      db.prepare('UPDATE sales_orders SET status = ? WHERE id = ?').run('Invoiced', soId);
      return saleId;
    });
    return tx();
  });
  ipcMain.handle('get-delivery-notes', () => {
    return getDatabase().prepare(
      'SELECT dn.*, c.shop_name as customer_name FROM delivery_notes dn JOIN customers c ON dn.customer_id = c.id ORDER BY dn.created_at DESC'
    ).all();
  });
  ipcMain.handle('add-delivery-note', (event, dn) => {
    const r = getDatabase().prepare(
      'INSERT INTO delivery_notes (sale_id, so_id, dn_number, customer_id, status) VALUES (?, ?, ?, ?, ?)'
    ).run(dn.sale_id || null, dn.so_id || null, dn.dn_number, dn.customer_id, dn.status || 'Dispatched');
    return r.lastInsertRowid;
  });
  ipcMain.handle('get-customer-payments', () => {
    return getDatabase().prepare(
      'SELECT cp.*, c.shop_name as customer_name FROM customer_payments cp JOIN customers c ON cp.customer_id = c.id ORDER BY cp.created_at DESC'
    ).all();
  });
  ipcMain.handle('add-customer-payment', (event, payment) => {
    const db = getDatabase();
    const tx = db.transaction(() => {
      const r = db.prepare(
        'INSERT INTO customer_payments (customer_id, payment_method, reference_number, amount, date, notes) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(payment.customer_id, payment.payment_method, payment.reference_number || null, payment.amount, payment.date, payment.notes || null);
      db.prepare('UPDATE customers SET outstanding_balance = outstanding_balance - ? WHERE id = ?').run(payment.amount, payment.customer_id);
      db.prepare(
        'INSERT INTO cash_book (entry_type, category, description, amount, entry_date) VALUES (?, ?, ?, ?, ?)'
      ).run('Income', 'Customer Payment', `Payment from customer #${payment.customer_id}`, payment.amount, payment.date);
      return r.lastInsertRowid;
    });
    return tx();
  });
  ipcMain.handle('get-cash-book', () => getDatabase().prepare('SELECT * FROM cash_book ORDER BY entry_date DESC, id DESC').all());
  ipcMain.handle('add-cash-book-entry', (event, entry) => {
    const r = getDatabase().prepare(
      'INSERT INTO cash_book (entry_type, category, description, amount, entry_date) VALUES (?, ?, ?, ?, ?)'
    ).run(entry.entry_type, entry.category || null, entry.description || null, entry.amount, entry.entry_date);
    return r.lastInsertRowid;
  });
  ipcMain.handle('get-bank-transactions', () => getDatabase().prepare('SELECT * FROM bank_transactions ORDER BY transaction_date DESC').all());
  ipcMain.handle('add-bank-transaction', (event, t) => {
    const r = getDatabase().prepare(
      'INSERT INTO bank_transactions (bank_name, transaction_type, reference_number, amount, transaction_date, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(t.bank_name || null, t.transaction_type, t.reference_number || null, t.amount, t.transaction_date, t.notes || null);
    return r.lastInsertRowid;
  });
  ipcMain.handle('get-income-expenses', () => getDatabase().prepare('SELECT * FROM income_expenses ORDER BY entry_date DESC').all());
  ipcMain.handle('add-income-expense', (event, e) => {
    const r = getDatabase().prepare(
      'INSERT INTO income_expenses (type, category, description, amount, entry_date) VALUES (?, ?, ?, ?, ?)'
    ).run(e.type, e.category || null, e.description || null, e.amount, e.entry_date);
    return r.lastInsertRowid;
  });
  ipcMain.handle('get-promotions', () => getDatabase().prepare('SELECT * FROM promotions ORDER BY id DESC').all());
  ipcMain.handle('add-promotion', (event, p) => {
    const r = getDatabase().prepare(
      'INSERT INTO promotions (name, discount_percent, start_date, end_date, active) VALUES (?, ?, ?, ?, ?)'
    ).run(p.name, p.discount_percent || 0, p.start_date || null, p.end_date || null, p.active !== false ? 1 : 0);
    return r.lastInsertRowid;
  });
  ipcMain.handle('get-customer-statement', (event, customerId) => {
    const db = getDatabase();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    const sales = db.prepare('SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at').all(customerId);
    const payments = db.prepare('SELECT * FROM customer_payments WHERE customer_id = ? ORDER BY date').all(customerId);
    const cheques = db.prepare('SELECT * FROM cheques WHERE customer_id = ? ORDER BY created_at').all(customerId);
    return { customer, sales, payments, cheques };
  });
  ipcMain.handle('get-supplier-statement', (event, supplierId) => {
    const db = getDatabase();
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);
    const grns = db.prepare('SELECT * FROM grns WHERE supplier_id = ? ORDER BY created_at').all(supplierId);
    const payments = db.prepare('SELECT * FROM supplier_payments WHERE supplier_id = ? ORDER BY date').all(supplierId);
    return { supplier, grns, payments };
  });

  // --- Phase 4: Offline outbox / sync ---
  ipcMain.handle('get-sync-outbox', () => getDatabase().prepare('SELECT * FROM sync_outbox ORDER BY created_at DESC LIMIT 200').all());
  ipcMain.handle('enqueue-sync', (event, item) => {
    const db = getDatabase();
    try {
      const r = db.prepare(
        'INSERT INTO sync_outbox (entity_type, entity_id, payload, client_uuid, status) VALUES (?, ?, ?, ?, ?)'
      ).run(item.entity_type, item.entity_id || null, JSON.stringify(item.payload), item.client_uuid, 'pending');
      return r.lastInsertRowid;
    } catch (e) {
      if (String(e).includes('UNIQUE')) return { duplicate: true };
      throw e;
    }
  });
  ipcMain.handle('flush-sync-outbox', () => {
    const db = getDatabase();
    const pending = db.prepare("SELECT * FROM sync_outbox WHERE status = 'pending'").all();
    const now = new Date().toISOString();
    for (const row of pending) {
      db.prepare("UPDATE sync_outbox SET status = 'synced', synced_at = ? WHERE id = ?").run(now, row.id);
    }
    const existing = db.prepare('SELECT id FROM cloud_settings LIMIT 1').get();
    if (existing) db.prepare('UPDATE cloud_settings SET last_sync = ? WHERE id = ?').run(now, existing.id);
    return { success: true, synced: pending.length, timestamp: now };
  });
  ipcMain.removeHandler('sync-to-cloud');
  ipcMain.handle('sync-to-cloud', async () => {
    const db = getDatabase();
    const pending = db.prepare("SELECT * FROM sync_outbox WHERE status = 'pending'").all();
    const now = new Date().toISOString();
    for (const row of pending) {
      db.prepare("UPDATE sync_outbox SET status = 'synced', synced_at = ? WHERE id = ?").run(now, row.id);
    }
    const existing = db.prepare('SELECT id FROM cloud_settings LIMIT 1').get();
    if (existing) db.prepare('UPDATE cloud_settings SET last_sync = ? WHERE id = ?').run(now, existing.id);
    else db.prepare('INSERT INTO cloud_settings (postgres_url, last_sync) VALUES (?, ?)').run('', now);
    return { success: true, synced: pending.length, timestamp: now };
  });

  // --- Phase 5: Fleet / geofence ---
  ipcMain.handle('get-geofences', () => getDatabase().prepare('SELECT * FROM geofences').all());
  ipcMain.handle('add-geofence', (event, g) => {
    const r = getDatabase().prepare(
      'INSERT INTO geofences (name, latitude, longitude, radius_meters, customer_id) VALUES (?, ?, ?, ?, ?)'
    ).run(g.name, g.latitude, g.longitude, g.radius_meters || 100, g.customer_id || null);
    return r.lastInsertRowid;
  });
  ipcMain.handle('get-vehicle-expenses', (event, vehicleId) => {
    const db = getDatabase();
    if (vehicleId) return db.prepare('SELECT * FROM vehicle_expenses WHERE vehicle_id = ? ORDER BY expense_date DESC').all(vehicleId);
    return db.prepare('SELECT ve.*, v.registration_number FROM vehicle_expenses ve JOIN vehicles v ON ve.vehicle_id = v.id ORDER BY expense_date DESC').all();
  });
  ipcMain.handle('add-vehicle-expense', (event, e) => {
    const r = getDatabase().prepare(
      'INSERT INTO vehicle_expenses (vehicle_id, expense_type, amount, expense_date, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(e.vehicle_id, e.expense_type, e.amount, e.expense_date, e.notes || null);
    return r.lastInsertRowid;
  });
  ipcMain.handle('get-vehicle-fuel', (event, vehicleId) => {
    const db = getDatabase();
    if (vehicleId) return db.prepare('SELECT * FROM vehicle_fuel WHERE vehicle_id = ? ORDER BY fuel_date DESC').all(vehicleId);
    return db.prepare('SELECT vf.*, v.registration_number FROM vehicle_fuel vf JOIN vehicles v ON vf.vehicle_id = v.id ORDER BY fuel_date DESC').all();
  });
  ipcMain.handle('add-vehicle-fuel', (event, f) => {
    const r = getDatabase().prepare(
      'INSERT INTO vehicle_fuel (vehicle_id, liters, amount, odometer, fuel_date) VALUES (?, ?, ?, ?, ?)'
    ).run(f.vehicle_id, f.liters, f.amount, f.odometer || null, f.fuel_date);
    return r.lastInsertRowid;
  });
  ipcMain.handle('get-vehicle-maintenance', (event, vehicleId) => {
    const db = getDatabase();
    if (vehicleId) return db.prepare('SELECT * FROM vehicle_maintenance WHERE vehicle_id = ? ORDER BY service_date DESC').all(vehicleId);
    return db.prepare('SELECT vm.*, v.registration_number FROM vehicle_maintenance vm JOIN vehicles v ON vm.vehicle_id = v.id ORDER BY service_date DESC').all();
  });
  ipcMain.handle('add-vehicle-maintenance', (event, m) => {
    const r = getDatabase().prepare(
      'INSERT INTO vehicle_maintenance (vehicle_id, description, amount, service_date, next_service_date) VALUES (?, ?, ?, ?, ?)'
    ).run(m.vehicle_id, m.description, m.amount || 0, m.service_date, m.next_service_date || null);
    return r.lastInsertRowid;
  });
  ipcMain.handle('get-location-playback', (event, userId, from, to) => {
    const db = getDatabase();
    return db.prepare(
      'SELECT * FROM location_logs WHERE user_id = ? AND datetime(recorded_at) BETWEEN datetime(?) AND datetime(?) ORDER BY recorded_at ASC'
    ).all(userId, from, to);
  });

  // --- Phase 6: Audit, notifications, reports ---
  ipcMain.handle('add-audit-log', (event, log) => {
    const r = getDatabase().prepare(
      'INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(log.user_id || null, log.username || null, log.action, log.entity_type || null, log.entity_id || null, log.details || null);
    return r.lastInsertRowid;
  });
  ipcMain.handle('get-audit-logs', () => getDatabase().prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500').all());
  ipcMain.handle('get-notifications', (event, userId) => {
    const db = getDatabase();
    if (userId) return db.prepare('SELECT * FROM notifications WHERE user_id IS NULL OR user_id = ? ORDER BY created_at DESC LIMIT 100').all(userId);
    return db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100').all();
  });
  ipcMain.handle('add-notification', (event, n) => {
    const r = getDatabase().prepare(
      'INSERT INTO notifications (user_id, title, body, channel) VALUES (?, ?, ?, ?)'
    ).run(n.user_id || null, n.title, n.body || null, n.channel || 'in_app');
    return r.lastInsertRowid;
  });
  ipcMain.handle('mark-notification-read', (event, id) => {
    getDatabase().prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
    return true;
  });
  ipcMain.handle('backup-database', () => {
    const db = getDatabase();
    const tables = ['products', 'customers', 'suppliers', 'sales', 'sale_items', 'grns', 'users'];
    const dump = {};
    for (const t of tables) {
      try { dump[t] = db.prepare(`SELECT * FROM ${t}`).all(); } catch (_) { dump[t] = []; }
    }
    return { success: true, timestamp: new Date().toISOString(), dump };
  });
  ipcMain.handle('get-extended-report', (event, filters = {}) => {
    const db = getDatabase();
    const from = filters.from || '1970-01-01';
    const to = filters.to || '2999-12-31';
    const sales = db.prepare('SELECT * FROM sales WHERE date(created_at) BETWEEN date(?) AND date(?)').all(from, to);
    const purchases = db.prepare('SELECT * FROM grns WHERE date(created_at) BETWEEN date(?) AND date(?)').all(from, to);
    const visits = db.prepare('SELECT * FROM customer_visits WHERE date(visited_at) BETWEEN date(?) AND date(?)').all(from, to);
    const lowStock = db.prepare('SELECT * FROM products WHERE stock_quantity <= COALESCE(low_stock_threshold, 10)').all();
    return {
      salesTotal: sales.reduce((s, x) => s + (x.net_amount || 0), 0),
      purchaseTotal: purchases.reduce((s, x) => s + (x.total_amount || 0), 0),
      visitCount: visits.length,
      salesCount: sales.length,
      lowStock,
      sales,
      purchases
    };
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
