// utils/settlementCalculator.js
const Settings = require('../models/Settings');

/**
 * Get settlement settings from database
 */
async function getSettlementSettings() {
    const settings = await Settings.getSettings();
    return settings.settlement || {
        settlementDays: 1,
        settlementHour: 16,
        settlementMinute: 0,
        cutoffHour: 16,
        cutoffMinute: 0,
        skipWeekends: true
    };
}

/**
 * Calculate expected settlement date with customizable settings
 * Settlement happens AFTER the configured settlement time on the settlement date
 */
async function calculateExpectedSettlementDate(paidAt) {
    const settlementSettings = await getSettlementSettings();
    const paymentDate = new Date(paidAt);
    const paymentHour = paymentDate.getHours();
    const paymentMinute = paymentDate.getMinutes();
    
    // Check if payment is after cutoff time
    const isAfterCutoff = paymentHour > settlementSettings.cutoffHour || 
                         (paymentHour === settlementSettings.cutoffHour && paymentMinute >= settlementSettings.cutoffMinute);
    
    // If payment is after cutoff time, consider it as next day
    const effectivePaymentDate = isAfterCutoff 
        ? new Date(paymentDate.getTime() + 24 * 60 * 60 * 1000) // Add 1 day
        : paymentDate;
    
    // Calculate T+N from effective payment date
    let settlementDate = new Date(effectivePaymentDate);
    settlementDate.setDate(settlementDate.getDate() + settlementSettings.settlementDays);
    
    // Handle weekends if enabled
    if (settlementSettings.skipWeekends) {
        const dayOfWeek = settlementDate.getDay();
        
        if (dayOfWeek === 0) { // Sunday -> Monday
            settlementDate.setDate(settlementDate.getDate() + 1);
        } else if (dayOfWeek === 6) { // Saturday -> Monday
            settlementDate.setDate(settlementDate.getDate() + 2);
        }
    }
    
    // Set settlement time to configured hour and minute
    settlementDate.setHours(settlementSettings.settlementHour, settlementSettings.settlementMinute, 0, 0);
    
    return settlementDate;
}

/**
 * Check if transaction is ready for settlement
 * Now checks if current time >= settlement date at configured time
 */
async function isReadyForSettlement(paidAt, expectedSettlementDate) {
    const settlementSettings = await getSettlementSettings();
    const now = new Date();
    const currentDay = now.getDay();
    
    // Don't settle on weekends if enabled
    if (settlementSettings.skipWeekends && (currentDay === 0 || currentDay === 6)) {
        return false;
    }
    
    const settlementTime = new Date(expectedSettlementDate);
    
    // Must be after configured settlement time on the settlement date
    // Ready if current time >= expected settlement time
    return now >= settlementTime;
}

/**
 * Get settlement status message for display
 */
async function getSettlementStatusMessage(paidAt, expectedSettlementDate) {
    const settlementSettings = await getSettlementSettings();
    const now = new Date();
    const paymentDate = new Date(paidAt);
    const paymentHour = paymentDate.getHours();
    const paymentMinute = paymentDate.getMinutes();
    const settlementDate = new Date(expectedSettlementDate);
    
    const isAfterCutoff = paymentHour > settlementSettings.cutoffHour || 
                          (paymentHour === settlementSettings.cutoffHour && paymentMinute >= settlementSettings.cutoffMinute);
    
    if (now >= settlementDate) {
        return 'Ready for settlement';
    }
    
    // Calculate days and hours until settlement
    const msUntilSettlement = settlementDate - now;
    const hoursUntil = Math.ceil(msUntilSettlement / (1000 * 60 * 60));
    const daysUntil = Math.ceil(msUntilSettlement / (1000 * 60 * 60 * 24));
    
    // Format settlement date and time nicely
    const settlementDateStr = settlementDate.toLocaleDateString('en-IN', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
    
    const settlementTimeStr = `${String(settlementSettings.settlementHour).padStart(2, '0')}:${String(settlementSettings.settlementMinute).padStart(2, '0')}`;
    
    if (hoursUntil < 24) {
        return `Settles today at ${settlementTimeStr}`;
    }
    
    const tPlusDays = settlementSettings.settlementDays + (isAfterCutoff ? 1 : 0);
    return `Settles on ${settlementDateStr} at ${settlementTimeStr} (T+${tPlusDays})`;
}

module.exports = {
    calculateExpectedSettlementDate,
    isReadyForSettlement,
    getSettlementStatusMessage,
    getSettlementSettings
};
