import React from 'react';

function Docs() {
  return (
    <div style={{ padding: '20px', maxWidth: '800px' }} data-test-id="api-docs">
      <h2>Integration Guide</h2>
      <p>Follow these steps to integrate the payment gateway into your website.</p>

      {/* Section 1: Create Order */}
      <section data-test-id="section-create-order" style={{ marginBottom: '40px' }}>
        <h3>1. Create an Order</h3>
        <p>Call this API from your backend to generate an Order ID.</p>
        <div style={{ background: '#f4f6f8', padding: '15px', borderRadius: '6px', overflowX: 'auto' }}>
          <pre data-test-id="code-snippet-create-order" style={{ margin: 0 }}>
{`curl -X POST http://localhost:8000/api/v1/orders \\
  -H "X-Api-Key: key_test_abc123" \\
  -H "X-Api-Secret: secret_test_xyz789" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_123"
  }'`}
          </pre>
        </div>
      </section>

      {/* Section 2: SDK Integration */}
      <section data-test-id="section-sdk-integration" style={{ marginBottom: '40px' }}>
        <h3>2. Frontend SDK Integration</h3>
        <p>Include this script on your checkout page to open the payment modal.</p>
        <div style={{ background: '#f4f6f8', padding: '15px', borderRadius: '6px', overflowX: 'auto' }}>
          <pre data-test-id="code-snippet-sdk" style={{ margin: 0 }}>
{`<script src="http://localhost:3001/checkout.js"></script>
<script>
  const checkout = new PaymentGateway({
    key: 'key_test_abc123',
    orderId: 'order_xyz', // Get this from step 1
    onSuccess: (response) => {
      console.log('Payment ID:', response.paymentId);
      alert('Payment Success!');
    },
    onFailure: (error) => {
      console.error('Payment Failed:', error);
    }
  });

  // Open the modal
  checkout.open();
</script>`}
          </pre>
        </div>
      </section>

      {/* Section 3: Webhook Verification */}
      <section data-test-id="section-webhook-verification">
        <h3>3. Verify Webhooks</h3>
        <p>Verify the <code>X-Webhook-Signature</code> header to ensure security.</p>
        <div style={{ background: '#f4f6f8', padding: '15px', borderRadius: '6px', overflowX: 'auto' }}>
          <pre data-test-id="code-snippet-webhook" style={{ margin: 0 }}>
{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}`}
          </pre>
        </div>
      </section>
    </div>
  );
}

export default Docs;