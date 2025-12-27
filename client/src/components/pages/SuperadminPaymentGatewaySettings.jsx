import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiSettings, FiRefreshCw, FiSave, FiClock, FiPlay } from 'react-icons/fi';
import superadminSettingsService from '../../services/superadminSettingsService';
import superadminPaymentService from '../../services/superadminPaymentService';

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
    enabled: true,
    currentActiveGateway: null,
    lastUsedGatewayIndex: null,
    enabledGateways: [],
    customCounts: {},
    currentRotationState: {
      currentGateway: null,
      countUsed: 0,
      rotationCycle: 0
    }
  });
  const [customCounts, setCustomCounts] = useState({});
  const [settlementSettings, setSettlementSettings] = useState({
    settlementIntervalMinutes: 15, // Job run interval
    settlementMinutes: 20 // Minutes after payment to settle
  });
  const [settlementRunning, setSettlementRunning] = useState(false);
  const [settlementResult, setSettlementResult] = useState(null);
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
            prev.lastUsedGatewayIndex !== response.round_robin_rotation.last_used_gateway_index ||
            prev.enabled !== (response.round_robin_rotation.enabled !== false)
          ) {
            return {
              ...prev,
              enabled: response.round_robin_rotation.enabled !== false,
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
            enabled: response.round_robin_rotation.enabled !== false,
            currentActiveGateway: response.round_robin_rotation.current_active_gateway || null,
            lastUsedGatewayIndex: response.round_robin_rotation.last_used_gateway_index ?? null,
            enabledGateways: response.round_robin_rotation.enabled_gateways || [],
            customCounts: response.round_robin_rotation.custom_counts || {},
            currentRotationState: response.round_robin_rotation.current_rotation_state || {
              currentGateway: null,
              countUsed: 0,
              rotationCycle: 0
            }
          });
          
          // Set custom counts state (ensure it's an object)
          if (response.round_robin_rotation.custom_counts && typeof response.round_robin_rotation.custom_counts === 'object') {
            // Filter out any invalid values
            const validCounts = {};
            Object.entries(response.round_robin_rotation.custom_counts).forEach(([key, value]) => {
              const numValue = parseInt(value);
              if (!isNaN(numValue) && numValue > 0) {
                validCounts[key] = numValue;
              }
            });
            setCustomCounts(validCounts);
          } else {
            setCustomCounts({});
          }
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

  // Fetch settlement settings
  const fetchSettlementSettings = useCallback(async () => {
    try {
      const response = await superadminSettingsService.getSettlementSettings();
      if (response.success && response.settlement) {
        // Extract minutes from cron expression (e.g., "*/15 * * * 1-6" -> 15)
        const cronSchedule = response.settlement.cronSchedule || '*/15 * * * 1-6';
        const minutesMatch = cronSchedule.match(/^\*\/(\d+)/);
        const intervalMinutes = minutesMatch ? parseInt(minutesMatch[1]) : 15;
        
        // Get settlement minutes (time after payment to settle)
        const settlementMinutes = response.settlement.settlementMinutes || 20;
        
        setSettlementSettings({
          settlementIntervalMinutes: intervalMinutes,
          settlementMinutes: settlementMinutes
        });
      }
    } catch (err) {
      console.error('Error fetching settlement settings:', err);
    }
  }, []);

  useEffect(() => {
    // Initial load
    fetchSettings(true);
    fetchSettlementSettings();
    
    // Set up interval for lightweight rotation data updates (every 2 seconds)
    intervalRef.current = setInterval(() => {
      updateRotationDataOnly();
    }, 2000);
    
    // Update next settlement time every minute
    const settlementInterval = setInterval(() => {
      fetchSettlementSettings();
    }, 60000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (settlementInterval) {
        clearInterval(settlementInterval);
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
      const wasEnabled = currentGateway.enabled;
      console.log('Current gateway state before toggle:', gatewayName, currentGateway);
      
      // Simple toggle
      updated[gatewayName] = {
        enabled: !currentGateway.enabled
      };
      
      // If gateway is being disabled, clear its custom count
      if (wasEnabled && !updated[gatewayName].enabled) {
        setCustomCounts(prev => {
          const updated = { ...prev };
          delete updated[gatewayName];
          return updated;
        });
      }
      
      console.log('✅ Toggled gateway:', gatewayName, 'to', updated[gatewayName].enabled);
      console.log('✅ Updated gateways after toggle:', JSON.stringify(updated, null, 2));
      return updated;
    });
  };

  const handleCustomCountChange = (gatewayName, value) => {
    // Allow empty string for clearing, or valid numbers
    if (value === '' || value === null || value === undefined) {
      setCustomCounts(prev => {
        const updated = { ...prev };
        delete updated[gatewayName];
        return updated;
      });
      return;
    }
    
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      setCustomCounts(prev => ({
        ...prev,
        [gatewayName]: numValue
      }));
    } else if (numValue === 0 || isNaN(numValue)) {
      // Remove invalid values
      setCustomCounts(prev => {
        const updated = { ...prev };
        delete updated[gatewayName];
        return updated;
      });
    }
  };

  const handleManualSettlement = async () => {
    if (!window.confirm('Are you sure you want to run manual settlement? This will process all eligible transactions.')) {
      return;
    }

    setSettlementRunning(true);
    setSettlementResult(null);
    setError('');
    setSuccess('');

    try {
      const result = await superadminPaymentService.triggerManualSettlement();
      if (result && result.success) {
        setSettlementResult({
          success: true,
          settledCount: result.result?.settledCount || 0,
          notReadyCount: result.result?.notReadyCount || 0,
          errorCount: result.result?.errorCount || 0
        });
        setSuccess(`✅ Manual settlement completed! ${result.result?.settledCount || 0} transactions settled.`);
        setTimeout(() => {
          setSuccess('');
          setSettlementResult(null);
        }, 10000);
      } else {
        setError(result?.error || 'Failed to run manual settlement');
      }
    } catch (err) {
      console.error('Manual settlement error:', err);
      setError(err.message || 'Failed to run manual settlement');
    } finally {
      setSettlementRunning(false);
    }
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

    // Validate custom counts: if any count is set, all enabled gateways should have counts
    const enabledGateways = Object.keys(gateways).filter(key => gateways[key].enabled);
    const hasCustomCounts = Object.keys(customCounts).length > 0 && Object.values(customCounts).some(count => count > 0);
    
    if (hasCustomCounts && roundRobinRotation.enabled) {
      // Check if all enabled gateways have valid counts
      const missingCounts = enabledGateways.filter(gw => {
        const count = customCounts[gw];
        return !count || count <= 0 || isNaN(count);
      });
      
      if (missingCounts.length > 0) {
        setError(`Custom rotation requires counts for all enabled gateways. Missing or invalid counts for: ${missingCounts.map(g => gatewayLabels[g]).join(', ')}`);
        setSaving(false);
        return;
      }
      
      // Validate all counts are positive integers
      const invalidCounts = Object.entries(customCounts).filter(([gw, count]) => {
        return enabledGateways.includes(gw) && (isNaN(count) || count <= 0 || !Number.isInteger(count));
      });
      
      if (invalidCounts.length > 0) {
        setError(`Invalid counts detected. All counts must be positive integers (1-100).`);
        setSaving(false);
        return;
      }
    }

    try {
      // Update payment gateway settings
      const response = await superadminSettingsService.updatePaymentGatewaySettings(
        gateways,
        roundRobinRotation.enabled,
        hasCustomCounts ? customCounts : {}
      );
      
      // Update settlement settings - convert minutes to cron expression
      try {
        const cronSchedule = `*/${settlementSettings.settlementIntervalMinutes} * * * 1-6`;
        await superadminSettingsService.updateSettlementSettings({
          cronSchedule: cronSchedule,
          settlementMinutes: settlementSettings.settlementMinutes || 20
        });
        // Refresh settlement settings to get updated next settlement time
        await fetchSettlementSettings();
      } catch (settlementErr) {
        console.error('Error updating settlement settings:', settlementErr);
        // Don't fail the whole operation if settlement update fails
        setError(`Payment gateway settings saved, but settlement settings update failed: ${settlementErr.message}`);
      }
      
      if (response.success) {
        const rotationMode = response.rotation_mode || 'round-robin';
        setSuccess(`Settings updated successfully! Rotation mode: ${rotationMode}. Settlement job schedule updated.`);
        
        if (response.round_robin_rotation) {
          setRoundRobinRotation({
            enabled: response.round_robin_rotation.enabled !== false,
            currentActiveGateway: response.round_robin_rotation.current_active_gateway || null,
            lastUsedGatewayIndex: response.round_robin_rotation.last_used_gateway_index ?? null,
            enabledGateways: response.round_robin_rotation.enabled_gateways || [],
            customCounts: response.round_robin_rotation.custom_counts || {},
            currentRotationState: response.round_robin_rotation.current_rotation_state || {
              currentGateway: null,
              countUsed: 0,
              rotationCycle: 0
            }
          });
          
          if (response.round_robin_rotation.custom_counts) {
            setCustomCounts(response.round_robin_rotation.custom_counts);
          }
        }
        
        setTimeout(() => setSuccess(''), 5000);
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
        {roundRobinRotation.currentActiveGateway && gateways[roundRobinRotation.currentActiveGateway]?.enabled && roundRobinRotation.enabled && (
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
                    {Object.values(customCounts).some(c => c > 0) 
                      ? `Custom rotation: ${roundRobinRotation.currentRotationState?.countUsed || 0}/${customCounts[roundRobinRotation.currentActiveGateway] || 1} (Cycle #${roundRobinRotation.currentRotationState?.rotationCycle || 0})`
                      : 'Round-robin rotation: Gateways alternate with each payment request'}
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
          {/* Round-Robin Rotation Toggle */}
          <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiRefreshCw className="text-purple-400" />
                <div>
                  <p className="text-purple-400 text-sm font-medium mb-1">
                    Round-Robin Rotation
                  </p>
                  <p className="text-purple-300 text-xs">
                    {roundRobinRotation.enabled 
                      ? 'Automatically rotates between enabled gateways with each payment request'
                      : 'Rotation is disabled. First enabled gateway will be used for all payments.'}
                  </p>
                </div>
              </div>
              <div
                onClick={() => setRoundRobinRotation(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                  roundRobinRotation.enabled ? 'bg-purple-500' : 'bg-white/20'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setRoundRobinRotation(prev => ({ ...prev, enabled: !prev.enabled }));
                  }
                }}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-200 ${
                    roundRobinRotation.enabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Custom Rotation Counts (only show if round-robin is enabled) */}
          {roundRobinRotation.enabled && Object.values(gateways).some(g => g.enabled) && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-blue-400 text-sm font-medium">
                  Custom Rotation Counts (Optional)
                </p>
                {Object.keys(customCounts).length > 0 && (
                  <span className="text-xs px-2 py-1 bg-blue-500/30 text-blue-200 rounded">
                    {Object.keys(customCounts).length} gateway(s) configured
                  </span>
                )}
              </div>
              <p className="text-blue-300 text-xs mb-4">
                Set how many times each gateway should be used before switching to the next one. 
                <strong> Leave empty for default (1:1 alternation).</strong> Example: Paytm: 3, Easebuzz: 2 means 3 Paytm links, then 2 Easebuzz links, then repeat the cycle.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(gateways)
                  .filter(([_, gateway]) => gateway.enabled)
                  .map(([key, _]) => {
                    const currentCount = customCounts[key];
                    const hasCustomCount = currentCount !== undefined && currentCount > 0;
                    
                    return (
                      <div key={key} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                        <label className="text-white text-sm font-medium w-28 flex-shrink-0">
                          {gatewayLabels[key]}:
                        </label>
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            value={currentCount !== undefined ? currentCount : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleCustomCountChange(key, val);
                            }}
                            onBlur={(e) => {
                              // Ensure value is valid on blur
                              const val = e.target.value;
                              if (val) {
                                const numVal = parseInt(val);
                                if (isNaN(numVal) || numVal < 1 || numVal > 100) {
                                  setError(`Count must be between 1 and 100 for ${gatewayLabels[key]}`);
                                  setTimeout(() => setError(''), 3000);
                                  // Reset to empty if invalid
                                  handleCustomCountChange(key, '');
                                }
                              }
                            }}
                            placeholder="Default: 1"
                            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                          />
                          <span className="text-white/60 text-xs w-12">times</span>
                          {hasCustomCount && (
                            <span className="text-xs px-2 py-1 bg-blue-500/30 text-blue-200 rounded">
                              Set
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
              {Object.keys(customCounts).length > 0 && Object.values(customCounts).some(count => count > 0) && (
                <div className="mt-4 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <p className="text-blue-300 text-xs font-medium mb-2">
                    <strong>Custom Rotation Active:</strong>
                  </p>
                  <div className="text-blue-200 text-xs space-y-1">
                    {Object.entries(customCounts)
                      .filter(([_, count]) => count > 0)
                      .map(([gw, count]) => (
                        <div key={gw} className="flex items-center gap-2">
                          <span className="font-mono">•</span>
                          <span>{gatewayLabels[gw]}: {count} time{count > 1 ? 's' : ''}</span>
                        </div>
                      ))}
                  </div>
                  {roundRobinRotation.currentRotationState?.currentGateway && (
                    <div className="mt-2 pt-2 border-t border-blue-500/30 text-blue-300 text-xs">
                      <strong>Current Cycle:</strong> {gatewayLabels[roundRobinRotation.currentRotationState.currentGateway]} 
                      {' '}({roundRobinRotation.currentRotationState.countUsed}/{customCounts[roundRobinRotation.currentRotationState.currentGateway] || 1}) 
                      | Cycle #{roundRobinRotation.currentRotationState.rotationCycle || 0}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
                            {roundRobinRotation.enabled ? 'Round-robin enabled' : 'Rotation disabled'}
                          </span>
                          {isCurrentlyActive && roundRobinRotation.enabled && (
                            <span className="text-xs text-purple-400 font-semibold block mt-0.5">
                              Next payment
                            </span>
                          )}
                          {customCounts[key] && customCounts[key] > 0 && roundRobinRotation.enabled && (
                            <span className="text-xs text-blue-400 font-semibold block mt-0.5">
                              Custom: {customCounts[key]}x
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

          {/* Settlement Settings Section */}
          <div className="mt-8 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FiClock className="text-accent text-xl" />
                <h2 className="text-xl font-bold text-white font-['Albert_Sans']">Settlement Job Schedule</h2>
              </div>
              <button
                onClick={handleManualSettlement}
                disabled={settlementRunning}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlay className={settlementRunning ? 'animate-spin' : ''} />
                {settlementRunning ? 'Running...' : 'Run Settlement Now'}
              </button>
            </div>
            <p className="text-white/70 text-sm mb-4 font-['Albert_Sans']">
              Configure how often the automatic settlement job runs to process paid transactions. Runs Monday to Saturday.
            </p>

            {/* Settlement Result */}
            {settlementResult && (
              <div className={`mb-4 p-4 rounded-lg border ${
                settlementResult.success 
                  ? 'bg-green-500/20 border-green-500/50' 
                  : 'bg-red-500/20 border-red-500/50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`font-medium mb-2 ${
                      settlementResult.success ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {settlementResult.success ? '✅ Settlement Completed' : '❌ Settlement Failed'}
                    </p>
                    {settlementResult.success && (
                      <div className="text-sm space-y-2">
                        <div className="flex items-center gap-4">
                          <p className="text-green-300">
                            <strong>{settlementResult.settledCount}</strong> transaction{settlementResult.settledCount !== 1 ? 's' : ''} settled
                          </p>
                          {settlementResult.notReadyCount > 0 && (
                            <p className="text-yellow-300">
                              <strong>{settlementResult.notReadyCount}</strong> transaction{settlementResult.notReadyCount !== 1 ? 's' : ''} not ready yet
                            </p>
                          )}
                          {settlementResult.errorCount > 0 && (
                            <p className="text-red-300">
                              <strong>{settlementResult.errorCount}</strong> error{settlementResult.errorCount !== 1 ? 's' : ''} encountered
                            </p>
                          )}
                        </div>
                        {settlementResult.notReadyCount > 0 && settlementResult.nextSettlementInfo && (
                          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-blue-300 text-xs font-medium mb-1">Next Settlement Information:</p>
                            <div className="text-blue-200 text-xs space-y-1">
                              {settlementResult.nextSettlementInfo.daysUntil > 0 ? (
                                <p>Next transaction will settle in <strong>{settlementResult.nextSettlementInfo.daysUntil} day{settlementResult.nextSettlementInfo.daysUntil > 1 ? 's' : ''}</strong></p>
                              ) : settlementResult.nextSettlementInfo.hoursUntil > 0 ? (
                                <p>Next transaction will settle in <strong>{settlementResult.nextSettlementInfo.hoursUntil} hour{settlementResult.nextSettlementInfo.hoursUntil > 1 ? 's' : ''}</strong></p>
                              ) : (
                                <p>Next transaction will settle very soon</p>
                              )}
                              <p className="text-blue-300/70">
                                Expected settlement date: {new Date(settlementResult.nextSettlementInfo.nextSettlementDate).toLocaleString('en-IN', { 
                                  timeZone: 'Asia/Kolkata',
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                })}
                              </p>
                            </div>
                          </div>
                        )}
                        {settlementResult.notReadyCount > 0 && !settlementResult.nextSettlementInfo && (
                          <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
                            <p className="text-yellow-300 text-xs">
                              Transactions are waiting for their expected settlement time to be reached. 
                              Settlement happens automatically when the configured settlement time (T+N days) is reached.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Settlement Time After Payment */}
              <div>
                <label className="block text-white font-medium mb-2 font-['Albert_Sans']">
                  Settlement Time After Payment (Minutes)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={settlementSettings.settlementMinutes}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 20;
                      if (value >= 1 && value <= 1440) {
                        setSettlementSettings(prev => ({ ...prev, settlementMinutes: value }));
                      }
                    }}
                    className="w-32 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
                  />
                  <span className="text-white/70 text-sm">minutes</span>
                </div>
                <p className="text-white/60 text-xs mt-2">
                  Transactions will be settled <strong className="text-white">{settlementSettings.settlementMinutes}</strong> minutes after payment is received.
                  <br />
                  <span className="text-white/50">Example: 25 = settle 25 minutes after payment, 60 = settle 1 hour after payment</span>
                </p>
              </div>

              {/* Settlement Job Interval */}
              <div>
                <label className="block text-white font-medium mb-2 font-['Albert_Sans']">
                  Settlement Job Run Interval (Minutes)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={settlementSettings.settlementIntervalMinutes}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      if (value >= 1 && value <= 1440) {
                        setSettlementSettings(prev => ({ ...prev, settlementIntervalMinutes: value }));
                      }
                    }}
                    className="w-32 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
                  />
                  <span className="text-white/70 text-sm">minutes</span>
                </div>
                <p className="text-white/60 text-xs mt-2">
                  The settlement job will check for ready transactions every <strong className="text-white">{settlementSettings.settlementIntervalMinutes}</strong> minutes, Monday to Saturday.
                  <br />
                  <span className="text-white/50">Example: 15 = check every 15 minutes, 60 = check every hour</span>
                </p>
              </div>

            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-sm">
              <strong>Rotation Modes:</strong>
            </p>
            <ul className="text-blue-300 text-xs mt-2 space-y-1 list-disc list-inside">
              <li><strong>Round-Robin Disabled:</strong> First enabled gateway is used for all payments.</li>
              <li><strong>Round-Robin Enabled (Default):</strong> Gateways alternate 1:1 (Easebuzz → Paytm → Easebuzz → Paytm...)</li>
              <li><strong>Custom Rotation:</strong> Set custom counts (e.g., Paytm: 3, Easebuzz: 2) to use Paytm 3 times, then Easebuzz 2 times, then repeat the cycle.</li>
              <li>At least one gateway must be enabled. Custom counts require values for all enabled gateways.</li>
            </ul>
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

