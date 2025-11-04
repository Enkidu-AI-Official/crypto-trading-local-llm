const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'data', 'arena.db');
const db = new Database(dbPath);

console.log('Checking database schema...\n');

// Get all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables in database:', tables.map(t => t.name).join(', '));

// Check for bots table specifically
const botsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bots'").get();
console.log('\nBots table exists:', !!botsTable);

// If bots table exists, show its structure
if (botsTable) {
  const columns = db.prepare("PRAGMA table_info(bots)").all();
  console.log('\nBots table columns:');
  columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
}

db.close();

