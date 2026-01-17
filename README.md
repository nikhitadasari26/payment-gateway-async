# Production-Ready Payment Gateway with Async Processing & Webhooks

This project is a fully containerized, production-grade payment gateway system featuring asynchronous job processing, webhook delivery with retries and HMAC signature verification, an embeddable JavaScript checkout SDK, and refund management.

It is designed to demonstrate scalable, resilient backend architecture similar to real-world systems like Stripe or Razorpay.

---

## Architecture Overview

### Services
- **API Service (Port 8000)**  
  Handles merchant authentication, order creation, payment creation, capture, refunds, idempotency, and webhook log APIs.
- **Worker Service**  
  Processes background jobs from Redis:
  - Payment processing
  - Webhook delivery & retries
  - Refund processing
- **PostgreSQL (Port 5432)**  
  Primary data store for merchants, orders, payments, refunds, webhook logs, and idempotency keys.
- **Redis (Port 6379)**  
  Job queue backend for asynchronous processing.
- **Dashboard (Port 3000)**  
  Merchant UI for webhook configuration, logs, and API documentation.
- **Checkout (Port 3001)**  
  Hosted checkout page and embeddable JavaScript SDK.

### Flow
1. Merchant creates an **order**
2. Merchant creates a **payment** → status = `pending`
3. API enqueues **ProcessPaymentJob**
4. Worker processes payment → `success` or `failed`
5. Worker enqueues **DeliverWebhookJob**
6. Webhook delivery attempts with exponential backoff
7. Refunds follow the same async pipeline

---

## Tech Stack
- Node.js (Express)
- PostgreSQL
- Redis
- Bull (Job Queue)
- Docker & Docker Compose
- Webpack (SDK bundling)
- Thunder Client / cURL (Testing)

---

## Setup Instructions

### Prerequisites
- Docker
- Docker Compose

### Start System
```bash
docker compose up -d
```

### Verify Containers
```bash
docker ps
```
You should see:
- pg_gateway
- redis_gateway
- gateway_api
- gateway_worker
- gateway_dashboard
- gateway_checkout

---

## Environment Variables

Configured via `docker-compose.yml`:
- `DATABASE_URL`
- `REDIS_URL`
- `TEST_MODE`
- `TEST_PAYMENT_SUCCESS`
- `TEST_PROCESSING_DELAY`
- `WEBHOOK_RETRY_INTERVALS_TEST`

---

## API Authentication

All secured endpoints require:
```
X-Api-Key: key_test_abc123
X-Api-Secret: secret_test_xyz789
```

---

## Core API Endpoints

### Create Order
```
POST /api/v1/orders
```

### Create Payment
```
POST /api/v1/payments
```

### Capture Payment
```
POST /api/v1/payments/{payment_id}/capture
```

### Create Refund
```
POST /api/v1/payments/{payment_id}/refunds
```

### Get Refund
```
GET /api/v1/refunds/{refund_id}
```

### List Webhook Logs
```
GET /api/v1/webhooks
```

### Retry Webhook
```
POST /api/v1/webhooks/{webhook_id}/retry
```

### Job Queue Status (Test Endpoint)
```
GET /api/v1/test/jobs/status
```

---

## Webhooks

### Events
- `payment.created`
- `payment.pending`
- `payment.success`
- `payment.failed`
- `refund.created`
- `refund.processed`

### Signature Verification
HMAC-SHA256 signature is generated using:
- Payload JSON string
- Merchant `webhook_secret`

Header:
```
X-Webhook-Signature: <hex_signature>
```

---

## Embeddable SDK Usage

Include:
```html
<script src="http://localhost:3001/checkout.js"></script>
```

Example:
```html
<script>
const checkout = new PaymentGateway({
  key: "key_test_abc123",
  orderId: "order_xyz",
  onSuccess: (res) => console.log("Payment Success", res),
  onFailure: (err) => console.log("Payment Failed", err)
});

checkout.open();
</script>
```

---

## Testing

### Job Queue Status
```bash
curl http://localhost:8000/api/v1/test/jobs/status
```

### Worker Logs
```bash
docker logs -f gateway_worker
```

---

## Scaling Notes

- Worker service can be horizontally scaled
- Redis can be clustered for high throughput
- Webhook queue can be split per job type
- PostgreSQL can use read replicas for logs

---

## Author
Built as part of an advanced backend engineering deliverable demonstrating async processing, system reliability, and production-grade architecture.