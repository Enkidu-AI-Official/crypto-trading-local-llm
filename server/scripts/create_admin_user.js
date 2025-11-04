/**
 * Create Default Admin User
 * Run this script to create a default admin user for the application
 */

const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'arena.db');

async function createAdminUser() {
  console.log('🔐 Creating default admin user...\n');

  const db = new Database(DB_PATH);

  try {
    // Check if users table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='users'
    `).get();

    if (!tableExists) {
      console.log('Creating users table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          email TEXT UNIQUE,
          role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
          is_active BOOLEAN DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
      `);
      console.log('✓ Users table created\n');
    }

    // Check if admin user already exists
    const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      console.log('   Username: admin');
      console.log('   If you forgot the password, delete the user and run this script again.\n');
      return;
    }

    // Create admin user
    const userId = crypto.randomBytes(16).toString('hex');
    const password = 'admin123'; // Default password
    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare(`
      INSERT INTO users (id, username, password_hash, email, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, 'admin', passwordHash, 'admin@bonerbots.local', 'admin', 1);

    console.log('✅ Admin user created successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('═══════════════════════════════════════');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!\n');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    db.close();
  }
}

if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('✨ Setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createAdminUser };

