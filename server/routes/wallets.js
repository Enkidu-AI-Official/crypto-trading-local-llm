/**
 * @license
 * SPDX-License-Identifier: MIT
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { encrypt, decrypt, redact } = require('../utils/encryption');
const { createAuditLog } = require('../database/relational');
const db = require('../database/relational');

const router = express.Router();

/**
 * GET /api/wallets - List all wallets
 */
router.get('/',
  authenticateToken,
  requireRole('user'),
  query('bot_id').optional().trim().notEmpty().withMessage('Bot ID cannot be empty'),
  query('exchange').optional().trim().notEmpty().withMessage('Exchange cannot be empty'),
  validateRequest,
  (req, res) => {
    try {
      let wallets;
      
      if (req.query.bot_id) {
        wallets = db.getWalletsByBot(req.query.bot_id);
      } else {
        // Get all wallets (requires iterating through bots)
        const bots = db.getBots();
        wallets = [];
        for (const bot of bots) {
          wallets.push(...db.getWalletsByBot(bot.id));
        }
      }
      
      if (req.query.exchange) {
        wallets = wallets.filter(w => w.exchange === req.query.exchange);
      }
      
      // Redact sensitive data
      wallets = wallets.map(w => ({
        ...w,
        api_key_encrypted: redact(w.id.toString()),
        api_secret_encrypted: redact(w.id.toString())
      }));
      
      res.json(wallets);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      res.status(500).json({ error: 'Failed to fetch wallets', message: error.message });
    }
  }
);

/**
 * GET /api/wallets/bot/:botId - Get wallets for specific bot
 */
router.get('/bot/:botId',
  authenticateToken,
  requireRole('user'),
  param('botId').notEmpty().withMessage('Bot ID is required'),
  validateRequest,
  (req, res) => {
    try {
      let wallets = db.getWalletsByBot(req.params.botId);
      
      // Redact sensitive data
      wallets = wallets.map(w => ({
        ...w,
        api_key_encrypted: redact(w.id.toString()),
        api_secret_encrypted: redact(w.id.toString())
      }));
      
      res.json(wallets);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      res.status(500).json({ error: 'Failed to fetch wallets', message: error.message });
    }
  }
);

/**
 * POST /api/wallets - Add wallet for bot
 */
router.post('/',
  authenticateToken,
  requireRole('user'),
  body('bot_id').trim().notEmpty().withMessage('Bot ID is required'),
  body('exchange').trim().notEmpty().withMessage('Exchange is required'),
  body('api_key').trim().notEmpty().withMessage('API key is required'),
  body('api_secret').trim().notEmpty().withMessage('API secret is required'),
  body('wallet_address').optional().trim(),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  validateRequest,
  (req, res) => {
    try {
      // Check if bot exists
      const bot = db.getBot(req.body.bot_id);
      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' });
      }
      
      // Check if wallet for this bot+exchange already exists
      const existing = db.getWalletsByBot(req.body.bot_id).find(w => w.exchange === req.body.exchange);
      if (existing) {
        return res.status(409).json({ error: 'Wallet for this bot and exchange already exists' });
      }
      
      // Encrypt credentials
      const apiKeyEncrypted = encrypt(req.body.api_key);
      const apiSecretEncrypted = encrypt(req.body.api_secret);
      
      const wallet = db.createWallet({
        bot_id: req.body.bot_id,
        exchange: req.body.exchange,
        api_key_encrypted: apiKeyEncrypted,
        api_secret_encrypted: apiSecretEncrypted,
        wallet_address: req.body.wallet_address || null,
        is_active: req.body.is_active !== undefined ? req.body.is_active : true
      });
      
      // Create audit log
      createAuditLog({
        event_type: 'wallet_created',
        entity_type: 'wallet',
        entity_id: wallet.id.toString(),
        user_id: req.user?.userId,
        details: { bot_id: wallet.bot_id, exchange: wallet.exchange },
        ip_address: req.ip
      });
      
      // Redact credentials in response
      const response = {
        ...wallet,
        api_key_encrypted: redact(wallet.id.toString()),
        api_secret_encrypted: redact(wallet.id.toString())
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating wallet:', error);
      res.status(500).json({ error: 'Failed to create wallet', message: error.message });
    }
  }
);

/**
 * PUT /api/wallets/:id - Update wallet
 */
router.put('/:id',
  authenticateToken,
  requireRole('user'),
  param('id').isInt().withMessage('Wallet ID must be an integer'),
  body('exchange').optional().trim().notEmpty().withMessage('Exchange cannot be empty'),
  body('api_key').optional().trim().notEmpty().withMessage('API key cannot be empty if provided'),
  body('api_secret').optional().trim().notEmpty().withMessage('API secret cannot be empty if provided'),
  body('wallet_address').optional().trim(),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  validateRequest,
  (req, res) => {
    try {
      const walletId = parseInt(req.params.id);
      const wallet = db.getWallet(walletId);
      
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      
      const updates = { ...req.body };
      
      // Encrypt credentials if provided
      if (updates.api_key) {
        updates.api_key_encrypted = encrypt(updates.api_key);
        delete updates.api_key;
      }
      
      if (updates.api_secret) {
        updates.api_secret_encrypted = encrypt(updates.api_secret);
        delete updates.api_secret;
      }
      
      const updatedWallet = db.updateWallet(walletId, updates);
      
      // Create audit log
      createAuditLog({
        event_type: 'wallet_updated',
        entity_type: 'wallet',
        entity_id: walletId.toString(),
        user_id: req.user?.userId,
        details: { bot_id: updatedWallet.bot_id, updates: Object.keys(updates) },
        ip_address: req.ip
      });
      
      // Redact credentials in response
      const response = {
        ...updatedWallet,
        api_key_encrypted: redact(walletId.toString()),
        api_secret_encrypted: redact(walletId.toString())
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error updating wallet:', error);
      res.status(500).json({ error: 'Failed to update wallet', message: error.message });
    }
  }
);

/**
 * DELETE /api/wallets/:id - Delete wallet
 */
router.delete('/:id',
  authenticateToken,
  requireRole('user'),
  param('id').isInt().withMessage('Wallet ID must be an integer'),
  validateRequest,
  (req, res) => {
    try {
      const walletId = parseInt(req.params.id);
      const wallet = db.getWallet(walletId);
      
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      
      db.deleteWallet(walletId);
      
      // Create audit log
      createAuditLog({
        event_type: 'wallet_deleted',
        entity_type: 'wallet',
        entity_id: walletId.toString(),
        user_id: req.user?.userId,
        details: { bot_id: wallet.bot_id, exchange: wallet.exchange },
        ip_address: req.ip
      });
      
      res.json({ success: true, message: 'Wallet deleted successfully' });
    } catch (error) {
      console.error('Error deleting wallet:', error);
      res.status(500).json({ error: 'Failed to delete wallet', message: error.message });
    }
  }
);

module.exports = router;

