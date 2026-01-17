const Queue = require('bull');
const { Pool } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const redisConfig = process.env.REDIS_URL || 'redis://localhost:6379';

const paymentQueue = new Queue('payment-queue', redisConfig);
const refundQueue = new Queue('refund-queue', redisConfig);
const webhookQueue = new Queue('webhook-queue', redisConfig);

console.log("🚀 Worker Service Started...");

function generateSignature(payload, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
}

// --- 1. PROCESS PAYMENT JOB ---
paymentQueue.process(async (job) => {
    const { paymentId } = job.data;
    console.log(`[Payment] Processing ${paymentId}...`);

    try {
        const res = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
        const payment = res.rows[0];
        if (!payment) throw new Error('Payment not found');

        // Processing Delay
        let delay;
        if (process.env.TEST_MODE === 'true') {
            delay = parseInt(process.env.TEST_PROCESSING_DELAY || '1000');
        } else {
            delay = Math.floor(Math.random() * 5000) + 5000; // 5-10s
        }
        await new Promise(resolve => setTimeout(resolve, delay));

        // Determine Outcome
        let isSuccess;
        if (process.env.TEST_MODE === 'true') {
            // Default to true unless explicitly 'false'
            isSuccess = process.env.TEST_PAYMENT_SUCCESS !== 'false';
        } else {
            const successThreshold = payment.method === 'upi' ? 0.9 : 0.95;
            isSuccess = Math.random() < successThreshold;
        }

        const status = isSuccess ? 'success' : 'failed';

        let error_code = null;
        let error_desc = null;

        if (!isSuccess) {
            error_code = 'BANK_DECLINED';
            error_desc = 'The bank declined the transaction.';
        }

        await pool.query(
            'UPDATE payments SET status = $1, error_code = $2, error_description = $3, updated_at = NOW() WHERE id = $4',
            [status, error_code, error_desc, paymentId]
        );
        console.log(`[Payment] ${paymentId} -> ${status}`);

        // Trigger Webhook
        webhookQueue.add({
            merchantId: payment.merchant_id,
            event: isSuccess ? 'payment.success' : 'payment.failed',
            payload: {
                event: isSuccess ? 'payment.success' : 'payment.failed',
                data: {
                    payment: {
                        id: payment.id,
                        order_id: payment.order_id,
                        amount: payment.amount,
                        currency: payment.currency,
                        status: status,
                        method: payment.method,
                        created_at: payment.created_at
                    }
                }
            }
        });

    } catch (err) {
        console.error(`[Payment Error] ${paymentId}:`, err.message);
        throw err;
    }
});

// --- 2. PROCESS REFUND JOB ---
refundQueue.process(async (job) => {
    const { refundId } = job.data;
    console.log(`[Refund] Processing ${refundId}...`);

    try {
        const res = await pool.query('SELECT * FROM refunds WHERE id = $1', [refundId]);
        const refund = res.rows[0];
        if (!refund) throw new Error('Refund not found');

        // Verify Payment State & Amount
        if (refund.status !== 'pending') {
            console.log(`[Refund] ${refundId} already processed or failed. Skipping.`);
            return;
        }

        const paymentRes = await pool.query('SELECT amount FROM payments WHERE id = $1', [refund.payment_id]);
        const paymentAmount = paymentRes.rows[0].amount;

        const totalRes = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM refunds WHERE payment_id = $1 AND status != 'failed'",
            [refund.payment_id]
        );
        const totalRefunded = parseInt(totalRes.rows[0].total);

        // totalRefunded includes the current refund amount because it's in the DB as 'pending'
        if (totalRefunded > paymentAmount) {
            throw new Error('Refund amount exceeds payment amount');
        }

        const delay = Math.floor(Math.random() * 2000) + 3000; // 3-5s
        await new Promise(resolve => setTimeout(resolve, delay));

        await pool.query(
            'UPDATE refunds SET status = $1, processed_at = NOW() WHERE id = $2',
            ['processed', refundId]
        );

        // Update Payment Status
        let newPaymentStatus = 'success'; // default
        if (totalRefunded >= paymentAmount) {
            newPaymentStatus = 'refunded';
        } else if (totalRefunded > 0) {
            newPaymentStatus = 'partially_refunded';
        }

        if (newPaymentStatus !== 'success') {
            await pool.query(
                'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2',
                [newPaymentStatus, refund.payment_id]
            );
            console.log(`[Payment] ${refund.payment_id} -> ${newPaymentStatus}`);
        }

        // Trigger Webhook
        webhookQueue.add({
            merchantId: refund.merchant_id,
            event: 'refund.processed',
            payload: {
                event: 'refund.processed',
                data: {
                    refund: {
                        id: refund.id,
                        payment_id: refund.payment_id,
                        amount: refund.amount,
                        status: 'processed'
                    }
                }
            }
        });

    } catch (err) {
        console.error(`[Refund Error] ${refundId}:`, err.message);
        throw err;
    }
});

// --- 3. DELIVER WEBHOOK JOB ---
webhookQueue.process(async (job) => {
    const { merchantId, event, payload } = job.data;
    console.log(`[Webhook] Processing ${event} for merchant ${merchantId}...`);

    const res = await pool.query('SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1', [merchantId]);
    const merchant = res.rows[0];

    // If no URL, just skip (per instructions "Only create webhook logs... if webhook_url is configured")
    // Wait, instructions say: "Log webhook attempt... if configured".
    // If NOT configured, we generally don't even queue it? 
    // Instructions FAQS: "Q: Should webhooks be delivered even if merchant's webhook URL is not set? A: No. Only create webhook logs and attempt delivery if webhook_url is configured..."
    // So if it's in the queue, we assume it WAS configured at some point or we should check now.
    if (!merchant || !merchant.webhook_url) {
        console.log(`[Webhook] No URL for merchant ${merchantId}. Skipping.`);
        return;
    }

    // Generate/Reuse Log ID
    // We might have a logId passed in if this is a retry? 
    // The requirements say "Log webhook attempt... Record attempt number".
    // Better to create a log entry if it's the *first* attempt, or update if it's a retry?
    // Actually, distinct attempts are usually tracked. 
    // "Webhook Logs Table... attempts: Number of delivery attempts made".
    // So we need to find the existing log for this event OR create one.
    // Ideally the "log id" should be passed in the job data if it exists.
    // If not, we create it.

    // Let's create the log entry first if it's a fresh event.
    // BUT we need to handle "attempts". 
    // Let's assume one Log row per Event.

    // Check if log exists for this specific event/merchant/payload hash? 
    // The instructions don't give a 'webhook_id' to the job, so we might need to query or create.
    // Simplification: Create a new log entry for every "Initial" event enqueue? 
    // No, "attempts" field implies one row updated multiple times.

    // Strategy: Pass `logId` in the job data. 
    // If `logId` is missing, create the log row (Attempt 0).
    // Then proceed to procesing.

    let logId = job.data.logId;

    if (!logId) {
        const logRes = await pool.query(
            `INSERT INTO webhook_logs (merchant_id, event, payload, status, attempts, created_at, next_retry_at)
             VALUES ($1, $2, $3, 'pending', 0, NOW(), NOW()) RETURNING id`,
            [merchantId, event, JSON.stringify(payload)]
        );
        logId = logRes.rows[0].id;
    }

    // Now start the "Attempt"
    // Fetch current attempts count
    const logCheck = await pool.query('SELECT attempts FROM webhook_logs WHERE id = $1', [logId]);
    if (logCheck.rows.length === 0) return; // Should not happen
    let currentAttempts = logCheck.rows[0].attempts;

    const signature = generateSignature(payload, merchant.webhook_secret);

    try {
        const response = await axios.post(merchant.webhook_url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature
            },
            timeout: 5000
        });

        // Success
        await pool.query(
            `UPDATE webhook_logs 
             SET status = 'success', attempts = attempts + 1, last_attempt_at = NOW(), response_code = $1, response_body = NULL
             WHERE id = $2`,
            [response.status, logId]
        );
        console.log(`[Webhook] Success: ${response.status}`);

    } catch (err) {
        const responseCode = err.response ? err.response.status : (err.code === 'ECONNABORTED' ? 408 : 500);
        const responseBody = err.response ? JSON.stringify(err.response.data) : err.message;

        currentAttempts += 1; // We just failed this attempt

        console.error(`[Webhook Failed] Attempt ${currentAttempts}: ${err.message}`);

        // Retry Logic
        if (currentAttempts < 5) {
            // Calculate delay
            let delaySeconds = 0;
            const useTestIntervals = process.env.WEBHOOK_RETRY_INTERVALS_TEST === 'true';

            if (useTestIntervals) {
                // Test: 0(done), 5, 10, 15, 20
                const delays = [0, 5, 10, 15, 20];
                delaySeconds = delays[currentAttempts] || 20;
            } else {
                // Prod: 0(done), 60, 300, 1800, 7200
                // Attempts is now 1 (failed). Next is Attempt 2. Delay for Attempt 2 is 60s.
                // If Attempts is 2 (failed). Next is Attempt 3. Delay is 300s.
                // Map: currentAttempts -> delay for next
                // 1 -> 60
                // 2 -> 300
                // 3 -> 1800
                // 4 -> 7200
                const delays = { 1: 60, 2: 300, 3: 1800, 4: 7200 };
                delaySeconds = delays[currentAttempts] || 7200;
            }

            const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

            await pool.query(
                `UPDATE webhook_logs 
                 SET status = 'pending', attempts = $1, last_attempt_at = NOW(), next_retry_at = $2, response_code = $3, response_body = $4
                 WHERE id = $5`,
                [currentAttempts, nextRetryAt, responseCode, responseBody, logId]
            );

            // Re-queue with delay
            // Note: Bull delay is in ms
            webhookQueue.add(
                { merchantId, event, payload, logId },
                { delay: delaySeconds * 1000 }
            );
            console.log(`[Webhook] Scheduled retry #${currentAttempts + 1} in ${delaySeconds}s`);

        } else {
            // Permanent Failure
            await pool.query(
                `UPDATE webhook_logs 
                 SET status = 'failed', attempts = $1, last_attempt_at = NOW(), response_code = $2, response_body = $3
                 WHERE id = $4`,
                [currentAttempts, responseCode, responseBody, logId]
            );
            console.log(`[Webhook] Permanently failed after ${currentAttempts} attempts`);
        }
    }
});