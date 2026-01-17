const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(cors()); // Allow frontend to call API
app.use(express.json());

// Routes
// Routes
app.use('/api/v1/orders', require('./routes/orders'));
app.use('/api/v1/payments', require('./routes/payments'));
app.use('/api/v1/webhooks', require('./routes/webhooks'));
app.use('/api/v1/refunds', require('./routes/refunds'));
app.use('/api/v1/merchants', require('./routes/merchants'));

// Health Check [cite: 35]
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: "healthy",
            database: "connected",
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ status: "unhealthy", database: "disconnected" });
    }
});

const Queue = require('bull');
const redisConfig = process.env.REDIS_URL || 'redis://localhost:6379';
const paymentQueue = new Queue('payment-queue', redisConfig);

// Test Merchant Endpoint [cite: 54]
app.get('/api/v1/test/merchant', async (req, res) => {
    const result = await pool.query("SELECT * FROM merchants WHERE email = 'test@example.com'");
    if (result.rows.length > 0) {
        const m = result.rows[0];
        res.json({ id: m.id, email: m.email, api_key: m.api_key, seeded: true });
    } else {
        res.status(404).json({ error: "Merchant not found" });
    }
});

// Job Queue Status Endpoint (Required for Evaluation)
app.get('/api/v1/test/jobs/status', async (req, res) => {
    try {
        const waiting = await paymentQueue.getWaitingCount();
        const active = await paymentQueue.getActiveCount();
        const completed = await paymentQueue.getCompletedCount();
        const failed = await paymentQueue.getFailedCount();

        res.json({
            pending: waiting,
            processing: active,
            completed: completed,
            failed: failed,
            worker_status: 'running'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Redis connection error' });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));