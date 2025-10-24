// ============ PAYIN COMMISSION CALCULATOR ============
function calculatePayinCommission(amount) {
    const baseRate = 3.8; // 3.8%
    const gstRate = 0; // 18% GST
    
    // Calculate base commission
    const baseCommission = (amount * baseRate) / 100;
    
    // Calculate GST on the commission
    const gstAmount = baseCommission * gstRate;
    
    // Total commission = base + GST
    const totalCommission = baseCommission + gstAmount;
    
    // Effective rate
    const effectiveRate = baseRate + (baseRate * gstRate); // 3.8% + (3.8% × 18%) = 4.484%
    
    return {
        commission: parseFloat(totalCommission.toFixed(2)),
        commissionRate: effectiveRate,
        isMinimumCharge: false,
        breakdown: {
            baseAmount: amount,
            baseRate: `${baseRate}%`,
            baseCommission: baseCommission.toFixed(2),
            gstRate: '0%',
            gstAmount: gstAmount.toFixed(2),
            effectiveRate: `${effectiveRate}%`,
            totalCommission: totalCommission.toFixed(2)
        }
    };
}

 
// ============ PAYOUT COMMISSION CALCULATOR ============
function calculatePayoutCommission(amount, merchant = {}) {
  // Rules implemented:
  // - amount >= 1000  -> 1.5% commission
  // - amount >= 500 && amount < 1000 -> flat ₹30
  // - amount < 500 -> flat ₹10
  // - if amount < 500 AND merchant.freePayoutsUnder500 <= 5 -> commission = 0 (free)
  // - GST removed entirely

  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount');
  }

  // Normalise merchant.freePayoutsUnder500 to a number if provided
  const freeCount = typeof merchant.freePayoutsUnder500 === 'number'
    ? merchant.freePayoutsUnder500
    : null;

  let commission = 0;
  let commissionType = 'none';
  let breakdown = { baseAmount: amount };

  // Small payouts: apply free rule first
  if (amount < 500) {
    if (freeCount !== null && freeCount <= 5) {
      commission = 0;
      commissionType = 'free';
      breakdown.note = 'Free payout (merchant eligible: freePayoutsUnder500 <= 5)';
    } else {
      commission = 10;
      commissionType = 'flat';
      breakdown.flatFee = '₹10';
      breakdown.totalCommission = parseFloat(commission.toFixed(2));
    }
  } else if (amount >= 500 && amount < 1000) {
    // Flat ₹30
    commission = 30;
    commissionType = 'flat';
    breakdown.flatFee = '₹30';
    breakdown.totalCommission = parseFloat(commission.toFixed(2));
  } else { // amount >= 1000
    // 1.5% percentage
    const ratePercent = 1.5;
    commission = (ratePercent / 100) * amount;
    commissionType = 'percentage';
    breakdown.baseRate = `${ratePercent}%`;
    breakdown.totalCommission = parseFloat(commission.toFixed(2));
  }

  const roundedCommission = parseFloat(commission.toFixed(2));
  const netAmount = parseFloat((amount - roundedCommission).toFixed(2));

  return {
    commission: roundedCommission,
    commissionType,
    breakdown,
    netAmount
  };
}


module.exports = {
    calculatePayinCommission,
    calculatePayoutCommission
};
