const axios = require('axios');

const API_URL = 'http://localhost:8000/api/v1';
const HEADERS = {
    'X-Api-Key': 'key_test_abc123',
    'X-Api-Secret': 'secret_test_xyz789',
    'Content-Type': 'application/json'
};

async function verify() {
    try {
        console.log('1. Creating Order...');
        const orderRes = await axios.post(`${API_URL}/orders`, {
            amount: 50000,
            currency: 'INR',
            receipt: 'verification_receipt'
        }, { headers: HEADERS });

        const orderId = orderRes.data.id;
        console.log(`   Order Created: ${orderId}`);

        console.log('2. Creating Payment...');
        const paymentRes = await axios.post(`${API_URL}/payments`, {
            order_id: orderId,
            amount: 50000,
            currency: 'INR',
            method: 'upi',
            vpa: 'user@test'
        }, { headers: HEADERS });

        const paymentId = paymentRes.data.id;
        const initialStatus = paymentRes.data.status;
        console.log(`   Payment Created: ${paymentId}`);
        console.log(`   Initial Status: ${initialStatus} (Expect: pending)`);

        if (initialStatus !== 'pending') {
            console.error('❌ FAILED: Initial status is not pending');
            return;
        }

        console.log('3. Polling for Status Update...');
        let attempts = 0;
        const maxAttempts = 20; // 20 * 1s = 20s max

        const checkStatus = async () => {
            const getRes = await axios.get(`${API_URL}/payments/${paymentId}`, { headers: HEADERS });
            const status = getRes.data.status;
            console.log(`   Attempt ${attempts + 1}: ${status}`);

            if (status === 'success' || status === 'failed') {
                console.log(`✅ VERIFICATION PASSED: Payment reached final state '${status}'`);
                return true;
            }
            return false;
        };

        while (attempts < maxAttempts) {
            attempts++;
            await new Promise(r => setTimeout(r, 1000));
            const done = await checkStatus();
            if (done) return;
        }

        console.error('❌ TIMEOUT: Payment did not process in time');

    } catch (err) {
        console.error('❌ ERROR:', err.message);
        if (err.response) console.error('   Data:', err.response.data);
    }
}

verify();
