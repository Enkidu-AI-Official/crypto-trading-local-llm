/**
 * @license
 * SPDX-License-Identifier: MIT
 */

const express = require('express');
const { query } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');
const db = require('../database/relational');

const router = express.Router();

/**
 * GET /api/audit/logs - Get audit logs
 */
router.get('/logs',
  authenticateToken,
  requireRole('admin'),
  query('event_type').optional().trim().notEmpty().withMessage('Event type cannot be empty'),
  query('entity_type').optional().trim().notEmpty().withMessage('Entity type cannot be empty'),
  query('start_date').optional().isISO8601().withMessage('Invalid start date'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  validateRequest,
  (req, res) => {
    try {
      const filters = {
        event_type: req.query.event_type,
        entity_type: req.query.entity_type,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        limit: req.query.limit ? parseInt(req.query.limit) : 100
      };
      
      const logs = db.getAuditLogs(filters);
      
      // Parse details_json for each log
      const parsedLogs = logs.map(log => ({
        ...log,
        details: log.details_json ? JSON.parse(log.details_json) : {}
      }));
      
      // Group by event type
      const eventTypes = {};
      for (const log of parsedLogs) {
        if (!eventTypes[log.event_type]) {
          eventTypes[log.event_type] = 0;
        }
        eventTypes[log.event_type]++;
      }
      
      res.json({
        logs: parsedLogs,
        summary: {
          total_count: parsedLogs.length,
          event_types: eventTypes
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs', message: error.message });
    }
  }
);

/**
 * GET /api/audit/stats - Get audit statistics
 */
router.get('/stats',
  authenticateToken,
  requireRole('admin'),
  query('start_date').optional().isISO8601().withMessage('Invalid start date'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date'),
  validateRequest,
  (req, res) => {
    try {
      const filters = {
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        limit: 10000 // Get all for stats
      };
      
      const logs = db.getAuditLogs(filters);
      
      // Calculate statistics
      const stats = {
        total_events: logs.length,
        by_event_type: {},
        by_entity_type: {},
        by_user: {},
        timeline: []
      };
      
      for (const log of logs) {
        // Count by event type
        if (!stats.by_event_type[log.event_type]) {
          stats.by_event_type[log.event_type] = 0;
        }
        stats.by_event_type[log.event_type]++;
        
        // Count by entity type
        if (!stats.by_entity_type[log.entity_type]) {
          stats.by_entity_type[log.entity_type] = 0;
        }
        stats.by_entity_type[log.entity_type]++;
        
        // Count by user
        const userId = log.user_id || 'system';
        if (!stats.by_user[userId]) {
          stats.by_user[userId] = 0;
        }
        stats.by_user[userId]++;
      }
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      res.status(500).json({ error: 'Failed to fetch audit stats', message: error.message });
    }
  }
);

module.exports = router;

