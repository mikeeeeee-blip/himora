import React, { useState, useEffect } from 'react';
import { FiSettings, FiSave, FiClock, FiInfo } from 'react-icons/fi';
import superadminSettingsService from '../../services/superadminSettingsService';

const SuperadminSettlementSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settlement, setSettlement] = useState({
    settlementDays: 1,
    settlementHour: 16,
    settlementMinute: 0,
    cutoffHour: 16,
    cutoffMinute: 0,
    skipWeekends: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await superadminSettingsService.getSettlementSettings();
      if (response.success && response.settlement) {
        setSettlement(response.settlement);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch settlement settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettlement(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate inputs
      if (settlement.settlementDays < 0 || settlement.settlementDays > 30) {
        throw new Error('Settlement days must be between 0 and 30');
      }
      if (settlement.settlementHour < 0 || settlement.settlementHour > 23) {
        throw new Error('Settlement hour must be between 0 and 23');
      }
      if (settlement.settlementMinute < 0 || settlement.settlementMinute > 59) {
        throw new Error('Settlement minute must be between 0 and 59');
      }
      if (settlement.cutoffHour < 0 || settlement.cutoffHour > 23) {
        throw new Error('Cutoff hour must be between 0 and 23');
      }
      if (settlement.cutoffMinute < 0 || settlement.cutoffMinute > 59) {
        throw new Error('Cutoff minute must be between 0 and 59');
      }

      const response = await superadminSettingsService.updateSettlementSettings(settlement);
      if (response.success) {
        setSuccess('Settlement settings updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to update settlement settings');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (hour, minute) => {
    const h = String(hour).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    return `${h}:${m}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-300">Loading settlement settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FiClock className="text-green-500 text-2xl" />
              <div>
                <h1 className="text-2xl font-bold text-white">Settlement Settings</h1>
                <p className="text-gray-400 text-sm mt-1">Configure settlement time and policies</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <FiSave className="text-lg" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-300 rounded-lg p-4 mb-6">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 space-y-6">
          {/* Settlement Days */}
          <div>
            <label className="block text-white font-medium mb-2">
              Settlement Days (T+N)
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={settlement.settlementDays}
              onChange={(e) => handleChange('settlementDays', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-gray-400 text-sm mt-1">
              Number of days after payment for settlement (T+1 = next day, T+2 = day after next, etc.)
            </p>
          </div>

          {/* Settlement Time */}
          <div>
            <label className="block text-white font-medium mb-2">
              Settlement Time
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Hour (0-23)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={settlement.settlementHour}
                  onChange={(e) => handleChange('settlementHour', parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Minute (0-59)</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={settlement.settlementMinute}
                  onChange={(e) => handleChange('settlementMinute', parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Current settlement time: <span className="text-green-400 font-medium">{formatTime(settlement.settlementHour, settlement.settlementMinute)}</span>
            </p>
          </div>

          {/* Cutoff Time */}
          <div>
            <label className="block text-white font-medium mb-2">
              Payment Cutoff Time
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Hour (0-23)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={settlement.cutoffHour}
                  onChange={(e) => handleChange('cutoffHour', parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Minute (0-59)</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={settlement.cutoffMinute}
                  onChange={(e) => handleChange('cutoffMinute', parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Payments made after <span className="text-green-400 font-medium">{formatTime(settlement.cutoffHour, settlement.cutoffMinute)}</span> will be considered as next day's payment
            </p>
          </div>

          {/* Skip Weekends */}
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settlement.skipWeekends}
                onChange={(e) => handleChange('skipWeekends', e.target.checked)}
                className="w-5 h-5 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
              />
              <span className="text-white font-medium">Skip Weekends</span>
            </label>
            <p className="text-gray-400 text-sm mt-1 ml-8">
              If enabled, settlements scheduled for Saturday or Sunday will be moved to Monday
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mt-6">
            <div className="flex items-start space-x-3">
              <FiInfo className="text-blue-400 text-xl mt-0.5 flex-shrink-0" />
              <div className="text-blue-300 text-sm">
                <p className="font-medium mb-2">How Settlement Works:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-200/80">
                  <li>Payments made before the cutoff time settle on T+{settlement.settlementDays} at {formatTime(settlement.settlementHour, settlement.settlementMinute)}</li>
                  <li>Payments made after the cutoff time settle on T+{settlement.settlementDays + 1} at {formatTime(settlement.settlementHour, settlement.settlementMinute)}</li>
                  {settlement.skipWeekends && (
                    <li>Weekend settlements are automatically moved to the next Monday</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperadminSettlementSettings;

