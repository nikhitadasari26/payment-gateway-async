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
        const orderRes = await axios.post(`${API_URL}/orders`, { amount: 50000, currency: 'INR', receipt: 'r_refund_status' }, { headers: HEADERS });
        const orderId = orderRes.data.id;

        console.log('2. Creating Payment...');
        const paymentRes = await axios.post(`${API_URL}/payments`, { order_id: orderId, amount: 50000, currency: 'INR', method: 'card', vpa: 'u@test' }, { headers: HEADERS });
        const paymentId = paymentRes.data.id;

        console.log('3. Waiting for Payment Success...');
        let paymentStatus = 'pending';
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const pRes = await axios.get(`${API_URL}/payments/${paymentId}`, { headers: HEADERS });
            paymentStatus = pRes.data.status;
            if (paymentStatus === 'success') break;
        }
        if (paymentStatus !== 'success') throw new Error('Payment not success');
        console.log('   Payment Success');

        console.log('4. Partial Refund (1000)...');
        await axios.post(`${API_URL}/payments/${paymentId}/refunds`, { amount: 1000, reason: 'partial' }, { headers: HEADERS });

        console.log('   Waiting for "partially_refunded"...');
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const pRes = await axios.get(`${API_URL}/payments/${paymentId}`, { headers: HEADERS });
            if (pRes.data.status === 'partially_refunded') {
                console.log('   ✅ Status is partially_refunded');
                paymentStatus = 'partially_refunded';
                break;
            }
        }
        if (paymentStatus !== 'partially_refunded') console.error('   ❌ Failed to set partially_refunded');

        console.log('5. Full Refund (Remaining 49000)...');
        await axios.post(`${API_URL}/payments/${paymentId}/refunds`, { amount: 49000, reason: 'full' }, { headers: HEADERS });

        console.log('   Waiting for "refunded"...');
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const pRes = await axios.get(`${API_URL}/payments/${paymentId}`, { headers: HEADERS });
            if (pRes.data.status === 'refunded') {
                console.log('   ✅ Status is refunded');
                paymentStatus = 'refunded';
                break;
            }
        }
        if (paymentStatus !== 'refunded') console.error('   ❌ Failed to set refunded');

    } catch (err) {
        console.error('❌ ERROR:', err.message);
        if (err.response) console.error(err.response.data);
    }
}

verify();
