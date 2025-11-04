/**
 * @license
 * SPDX-License-Identifier: MIT
 */

require('dotenv').config();

/**
 * Configuration validation and loading
 * 
 * NOTE: As of Phase 3, this application is fully database-driven.
 * API keys and credentials are stored encrypted in the database via the UI.
 * Environment variables are now OPTIONAL and only used as fallbacks or for
 * initial setup. The application will work without them if configured via UI.
 */

// Optional environment variables (fallbacks for LLM providers if not in database)
const OPTIONAL_VARS = [
  'GEMINI_API_KEY',
  'XAI_API_KEY',
  'ENCRYPTION_KEY'  // Recommended for production
];

/**
 * Validate configuration - now only warns about optional variables
 * The application will function without environment variables if configured via UI
 */
function validateConfig() {
  const missing = [];
  
  for (const varName of OPTIONAL_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.warn('\n⚠️  NOTICE: Some optional environment variables are not set:');
    console.warn(missing.map(v => `  - ${v}`).join('\n'));
    console.warn('\nThese can be configured through the UI at /config/providers and /config/credentials');
    console.warn('Or you can set them in server/.env for convenience.\n');
  } else {
    console.log('✅ All optional environment variables are set\n');
  }
  
  return true; // Always return true - app works without env vars
}

/**
 * Get API keys for a specific bot
 * NOW PULLS FROM DATABASE - This function is kept for backward compatibility
 * but now retrieves encrypted credentials from the database.
 * 
 * @param {string} botId - The bot identifier (e.g., 'bot_degen')
 * @returns {Promise<{apiKey: string, apiSecret: string}>}
 */
async function getApiKeysForBot(botId) {
  const Database = require('better-sqlite3');
  const { decrypt } = require('./utils/encryption');
  const path = require('path');
  
  const dbPath = path.join(__dirname, '..', 'data', 'arena.db');
  const db = new Database(dbPath);
  
  try {
    // Get the wallet for this bot (assuming 'asterdex' exchange for now)
    const wallet = db.prepare(`
      SELECT api_key_encrypted, api_secret_encrypted 
      FROM wallets 
      WHERE bot_id = ? AND is_active = 1
      LIMIT 1
    `).get(botId);
    
    if (!wallet) {
      // Fallback to environment variables if no wallet in database
      console.warn(`No wallet found in database for ${botId}, checking environment variables...`);
      
      // Map bot IDs to environment variable prefixes
      const envPrefixMap = {
        'bot_degen': 'DEGEN_LIVE',
        'bot_monkey': 'ESCAPED_MONKEY',
        'bot_astrologer': 'ASTROLOGER',
        'bot_chronospeculator': 'CHRONOSPECULATOR'
      };
      
      const prefix = envPrefixMap[botId];
      if (prefix && process.env[`${prefix}_API_KEY`] && process.env[`${prefix}_SECRET`]) {
        return {
          apiKey: process.env[`${prefix}_API_KEY`],
          apiSecret: process.env[`${prefix}_SECRET`]
        };
      }
      
      throw new Error(`No API key configuration found for botId: ${botId}. Please configure via /config/credentials`);
    }
    
    // Decrypt the credentials
    const apiKey = decrypt(wallet.api_key_encrypted);
    const apiSecret = decrypt(wallet.api_secret_encrypted);
    
    return { apiKey, apiSecret };
    
  } finally {
    db.close();
  }
}

// Configuration object
const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  wsPort: parseInt(process.env.WS_PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || './data/arena.db',
  
  // API Keys (only accessed through getApiKeysForBot for multi-wallet)
  geminiApiKey: process.env.GEMINI_API_KEY,
  xaiApiKey: process.env.XAI_API_KEY,
  
  // Helper function
  getApiKeysForBot,
  validateConfig
};

module.exports = config;
