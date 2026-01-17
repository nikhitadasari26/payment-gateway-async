const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Run me with: node webhook-receiver.js
// Set Webhook URL in dashboard to: http://host.docker.internal:4000/webhook

app.post('/webhook', (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    const payload = JSON.stringify(req.body);

    // Verify signature
    // Using the secret from seed data
    const expectedSignature = crypto
        .createHmac('sha256', 'whsec_test_abc123')
        .update(payload)
        .digest('hex');

    if (signature !== expectedSignature) {
        console.log('❌ Invalid signature');
        console.log('Received:', signature);
        console.log('Expected:', expectedSignature);
        return res.status(401).send('Invalid signature');
    }

    console.log('✅ Webhook verified:', req.body.event);
    if (req.body.data && req.body.data.payment) {
        console.log('Payment ID:', req.body.data.payment.id);
    }
    if (req.body.data && req.body.data.refund) {
        console.log('Refund ID:', req.body.data.refund.id);
    }

    res.status(200).send('OK');
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Test merchant webhook running on port ${PORT}`);
});
