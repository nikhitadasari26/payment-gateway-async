import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Webhooks() {
  const [logs, setLogs] = useState([]);
  const [secret, setSecret] = useState('Loading...');
  const [url, setUrl] = useState('https://mysite.com/webhook'); // Mock URL for display

  // API Config
  const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1',
    headers: {
      'X-Api-Key': 'key_test_abc123',
      'X-Api-Secret': 'secret_test_xyz789'
    }
  });

  useEffect(() => {
    fetchLogs();
    // In a real app, we would fetch the secret/url from GET /merchants/me
    setSecret('whsec_test_abc123');
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/webhooks');
      setLogs(res.data.data);
    } catch (err) { console.error(err); }
  };

  const handleRetry = async (logId) => {
    try {
      await api.post(`/webhooks/${logId}/retry`);
      alert("Retry scheduled!");
      fetchLogs(); // Refresh list
    } catch (err) { alert("Retry failed"); }
  };

  const handleSave = async () => {
    try {
      await api.put('/merchants/me', { webhook_url: url });
      alert('Configuration saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save configuration');
    }
  };

  return (
    <div style={{ padding: '20px' }} data-test-id="webhook-config">
      <h2>Webhook Configuration</h2>

      <div className="card" style={{ marginBottom: '30px', padding: '20px', background: 'white', borderRadius: '8px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold' }}>Webhook URL</label>
          <input data-test-id="webhook-url-input" value={url} onChange={e => setUrl(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold' }}>Webhook Secret</label>
          <code data-test-id="webhook-secret" style={{ background: '#eee', padding: '4px' }}>{secret}</code>
        </div>
        <button
          data-test-id="save-webhook-button"
          onClick={handleSave}
          style={{ marginTop: '15px', padding: '8px 16px', background: '#635bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Save Configuration
        </button>
      </div>

      <h3>Webhook Logs</h3>
      <table data-test-id="webhook-logs-table" style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
            <th style={{ padding: '10px' }}>Event</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Last Attempt</th>
            <th>Code</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} data-test-id="webhook-log-item" style={{ borderBottom: '1px solid #eee' }}>
              <td data-test-id="webhook-event" style={{ padding: '10px' }}>{log.event}</td>
              <td data-test-id="webhook-status" style={{ color: log.status === 'success' ? 'green' : 'orange' }}>
                {log.status}
              </td>
              <td data-test-id="webhook-attempts">{log.attempts}</td>
              <td data-test-id="webhook-last-attempt">{new Date(log.created_at).toLocaleTimeString()}</td>
              <td data-test-id="webhook-response-code">{log.response_code || '-'}</td>
              <td>
                <button
                  data-test-id="retry-webhook-button"
                  onClick={() => handleRetry(log.id)}
                  style={{ cursor: 'pointer', color: '#635bff', background: 'none', border: 'none', fontWeight: 'bold' }}
                >
                  Retry
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Webhooks;