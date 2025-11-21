import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiSettings, FiRefreshCw, FiSave, FiClock } from 'react-icons/fi';
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
  const [roundRobinRotation, setRoundRobinRotation] = useState({
    currentActiveGateway: null,
    lastUsedGatewayIndex: null,
    enabledGateways: []
  });
  const intervalRef = useRef(null);

  // Memoized function to update only rotation data (lightweight)
  const updateRotationDataOnly = useCallback(async () => {
    try {
      const response = await superadminSettingsService.getPaymentGatewaySettings();
      if (response.success && response.round_robin_rotation) {
        setRoundRobinRotation(prev => {
          // Only update if values actually changed
          if (
            prev.currentActiveGateway !== response.round_robin_rotation.current_active_gateway ||
            prev.lastUsedGatewayIndex !== response.round_robin_rotation.last_used_gateway_index
          ) {
            return {
              ...prev,
              currentActiveGateway: response.round_robin_rotation.current_active_gateway || null,
              lastUsedGatewayIndex: response.round_robin_rotation.last_used_gateway_index ?? null,
              enabledGateways: response.round_robin_rotation.enabled_gateways || []
            };
          }
          return prev;
        });
      }
    } catch (err) {
      // Silently fail for rotation updates to avoid disrupting UI
      console.error('Rotation data update error:', err);
    }
  }, []);

  // Full settings fetch (for initial load and manual refresh)
  const fetchSettings = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    setError('');
    try {
      const response = await superadminSettingsService.getPaymentGatewaySettings();
      if (response.success) {
        // Update gateways only if they changed
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
        
        setGateways(prev => {
          // Only update if something changed
          const hasChanged = Object.keys(normalizedGateways).some(
            key => prev[key]?.enabled !== normalizedGateways[key].enabled
          );
          return hasChanged ? normalizedGateways : prev;
        });
        
        // Update round-robin rotation state
        if (response.round_robin_rotation) {
          setRoundRobinRotation({
            currentActiveGateway: response.round_robin_rotation.current_active_gateway || null,
            lastUsedGatewayIndex: response.round_robin_rotation.last_used_gateway_index ?? null,
            enabledGateways: response.round_robin_rotation.enabled_gateways || []
          });
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch settings');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Initial load
    fetchSettings(true);
    
    // Set up interval for lightweight rotation data updates (every 2 seconds)
    intervalRef.current = setInterval(() => {
      updateRotationDataOnly();
    }, 2000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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
      
      // Simple toggle
      updated[gatewayName] = {
        enabled: !currentGateway.enabled
      };
      
      console.log('✅ Toggled gateway:', gatewayName, 'to', updated[gatewayName].enabled);
      console.log('✅ Updated gateways after toggle:', JSON.stringify(updated, null, 2));
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

    try {
      const response = await superadminSettingsService.updatePaymentGatewaySettings(gateways);
      if (response.success) {
        setSuccess('Payment gateway settings updated successfully! Transaction-count-based rotation is active.');
        
        if (response.round_robin_rotation) {
          setRoundRobinRotation({
            currentActiveGateway: response.round_robin_rotation.current_active_gateway || null,
            lastUsedGatewayIndex: response.round_robin_rotation.last_used_gateway_index ?? null,
            enabledGateways: response.round_robin_rotation.enabled_gateways || []
          });
        }
        
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
            Enable or disable payment gateways. Round-robin rotation automatically alternates between enabled gateways (1st payment: first gateway, 2nd payment: second gateway, and so on).
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

        {/* Currently Active Gateway Status Card */}
        {roundRobinRotation.currentActiveGateway && gateways[roundRobinRotation.currentActiveGateway]?.enabled && (
          <div className="mb-6 p-6 bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-2 border-purple-500/50 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/30 rounded-lg">
                  <FiClock className="text-purple-300 text-2xl" />
                </div>
                <div>
                  <p className="text-purple-300 text-xs mb-1 font-medium uppercase tracking-wide">
                    Next Payment Will Use
                  </p>
                  <p className="text-white font-bold text-2xl">
                    {gatewayLabels[roundRobinRotation.currentActiveGateway] || roundRobinRotation.currentActiveGateway}
                  </p>
                  <p className="text-purple-300 text-xs mt-1">
                    Round-robin rotation: Gateways alternate with each payment request
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-purple-300 text-xs mb-2 font-medium uppercase tracking-wide">
                  Enabled Gateways
                </p>
                <p className="text-purple-400 font-mono font-bold text-2xl mb-1">
                  {roundRobinRotation.enabledGateways.length || Object.values(gateways).filter(g => g.enabled).length}
                </p>
                <div className="flex items-center gap-1 justify-end">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <p className="text-purple-300 text-xs">Active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Card */}
        <div className="bg-bg-secondary border border-white/10 rounded-xl p-6">
          {/* Round-Robin Rotation Info */}
          <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <FiRefreshCw className="text-purple-400" />
              <div>
                <p className="text-purple-400 text-sm font-medium mb-1">
                  Round-Robin Rotation (Always Active)
                </p>
                <p className="text-purple-300 text-xs">
                  Automatically alternates between enabled gateways with each payment request (1st: first gateway, 2nd: second gateway, 3rd: first gateway again, and so on)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(gateways).map(([key, gateway]) => {
              const isEnabled = gateway?.enabled === true;
              const isCurrentlyActive = roundRobinRotation.currentActiveGateway === key && isEnabled;
              
              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrentlyActive
                      ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                      : isEnabled
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-white/10 bg-white/5 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        {/* Toggle Switch */}
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
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
                          Active
                        </span>
                      )}
                      {isCurrentlyActive && (
                        <span className="text-xs px-3 py-1.5 bg-purple-500/40 text-purple-200 rounded-full font-bold flex items-center gap-1.5 border border-purple-400/50">
                          <div className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-pulse"></div>
                          NEXT
                        </span>
                      )}
                      {!isEnabled && (
                        <span className="text-xs px-2 py-1 bg-white/10 text-white/50 rounded">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2" style={{ position: 'relative', zIndex: 10 }}>
                      {isEnabled && (
                        <div className="text-right">
                          <span className="text-xs text-white/60 block">
                            Round-robin enabled
                          </span>
                          {isCurrentlyActive && (
                            <span className="text-xs text-purple-400 font-semibold block mt-0.5">
                              Next payment
                            </span>
                          )}
                        </div>
                      )}
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

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-sm">
              <strong>Round-Robin Rotation:</strong> All enabled gateways are active and participate in rotation.
              The system automatically alternates between enabled gateways with each payment request.
              For example: 1st payment uses Easebuzz, 2nd payment uses Paytm, 3rd payment uses Easebuzz again, and so on.
              At least one gateway must be enabled. The rotation starts automatically when the server starts.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => fetchSettings(true)}
              disabled={saving || loading}
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

