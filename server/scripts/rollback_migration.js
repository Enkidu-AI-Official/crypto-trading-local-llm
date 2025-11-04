/**
 * @license
 * SPDX-License-Identifier: MIT
 */

const fs = require('fs');
const path = require('path');

/**
 * Rollback Script: Restore database from backup
 * 
 * This script allows you to restore the database to a previous backup
 * in case the migration fails or you need to revert changes.
 */

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'arena.db');
const BACKUP_DIR = path.join(__dirname, '..', '..', 'data', 'backups');

function log(message, isError = false) {
  const prefix = isError ? '❌ ERROR' : '✓';
  console.log(`${prefix} ${message}`);
}

function getAvailableBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(BACKUP_DIR);
  const backups = files
    .filter(f => f.startsWith('arena_backup_') && f.endsWith('.db'))
    .map(f => ({
      filename: f,
      path: path.join(BACKUP_DIR, f),
      stats: fs.statSync(path.join(BACKUP_DIR, f))
    }))
    .sort((a, b) => b.stats.mtime - a.stats.mtime); // Most recent first
  
  return backups;
}

async function rollback() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  BONERBOTS AI Arena - Database Rollback');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // List available backups
    const backups = getAvailableBackups();
    
    if (backups.length === 0) {
      log('No backups found!', true);
      console.log('\nBackups should be in:', BACKUP_DIR);
      process.exit(1);
    }
    
    console.log('Available backups:\n');
    backups.forEach((backup, index) => {
      const date = backup.stats.mtime.toISOString();
      const size = (backup.stats.size / 1024).toFixed(2);
      console.log(`  ${index + 1}. ${backup.filename}`);
      console.log(`     Date: ${date}`);
      console.log(`     Size: ${size} KB\n`);
    });
    
    // Use the most recent backup
    const latestBackup = backups[0];
    
    console.log(`Using most recent backup: ${latestBackup.filename}\n`);
    console.log('⚠️  WARNING: This will overwrite the current database!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Create a backup of current database before rollback
    if (fs.existsSync(DB_PATH)) {
      const preRollbackBackup = path.join(
        BACKUP_DIR,
        `pre_rollback_${new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '')}.db`
      );
      fs.copyFileSync(DB_PATH, preRollbackBackup);
      log(`Current database backed up to: ${preRollbackBackup}`);
    }
    
    // Restore from backup
    fs.copyFileSync(latestBackup.path, DB_PATH);
    log(`Database restored from: ${latestBackup.filename}`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✓ Rollback Complete!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error('  ❌ Rollback Failed!');
    console.error(`  Error: ${error.message}`);
    console.error('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

// Run rollback
rollback().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

