import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import paymentService from '@/services/paymentService';
import { Colors } from '@/constants/theme';

interface BeneficiaryDetails {
  upiId?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  bankName?: string;
  branchName?: string;
  walletAddress?: string;
  networkName?: string;
  currencyName?: string;
}

interface PayoutRequestData {
  amount: string;
  transferMode: 'upi' | 'bank' | 'crypto';
  beneficiaryDetails: BeneficiaryDetails;
  notes: string;
}

const FEE_FLAT_500_1000 = 35.40;
const FEE_PERCENT_ABOVE_1000 = 0.0177; // 1.77%
const SMALL_TXN_EXTRA_CHARGE = 10;

const computePayoutCharge = (amount: number, freePayoutsRemaining: number) => {
  const a = Number(amount) || 0;
  let commission = 0;
  let note = '';
  let warning = '';

  if (freePayoutsRemaining === 0) {
    if (a < 500) {
      commission = SMALL_TXN_EXTRA_CHARGE;
      note = `Since free payouts are exhausted, ₹${SMALL_TXN_EXTRA_CHARGE} will be charged for amounts below ₹500.`;
    } else if (a >= 500 && a <= 1000) {
      commission = FEE_FLAT_500_1000;
      note = `Flat fee of ₹${FEE_FLAT_500_1000.toFixed(2)} applies for amounts between ₹500 and ₹1000.`;
    } else if (a > 1000) {
      commission = parseFloat((a * FEE_PERCENT_ABOVE_1000).toFixed(2));
      note = `Fee of 1.77% applies for amounts above ₹1000 (₹${commission.toFixed(2)}).`;
    }
  } else {
    if (a >= 500 && a <= 1000) {
      commission = FEE_FLAT_500_1000;
      note = `Flat fee of ₹${FEE_FLAT_500_1000.toFixed(2)} applies for amounts between ₹500 and ₹1000.`;
    } else if (a > 1000) {
      commission = parseFloat((a * FEE_PERCENT_ABOVE_1000).toFixed(2));
      note = `Fee of 1.77% applies for amounts above ₹1000 (₹${commission.toFixed(2)}).`;
    }
  }

  const grossAmount = a;
  const netAmount = parseFloat((grossAmount - commission).toFixed(2));

  if (a === 500) {
    warning = `Payout will be created for ₹${(a + FEE_FLAT_500_1000).toFixed(2)} (₹${a} + ₹${FEE_FLAT_500_1000.toFixed(2)} fee).`;
  } else if (a < 500 && freePayoutsRemaining === 0) {
    warning = `Payout will be created for ₹${(a + SMALL_TXN_EXTRA_CHARGE).toFixed(2)} (₹${a} + ₹${SMALL_TXN_EXTRA_CHARGE} fee).`;
  } else if (a > 1000) {
    warning = `Payout will be created for ₹${(a + commission).toFixed(2)} (₹${a} + ₹${commission.toFixed(2)} fee).`;
  } else if (commission > 0) {
    warning = `Payout will be created for ₹${(a + commission).toFixed(2)} (₹${a} + ₹${commission.toFixed(2)} fee).`;
  }

  return {
    grossAmount,
    commission,
    netAmount,
    note,
    warning,
  };
};

export default function PayoutRequestScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState<any>(null);
  const [eligibility, setEligibility] = useState({
    can_request_payout: false,
    minimum_payout_amount: 0,
    maximum_payout_amount: 0,
  });
  const [feePreview, setFeePreview] = useState({
    grossAmount: 0,
    commission: 0,
    netAmount: 0,
    note: '',
    warning: '',
  });

  const [formData, setFormData] = useState<PayoutRequestData>({
    amount: '',
    transferMode: 'upi',
    beneficiaryDetails: {
      upiId: '',
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      bankName: '',
      branchName: '',
      walletAddress: '',
      networkName: '',
      currencyName: '',
    },
    notes: '',
  });

  useEffect(() => {
    loadEligibility();
  }, []);

  useEffect(() => {
    if (formData.amount) {
      const amount = parseFloat(formData.amount);
      if (!isNaN(amount) && amount > 0) {
        const freeLeft = balance?.merchant?.freePayoutsRemaining ?? 0;
        const preview = computePayoutCharge(amount, freeLeft);
        setFeePreview(preview);
      } else {
        setFeePreview({
          grossAmount: 0,
          commission: 0,
          netAmount: 0,
          note: '',
          warning: '',
        });
      }
    }
  }, [formData.amount, balance]);

  const loadEligibility = async () => {
    try {
      setLoading(true);
      const bal = await paymentService.getBalance();
      setBalance(bal);
      const pe = bal.payout_eligibility || bal.payoutEligibility || {};
      setEligibility({
        can_request_payout: pe.can_request_payout ?? false,
        minimum_payout_amount: pe.minimum_payout_amount ?? 0,
        maximum_payout_amount: pe.maximum_payout_amount ?? 0,
      });
    } catch (error: any) {
      console.error('Error loading eligibility:', error);
      Alert.alert('Error', error.message || 'Failed to load payout eligibility');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof PayoutRequestData],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${parseFloat(String(amount || 0)).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const validateForm = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid payout amount.');
      return false;
    }

    const payoutAmount = parseFloat(formData.amount);
    const availableBalance = balance?.balance?.available_balance || 0;
    const totalRequired = payoutAmount + feePreview.commission;

    if (totalRequired > availableBalance) {
      Alert.alert(
        'Insufficient Balance',
        `The requested amount (${formatCurrency(totalRequired)}) exceeds your available balance (${formatCurrency(availableBalance)}).`
      );
      return false;
    }

    if (formData.transferMode === 'upi') {
      if (!formData.beneficiaryDetails.upiId) {
        Alert.alert('Validation Error', 'Please enter UPI ID.');
        return false;
      }
    } else if (formData.transferMode === 'bank') {
      if (!formData.beneficiaryDetails.accountNumber) {
        Alert.alert('Validation Error', 'Please enter account number.');
        return false;
      }
      if (!formData.beneficiaryDetails.ifscCode) {
        Alert.alert('Validation Error', 'Please enter IFSC code.');
        return false;
      }
      if (!formData.beneficiaryDetails.accountHolderName) {
        Alert.alert('Validation Error', 'Please enter account holder name.');
        return false;
      }
    } else if (formData.transferMode === 'crypto') {
      if (!formData.beneficiaryDetails.walletAddress) {
        Alert.alert('Validation Error', 'Please enter wallet address.');
        return false;
      }
      if (!formData.beneficiaryDetails.networkName) {
        Alert.alert('Validation Error', 'Please enter network name.');
        return false;
      }
      if (!formData.beneficiaryDetails.currencyName) {
        Alert.alert('Validation Error', 'Please enter currency name.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!eligibility.can_request_payout) {
      Alert.alert(
        'Not Eligible',
        'You are not eligible to request a payout at this time. Wait for settlement to complete.'
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    const payoutAmount = parseFloat(formData.amount);
    const freeLeft = balance?.merchant?.freePayoutsRemaining ?? 0;
    const { commission, warning } = computePayoutCharge(payoutAmount, freeLeft);

    if (warning) {
      Alert.alert(
        'Payout Fee Notice',
        warning + '\n\nProceed with payout request?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed',
            onPress: async () => {
              await submitPayout();
            },
          },
        ]
      );
    } else {
      await submitPayout();
    }
  };

  const submitPayout = async () => {
    try {
      setSubmitting(true);

      const payoutAmount = parseFloat(formData.amount);
      let beneficiaryDetails: BeneficiaryDetails = {};

      if (formData.transferMode === 'upi') {
        beneficiaryDetails = {
          upiId: formData.beneficiaryDetails.upiId,
        };
      } else if (formData.transferMode === 'crypto') {
        beneficiaryDetails = {
          walletAddress: formData.beneficiaryDetails.walletAddress,
          networkName: formData.beneficiaryDetails.networkName,
          currencyName: formData.beneficiaryDetails.currencyName,
        };
      } else {
        beneficiaryDetails = {
          accountNumber: formData.beneficiaryDetails.accountNumber,
          ifscCode: formData.beneficiaryDetails.ifscCode,
          accountHolderName: formData.beneficiaryDetails.accountHolderName,
          bankName: formData.beneficiaryDetails.bankName,
          branchName: formData.beneficiaryDetails.branchName,
        };
      }

      const payoutData = {
        amount: payoutAmount,
        transferMode: formData.transferMode,
        beneficiaryDetails,
        notes: formData.notes,
      };

      await paymentService.requestPayout(payoutData);
      Alert.alert('Success', 'Payout request submitted successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error submitting payout:', error);
      Alert.alert('Error', error.message || 'Failed to submit payout request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Payout</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Payout</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Eligibility Warning */}
          {!eligibility.can_request_payout && (
            <View style={styles.warningCard}>
              <Ionicons name="alert-circle" size={24} color={Colors.warning} />
              <Text style={styles.warningText}>
                You are not eligible to request a payout at this time. Wait for settlement to complete.
              </Text>
            </View>
          )}

          {/* Balance Info */}
          {balance && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Available Balance</Text>
              <Text style={styles.infoValue}>
                {formatCurrency(balance.balance?.available_balance || 0)}
              </Text>
              {balance.merchant?.freePayoutsRemaining !== undefined && (
                <Text style={styles.infoSubtext}>
                  Free payouts remaining: {balance.merchant.freePayoutsRemaining}
                </Text>
              )}
            </View>
          )}

          {/* Amount Input */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Payout Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount (₹)"
              placeholderTextColor={Colors.textSubtleLight}
              value={formData.amount}
              onChangeText={(value) => handleInputChange('amount', value.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              editable={eligibility.can_request_payout}
            />
            {eligibility.minimum_payout_amount > 0 && (
              <Text style={styles.hintText}>
                Minimum: {formatCurrency(eligibility.minimum_payout_amount)}
              </Text>
            )}
            {eligibility.maximum_payout_amount > 0 && (
              <Text style={styles.hintText}>
                Maximum: {formatCurrency(eligibility.maximum_payout_amount)}
              </Text>
            )}
          </View>

          {/* Fee Preview */}
          {formData.amount && parseFloat(formData.amount) > 0 && (
            <View style={styles.feeCard}>
              <Text style={styles.feeTitle}>Fee Breakdown</Text>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Gross Amount:</Text>
                <Text style={styles.feeValue}>{formatCurrency(feePreview.grossAmount)}</Text>
              </View>
              {feePreview.commission > 0 && (
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Commission:</Text>
                  <Text style={styles.feeValue}>- {formatCurrency(feePreview.commission)}</Text>
                </View>
              )}
              <View style={[styles.feeRow, styles.feeRowTotal]}>
                <Text style={styles.feeLabelTotal}>Net Amount:</Text>
                <Text style={styles.feeValueTotal}>{formatCurrency(feePreview.netAmount)}</Text>
              </View>
              {feePreview.note && (
                <Text style={styles.feeNote}>{feePreview.note}</Text>
              )}
            </View>
          )}

          {/* Transfer Mode Selector */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Transfer Mode</Text>
            <View style={styles.modeSelector}>
              {(['upi', 'bank', 'crypto'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeButton,
                    formData.transferMode === mode && styles.modeButtonActive,
                  ]}
                  onPress={() => handleInputChange('transferMode', mode)}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      formData.transferMode === mode && styles.modeButtonTextActive,
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Beneficiary Details */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Beneficiary Details</Text>

            {formData.transferMode === 'upi' && (
              <>
                <Text style={styles.inputLabel}>UPI ID *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="example@upi"
                  placeholderTextColor={Colors.textSubtleLight}
                  value={formData.beneficiaryDetails.upiId}
                  onChangeText={(value) => handleInputChange('beneficiaryDetails.upiId', value)}
                  autoCapitalize="none"
                />
              </>
            )}

            {formData.transferMode === 'bank' && (
              <>
                <Text style={styles.inputLabel}>Account Holder Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter account holder name"
                  placeholderTextColor={Colors.textSubtleLight}
                  value={formData.beneficiaryDetails.accountHolderName}
                  onChangeText={(value) => handleInputChange('beneficiaryDetails.accountHolderName', value)}
                />

                <Text style={styles.inputLabel}>Account Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter account number"
                  placeholderTextColor={Colors.textSubtleLight}
                  value={formData.beneficiaryDetails.accountNumber}
                  onChangeText={(value) => handleInputChange('beneficiaryDetails.accountNumber', value.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>IFSC Code *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter IFSC code"
                  placeholderTextColor={Colors.textSubtleLight}
                  value={formData.beneficiaryDetails.ifscCode}
                  onChangeText={(value) => handleInputChange('beneficiaryDetails.ifscCode', value.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={11}
                />

                <Text style={styles.inputLabel}>Bank Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter bank name"
                  placeholderTextColor={Colors.textSubtleLight}
                  value={formData.beneficiaryDetails.bankName}
                  onChangeText={(value) => handleInputChange('beneficiaryDetails.bankName', value)}
                />

                <Text style={styles.inputLabel}>Branch Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter branch name"
                  placeholderTextColor={Colors.textSubtleLight}
                  value={formData.beneficiaryDetails.branchName}
                  onChangeText={(value) => handleInputChange('beneficiaryDetails.branchName', value)}
                />
              </>
            )}

            {formData.transferMode === 'crypto' && (
              <>
                <Text style={styles.inputLabel}>Wallet Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter wallet address"
                  placeholderTextColor={Colors.textSubtleLight}
                  value={formData.beneficiaryDetails.walletAddress}
                  onChangeText={(value) => handleInputChange('beneficiaryDetails.walletAddress', value)}
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>Network Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Ethereum, Bitcoin, Polygon"
                  placeholderTextColor={Colors.textSubtleLight}
                  value={formData.beneficiaryDetails.networkName}
                  onChangeText={(value) => handleInputChange('beneficiaryDetails.networkName', value)}
                />

                <Text style={styles.inputLabel}>Currency Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., USDT, BTC, ETH"
                  placeholderTextColor={Colors.textSubtleLight}
                  value={formData.beneficiaryDetails.currencyName}
                  onChangeText={(value) => handleInputChange('beneficiaryDetails.currencyName', value.toUpperCase())}
                  autoCapitalize="characters"
                />
              </>
            )}
          </View>

          {/* Notes */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any additional notes"
              placeholderTextColor={Colors.textSubtleLight}
              value={formData.notes}
              onChangeText={(value) => handleInputChange('notes', value)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!eligibility.can_request_payout || submitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!eligibility.can_request_payout || submitting}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color={Colors.textLight} />
                <Text style={styles.submitButtonText}>Submitting...</Text>
              </>
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color={Colors.textLight} />
                <Text style={styles.submitButtonText}>Request Payout</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 80, // Account for Navbar + status bar
    backgroundColor: Colors.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSubtleLight,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.warning,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSubtleLight,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  infoSubtext: {
    fontSize: 12,
    color: Colors.textSubtleLight,
    marginTop: 4,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textLight,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 12,
    color: Colors.textSubtleLight,
    marginTop: 4,
  },
  feeCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeRowTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  feeLabel: {
    fontSize: 14,
    color: Colors.textSubtleLight,
  },
  feeValue: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  feeLabelTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  feeValueTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
  },
  feeNote: {
    fontSize: 12,
    color: Colors.textSubtleLight,
    marginTop: 8,
    fontStyle: 'italic',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSubtleLight,
  },
  modeButtonTextActive: {
    color: Colors.textLight,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
});

