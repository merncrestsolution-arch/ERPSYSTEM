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
