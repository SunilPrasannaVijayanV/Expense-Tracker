import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db;

function getDb() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'expenses.db');
    const dataDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      description TEXT,
      merchant TEXT,
      date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, category, month)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      is_custom INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
  `);

  // Seed default categories if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM categories WHERE user_id IS NULL').get();
  if (count.count === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, icon, color, is_custom) VALUES (?, ?, ?, 0)');
    const defaultCategories = [
      ['Food', '🍕', '#FF6B6B'],
      ['Groceries', '🛒', '#4ECDC4'],
      ['Transport', '🚗', '#45B7D1'],
      ['Entertainment', '🎬', '#96CEB4'],
      ['Bills', '📄', '#FFEAA7'],
      ['Shopping', '🛍️', '#DDA0DD'],
      ['Healthcare', '🏥', '#98D8C8'],
      ['Education', '📚', '#F7DC6F'],
      ['Travel', '✈️', '#BB8FCE'],
      ['Coffee', '☕', '#D4A574'],
      ['Restaurants', '🍽️', '#FF8A65'],
      ['Utilities', '💡', '#FFD93D'],
      ['Rent', '🏠', '#6C5CE7'],
      ['Subscriptions', '📱', '#A29BFE'],
      ['Personal', '👤', '#FD79A8'],
      ['Other', '📦', '#B2BEC3'],
    ];
    const insertMany = db.transaction((cats) => {
      for (const [name, icon, color] of cats) {
        insertCat.run(name, icon, color);
      }
    });
    insertMany(defaultCategories);
  }
}

export default getDb;
