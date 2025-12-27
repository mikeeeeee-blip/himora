// utils/settlementCalculator.js
const Settings = require('../models/Settings');

/**
 * Get settlement settings from database
 */
async function getSettlementSettings() {
    const settings = await Settings.getSettings();
    return settings.settlement || {
        settlementDays: 1,
        settlementMinutes: 20,
        settlementHour: 16,
        settlementMinute: 0,
        cutoffHour: 16,
        cutoffMinute: 0,
        skipWeekends: false
    };
}

/**
 * Calculate expected settlement date with customizable settings
 * NEW: Uses time-based settlement (minutes after payment) instead of T+N days
 */
async function calculateExpectedSettlementDate(paidAt) {
    const settlementSettings = await getSettlementSettings();
    const paymentDate = new Date(paidAt);
    
    // Use time-based settlement (minutes after payment) if settlementMinutes is set
    if (settlementSettings.settlementMinutes !== undefined && settlementSettings.settlementMinutes !== null) {
        const settlementMinutes = settlementSettings.settlementMinutes || 20; // Default to 20 minutes
        const settlementDate = new Date(paymentDate.getTime() + (settlementMinutes * 60 * 1000));
        return settlementDate;
    }
    
    // Legacy T+N days logic (for backward compatibility)
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
    settlementDate.setDate(settlementDate.getDate() + (settlementSettings.settlementDays || 1));
    
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
    settlementDate.setHours(settlementSettings.settlementHour || 16, settlementSettings.settlementMinute || 0, 0, 0);
    
    return settlementDate;
}

/**
 * Check if transaction is ready for settlement
 * NEW: Uses time-based check (minutes after payment) instead of date-based
 */
async function isReadyForSettlement(paidAt, expectedSettlementDate) {
    const settlementSettings = await getSettlementSettings();
    const now = new Date();
    
    // If using time-based settlement (settlementMinutes), check if enough time has passed
    if (settlementSettings.settlementMinutes !== undefined && settlementSettings.settlementMinutes !== null) {
        const paymentDate = new Date(paidAt);
        const timeSincePayment = now.getTime() - paymentDate.getTime();
        const minutesSincePayment = timeSincePayment / (1000 * 60);
        const settlementMinutes = settlementSettings.settlementMinutes || 25;
        
        // Ready if enough minutes have passed since payment
        return minutesSincePayment >= settlementMinutes;
    }
    
    // Legacy date-based logic (for backward compatibility)
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
    const settlementDate = new Date(expectedSettlementDate);
    
    if (now >= settlementDate) {
        return 'Ready for settlement';
    }
    
    // If using time-based settlement (settlementMinutes), show minutes remaining
    if (settlementSettings.settlementMinutes !== undefined && settlementSettings.settlementMinutes !== null) {
        const paymentDate = new Date(paidAt);
        const timeSincePayment = now.getTime() - paymentDate.getTime();
        const minutesSincePayment = timeSincePayment / (1000 * 60);
        const settlementMinutes = settlementSettings.settlementMinutes || 20;
        const minutesRemaining = Math.max(0, settlementMinutes - minutesSincePayment);
        
        if (minutesRemaining <= 0) {
            return 'Ready for settlement';
        } else if (minutesRemaining < 60) {
            return `Settles in ${Math.ceil(minutesRemaining)} minute${Math.ceil(minutesRemaining) > 1 ? 's' : ''}`;
        } else {
            const hoursRemaining = Math.floor(minutesRemaining / 60);
            const minsRemaining = Math.ceil(minutesRemaining % 60);
            return `Settles in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} ${minsRemaining > 0 ? `and ${minsRemaining} minute${minsRemaining > 1 ? 's' : ''}` : ''}`;
        }
    }
    
    // Legacy date-based logic
    const paymentDate = new Date(paidAt);
    const paymentHour = paymentDate.getHours();
    const paymentMinute = paymentDate.getMinutes();
    
    const isAfterCutoff = paymentHour > settlementSettings.cutoffHour || 
                          (paymentHour === settlementSettings.cutoffHour && paymentMinute >= settlementSettings.cutoffMinute);
    
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
