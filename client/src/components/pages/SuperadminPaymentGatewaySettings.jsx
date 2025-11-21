import React, { useState, useEffect } from 'react';
import { FiSettings, FiRefreshCw, FiSave } from 'react-icons/fi';
import superadminSettingsService from '../../services/superadminSettingsService';

const SuperadminPaymentGatewaySettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gateways, setGateways] = useState({
    razorpay: { enabled: false },
    paytm: { enabled: false },
    phonepe: { enabled: false },
    easebuzz: { enabled: false },
    sabpaisa: { enabled: false },
    cashfree: { enabled: false }
  });
  const [rotationMode, setRotationMode] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await superadminSettingsService.getPaymentGatewaySettings();
      console.log('Fetched settings:', response);
      if (response.success) {
        console.log('Setting gateways:', response.payment_gateways);
        // Ensure all gateways are properly structured (round-robin mode - no default needed)
        const normalizedGateways = {
          razorpay: { 
            enabled: Boolean(response.payment_gateways?.razorpay?.enabled)
          },
          paytm: { 
            enabled: Boolean(response.payment_gateways?.paytm?.enabled)
          },
          phonepe: { 
            enabled: Boolean(response.payment_gateways?.phonepe?.enabled)
          },
          easebuzz: { 
            enabled: Boolean(response.payment_gateways?.easebuzz?.enabled)
          },
          sabpaisa: { 
            enabled: Boolean(response.payment_gateways?.sabpaisa?.enabled)
          },
          cashfree: { 
            enabled: Boolean(response.payment_gateways?.cashfree?.enabled)
          }
        };
        console.log('Normalized gateways:', normalizedGateways);
        setGateways(normalizedGateways);
        setRotationMode(response.rotation_mode !== false); // Default to true
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGateway = (gatewayName) => {
    console.log('=== TOGGLE GATEWAY FUNCTION CALLED ===');
    console.log('Gateway name:', gatewayName);
    console.log('Current gateways state:', JSON.stringify(gateways, null, 2));
    
    setGateways(prev => {
      console.log('Previous state in setGateways:', JSON.stringify(prev, null, 2));
      
      // Create a completely new object structure to ensure React detects the change
      const updated = {
        razorpay: { enabled: prev.razorpay?.enabled || false },
        paytm: { enabled: prev.paytm?.enabled || false },
        phonepe: { enabled: prev.phonepe?.enabled || false },
        easebuzz: { enabled: prev.easebuzz?.enabled || false },
        sabpaisa: { enabled: prev.sabpaisa?.enabled || false },
        cashfree: { enabled: prev.cashfree?.enabled || false }
      };
      
      const currentGateway = updated[gatewayName];
      console.log('Current gateway state before toggle:', gatewayName, currentGateway);
      
      // Simple toggle - round-robin handles selection automatically
      updated[gatewayName] = {
        enabled: !currentGateway.enabled
      };
      
      console.log('✅ Toggled gateway:', gatewayName, 'to', updated[gatewayName].enabled);
      console.log('✅ Updated gateways after toggle:', JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  // Removed handleSetDefault - round-robin handles selection automatically

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    // Validate: at least one gateway must be enabled
    const enabledCount = Object.values(gateways).filter(g => g.enabled).length;
    if (enabledCount === 0) {
      setError('At least one payment gateway must be enabled');
      setSaving(false);
      return;
    }

    // No need to validate default - round-robin handles selection automatically

    try {
      const response = await superadminSettingsService.updatePaymentGatewaySettings(gateways);
      if (response.success) {
        setSuccess('Payment gateway settings updated successfully! Round-robin mode is active.');
        setRotationMode(response.rotation_mode !== false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const gatewayLabels = {
    razorpay: 'Razorpay',
    paytm: 'Paytm',
    phonepe: 'PhonePe',
    easebuzz: 'Easebuzz',
    sabpaisa: 'SabPaisa',
    cashfree: 'Cashfree'
  };

  // Removed handleRotateGateway - round-robin is automatic on the backend

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-white text-lg">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 font-['Albert_Sans'] flex items-center gap-3">
            <FiSettings className="text-accent" />
            Payment Gateway Settings
          </h1>
          <p className="text-white/70 font-['Albert_Sans']">
            Enable or disable payment gateways. Round-robin mode automatically distributes payment requests across all enabled gateways.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">
            {success}
          </div>
        )}

        {/* Settings Card */}
        <div className="bg-bg-secondary border border-white/10 rounded-xl p-6">
          <div className="space-y-4">
            {Object.entries(gateways).map(([key, gateway]) => {
              const isEnabled = gateway?.enabled === true;
              
              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isEnabled
                      ? 'border-white/20 bg-white/5'
                      : 'border-white/10 bg-white/5 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        {/* Toggle Switch - Using div with onClick for better compatibility */}
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('=== TOGGLE CLICKED ===');
                            console.log('Gateway:', key);
                            console.log('Current enabled state:', isEnabled);
                            console.log('Current gateway object:', gateway);
                            handleToggleGateway(key);
                          }}
                          className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer select-none ${
                            isEnabled ? 'bg-accent' : 'bg-white/20'
                          }`}
                          style={{
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 30,
                            outline: 'none',
                            WebkitTapHighlightColor: 'transparent',
                            touchAction: 'manipulation',
                            userSelect: 'none'
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleToggleGateway(key);
                            }
                          }}
                          aria-label={`Toggle ${gatewayLabels[key]}`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                              isEnabled ? 'translate-x-6' : 'translate-x-0'
                            }`}
                            style={{ 
                              pointerEvents: 'none',
                              userSelect: 'none'
                            }}
                          />
                        </div>
                        <span className="text-white font-medium font-['Albert_Sans']">
                          {gatewayLabels[key]}
                        </span>
                      </div>
                      {isEnabled && (
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                          Enabled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 10 }}>
                      {!isEnabled && (
                        <span className="px-3 py-1.5 bg-white/10 text-white/50 rounded-lg text-sm font-medium">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Round-Robin Info - Show when multiple gateways are enabled */}
          {Object.values(gateways).filter(g => g.enabled).length > 1 && (
            <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <FiRefreshCw className="text-purple-400" />
                <div>
                  <p className="text-purple-400 text-sm font-medium mb-1">
                    Round-Robin Mode Active
                  </p>
                  <p className="text-purple-300 text-xs">
                    Payment requests are automatically distributed across {Object.values(gateways).filter(g => g.enabled).length} enabled gateways in round-robin fashion
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-sm">
              <strong>Round-Robin Mode:</strong> Payment requests are automatically distributed across all enabled gateways in round-robin fashion.
              At least one gateway must be enabled. When multiple gateways are enabled, each payment link creation will automatically use the next gateway in rotation.
              {Object.values(gateways).filter(g => g.enabled).length > 1 && (
                <span className="block mt-1 text-blue-300">
                  Currently {Object.values(gateways).filter(g => g.enabled).length} gateways are enabled and will be rotated automatically.
                </span>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={fetchSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <FiSave />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperadminPaymentGatewaySettings;

