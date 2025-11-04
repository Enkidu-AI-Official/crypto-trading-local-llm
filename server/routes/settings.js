/**
 * @license
 * SPDX-License-Identifier: MIT
 */

const express = require('express');
const { body, param } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { createAuditLog } = require('../database/relational');
const db = require('../database/relational');

const router = express.Router();

/**
 * GET /api/settings - Get all system settings
 */
router.get('/',
  optionalAuth,
  (req, res) => {
    try {
      const settings = db.getSettings();
      
      // Hide sensitive settings for non-admin users
      if (!req.user || req.user.role !== 'admin') {
        delete settings.broadcast_password;
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings', message: error.message });
    }
  }
);

/**
 * GET /api/settings/:key - Get specific setting
 */
router.get('/:key',
  optionalAuth,
  param('key').trim().notEmpty().withMessage('Setting key is required'),
  validateRequest,
  (req, res) => {
    try {
      // Check if key is sensitive
      const sensitiveKeys = ['broadcast_password'];
      
      if (sensitiveKeys.includes(req.params.key) && (!req.user || req.user.role !== 'admin')) {
        return res.status(403).json({ error: 'Insufficient permissions to access this setting' });
      }
      
      const value = db.getSetting(req.params.key);
      
      if (value === null) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      
      res.json({ key: req.params.key, value });
    } catch (error) {
      console.error('Error fetching setting:', error);
      res.status(500).json({ error: 'Failed to fetch setting', message: error.message });
    }
  }
);

/**
 * PUT /api/settings/:key - Update specific setting
 */
router.put('/:key',
  authenticateToken,
  requireRole('admin'),
  param('key').trim().notEmpty().withMessage('Setting key is required'),
  body('value').exists().withMessage('Value is required'),
  validateRequest,
  (req, res) => {
    try {
      // Verify setting exists
      const currentValue = db.getSetting(req.params.key);
      
      if (currentValue === null) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      
      // Update setting
      db.updateSetting(req.params.key, req.body.value);
      
      // Create audit log
      createAuditLog({
        event_type: 'setting_updated',
        entity_type: 'setting',
        entity_id: req.params.key,
        user_id: req.user?.userId,
        details: { key: req.params.key, old_value: currentValue, new_value: req.body.value },
        ip_address: req.ip
      });
      
      const newValue = db.getSetting(req.params.key);
      res.json({ key: req.params.key, value: newValue });
    } catch (error) {
      console.error('Error updating setting:', error);
      res.status(500).json({ error: 'Failed to update setting', message: error.message });
    }
  }
);

/**
 * POST /api/settings/reset - Reset all settings to defaults
 */
router.post('/reset',
  authenticateToken,
  requireRole('admin'),
  (req, res) => {
    try {
      // This would require re-seeding the database
      // For now, return not implemented
      res.status(501).json({ error: 'Reset not implemented yet. Please use the seed script.' });
    } catch (error) {
      console.error('Error resetting settings:', error);
      res.status(500).json({ error: 'Failed to reset settings', message: error.message });
    }
  }
);

module.exports = router;

