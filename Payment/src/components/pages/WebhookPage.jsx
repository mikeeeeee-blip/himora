import React, { useState, useEffect } from 'react';
import { FiLink, FiCopy, FiPlus, FiTrash2, FiEdit, FiPlay, FiCheck } from 'react-icons/fi';
import Sidebar from '../Sidebar';
import webhookService from '../../services/webhookService';
import './PageLayout.css';
import Toast from '../ui/Toast';

const WebhookPage = () => {
  const [webhookConfig, setWebhookConfig] = useState(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [webhookData, setWebhookData] = useState({
    url: '',
    events: []
  });

  const webhookEvents = webhookService.getAvailableEvents();

  useEffect(() => {
    fetchWebhookConfig();
  }, []);

  const fetchWebhookConfig = async () => {
    setLoading(true);
    try {
      const config = await webhookService.getWebhookConfig();
      setWebhookConfig(config);
      if (config) {
        setWebhookData({
          url: config.webhook_url || '',
          events: config.webhook_events || []
        });
      }
    } catch (error) {
      console.error('Error fetching webhook config:', error);
      setError('Failed to fetch webhook configuration');
      setToast({ message: 'Failed to fetch webhook configuration', type: 'error' });
    } finally {
      setLoading(false);
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
      
      // Refresh the webhook config
      await fetchWebhookConfig();
      setShowConfigForm(false);
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
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
      } catch (error) {
        setError('Failed to delete webhook configuration');
        setToast({ message: 'Failed to delete webhook configuration', type: 'error' });
      }
    }
  };

  const handleTest = async () => {
    try {
      await webhookService.testWebhook();
      setSuccess('Test webhook sent successfully!');
      setToast({ message: 'Test webhook sent successfully!', type: 'success' });
    } catch (error) {
      setError('Failed to send test webhook');
      setToast({ message: 'Failed to send test webhook', type: 'error' });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setToast({ message: 'Copied to clipboard!', type: 'success' });
  };

  return (
    <div className="page-container with-sidebar">
      <Sidebar />
      <main className="page-main">
        <div className="page-header">
          <h1>Webhook Configuration</h1>
          <p>Configure your webhook URL to receive real-time payment notifications</p>
          <div className="webhook-info">
            
          </div>
          <div className="header-actions">
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
          
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading webhook configuration...</p>
            </div>
          ) : webhookConfig ? (
            <div className="webhook-config-display">
              <div className="webhook-card">
                <div className="webhook-header">
                  <div className="webhook-title">
                    <FiLink className="webhook-icon" />
                    <h4>Webhook Configuration</h4>
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