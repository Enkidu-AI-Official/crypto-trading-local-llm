/**
 * @license
 * SPDX-License-Identifier: MIT
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

/**
 * Database Seeding Script
 * 
 * Seeds the database with:
 * - Default LLM providers
 * - System settings
 * - Optional: Default admin user
 */

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'arena.db');

function log(message, isError = false) {
  const prefix = isError ? '❌' : '✓';
  console.log(`${prefix} ${message}`);
}

function seedProviders(db) {
  log('Seeding LLM providers...');
  
  const insert = db.prepare(`
    INSERT OR IGNORE INTO llm_providers (id, name, provider_type, api_endpoint, model_name, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const providers = [
    {
      id: 1,
      name: 'Gemini 2.5 Flash',
      type: 'gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      model: 'gemini-2.5-flash',
      active: 1
    },
    {
      id: 2,
      name: 'Grok 3 Mini Beta',
      type: 'grok',
      endpoint: 'https://api.x.ai/v1/chat/completions',
      model: 'grok-3-mini-beta',
      active: 1
    },
    {
      id: 3,
      name: 'GPT-4 Turbo',
      type: 'openai',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4-turbo',
      active: 0
    },
    {
      id: 4,
      name: 'Claude 3 Opus',
      type: 'anthropic',
      endpoint: 'https://api.anthropic.com/v1/messages',
      model: 'claude-3-opus-20240229',
      active: 0
    },
    {
      id: 5,
      name: 'Local Ollama',
      type: 'local',
      endpoint: 'http://localhost:11434/api/generate',
      model: 'llama2',
      active: 0
    }
  ];
  
  for (const provider of providers) {
    insert.run(
      provider.id,
      provider.name,
      provider.type,
      provider.endpoint,
      provider.model,
      provider.active
    );
  }
  
  log(`  Seeded ${providers.length} LLM providers`);
}

function seedSystemSettings(db) {
  log('Seeding system settings...');
  
  const insert = db.prepare(`
    INSERT OR IGNORE INTO system_settings (key, value, data_type, description)
    VALUES (?, ?, ?, ?)
  `);
  
  const settings = [
    {
      key: 'paper_bot_initial_balance',
      value: '10000',
      type: 'number',
      desc: 'Starting balance for paper trading bots'
    },
    {
      key: 'live_bot_initial_balance',
      value: '950',
      type: 'number',
      desc: 'Starting balance for live trading bots'
    },
    {
      key: 'turn_interval_ms',
      value: '300000',
      type: 'number',
      desc: 'Interval between bot trading decisions (ms)'
    },
    {
      key: 'refresh_interval_ms',
      value: '5000',
      type: 'number',
      desc: 'Portfolio refresh interval (ms)'
    },
    {
      key: 'minimum_trade_size_usd',
      value: '50',
      type: 'number',
      desc: 'Minimum trade size in USD'
    },
    {
      key: 'symbol_cooldown_ms',
      value: '1800000',
      type: 'number',
      desc: 'Cooldown after closing position (ms)'
    },
    {
      key: 'trading_symbols',
      value: '["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","DOGEUSDT","XRPUSDT"]',
      type: 'json',
      desc: 'Symbols available for trading'
    },
    {
      key: 'broadcast_password',
      value: 'bonerbots',
      type: 'string',
      desc: 'Password for broadcast mode'
    },
    {
      key: 'max_bots',
      value: '10',
      type: 'number',
      desc: 'Maximum number of bots allowed'
    },
    {
      key: 'max_positions_per_bot',
      value: '5',
      type: 'number',
      desc: 'Maximum open positions per bot'
    },
    {
      key: 'data_retention_days',
      value: '90',
      type: 'number',
      desc: 'Days to retain historical data'
    },
    {
      key: 'session_timeout_hours',
      value: '24',
      type: 'number',
      desc: 'User session timeout in hours'
    },
    {
      key: 'max_login_attempts',
      value: '5',
      type: 'number',
      desc: 'Maximum failed login attempts before lockout'
    },
    {
      key: 'app_name',
      value: 'BONERBOTS AI Arena',
      type: 'string',
      desc: 'Application name'
    },
    {
      key: 'app_version',
      value: '2.0.0',
      type: 'string',
      desc: 'Application version'
    }
  ];
  
  for (const setting of settings) {
    insert.run(setting.key, setting.value, setting.type, setting.desc);
  }
  
  log(`  Seeded ${settings.length} system settings`);
}

function seedDefaultAdmin(db) {
  log('Seeding default admin user...');
  
  const bcrypt = require('bcrypt');
  
  const adminId = crypto.randomUUID();
  const defaultPassword = 'admin123'; // Should be changed on first login
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);
  
  const insert = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, password_hash, email, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  try {
    insert.run(
      adminId,
      'admin',
      passwordHash,
      'admin@bonerbots.local',
      'admin',
      1
    );
    
    log('  Default admin user created');
    log('  Username: admin');
    log('  Password: admin123 (CHANGE THIS IMMEDIATELY!)');
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      log('  Admin user already exists');
    } else {
      throw error;
    }
  }
}

async function seed() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  BONERBOTS AI Arena - Database Seeding');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  let db;
  
  try {
    db = new Database(DB_PATH);
    
    // Seed providers
    seedProviders(db);
    
    // Seed system settings
    seedSystemSettings(db);
    
    // Seed default admin (optional - requires bcrypt)
    try {
      seedDefaultAdmin(db);
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        log('  Skipping admin user (bcrypt not installed)');
      } else {
        throw error;
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✓ Database Seeding Complete!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error('  ❌ Seeding Failed!');
    console.error(`  Error: ${error.message}`);
    console.error('═══════════════════════════════════════════════════════════\n');
    
    if (db) db.close();
    process.exit(1);
  }
  
  if (db) db.close();
}

// Run seeding
seed().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

