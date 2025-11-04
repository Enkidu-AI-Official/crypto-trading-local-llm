/**
 * System Settings Page
 * 
 * Configure global application settings
 */

import React, { useState, useEffect } from 'react';
import { useConfiguration } from '../../context/ConfigurationContext';
import { TextInput } from '../../components/forms/TextInput';

export const SettingsPage: React.FC = () => {
  const { settings, updateSetting, loading } = useConfiguration();

  const [formData, setFormData] = useState({
    paper_bot_initial_balance: '',
    live_bot_initial_balance: '',
    turn_interval_ms: '',
    refresh_interval_ms: '',
    minimum_trade_size_usd: '',
    symbol_cooldown_ms: '',
    trading_symbols: '',
    max_bots: '',
    max_positions_per_bot: '',
    data_retention_days: '',
    session_timeout_hours: '',
    max_login_attempts: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load settings
  useEffect(() => {
    if (settings) {
      setFormData({
        paper_bot_initial_balance: settings.paper_bot_initial_balance?.toString() || '10000',
        live_bot_initial_balance: settings.live_bot_initial_balance?.toString() || '950',
        turn_interval_ms: settings.turn_interval_ms?.toString() || '300000',
        refresh_interval_ms: settings.refresh_interval_ms?.toString() || '5000',
        minimum_trade_size_usd: settings.minimum_trade_size_usd?.toString() || '50',
        symbol_cooldown_ms: settings.symbol_cooldown_ms?.toString() || '1800000',
        trading_symbols: settings.trading_symbols?.join(', ') || 'BTCUSDT,ETHUSDT,SOLUSDT',
        max_bots: settings.max_bots?.toString() || '10',
        max_positions_per_bot: settings.max_positions_per_bot?.toString() || '5',
        data_retention_days: settings.data_retention_days?.toString() || '90',
        session_timeout_hours: settings.session_timeout_hours?.toString() || '24',
        max_login_attempts: settings.max_login_attempts?.toString() || '5',
      });
    }
  }, [settings]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate numbers
    const numericFields = [
      'paper_bot_initial_balance',
      'live_bot_initial_balance',
      'turn_interval_ms',
      'refresh_interval_ms',
      'minimum_trade_size_usd',
      'symbol_cooldown_ms',
      'max_bots',
      'max_positions_per_bot',
      'data_retention_days',
      'session_timeout_hours',
      'max_login_attempts',
    ];

    for (const field of numericFields) {
      const value = parseFloat((formData as any)[field]);
      if (isNaN(value) || value < 0) {
        newErrors[field] = 'Must be a positive number';
      }
    }

    // Validate trading symbols
    if (!formData.trading_symbols.trim()) {
      newErrors.trading_symbols = 'At least one symbol is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save all settings
  const handleSaveAll = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      setSaveSuccess(false);

      // Parse trading symbols
      const symbols = formData.trading_symbols
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(s => s.length > 0);

      // Update each setting
      await updateSetting('paper_bot_initial_balance', parseFloat(formData.paper_bot_initial_balance));
      await updateSetting('live_bot_initial_balance', parseFloat(formData.live_bot_initial_balance));
      await updateSetting('turn_interval_ms', parseFloat(formData.turn_interval_ms));
      await updateSetting('refresh_interval_ms', parseFloat(formData.refresh_interval_ms));
      await updateSetting('minimum_trade_size_usd', parseFloat(formData.minimum_trade_size_usd));
      await updateSetting('symbol_cooldown_ms', parseFloat(formData.symbol_cooldown_ms));
      await updateSetting('trading_symbols', symbols);
      await updateSetting('max_bots', parseInt(formData.max_bots));
      await updateSetting('max_positions_per_bot', parseInt(formData.max_positions_per_bot));
      await updateSetting('data_retention_days', parseInt(formData.data_retention_days));
      await updateSetting('session_timeout_hours', parseInt(formData.session_timeout_hours));
      await updateSetting('max_login_attempts', parseInt(formData.max_login_attempts));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100">System Settings</h1>
        <p className="text-gray-400 mt-1">
          Configure global application behavior and defaults
        </p>
      </div>

      {/* Save Success Message */}
      {saveSuccess && (
        <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 text-green-300">
          Settings saved successfully!
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-6">
        {/* Trading Defaults */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100 border-b border-gray-700 pb-2">
            Trading Defaults
          </h2>

          <TextInput
            label="Paper Bot Initial Balance (USD)"
            value={formData.paper_bot_initial_balance}
            onChange={(value) => setFormData({ ...formData, paper_bot_initial_balance: value })}
            error={errors.paper_bot_initial_balance}
            type="number"
            helperText="Starting balance for paper trading bots"
          />

          <TextInput
            label="Live Bot Initial Balance (USD)"
            value={formData.live_bot_initial_balance}
            onChange={(value) => setFormData({ ...formData, live_bot_initial_balance: value })}
            error={errors.live_bot_initial_balance}
            type="number"
            helperText="Starting balance for live trading bots"
          />

          <TextInput
            label="Minimum Trade Size (USD)"
            value={formData.minimum_trade_size_usd}
            onChange={(value) => setFormData({ ...formData, minimum_trade_size_usd: value })}
            error={errors.minimum_trade_size_usd}
            type="number"
            helperText="Minimum position size for trades"
          />

          <TextInput
            label="Trading Symbols"
            value={formData.trading_symbols}
            onChange={(value) => setFormData({ ...formData, trading_symbols: value })}
            error={errors.trading_symbols}
            placeholder="BTCUSDT, ETHUSDT, SOLUSDT"
            helperText="Comma-separated list of symbols available for trading"
          />
        </div>

        {/* Timing Settings */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100 border-b border-gray-700 pb-2">
            Timing & Intervals
          </h2>

          <TextInput
            label="Turn Interval (milliseconds)"
            value={formData.turn_interval_ms}
            onChange={(value) => setFormData({ ...formData, turn_interval_ms: value })}
            error={errors.turn_interval_ms}
            type="number"
            helperText="Time between bot trading decisions (default: 300000 = 5 minutes)"
          />

          <TextInput
            label="Portfolio Refresh Interval (milliseconds)"
            value={formData.refresh_interval_ms}
            onChange={(value) => setFormData({ ...formData, refresh_interval_ms: value })}
            error={errors.refresh_interval_ms}
            type="number"
            helperText="How often to refresh portfolio data (default: 5000 = 5 seconds)"
          />

          <TextInput
            label="Symbol Cooldown (milliseconds)"
            value={formData.symbol_cooldown_ms}
            onChange={(value) => setFormData({ ...formData, symbol_cooldown_ms: value })}
            error={errors.symbol_cooldown_ms}
            type="number"
            helperText="Cooldown period after closing a position (default: 1800000 = 30 minutes)"
          />
        </div>

        {/* Limits & Constraints */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100 border-b border-gray-700 pb-2">
            Limits & Constraints
          </h2>

          <TextInput
            label="Maximum Bots"
            value={formData.max_bots}
            onChange={(value) => setFormData({ ...formData, max_bots: value })}
            error={errors.max_bots}
            type="number"
            helperText="Maximum number of bots allowed"
          />

          <TextInput
            label="Maximum Positions Per Bot"
            value={formData.max_positions_per_bot}
            onChange={(value) => setFormData({ ...formData, max_positions_per_bot: value })}
            error={errors.max_positions_per_bot}
            type="number"
            helperText="Maximum open positions per bot"
          />
        </div>

        {/* Data & Security */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100 border-b border-gray-700 pb-2">
            Data & Security
          </h2>

          <TextInput
            label="Data Retention (days)"
            value={formData.data_retention_days}
            onChange={(value) => setFormData({ ...formData, data_retention_days: value })}
            error={errors.data_retention_days}
            type="number"
            helperText="How long to retain historical data"
          />

          <TextInput
            label="Session Timeout (hours)"
            value={formData.session_timeout_hours}
            onChange={(value) => setFormData({ ...formData, session_timeout_hours: value })}
            error={errors.session_timeout_hours}
            type="number"
            helperText="User session timeout period"
          />

          <TextInput
            label="Max Login Attempts"
            value={formData.max_login_attempts}
            onChange={(value) => setFormData({ ...formData, max_login_attempts: value })}
            error={errors.max_login_attempts}
            type="number"
            helperText="Maximum failed login attempts before lockout"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end pt-4 border-t border-gray-700">
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

