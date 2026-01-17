const express = require('express');
const router = express.Router();
const pool = require('../db');

// Auth middleware
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

// GET /api/v1/merchants/me
router.get('/me', async (req, res) => {
    res.json(req.merchant);
});

// PUT /api/v1/merchants/me
router.put('/me', async (req, res) => {
    const { webhook_url } = req.body;

    // Validate URL (simple)
    if (webhook_url && !webhook_url.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    try {
        const result = await pool.query(
            'UPDATE merchants SET webhook_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [webhook_url, req.merchant.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database update failed' });
    }
});

module.exports = router;
