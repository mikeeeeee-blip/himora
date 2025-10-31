import React, { useState, useEffect } from 'react';
import { FiLink, FiCopy, FiPlus, FiTrash2, FiEdit, FiPlay, FiCheck } from 'react-icons/fi';
import Sidebar from '../Sidebar';
import webhookService from '../../services/webhookService';
import './PageLayout.css';
import Toast from '../ui/Toast';

const WebhookPage = () => {
  const [webhookConfig, setWebhookConfig] = useState(null);
  const [payoutWebhookConfig, setPayoutWebhookConfig] = useState(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showPayoutConfigForm, setShowPayoutConfigForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [webhookData, setWebhookData] = useState({
    url: '',
    events: []
  });
  const [payoutWebhookData, setPayoutWebhookData] = useState({
    url: '',
    events: []
  });

  const webhookEvents = webhookService.getAvailableEvents();
  const payoutEvents = webhookService.getAvailablePayoutEvents();

  useEffect(() => {
    fetchWebhookConfig();
    fetchPayoutWebhookConfig();
  }, []);

  const fetchWebhookConfig = async () => {
    setLoading(true);
    try {
      const config = await webhookService.getWebhookConfig();
      // Handle both direct config and wrapped response
      const webhookData = config?.success === false ? null : (config?.webhook_url ? config : (config || null));
      setWebhookConfig(webhookData);
      if (webhookData) {
        setWebhookData({
          url: webhookData.webhook_url || webhookData.url || '',
          events: webhookData.webhook_events || webhookData.events || []
        });
      } else {
        setWebhookData({ url: '', events: [] });
      }
    } catch (error) {
      console.error('Error fetching webhook config:', error);
      setError('Failed to fetch webhook configuration');
      setToast({ message: 'Failed to fetch webhook configuration', type: 'error' });
      setWebhookConfig(null);
      setWebhookData({ url: '', events: [] });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutWebhookConfig = async () => {
    setPayoutLoading(true);
    try {
      const config = await webhookService.getPayoutWebhookConfig();
      // Handle both direct config and wrapped response
      const payoutData = config?.success === false ? null : (config?.webhook_url ? config : (config || null));
      setPayoutWebhookConfig(payoutData);
      if (payoutData) {
        setPayoutWebhookData({
          url: payoutData.webhook_url || payoutData.url || '',
          events: payoutData.webhook_events || payoutData.events || []
        });
      } else {
        setPayoutWebhookData({ url: '', events: [] });
      }
    } catch (error) {
      console.error('Error fetching payout webhook config:', error);
      setError('Failed to fetch payout webhook configuration');
      setToast({ message: 'Failed to fetch payout webhook configuration', type: 'error' });
      setPayoutWebhookConfig(null);
      setPayoutWebhookData({ url: '', events: [] });
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === 'events') {
      setWebhookData(prev => ({
        ...prev,
        events: value
      }));
    } else {
      setWebhookData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleEventToggle = (eventId) => {
    setWebhookData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const handlePayoutEventToggle = (eventId) => {
    setPayoutWebhookData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const handleConfigure = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!webhookData.url || webhookData.events.length === 0) {
        throw new Error('Please fill in all required fields');
      }

      // Validate URL format
      try {
        new URL(webhookData.url);
      } catch {
        throw new Error('Please enter a valid URL');
      }

      const result = await webhookService.configureWebhook(webhookData);
      setSuccess('Webhook configured successfully!');
      setToast({ message: 'Webhook configured successfully!', type: 'success' });
      
      // Update webhook config from response if available
      if (result && result.webhook_url) {
        setWebhookConfig(result);
        setWebhookData({
          url: result.webhook_url || '',
          events: result.webhook_events || []
        });
      }
      
      // Refresh the webhook config to get latest state
      await fetchWebhookConfig();
      setShowConfigForm(false);
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutConfigure = async (e) => {
    e.preventDefault();
    setPayoutLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!payoutWebhookData.url || payoutWebhookData.events.length === 0) {
        throw new Error('Please fill in all required fields');
      }

      // Validate URL format
      try {
        new URL(payoutWebhookData.url);
      } catch {
        throw new Error('Please enter a valid URL');
      }

      const result = await webhookService.configurePayoutWebhook(payoutWebhookData);
      setSuccess('Payout webhook configured successfully!');
      setToast({ message: 'Payout webhook configured successfully!', type: 'success' });

      // Update payout webhook config from response if available
      if (result && result.webhook_url) {
        setPayoutWebhookConfig(result);
        setPayoutWebhookData({
          url: result.webhook_url || '',
          events: result.webhook_events || []
        });
      }
      
      // Refresh the payout webhook config to get latest state
      await fetchPayoutWebhookConfig();
      setShowPayoutConfigForm(false);
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: 'error' });
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete the webhook configuration?')) {
      try {
        await webhookService.deleteWebhook();
        setSuccess('Webhook configuration deleted successfully!');
        setToast({ message: 'Webhook configuration deleted successfully!', type: 'success' });
        setWebhookConfig(null);
        setWebhookData({ url: '', events: [] });
        // Refresh to ensure UI is updated
        await fetchWebhookConfig();
      } catch (error) {
        setError('Failed to delete webhook configuration');
        setToast({ message: 'Failed to delete webhook configuration', type: 'error' });
      }
    }
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const result = await webhookService.testWebhook();
      if (result && result.success) {
        setSuccess('Test webhook sent successfully!');
        setToast({ message: 'Test webhook sent successfully!', type: 'success' });
      } else {
        setError(result?.error || 'Test webhook failed');
        setToast({ message: result?.error || 'Test webhook failed', type: 'error' });
      }
    } catch (error) {
      setError(error.message || 'Failed to send test webhook');
      setToast({ message: error.message || 'Failed to send test webhook', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutTest = async () => {
    setPayoutLoading(true);
    try {
      const result = await webhookService.testPayoutWebhook();
      if (result && result.success) {
        setSuccess('Test payout webhook sent successfully!');
        setToast({ message: 'Test payout webhook sent successfully!', type: 'success' });
      } else {
        setError(result?.error || 'Test payout webhook failed');
        setToast({ message: result?.error || 'Test payout webhook failed', type: 'error' });
      }
    } catch (error) {
      setError(error.message || 'Failed to send test payout webhook');
      setToast({ message: error.message || 'Failed to send test payout webhook', type: 'error' });
    } finally {
      setPayoutLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setToast({ message: 'Copied to clipboard!', type: 'success' });
  };

  return (
    <div className="page-container with-sidebar webhook-page">
      <Sidebar />
      <main className="page-main">
        <div className="page-header scroll-header">
          <h1>Webhook Configuration</h1>
          <p>Configure your webhooks to receive real-time notifications</p>
          <div className="webhook-info">
            
          </div>
          <div className="header-actions">
            <a href="/admin/webhooks/how-to" className="secondary-btn" style={{ marginRight: 12 }}>
              How to setup
            </a>
            {!webhookConfig ? (
              <button 
                onClick={() => setShowConfigForm(!showConfigForm)} 
                className="primary-btn"
              >
                <FiPlus className="icon" />
                {showConfigForm ? 'Cancel' : 'Configure Webhook'}
              </button>
            ) : (
              <div className="webhook-actions">
                <button 
                  onClick={handleTest}
                  className="secondary-btn"
                >
                  <FiPlay className="icon" />
                  Test Webhook
                </button>
                <button 
                  onClick={() => setShowConfigForm(true)}
                  className="secondary-btn"
                >
                  <FiEdit className="icon" />
                  Edit Configuration
                </button>
                <button 
                  onClick={handleDelete}
                  className="danger-btn"
                >
                  <FiTrash2 className="icon" />
                  Delete Webhook
                </button>
              </div>
            )}
            {/* Payout webhook actions */}
            {!payoutWebhookConfig ? (
              <button 
                onClick={() => setShowPayoutConfigForm(!showPayoutConfigForm)} 
                className="primary-btn"
                style={{ marginLeft: 12 }}
              >
                <FiPlus className="icon" />
                {showPayoutConfigForm ? 'Cancel' : 'Configure Payout Webhook'}
              </button>
            ) : (
              <div className="webhook-actions" style={{ marginLeft: 12 }}>
                <button 
                  onClick={handlePayoutTest}
                  className="secondary-btn"
                >
                  <FiPlay className="icon" />
                  Test Payout Webhook
                </button>
                <button 
                  onClick={() => setShowPayoutConfigForm(true)}
                  className="secondary-btn"
                >
                  <FiEdit className="icon" />
                  Edit Payout Webhook
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="page-content">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          {showConfigForm && (
            <div className="webhook-form-card">
              <h3>Configure Webhook</h3>
              <form onSubmit={handleConfigure} className="webhook-form">
                <div className="form-group">
                  <label>Webhook URL *</label>
                  <input
                    type="url"
                    value={webhookData.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    required
                    placeholder="https://yourdomain.com/api/webhooks/payment"
                  />
                </div>

                <div className="form-group">
                  <label>Events to Subscribe *</label>
                  <div className="events-grid">
                    {webhookEvents.map(event => (
                      <div key={event.id} className="event-option">
                        <label className="checkbox-container">
                          <input
                            type="checkbox"
                            checked={webhookData.events.includes(event.id)}
                            onChange={() => handleEventToggle(event.id)}
                          />
                          <span className="checkmark"></span>
                          <div className="event-info">
                            <div className="event-label">{event.label}</div>
                            <div className="event-description">{event.description}</div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowConfigForm(false);
                      setWebhookData({ url: '', events: [] });
                    }} 
                    className="secondary-btn"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="primary-btn">
                    {loading ? 'Configuring...' : 'Configure Webhook'}
                  </button>
                </div>
              </form>
            </div>
          )}
          {showPayoutConfigForm && (
            <div className="webhook-form-card">
              <h3>Configure Payout Webhook</h3>
              <form onSubmit={handlePayoutConfigure} className="webhook-form">
                <div className="form-group">
                  <label>Payout Webhook URL *</label>
                  <input
                    type="url"
                    value={payoutWebhookData.url}
                    onChange={(e) => setPayoutWebhookData(prev => ({ ...prev, url: e.target.value }))}
                    required
                    placeholder="https://yourdomain.com/api/webhooks/payout"
                  />
                </div>

                <div className="form-group">
                  <label>Payout Events to Subscribe *</label>
                  <div className="events-grid">
                    {payoutEvents.map(event => (
                      <div key={event.id} className="event-option">
                        <label className="checkbox-container">
                          <input
                            type="checkbox"
                            checked={payoutWebhookData.events.includes(event.id)}
                            onChange={() => handlePayoutEventToggle(event.id)}
                          />
                          <span className="checkmark"></span>
                          <div className="event-info">
                            <div className="event-label">{event.label}</div>
                            <div className="event-description">{event.description}</div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowPayoutConfigForm(false);
                      setPayoutWebhookData({ url: '', events: [] });
                    }} 
                    className="secondary-btn"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={payoutLoading} className="primary-btn">
                    {payoutLoading ? 'Configuring...' : 'Configure Payout Webhook'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {(loading || payoutLoading) ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading webhook configuration...</p>
            </div>
          ) : (webhookConfig || payoutWebhookConfig) ? (
            <div className="webhook-config-display">
              {/* Payment Webhook Configuration */}
              {webhookConfig ? (
                <div className="webhook-card">
                  <div className="webhook-header">
                    <div className="webhook-title">
                      <FiLink className="webhook-icon" />
                      <h4>Payment Webhook Configuration</h4>
                      <span className={`status-badge ${webhookConfig.webhook_enabled ? 'active' : 'inactive'}`}>
                        {webhookConfig.webhook_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="webhook-body">
                    <div className="webhook-detail">
                      <label>Webhook URL:</label>
                      <div className="url-container">
                        <span className="url-text">{webhookConfig.webhook_url}</span>
                        <button 
                          onClick={() => copyToClipboard(webhookConfig.webhook_url)}
                          className="copy-btn small"
                        >
                          <FiCopy />
                        </button>
                      </div>
                    </div>
                    
                    <div className="webhook-detail">
                      <label>Webhook Secret:</label>
                      <div className="secret-container">
                        <span className="secret-text">
                          {webhookConfig.webhook_secret ? 
                            `${webhookConfig.webhook_secret.substring(0, 8)}...` : 
                            'Not available'
                          }
                        </span>
                        {webhookConfig.webhook_secret && (
                          <button 
                            onClick={() => copyToClipboard(webhookConfig.webhook_secret)}
                            className="copy-btn small"
                          >
                            <FiCopy />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="webhook-detail">
                      <label>Subscribed Events:</label>
                      <div className="events-list">
                        {webhookConfig.webhook_events?.map(eventId => {
                          const event = webhookEvents.find(e => e.id === eventId);
                          return (
                            <span key={eventId} className="event-tag">
                              {event ? event.label : eventId}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="webhook-detail">
                      <label>Retry Attempts:</label>
                      <span className="webhook-value">{webhookConfig.webhook_retries || 3}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon"><FiLink /></div>
                  <h3>No Payment Webhook Configured</h3>
                  <p>Configure your payment webhook to start receiving payment notifications.</p>
                </div>
              )}

              {/* Payout Webhook Configuration */}
              {payoutWebhookConfig ? (
                <div className="webhook-card" style={{ marginTop: webhookConfig ? 16 : 0 }}>
                  <div className="webhook-header">
                    <div className="webhook-title">
                      <FiLink className="webhook-icon" />
                      <h4>Payout Webhook Configuration</h4>
                      <span className={`status-badge ${payoutWebhookConfig.webhook_enabled ? 'active' : 'inactive'}`}>
                        {payoutWebhookConfig.webhook_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <div className="webhook-body">
                    <div className="webhook-detail">
                      <label>Webhook URL:</label>
                      <div className="url-container">
                        <span className="url-text">{payoutWebhookConfig.webhook_url}</span>
                        <button 
                          onClick={() => copyToClipboard(payoutWebhookConfig.webhook_url)}
                          className="copy-btn small"
                        >
                          <FiCopy />
                        </button>
                      </div>
                    </div>

                    <div className="webhook-detail">
                      <label>Webhook Secret:</label>
                      <div className="secret-container">
                        <span className="secret-text">
                          {payoutWebhookConfig.webhook_secret ? 
                            `${payoutWebhookConfig.webhook_secret.substring(0, 8)}...` : 
                            'Not available'
                          }
                        </span>
                        {payoutWebhookConfig.webhook_secret && (
                          <button 
                            onClick={() => copyToClipboard(payoutWebhookConfig.webhook_secret)}
                            className="copy-btn small"
                          >
                            <FiCopy />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="webhook-detail">
                      <label>Subscribed Events:</label>
                      <div className="events-list">
                        {payoutWebhookConfig.webhook_events?.map(eventId => {
                          const event = payoutEvents.find(e => e.id === eventId);
                          return (
                            <span key={eventId} className="event-tag">
                              {event ? event.label : eventId}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="webhook-detail">
                      <label>Retry Attempts:</label>
                      <span className="webhook-value">{payoutWebhookConfig.webhook_retries || 3}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ marginTop: webhookConfig ? 16 : 0 }}>
                  <div className="empty-icon"><FiLink /></div>
                  <h3>No Payout Webhook Configured</h3>
                  <p>Configure your payout webhook to start receiving payout notifications.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><FiLink /></div>
              <h3>No Webhook Configured</h3>
              <p>Configure your webhook to start receiving payment notifications.</p>
            </div>
          )}
        </div>
      </main>
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </div>
  );
};

export default WebhookPage;