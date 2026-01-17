class PaymentGateway {
    constructor(options) {
        this.options = options || {};
        this.modalId = 'payment-gateway-modal';
        this.iframeId = 'payment-iframe';

        if (!this.options.key) {
            console.error('PaymentGateway: "key" is required.');
        }
    }

    open() {
        if (document.getElementById(this.modalId)) return;

        // Create Modal
        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.dataset.testId = 'payment-modal';
        Object.assign(modal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '9999'
        });

        // Content container
        const content = document.createElement('div');
        content.className = 'modal-content';
        Object.assign(content.style, {
            position: 'relative',
            width: '400px',
            height: '600px',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        });

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.innerText = '×';
        closeBtn.dataset.testId = 'close-modal-button';
        closeBtn.className = 'close-button';
        Object.assign(closeBtn.style, {
            position: 'absolute',
            top: '10px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#333',
            zIndex: '10'
        });
        closeBtn.onclick = () => this.close();

        // Iframe
        const iframe = document.createElement('iframe');
        iframe.dataset.testId = 'payment-iframe';

        // Construct URL
        // Assumption: The checkout page is served from the same origin as this script (localhost:3001)
        // Or we should assume localhost:3001 if not specified? 
        // The requirement says src="http://localhost:3001/checkout?..."
        const baseUrl = 'http://localhost:3001/checkout';
        const params = new URLSearchParams({
            order_id: this.options.orderId || '',
            key: this.options.key || '',
            embedded: 'true'
        });

        iframe.src = `${baseUrl}?${params.toString()}`;

        Object.assign(iframe.style, {
            width: '100%',
            height: '100%',
            border: 'none'
        });

        content.appendChild(closeBtn);
        content.appendChild(iframe);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Listen for messages
        window.addEventListener('message', this.handleMessage.bind(this));
    }

    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.remove();
        }
        window.removeEventListener('message', this.handleMessage.bind(this));
        if (this.options.onClose) this.options.onClose();
    }

    handleMessage(event) {
        // In production, check event.origin
        const { type, data } = event.data;

        if (type === 'payment_success') {
            if (this.options.onSuccess) this.options.onSuccess(data);
            this.close();
        } else if (type === 'payment_failed') {
            if (this.options.onFailure) this.options.onFailure(data);
        } else if (type === 'close_modal') {
            this.close();
        }
    }
}

// Expose globally
window.PaymentGateway = PaymentGateway;
