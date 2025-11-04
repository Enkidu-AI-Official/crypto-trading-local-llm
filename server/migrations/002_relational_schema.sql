-- ============================================================================
-- BONERBOTS AI Arena - Relational Database Schema
-- Migration: 002_relational_schema.sql
-- Description: Transforms the single JSON blob into a robust relational structure
-- ============================================================================

-- ============================================================================
-- Core Tables
-- ============================================================================

-- 1. LLM Providers Table
CREATE TABLE IF NOT EXISTS llm_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('openai', 'anthropic', 'gemini', 'grok', 'local', 'custom')),
  api_endpoint TEXT NOT NULL,
  model_name TEXT,
  api_key_encrypted TEXT,
  config_json TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_providers_active ON llm_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_providers_type ON llm_providers(provider_type);

-- 2. Bots Table
CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  provider_id INTEGER NOT NULL,
  trading_mode TEXT NOT NULL CHECK (trading_mode IN ('paper', 'real')),
  is_active BOOLEAN DEFAULT 1,
  is_paused BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES llm_providers(id)
);

CREATE INDEX IF NOT EXISTS idx_bots_active ON bots(is_active);
CREATE INDEX IF NOT EXISTS idx_bots_provider ON bots(provider_id);
CREATE INDEX IF NOT EXISTS idx_bots_mode ON bots(trading_mode);

-- 3. Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL,
  exchange TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  wallet_address TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wallets_bot ON wallets(bot_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_bot_exchange ON wallets(bot_id, exchange);

-- 4. Bot State Snapshots Table
CREATE TABLE IF NOT EXISTS bot_state_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL,
  balance REAL NOT NULL,
  unrealized_pnl REAL NOT NULL,
  realized_pnl REAL NOT NULL,
  total_value REAL NOT NULL,
  trade_count INTEGER NOT NULL,
  win_rate REAL NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshots_bot_time ON bot_state_snapshots(bot_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON bot_state_snapshots(timestamp);

-- 5. Positions Table
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  position_type TEXT NOT NULL CHECK (position_type IN ('LONG', 'SHORT')),
  entry_price REAL NOT NULL,
  size REAL NOT NULL,
  leverage INTEGER NOT NULL,
  liquidation_price REAL,
  stop_loss REAL,
  take_profit REAL,
  unrealized_pnl REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_positions_bot ON positions(bot_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_positions_opened ON positions(opened_at);

-- 6. Trades Table
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL,
  position_id TEXT,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('LONG', 'SHORT')),
  action TEXT NOT NULL CHECK (action IN ('OPEN', 'CLOSE')),
  entry_price REAL NOT NULL,
  exit_price REAL,
  size REAL NOT NULL,
  leverage INTEGER NOT NULL,
  pnl REAL NOT NULL,
  fee REAL NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_trades_bot ON trades(bot_id);
CREATE INDEX IF NOT EXISTS idx_trades_position ON trades(position_id);
CREATE INDEX IF NOT EXISTS idx_trades_executed ON trades(executed_at);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_pnl ON trades(pnl);

-- 7. Bot Decisions Table
CREATE TABLE IF NOT EXISTS bot_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL,
  prompt_sent TEXT NOT NULL,
  decisions_json TEXT NOT NULL,
  notes_json TEXT,
  execution_success BOOLEAN NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_decisions_bot ON bot_decisions(bot_id);
CREATE INDEX IF NOT EXISTS idx_decisions_timestamp ON bot_decisions(timestamp);

-- 8. Market Data Table
CREATE TABLE IF NOT EXISTS market_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  price REAL NOT NULL,
  price_24h_change REAL NOT NULL,
  volume_24h REAL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_symbol_time ON market_data(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_market_timestamp ON market_data(timestamp);

-- 9. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  user_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

-- 11. Users Table (Future-proofing for multi-user support)
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

-- ============================================================================
-- Seed Default Data
-- ============================================================================

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, description) VALUES
  ('paper_bot_initial_balance', '10000', 'number', 'Starting balance for paper trading bots'),
  ('live_bot_initial_balance', '950', 'number', 'Starting balance for live trading bots'),
  ('turn_interval_ms', '300000', 'number', 'Interval between bot trading decisions (ms)'),
  ('refresh_interval_ms', '5000', 'number', 'Portfolio refresh interval (ms)'),
  ('minimum_trade_size_usd', '50', 'number', 'Minimum trade size in USD'),
  ('symbol_cooldown_ms', '1800000', 'number', 'Cooldown after closing position (ms)'),
  ('trading_symbols', '["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","DOGEUSDT","XRPUSDT"]', 'json', 'Symbols available for trading'),
  ('broadcast_password', 'bonerbots', 'string', 'Password for broadcast mode'),
  ('max_bots', '10', 'number', 'Maximum number of bots allowed');

-- Insert default LLM providers
INSERT OR IGNORE INTO llm_providers (id, name, provider_type, api_endpoint, model_name, is_active) VALUES
  (1, 'Gemini 2.5 Flash', 'gemini', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', 'gemini-2.5-flash', 1),
  (2, 'Grok 3 Mini Beta', 'grok', 'https://api.x.ai/v1/chat/completions', 'grok-3-mini-beta', 1);

-- ============================================================================
-- Migration Complete
-- ============================================================================

