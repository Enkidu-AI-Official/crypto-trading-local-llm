/**
 * @license
 * SPDX-License-Identifier: MIT
 */

const Database = require('better-sqlite3');
const path = require('path');

/**
 * Verification Script: Validate database migration
 * 
 * This script performs comprehensive checks to ensure the migration
 * was successful and data integrity is maintained.
 */

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'arena.db');

function log(message, isError = false) {
  const prefix = isError ? '❌' : '✓';
  console.log(`${prefix} ${message}`);
}

function checkTableExists(db, tableName) {
  const result = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name=?
  `).get(tableName);
  
  return !!result;
}

function getTableRowCount(db, tableName) {
  try {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    return result.count;
  } catch (error) {
    return 0;
  }
}

function verifySchema(db) {
  console.log('\n1. Verifying Schema Structure...\n');
  
  const requiredTables = [
    'arena_state',        // Old table (kept for safety)
    'bots',
    'llm_providers',
    'wallets',
    'bot_state_snapshots',
    'positions',
    'trades',
    'bot_decisions',
    'market_data',
    'system_settings',
    'audit_log',
    'users'
  ];
  
  let allTablesExist = true;
  
  for (const table of requiredTables) {
    const exists = checkTableExists(db, table);
    if (exists) {
      const count = getTableRowCount(db, table);
      log(`  ${table}: ${count} rows`);
    } else {
      log(`  ${table}: MISSING`, true);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

function verifyIndexes(db) {
  console.log('\n2. Verifying Indexes...\n');
  
  const indexes = db.prepare(`
    SELECT name, tbl_name 
    FROM sqlite_master 
    WHERE type='index' AND name LIKE 'idx_%'
  `).all();
  
  log(`  Found ${indexes.length} custom indexes`);
  
  return indexes.length > 0;
}

function verifyForeignKeys(db) {
  console.log('\n3. Verifying Foreign Key Constraints...\n');
  
  // Check if foreign keys are enabled
  const fkEnabled = db.pragma('foreign_keys');
  log(`  Foreign keys enabled: ${fkEnabled[0].foreign_keys === 1 ? 'Yes' : 'No'}`);
  
  // Check for orphaned records
  const tables = ['bots', 'wallets', 'positions', 'trades', 'bot_decisions'];
  let hasOrphans = false;
  
  for (const table of tables) {
    try {
      const orphans = db.prepare(`
        SELECT COUNT(*) as count FROM ${table}
        WHERE bot_id NOT IN (SELECT id FROM bots)
      `).get();
      
      if (orphans.count > 0) {
        log(`  ${table}: ${orphans.count} orphaned records`, true);
        hasOrphans = true;
      }
    } catch (error) {
      // Table might not have bot_id column
      continue;
    }
  }
  
  if (!hasOrphans) {
    log(`  No orphaned records found`);
  }
  
  return !hasOrphans;
}

function verifySystemSettings(db) {
  console.log('\n4. Verifying System Settings...\n');
  
  const requiredSettings = [
    'paper_bot_initial_balance',
    'live_bot_initial_balance',
    'turn_interval_ms',
    'refresh_interval_ms',
    'minimum_trade_size_usd',
    'symbol_cooldown_ms',
    'trading_symbols',
    'broadcast_password',
    'max_bots'
  ];
  
  let allSettingsExist = true;
  
  for (const setting of requiredSettings) {
    const result = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(setting);
    if (result) {
      log(`  ${setting}: ${result.value.substring(0, 50)}${result.value.length > 50 ? '...' : ''}`);
    } else {
      log(`  ${setting}: MISSING`, true);
      allSettingsExist = false;
    }
  }
  
  return allSettingsExist;
}

function verifyProviders(db) {
  console.log('\n5. Verifying LLM Providers...\n');
  
  const providers = db.prepare('SELECT name, provider_type, is_active FROM llm_providers').all();
  
  if (providers.length === 0) {
    log('  No providers found', true);
    return false;
  }
  
  for (const provider of providers) {
    const status = provider.is_active ? 'Active' : 'Inactive';
    log(`  ${provider.name} (${provider.provider_type}): ${status}`);
  }
  
  return true;
}

function verifyBots(db) {
  console.log('\n6. Verifying Bots...\n');
  
  const bots = db.prepare(`
    SELECT b.id, b.name, b.trading_mode, lp.name as provider_name
    FROM bots b
    JOIN llm_providers lp ON b.provider_id = lp.id
  `).all();
  
  if (bots.length === 0) {
    log('  No bots found (this is okay for fresh installs)');
    return true;
  }
  
  for (const bot of bots) {
    log(`  ${bot.name} (${bot.id}): ${bot.trading_mode} mode, using ${bot.provider_name}`);
  }
  
  return true;
}

function verifyDataIntegrity(db) {
  console.log('\n7. Verifying Data Integrity...\n');
  
  const checks = [
    {
      name: 'Bot snapshots without bots',
      query: 'SELECT COUNT(*) as count FROM bot_state_snapshots WHERE bot_id NOT IN (SELECT id FROM bots)'
    },
    {
      name: 'Positions without bots',
      query: 'SELECT COUNT(*) as count FROM positions WHERE bot_id NOT IN (SELECT id FROM bots)'
    },
    {
      name: 'Trades without bots',
      query: 'SELECT COUNT(*) as count FROM trades WHERE bot_id NOT IN (SELECT id FROM bots)'
    },
    {
      name: 'Bots with invalid providers',
      query: 'SELECT COUNT(*) as count FROM bots WHERE provider_id NOT IN (SELECT id FROM llm_providers)'
    }
  ];
  
  let allChecksPass = true;
  
  for (const check of checks) {
    try {
      const result = db.prepare(check.query).get();
      if (result.count > 0) {
        log(`  ${check.name}: ${result.count} issues`, true);
        allChecksPass = false;
      } else {
        log(`  ${check.name}: OK`);
      }
    } catch (error) {
      log(`  ${check.name}: Error checking - ${error.message}`, true);
      allChecksPass = false;
    }
  }
  
  return allChecksPass;
}

function generateReport(db) {
  console.log('\n8. Migration Statistics...\n');
  
  const stats = {
    bots: getTableRowCount(db, 'bots'),
    providers: getTableRowCount(db, 'llm_providers'),
    wallets: getTableRowCount(db, 'wallets'),
    snapshots: getTableRowCount(db, 'bot_state_snapshots'),
    positions: getTableRowCount(db, 'positions'),
    trades: getTableRowCount(db, 'trades'),
    decisions: getTableRowCount(db, 'bot_decisions'),
    marketData: getTableRowCount(db, 'market_data'),
    settings: getTableRowCount(db, 'system_settings')
  };
  
  console.log(`  Bots:           ${stats.bots}`);
  console.log(`  Providers:      ${stats.providers}`);
  console.log(`  Wallets:        ${stats.wallets}`);
  console.log(`  Snapshots:      ${stats.snapshots}`);
  console.log(`  Positions:      ${stats.positions}`);
  console.log(`  Trades:         ${stats.trades}`);
  console.log(`  Decisions:      ${stats.decisions}`);
  console.log(`  Market Data:    ${stats.marketData}`);
  console.log(`  Settings:       ${stats.settings}`);
  
  return stats;
}

async function verify() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  BONERBOTS AI Arena - Database Verification');
  console.log('═══════════════════════════════════════════════════════════');
  
  let db;
  
  try {
    db = new Database(DB_PATH, { readonly: true });
    
    const results = {
      schema: verifySchema(db),
      indexes: verifyIndexes(db),
      foreignKeys: verifyForeignKeys(db),
      settings: verifySystemSettings(db),
      providers: verifyProviders(db),
      bots: verifyBots(db),
      integrity: verifyDataIntegrity(db)
    };
    
    generateReport(db);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    
    const allPassed = Object.values(results).every(r => r === true);
    
    if (allPassed) {
      console.log('  ✓ All Verification Checks Passed!');
      console.log('  Database migration is successful and data is intact.');
    } else {
      console.log('  ⚠️  Some Verification Checks Failed');
      console.log('  Please review the issues above.');
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error('  ❌ Verification Failed!');
    console.error(`  Error: ${error.message}`);
    console.error('═══════════════════════════════════════════════════════════\n');
    
    if (db) db.close();
    process.exit(1);
  }
  
  if (db) db.close();
}

// Run verification
verify().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

