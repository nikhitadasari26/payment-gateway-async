const express = require('express');
const router = express.Router();
const pool = require('../db');

// --- AUTH MIDDLEWARE ---
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

// GET /api/v1/refunds/{refund_id}
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM refunds WHERE id = $1 AND merchant_id = $2', [req.params.id, req.merchant.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
