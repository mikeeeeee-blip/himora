import React, { useState, useEffect } from 'react';
import { FiSettings, FiCheck, FiX, FiRefreshCw, FiSave } from 'react-icons/fi';
import superadminSettingsService from '../../services/superadminSettingsService';

const SuperadminPaymentGatewaySettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gateways, setGateways] = useState({
    razorpay: { enabled: false, isDefault: false },
    paytm: { enabled: false, isDefault: false },
    phonepe: { enabled: false, isDefault: false },
    easebuzz: { enabled: false, isDefault: false },
    cashfree: { enabled: false, isDefault: false }
  });
  const [defaultGateway, setDefaultGateway] = useState(null);

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
        // Ensure all gateways are properly structured
        const normalizedGateways = {
          razorpay: { 
            enabled: Boolean(response.payment_gateways?.razorpay?.enabled), 
            isDefault: Boolean(response.payment_gateways?.razorpay?.isDefault) 
          },
          paytm: { 
            enabled: Boolean(response.payment_gateways?.paytm?.enabled), 
            isDefault: Boolean(response.payment_gateways?.paytm?.isDefault) 
          },
          phonepe: { 
            enabled: Boolean(response.payment_gateways?.phonepe?.enabled), 
            isDefault: Boolean(response.payment_gateways?.phonepe?.isDefault) 
          },
          easebuzz: { 
            enabled: Boolean(response.payment_gateways?.easebuzz?.enabled), 
            isDefault: Boolean(response.payment_gateways?.easebuzz?.isDefault) 
          },
          cashfree: { 
            enabled: Boolean(response.payment_gateways?.cashfree?.enabled), 
            isDefault: Boolean(response.payment_gateways?.cashfree?.isDefault) 
          }
        };
        console.log('Normalized gateways:', normalizedGateways);
        setGateways(normalizedGateways);
        setDefaultGateway(response.default_gateway);
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
        razorpay: { enabled: prev.razorpay?.enabled || false, isDefault: prev.razorpay?.isDefault || false },
        paytm: { enabled: prev.paytm?.enabled || false, isDefault: prev.paytm?.isDefault || false },
        phonepe: { enabled: prev.phonepe?.enabled || false, isDefault: prev.phonepe?.isDefault || false },
        easebuzz: { enabled: prev.easebuzz?.enabled || false, isDefault: prev.easebuzz?.isDefault || false },
        cashfree: { enabled: prev.cashfree?.enabled || false, isDefault: prev.cashfree?.isDefault || false }
      };
      
      const currentGateway = updated[gatewayName];
      console.log('Current gateway state before toggle:', gatewayName, currentGateway);
      
      // If disabling, also remove default
      if (currentGateway.enabled) {
        updated[gatewayName] = {
          enabled: false,
          isDefault: false
        };
        console.log('✅ Disabling gateway:', gatewayName);
      } else {
        // Enabling the gateway
        updated[gatewayName] = {
          enabled: true,
          isDefault: currentGateway.isDefault || false
        };
        
        // If no other gateway is default, make this one default
        const hasDefault = Object.values(updated).some(g => g.isDefault && g.enabled);
        if (!hasDefault) {
          updated[gatewayName] = {
            ...updated[gatewayName],
            isDefault: true
          };
          console.log('✅ Setting', gatewayName, 'as default (no other default exists)');
        }
        console.log('✅ Enabling gateway:', gatewayName);
      }
      
      console.log('✅ Updated gateways after toggle:', JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const handleSetDefault = (gatewayName) => {
    console.log('Set default gateway:', gatewayName);
    console.log('Current gateways state:', gateways);
    
    setGateways(prev => {
      // Create a completely new object to ensure React detects the change
      const updated = {
        razorpay: { ...prev.razorpay },
        paytm: { ...prev.paytm },
        phonepe: { ...prev.phonepe },
        easebuzz: { ...prev.easebuzz },
        cashfree: { ...prev.cashfree }
      };
      
      console.log('Previous state:', prev);
      console.log('Gateway to set as default:', gatewayName, 'Current value:', updated[gatewayName]);
      
      // Unset all defaults
      updated.razorpay.isDefault = false;
      updated.paytm.isDefault = false;
      updated.phonepe.isDefault = false;
      updated.easebuzz.isDefault = false;
      updated.cashfree.isDefault = false;
      
      // Set new default (only if enabled)
      if (updated[gatewayName] && updated[gatewayName].enabled) {
        updated[gatewayName] = {
          ...updated[gatewayName],
          isDefault: true
        };
        console.log('Set', gatewayName, 'as default');
      } else {
        console.warn('Cannot set default - gateway not enabled:', gatewayName, updated[gatewayName]);
      }
      
      console.log('Updated gateways:', updated);
      return updated;
    });
  };

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

    // Validate: at least one default must be set
    const defaultCount = Object.values(gateways).filter(g => g.isDefault && g.enabled).length;
    if (defaultCount === 0) {
      setError('At least one enabled gateway must be set as default');
      setSaving(false);
      return;
    }

    try {
      const response = await superadminSettingsService.updatePaymentGatewaySettings(gateways);
      if (response.success) {
        setSuccess('Payment gateway settings updated successfully!');
        setDefaultGateway(response.default_gateway);
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
    cashfree: 'Cashfree'
  };

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
            Enable or disable payment gateways and set the default gateway for payment link creation
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
              const isDefault = gateway?.isDefault === true;
              
              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isEnabled
                      ? isDefault
                        ? 'border-accent bg-accent/10'
                        : 'border-white/20 bg-white/5'
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
                      {isDefault && isEnabled && (
                        <span className="text-xs px-2 py-1 bg-accent/20 text-accent rounded font-medium">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 10 }}>
                      {isEnabled && !isDefault && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Set default clicked for:', key);
                            console.log('Current gateway state:', gateway);
                            console.log('isEnabled:', isEnabled, 'isDefault:', isDefault);
                            handleSetDefault(key);
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 active:bg-accent/40 text-accent rounded-lg text-sm font-medium transition-colors cursor-pointer"
                          style={{ 
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 20
                          }}
                        >
                          Set as Default
                        </button>
                      )}
                      {isDefault && isEnabled && (
                        <span className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium">
                          Default Gateway
                        </span>
                      )}
                      {!isEnabled && (
                        <span className="px-3 py-1.5 bg-white/10 text-white/50 rounded-lg text-sm font-medium">
                          Enable first
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-sm">
              <strong>Note:</strong> The default gateway will be used automatically when creating payment links.
              At least one gateway must be enabled and set as default.
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

