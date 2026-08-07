const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const { hashPassword } = require('./auth.cjs');

let db;

function columnExists(table, column) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    return cols.some((c) => c.name === column);
  } catch (e) {
    return false;
  }
}

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'erp_database.sqlite');
  
  try {
    db = new Database(dbPath, { verbose: console.log });
    console.log(`Connected to the offline SQLite database at ${dbPath}`);
    
    // Create initial tables here
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        full_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        brand_id INTEGER,
        cost_price REAL DEFAULT 0,
        selling_price REAL DEFAULT 0,
        barcode TEXT UNIQUE,
        stock_quantity INTEGER DEFAULT 0,
        FOREIGN KEY(category_id) REFERENCES categories(id),
        FOREIGN KEY(brand_id) REFERENCES brands(id)
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        contact_number TEXT,
        address TEXT,
        route TEXT,
        credit_limit REAL DEFAULT 0,
        outstanding_balance REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_person TEXT,
        contact_number TEXT,
        address TEXT,
        balance REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_number TEXT UNIQUE NOT NULL,
        driver_name TEXT,
        insurance_expiry DATE,
        revenue_license_expiry DATE,
        status TEXT DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS grns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        grn_number TEXT UNIQUE NOT NULL,
        supplier_invoice_no TEXT,
        total_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
      );

      CREATE TABLE IF NOT EXISTS grn_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grn_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        cost_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY(grn_id) REFERENCES grns(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS grtns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        grtn_number TEXT UNIQUE NOT NULL,
        reason TEXT,
        total_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS grtn_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grtn_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        cost_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY(grtn_id) REFERENCES grtns(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        adjustment_type TEXT NOT NULL, 
        quantity INTEGER NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        invoice_number TEXT UNIQUE NOT NULL,
        sale_type TEXT DEFAULT 'Cash', 
        total_amount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        net_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'Completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        selling_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY(sale_id) REFERENCES sales(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS cheques (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        cheque_number TEXT UNIQUE NOT NULL,
        bank_name TEXT NOT NULL,
        branch_name TEXT,
        amount REAL NOT NULL,
        issue_date DATE NOT NULL,
        realize_date DATE NOT NULL,
        status TEXT DEFAULT 'Pending', 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS supplier_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        reference_number TEXT,
        amount REAL NOT NULL,
        date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
      );

      CREATE TABLE IF NOT EXISTS cloud_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        postgres_url TEXT,
        last_sync DATETIME
      );

      CREATE TABLE IF NOT EXISTS location_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        full_name TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy REAL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        assigned_user_id INTEGER,
        status TEXT DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS route_stops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        route_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        sequence_no INTEGER DEFAULT 0,
        FOREIGN KEY(route_id) REFERENCES routes(id),
        FOREIGN KEY(customer_id) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS daily_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        route_id INTEGER NOT NULL,
        schedule_date DATE NOT NULL,
        assigned_user_id INTEGER,
        status TEXT DEFAULT 'Planned',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(route_id) REFERENCES routes(id)
      );

      CREATE TABLE IF NOT EXISTS customer_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        user_id INTEGER,
        schedule_id INTEGER,
        method TEXT DEFAULT 'manual',
        reason TEXT,
        latitude REAL,
        longitude REAL,
        photo_url TEXT,
        visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        location TEXT,
        is_default INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS warehouse_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        warehouse_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 0,
        UNIQUE(warehouse_id, product_id),
        FOREIGN KEY(warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS stock_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_warehouse_id INTEGER NOT NULL,
        to_warehouse_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        po_number TEXT UNIQUE NOT NULL,
        total_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'Draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
      );

      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        cost_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY(po_id) REFERENCES purchase_orders(id)
      );

      CREATE TABLE IF NOT EXISTS purchase_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        return_number TEXT UNIQUE NOT NULL,
        total_amount REAL DEFAULT 0,
        reason TEXT,
        status TEXT DEFAULT 'Completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
      );

      CREATE TABLE IF NOT EXISTS purchase_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        cost_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY(return_id) REFERENCES purchase_returns(id)
      );

      CREATE TABLE IF NOT EXISTS quotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        quote_number TEXT UNIQUE NOT NULL,
        total_amount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        net_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'Draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS quotation_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quotation_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        selling_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY(quotation_id) REFERENCES quotations(id)
      );

      CREATE TABLE IF NOT EXISTS sales_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        quotation_id INTEGER,
        so_number TEXT UNIQUE NOT NULL,
        total_amount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        net_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'Open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS sales_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        so_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        selling_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY(so_id) REFERENCES sales_orders(id)
      );

      CREATE TABLE IF NOT EXISTS delivery_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER,
        so_id INTEGER,
        dn_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        status TEXT DEFAULT 'Dispatched',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customer_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        reference_number TEXT,
        amount REAL NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS cash_book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_type TEXT NOT NULL,
        category TEXT,
        description TEXT,
        amount REAL NOT NULL,
        entry_date DATE NOT NULL,
        payment_method TEXT,
        collection_type TEXT,
        invoice_number TEXT,
        receipt_number TEXT,
        cheque_id INTEGER,
        cheque_reference TEXT,
        sale_id INTEGER,
        receipt_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bank_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bank_name TEXT,
        transaction_type TEXT NOT NULL,
        reference_number TEXT,
        amount REAL NOT NULL,
        transaction_date DATE NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS income_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        category TEXT,
        description TEXT,
        amount REAL NOT NULL,
        entry_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS promotions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        discount_percent REAL DEFAULT 0,
        start_date DATE,
        end_date DATE,
        active INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS sync_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        payload TEXT NOT NULL,
        client_uuid TEXT UNIQUE,
        status TEXT DEFAULT 'pending',
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS geofences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        radius_meters REAL DEFAULT 100,
        customer_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS vehicle_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        expense_type TEXT NOT NULL,
        amount REAL NOT NULL,
        expense_date DATE NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
      );

      CREATE TABLE IF NOT EXISTS vehicle_fuel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        liters REAL NOT NULL,
        amount REAL NOT NULL,
        odometer REAL,
        fuel_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
      );

      CREATE TABLE IF NOT EXISTS vehicle_maintenance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        amount REAL DEFAULT 0,
        service_date DATE NOT NULL,
        next_service_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        body TEXT,
        channel TEXT DEFAULT 'in_app',
        read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // --- Lightweight migrations for databases created by older versions ---

    // Older schemas omitted users.full_name.
    if (!columnExists('users', 'full_name')) {
      try { db.exec('ALTER TABLE users ADD COLUMN full_name TEXT'); } catch (e) {}
    }

    // Older schemas defined grtns with a (wrong) supplier_id column instead of
    // customer_id. Add customer_id if it is missing so existing data keeps working.
    if (!columnExists('grtns', 'customer_id')) {
      try { db.exec('ALTER TABLE grtns ADD COLUMN customer_id INTEGER'); } catch (e) {}
    }

    if (!columnExists('cheques', 'received_from')) {
      try { db.exec('ALTER TABLE cheques ADD COLUMN received_from TEXT'); } catch (e) {}
    }

    if (!columnExists('customers', 'qr_code')) {
      try { db.exec('ALTER TABLE customers ADD COLUMN qr_code TEXT'); } catch (e) {}
    }

    if (!columnExists('products', 'low_stock_threshold')) {
      try { db.exec('ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 10'); } catch (e) {}
    }

    if (!columnExists('products', 'batch_number')) {
      try { db.exec('ALTER TABLE products ADD COLUMN batch_number TEXT'); } catch (e) {}
    }

    if (!columnExists('grns', 'po_id')) {
      try { db.exec('ALTER TABLE grns ADD COLUMN po_id INTEGER'); } catch (e) {}
    }

    if (!columnExists('vehicles', 'assigned_user_id')) {
      try { db.exec('ALTER TABLE vehicles ADD COLUMN assigned_user_id INTEGER'); } catch (e) {}
    }

    // Cash book collection metadata (invoice / receipt / method / cheque)
    const cashBookCols = [
      ['payment_method', 'TEXT'],
      ['collection_type', 'TEXT'],
      ['invoice_number', 'TEXT'],
      ['receipt_number', 'TEXT'],
      ['cheque_id', 'INTEGER'],
      ['cheque_reference', 'TEXT'],
      ['sale_id', 'INTEGER'],
      ['receipt_id', 'INTEGER'],
    ];
    for (const [col, type] of cashBookCols) {
      if (!columnExists('cash_book', col)) {
        try { db.exec(`ALTER TABLE cash_book ADD COLUMN ${col} ${type}`); } catch (e) {}
      }
    }

    // GRN packaging / meters (Sierra Cables auto-inventory)
    const grnItemCols = [
      ['packaging_type', 'TEXT'],
      ['quantity_meters', 'INTEGER'],
      ['total_meters', 'INTEGER'],
      ['item_status', "TEXT DEFAULT 'Pending'"],
      ['added_to_inventory_at', 'DATETIME'],
    ];
    for (const [col, type] of grnItemCols) {
      if (!columnExists('grn_items', col)) {
        try { db.exec(`ALTER TABLE grn_items ADD COLUMN ${col} ${type}`); } catch (e) {}
      }
    }

    if (!columnExists('grns', 'received_at')) {
      try { db.exec('ALTER TABLE grns ADD COLUMN received_at DATETIME'); } catch (e) {}
    }
    if (!columnExists('grns', 'notes')) {
      try { db.exec('ALTER TABLE grns ADD COLUMN notes TEXT'); } catch (e) {}
    }
    if (!columnExists('grns', 'total_meters')) {
      try { db.exec('ALTER TABLE grns ADD COLUMN total_meters INTEGER DEFAULT 0'); } catch (e) {}
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL,
        quantity_units REAL NOT NULL DEFAULT 0,
        quantity_meters INTEGER NOT NULL DEFAULT 0,
        reference TEXT,
        notes TEXT,
        balance_before INTEGER,
        balance_after INTEGER,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(product_id) REFERENCES products(id)
      );
    `);

    // Ensure a default warehouse exists
    const whCount = db.prepare('SELECT COUNT(*) AS count FROM warehouses').get();
    if (!whCount || whCount.count === 0) {
      db.prepare('INSERT INTO warehouses (name, location, is_default) VALUES (?, ?, ?)').run('Main Warehouse', 'Head Office', 1);
    }

    // Seed Sierra Cables PLC vendor
    const sierra = db.prepare("SELECT id FROM suppliers WHERE name = ?").get('Sierra Cables PLC');
    if (!sierra) {
      db.prepare(
        'INSERT INTO suppliers (name, contact_person, contact_number, address) VALUES (?, ?, ?, ?)'
      ).run('Sierra Cables PLC', 'Sales Desk', '0112345678', 'Sri Lanka');
    }

    // Seed Sierra category folders used by catalog
    const sierraCats = [
      ['Single Core (S)', 'Single core cables SLS 733 — (S)'],
      ['Twin Flat (T)', 'Twin flat cables SLS 733 — (T)'],
      ['Cu/XLPE Single Core', 'Cu/XLPE/PVC single core'],
      ['Flexible Cords', 'Flexible cords — editable bobbins'],
      ['Earth Cables', 'PVC insulated earth cables'],
      ['Armoured Power', 'Armoured SWA / XLPE-SWA'],
      ['Unarmed Power', 'Unarmed power cables'],
      ['Specialized Cables', 'Battery, welding, solar, auto'],
    ];
    const catIns = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)');
    // categories table may not have UNIQUE on name — check first
    for (const [name, desc] of sierraCats) {
      const exists = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
      if (!exists) {
        try { catIns.run(name, desc); } catch (e) {
          try { db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, desc); } catch (e2) {}
        }
      }
    }

    // Seed a default admin (hashed) only if there are no users yet.
    const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get();
    if (!userCount || userCount.count === 0) {
      db.prepare(
        'INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)'
      ).run('admin', hashPassword('admin123'), 'Director', 'System Administrator');
      console.log('Seeded default admin user (username: admin).');
    }

    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

function getDatabase() {
  return db;
}

module.exports = {
  initDatabase,
  getDatabase
};
