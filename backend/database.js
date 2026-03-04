const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, 'pos.db');

async function initDb() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Products Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      barcode TEXT UNIQUE,
      uom TEXT NOT NULL,
      cost_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      stock_quantity REAL DEFAULT 0,
      min_stock_level REAL DEFAULT 0
    )
  `);

  // Customers Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      email TEXT,
      address TEXT,
      loyalty_points INTEGER DEFAULT 0,
      date_created TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Batches Table (For Grocery: Tracking expiry)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      quantity REAL NOT NULL,
      expiry_date TEXT,
      arrival_date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `);

  // Sales Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_amount REAL NOT NULL,
      discount REAL DEFAULT 0,
      cash_paid REAL DEFAULT 0,
      card_paid REAL DEFAULT 0,
      online_paid REAL DEFAULT 0,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      payment_method TEXT
    )
  `);

  // Day Sessions Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS day_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opening_amount REAL NOT NULL,
      opening_time TEXT DEFAULT CURRENT_TIMESTAMP,
      closing_time TEXT,
      closing_amount_expected REAL,
      status TEXT DEFAULT 'OPEN'
    )
  `);

  // Expenses Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES day_sessions (id)
    )
  `);

  // Migration: Ensure all payment columns exist
  const columns = ['cash_paid', 'card_paid', 'online_paid', 'credit_paid', 'customer_id', 'session_id'];
  for (const col of columns) {
    try {
      if (col === 'customer_id') {
        await db.exec(`ALTER TABLE sales ADD COLUMN customer_id INTEGER REFERENCES customers(id)`);
      } else {
        await db.exec(`ALTER TABLE sales ADD COLUMN ${col} REAL DEFAULT 0`);
      }
    } catch (e) {
      // Column probably exists
    }
  }

  // Sale Items
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER,
      product_id INTEGER,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `);

  // Purchases Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_name TEXT,
      invoice_number TEXT,
      total_amount REAL NOT NULL,
      date TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Purchase Items
  await db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER,
      product_id INTEGER,
      quantity REAL NOT NULL,
      cost_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `);

  // Settings Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      shop_name TEXT DEFAULT 'Precision Grocery',
      shop_logo TEXT,
      shop_address TEXT DEFAULT '123 Main St, City, Country',
      shop_phone TEXT DEFAULT '+1 234 567 890'
    )
  `);

  // Default Settings Seed
  const settingsCount = await db.get(`SELECT COUNT(*) as count FROM settings`);
  if (settingsCount.count === 0) {
    await db.run(`INSERT INTO settings (id) VALUES (1)`);
  }

  return db;
}

module.exports = { initDb };
