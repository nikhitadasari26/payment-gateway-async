const express = require('express');
const router = express.Router();
const pool = require('../db');
const Queue = require('bull');

const redisConfig = process.env.REDIS_URL || 'redis://localhost:6379';
const webhookQueue = new Queue('webhook-queue', redisConfig);

// --- AUTH MIDDLEWARE (Duplicated for now, distinct file) ---
const authenticate = async (req, res, next) => {
    const apiKey = req.header('X-Api-Key');
    const apiSecret = req.header('X-Api-Secret');

    if (!apiKey || !apiSecret) {
        return res.status(401).json({ error: 'Missing API credentials' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM merchants WHERE api_key = $1 AND api_secret = $2',
            [apiKey, apiSecret]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.merchant = result.rows[0];
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Auth error' });
    }
};

router.use(authenticate);

// 1. List Webhook Logs
// GET /api/v1/webhooks?limit=10&offset=0
router.get('/', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    try {
        // Fetch logs
        const result = await pool.query(
            'SELECT * FROM webhook_logs WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [req.merchant.id, limit, offset]
        );

        // Fetch total count
        const countRes = await pool.query(
            'SELECT COUNT(*) FROM webhook_logs WHERE merchant_id = $1',
            [req.merchant.id]
        );

        res.json({
            data: result.rows,
            total: parseInt(countRes.rows[0].count),
            limit,
            offset
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 2. Retry Webhook
// POST /api/v1/webhooks/{webhook_id}/retry
router.post('/:id/retry', async (req, res) => {
    try {
        // Fetch log to get payload details
        const logRes = await pool.query(
            'SELECT * FROM webhook_logs WHERE id = $1 AND merchant_id = $2',
            [req.params.id, req.merchant.id]
        );

        if (logRes.rows.length === 0) return res.status(404).json({ error: 'Webhook log not found' });
        const log = logRes.rows[0];

        // Enqueue Job directly
        // Note: passing logId so worker knows it's a retry of this specific log
        await webhookQueue.add({
            merchantId: req.merchant.id,
            event: log.event,
            payload: log.payload,
            logId: log.id
        });

        // Reset attempts in DB so UI updates
        // "Reset attempts to 0, set status to 'pending'"
        await pool.query(
            "UPDATE webhook_logs SET status = 'pending', attempts = 0, next_retry_at = NULL WHERE id = $1",
            [req.params.id]
        );

        res.json({ id: req.params.id, status: 'pending', message: 'Webhook retry scheduled' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
