const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: true,
      contextIsolation: false,
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
const { ipcMain } = require('electron');

app.whenReady().then(() => {
  initDatabase();

  ipcMain.handle('get-products', () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM products').all();
  });

  ipcMain.handle('add-product', (event, product) => {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO products (name, barcode, selling_price, stock_quantity) VALUES (?, ?, ?, ?)');
    const result = stmt.run(product.name, product.barcode, product.selling_price, product.stock_quantity);
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
      // Create GRN
      const grnStmt = db.prepare('INSERT INTO grns (supplier_id, grn_number, supplier_invoice_no, total_amount) VALUES (?, ?, ?, ?)');
      const grnResult = grnStmt.run(data.supplier_id, data.grn_number, data.supplier_invoice_no, data.total_amount);
      const grnId = grnResult.lastInsertRowid;

      // Add Items and Update Stock
      const itemStmt = db.prepare('INSERT INTO grn_items (grn_id, product_id, quantity, cost_price, total_price) VALUES (?, ?, ?, ?, ?)');
      const stockStmt = db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, cost_price = ? WHERE id = ?');
      
      for (const item of data.items) {
        itemStmt.run(grnId, item.product_id, item.quantity, item.cost_price, item.total_price);
        stockStmt.run(item.quantity, item.cost_price, item.product_id);
      }

      // Update Supplier Balance
      const supStmt = db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?');
      supStmt.run(data.total_amount, data.supplier_id);

      return grnId;
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
      const saleStmt = db.prepare('INSERT INTO sales (customer_id, invoice_number, sale_type, total_amount, discount, net_amount) VALUES (?, ?, ?, ?, ?, ?)');
      const saleResult = saleStmt.run(data.customer_id, data.invoice_number, data.sale_type, data.total_amount, data.discount, data.net_amount);
      const saleId = saleResult.lastInsertRowid;

      // Add Items and Update Stock (only if not Pending Approval)
      const itemStmt = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, selling_price, total_price) VALUES (?, ?, ?, ?, ?)');
      const stockStmt = db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?');
      
      for (const item of data.items) {
        itemStmt.run(saleId, item.product_id, item.quantity, item.selling_price, item.total_price);
        if (data.status !== 'Pending Approval') {
          stockStmt.run(item.quantity, item.product_id);
        }
      }

      // Update Customer Outstanding Balance if Credit Sale and not Pending Approval
      if (data.sale_type === 'Credit' && data.status !== 'Pending Approval') {
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
    const user = db.prepare('SELECT id, username, role, full_name FROM users WHERE username = ? AND password = ?').get(username, password);
    return user || null;
  });

  ipcMain.handle('get-pending-approvals', () => {
    const db = getDatabase();
    const grns = db.prepare('SELECT id, grn_number as reference, total_amount as amount, status, "GRN" as type, created_at FROM grns WHERE status LIKE "Pending%"').all();
    const cheques = db.prepare('SELECT id, cheque_number as reference, amount, status, "Cheque" as type, created_at FROM cheques WHERE status LIKE "Pending%"').all();
    const grtns = db.prepare('SELECT id, grtn_number as reference, total_amount as amount, status, "GRTN" as type, created_at FROM grtns WHERE status LIKE "Pending%"').all();
    const sales = db.prepare('SELECT id, invoice_number as reference, net_amount as amount, status, "Sale" as type, created_at FROM sales WHERE status LIKE "Pending%"').all();
    
    return [...grns, ...cheques, ...grtns, ...sales].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  });

  ipcMain.handle('approve-item', (event, { id, type, newStatus }) => {
    const db = getDatabase();
    if (type === 'GRN') {
      db.prepare('UPDATE grns SET status = ? WHERE id = ?').run(newStatus, id);
    } else if (type === 'Cheque') {
      db.prepare('UPDATE cheques SET status = ? WHERE id = ?').run(newStatus, id);
    } else if (type === 'GRTN') {
      db.prepare('UPDATE grtns SET status = ? WHERE id = ?').run(newStatus, id);
    } else if (type === 'Sale') {
      const transaction = db.transaction(() => {
        db.prepare('UPDATE sales SET status = ? WHERE id = ?').run(newStatus, id);
        
        if (newStatus === 'Approved' || newStatus === 'Completed') {
          const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
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
    const result = stmt.run(user.username, user.password, user.role, user.full_name);
    return result.lastInsertRowid;
  });

  ipcMain.handle('delete-user', (event, id) => {
    const db = getDatabase();
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return true;
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
