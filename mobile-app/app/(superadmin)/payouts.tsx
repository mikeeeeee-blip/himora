import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import superadminPaymentService from '@/services/superadminPaymentService';
import authService from '@/services/authService';
import Navbar from '@/components/Navbar';
import SwipeGestureHandler from '@/components/SwipeGestureHandler';
import { Colors } from '@/constants/theme';

interface Payout {
  _id: string;
  payoutId: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: string;
  transferMode: string;
  merchantName: string;
  requestedByName: string;
  requestedAt: string;
  approvedAt?: string;
  approvedByName?: string;
  completedAt?: string;
  processedByName?: string;
  rejectedAt?: string;
  rejectedByName?: string;
  rejectionReason?: string;
  utr?: string;
  adminNotes?: string;
  beneficiaryDetails?: {
    upiId?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    bankName?: string;
    walletAddress?: string;
    networkName?: string;
    currencyName?: string;
  };
}

interface PayoutsSummary {
  total_payout_requests?: number;
  requested_payouts?: number;
  total_pending?: number;
  completed_payouts?: number;
  total_completed?: number;
  rejected_payouts?: number;
  failed_payouts?: number;
}

export default function SuperadminPayoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'view' | 'approve' | 'reject' | 'process'>('view');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form states
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [processUtr, setProcessUtr] = useState('');
  const [processNotes, setProcessNotes] = useState('');

  useEffect(() => {
    loadPayouts();
  }, [statusFilter]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const data = await superadminPaymentService.getAllPayouts({
        status: statusFilter || undefined,
        limit: 100,
      });
      
      if (data) {
        setPayouts(data.payouts || []);
        setSummary(data.summary || null);
      }
    } catch (error: any) {
      console.error('Error loading payouts:', error);
      Alert.alert('Error', error.message || 'Failed to load payouts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPayouts();
  };

  const openModal = (type: 'view' | 'approve' | 'reject' | 'process', payout: Payout) => {
    setModalType(type);
    setSelectedPayout(payout);
    setShowModal(true);
    // Reset form states
    setApproveNotes('');
    setRejectReason('');
    setProcessUtr('');
    setProcessNotes('');
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPayout(null);
    setModalType('view');
    setApproveNotes('');
    setRejectReason('');
    setProcessUtr('');
    setProcessNotes('');
  };

  const handleApprovePayout = async () => {
    if (!selectedPayout) return;
    
    setActionLoading(true);
    try {
      await superadminPaymentService.approvePayout(selectedPayout.payoutId, approveNotes);
      Alert.alert('Success', 'Payout approved successfully!');
      closeModal();
      loadPayouts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve payout');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayout = async () => {
    if (!selectedPayout) return;
    
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Rejection reason is required');
      return;
    }

    setActionLoading(true);
    try {
      await superadminPaymentService.rejectPayout(selectedPayout.payoutId, rejectReason);
      Alert.alert('Success', 'Payout rejected successfully');
      closeModal();
      loadPayouts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject payout');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessPayout = async () => {
    if (!selectedPayout) return;
    
    if (!processUtr.trim()) {
      const fieldName = selectedPayout.transferMode === 'crypto' ? 'Transaction Hash' : 'UTR/Transaction reference';
      Alert.alert('Error', `${fieldName} is required`);
      return;
    }

    setActionLoading(true);
    try {
      await superadminPaymentService.processPayout(
        selectedPayout.payoutId,
        processUtr,
        processNotes,
        selectedPayout.transferMode === 'crypto' ? processUtr : undefined
      );
      Alert.alert('Success', 'Payout processed successfully!');
      closeModal();
      loadPayouts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process payout');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${parseFloat(String(amount || 0)).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return Colors.success;
      case 'failed':
      case 'cancelled':
      case 'rejected':
        return Colors.error;
      case 'requested':
        return Colors.warning;
      case 'pending':
      case 'processing':
        return Colors.info;
      default:
        return Colors.textSubtleLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'checkmark-circle';
      case 'failed':
      case 'cancelled':
      case 'rejected':
        return 'close-circle';
      case 'requested':
        return 'alert-circle';
      case 'pending':
      case 'processing':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  const filteredPayouts = payouts.filter((payout) => {
    const matchesSearch = !searchQuery || 
      payout.payoutId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.merchantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.requestedByName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const renderPayout = ({ item }: { item: Payout }) => (
    <TouchableOpacity
      style={styles.payoutCard}
      onPress={() => openModal('view', item)}
    >
      <View style={styles.payoutHeader}>
        <View style={styles.payoutIdContainer}>
          <Text style={styles.payoutId} numberOfLines={1}>
            {item.payoutId.slice(-12)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Ionicons 
            name={getStatusIcon(item.status) as any} 
            size={12} 
            color={getStatusColor(item.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      
      <View style={styles.payoutBody}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amount}>{formatCurrency(item.netAmount)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Merchant</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {item.merchantName || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mode</Text>
          <View style={styles.transferModeBadge}>
            <Text style={styles.transferModeText}>
              {item.transferMode === 'bank_transfer' ? '🏦 Bank' : 
               item.transferMode === 'crypto' ? '₿ Crypto' : '📱 UPI'}
            </Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Requested</Text>
          <Text style={styles.infoValue}>
            {new Date(item.requestedAt).toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'short' 
            })}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openModal('view', item)}
        >
          <Ionicons name="eye-outline" size={16} color={Colors.accent} />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>

        {item.status === 'requested' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => openModal('approve', item)}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
              <Text style={[styles.actionButtonText, { color: Colors.success }]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => openModal('reject', item)}
            >
              <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
              <Text style={[styles.actionButtonText, { color: Colors.error }]}>Reject</Text>
            </TouchableOpacity>
          </>
        )}

        {(item.status === 'pending' || item.status === 'processing') && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.processButton]}
              onPress={() => openModal('process', item)}
            >
              <Ionicons name="send-outline" size={16} color={Colors.info} />
              <Text style={[styles.actionButtonText, { color: Colors.info }]}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => openModal('reject', item)}
            >
              <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
              <Text style={[styles.actionButtonText, { color: Colors.error }]}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Navbar />
      <SwipeGestureHandler
        onSwipeLeft={() => router.push('/(superadmin)/dashboard')}
        onSwipeRight={() => {
          // Already on payouts, do nothing or could navigate to transactions
        }}
      >
        {/* Background X Graphic */}
        <View style={styles.backgroundGraphic}>
          <Image
            source={require('../../assets/images/X.png')}
            style={styles.xGraphic}
            resizeMode="contain"
          />
        </View>

        <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 120 + insets.bottom }
        ]}
        contentOffset={{ x: 0, y: 0 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {/* Spacer for graphic */}
        <View style={styles.spacer} />

        {/* Main Content Card */}
        <View style={styles.mainCard}>
          {/* Header */}
          <View style={styles.headerSection}>
            <View>
              <Text style={styles.headerTitle}>Payout Management</Text>
              <Text style={styles.headerSubtitle}>Approve, reject, and process merchant payout requests</Text>
            </View>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={loading}
              style={styles.refreshButton}
            >
              <Ionicons
                name="refresh"
                size={20}
                color={Colors.textLight}
                style={loading && styles.refreshSpinning}
              />
            </TouchableOpacity>
          </View>

          {/* Summary Cards */}
          {summary && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Summary Statistics</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Ionicons name="cash-outline" size={20} color={Colors.textLight} />
                  <View style={styles.summaryCardContent}>
                    <Text style={styles.summaryCardTitle}>Total Requests</Text>
                    <Text style={styles.summaryCardValue}>
                      {summary.total_payout_requests || 0}
                    </Text>
                  </View>
                </View>

                <View style={[styles.summaryCard, styles.summaryCardWarning]}>
                  <Ionicons name="time-outline" size={20} color={Colors.warning} />
                  <View style={styles.summaryCardContent}>
                    <Text style={styles.summaryCardTitle}>Pending</Text>
                    <Text style={styles.summaryCardValue}>
                      {summary.requested_payouts || 0}
                    </Text>
                    <Text style={styles.summaryCardSubtext}>
                      {formatCurrency(summary.total_pending || 0)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.summaryCard, styles.summaryCardSuccess]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={Colors.success} />
                  <View style={styles.summaryCardContent}>
                    <Text style={styles.summaryCardTitle}>Completed</Text>
                    <Text style={styles.summaryCardValue}>
                      {summary.completed_payouts || 0}
                    </Text>
                    <Text style={styles.summaryCardSubtext}>
                      {formatCurrency(summary.total_completed || 0)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.summaryCard, styles.summaryCardError]}>
                  <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
                  <View style={styles.summaryCardContent}>
                    <Text style={styles.summaryCardTitle}>Rejected</Text>
                    <Text style={styles.summaryCardValue}>
                      {(summary.rejected_payouts || 0) + (summary.failed_payouts || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Filters */}
          <View style={styles.filtersSection}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={Colors.textSubtleLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by Payout ID, Merchant..."
                placeholderTextColor={Colors.textSubtleLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={Colors.textSubtleLight} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowStatusFilter(!showStatusFilter)}
            >
              <Ionicons name="filter-outline" size={16} color={Colors.textLight} />
              <Text style={styles.filterButtonText}>
                {statusFilter || 'All Status'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Status Filter Dropdown */}
          {showStatusFilter && (
            <View style={styles.statusFilterDropdown}>
              <TouchableOpacity
                style={[styles.statusFilterOption, !statusFilter && styles.statusFilterOptionActive]}
                onPress={() => {
                  setStatusFilter('');
                  setShowStatusFilter(false);
                }}
              >
                <Text style={[styles.statusFilterOptionText, !statusFilter && styles.statusFilterOptionTextActive]}>
                  All Status
                </Text>
              </TouchableOpacity>
              {['requested', 'pending', 'processing', 'completed', 'rejected', 'failed', 'cancelled'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusFilterOption, statusFilter === status && styles.statusFilterOptionActive]}
                  onPress={() => {
                    setStatusFilter(status);
                    setShowStatusFilter(false);
                  }}
                >
                  <Text style={[styles.statusFilterOptionText, statusFilter === status && styles.statusFilterOptionTextActive]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Loading State */}
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Loading payouts...</Text>
            </View>
          ) : filteredPayouts.length > 0 ? (
            <View style={styles.payoutsList}>
              {filteredPayouts.map((payout) => (
                <View key={payout._id}>
                  {renderPayout({ item: payout })}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={64} color={Colors.textSubtleLight} />
              <Text style={styles.emptyText}>No payouts found</Text>
            </View>
          )}
        </View>
        </ScrollView>
      </SwipeGestureHandler>

      {/* Action Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'view' && '📋 Payout Details'}
                {modalType === 'approve' && '✅ Approve Payout'}
                {modalType === 'reject' && '❌ Reject Payout'}
                {modalType === 'process' && '🚀 Process Payout'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedPayout && (
                <>
                  {/* View Details */}
                  {modalType === 'view' && (
                    <View>
                      {/* Payout ID and Status */}
                      <View style={styles.detailCard}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Payout ID</Text>
                          <Text style={styles.detailValue} numberOfLines={1}>
                            {selectedPayout.payoutId}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Status</Text>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedPayout.status) + '20' }]}>
                            <Ionicons 
                              name={getStatusIcon(selectedPayout.status) as any} 
                              size={14} 
                              color={getStatusColor(selectedPayout.status)} 
                            />
                            <Text style={[styles.statusText, { color: getStatusColor(selectedPayout.status) }]}>
                              {selectedPayout.status}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Amount Summary */}
                      <View style={[styles.detailCard, styles.amountCard]}>
                        <View style={styles.amountSummary}>
                          <View style={styles.amountItem}>
                            <Text style={styles.amountItemLabel}>Gross Amount</Text>
                            <Text style={styles.amountItemValue}>
                              {formatCurrency(selectedPayout.amount)}
                            </Text>
                          </View>
                          <Text style={styles.amountOperator}>-</Text>
                          <View style={styles.amountItem}>
                            <Text style={styles.amountItemLabel}>Commission</Text>
                            <Text style={[styles.amountItemValue, styles.amountNegative]}>
                              {formatCurrency(selectedPayout.commission)}
                            </Text>
                          </View>
                          <Text style={styles.amountOperator}>=</Text>
                          <View style={[styles.amountItem, styles.amountItemPrimary]}>
                            <Text style={styles.amountItemLabel}>Net Amount</Text>
                            <Text style={[styles.amountItemValue, styles.amountItemValueLarge]}>
                              {formatCurrency(selectedPayout.netAmount)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Merchant Information */}
                      <View style={styles.detailCard}>
                        <View style={styles.detailSectionHeader}>
                          <Ionicons name="person-outline" size={18} color={Colors.accent} />
                          <Text style={styles.detailSectionTitle}>Merchant Information</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Merchant Name</Text>
                          <Text style={styles.detailValue}>{selectedPayout.merchantName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Requested By</Text>
                          <Text style={styles.detailValue}>{selectedPayout.requestedByName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Requested Date</Text>
                          <Text style={styles.detailValue}>{formatDate(selectedPayout.requestedAt)}</Text>
                        </View>
                      </View>

                      {/* Beneficiary Details */}
                      <View style={styles.detailCard}>
                        <View style={styles.detailSectionHeader}>
                          <Ionicons name="card-outline" size={18} color={Colors.accent} />
                          <Text style={styles.detailSectionTitle}>Beneficiary Details</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Transfer Mode</Text>
                          <View style={styles.transferModeBadge}>
                            <Text style={styles.transferModeText}>
                              {selectedPayout.transferMode === 'bank_transfer' ? '🏦 Bank Transfer' : 
                               selectedPayout.transferMode === 'crypto' ? '₿ Crypto' : '📱 UPI'}
                            </Text>
                          </View>
                        </View>

                        {selectedPayout.beneficiaryDetails?.upiId && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>UPI ID</Text>
                            <Text style={[styles.detailValue, styles.monoText]}>
                              {selectedPayout.beneficiaryDetails.upiId}
                            </Text>
                          </View>
                        )}

                        {selectedPayout.beneficiaryDetails?.walletAddress && (
                          <>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Wallet Address</Text>
                              <Text style={[styles.detailValue, styles.monoText]} numberOfLines={2}>
                                {selectedPayout.beneficiaryDetails.walletAddress}
                              </Text>
                            </View>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Network</Text>
                              <Text style={styles.detailValue}>
                                {selectedPayout.beneficiaryDetails.networkName}
                              </Text>
                            </View>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Currency</Text>
                              <Text style={styles.detailValue}>
                                {selectedPayout.beneficiaryDetails.currencyName}
                              </Text>
                            </View>
                          </>
                        )}

                        {selectedPayout.beneficiaryDetails?.accountNumber && (
                          <>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Account Number</Text>
                              <Text style={[styles.detailValue, styles.monoText]}>
                                {selectedPayout.beneficiaryDetails.accountNumber}
                              </Text>
                            </View>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>IFSC Code</Text>
                              <Text style={[styles.detailValue, styles.monoText]}>
                                {selectedPayout.beneficiaryDetails.ifscCode}
                              </Text>
                            </View>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Account Holder</Text>
                              <Text style={styles.detailValue}>
                                {selectedPayout.beneficiaryDetails.accountHolderName}
                              </Text>
                            </View>
                            {selectedPayout.beneficiaryDetails.bankName && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Bank Name</Text>
                                <Text style={styles.detailValue}>
                                  {selectedPayout.beneficiaryDetails.bankName}
                                </Text>
                              </View>
                            )}
                          </>
                        )}
                      </View>

                      {/* Transaction Details (if completed) */}
                      {selectedPayout.utr && (
                        <View style={[styles.detailCard, styles.successCard]}>
                          <View style={styles.detailSectionHeader}>
                            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                            <Text style={styles.detailSectionTitle}>Transaction Details</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>
                              {selectedPayout.transferMode === 'crypto' ? 'Transaction Hash' : 'UTR / Reference'}
                            </Text>
                            <Text style={[styles.detailValue, styles.monoText, styles.successText]}>
                              {selectedPayout.utr}
                            </Text>
                          </View>
                          {selectedPayout.completedAt && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Completed Date</Text>
                              <Text style={styles.detailValue}>{formatDate(selectedPayout.completedAt)}</Text>
                            </View>
                          )}
                          {selectedPayout.processedByName && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Processed By</Text>
                              <Text style={styles.detailValue}>{selectedPayout.processedByName}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Timeline */}
                      <View style={styles.detailCard}>
                        <View style={styles.detailSectionHeader}>
                          <Ionicons name="time-outline" size={18} color={Colors.accent} />
                          <Text style={styles.detailSectionTitle}>Timeline</Text>
                        </View>
                        <View style={styles.timeline}>
                          <View style={styles.timelineItem}>
                            <View style={styles.timelineDot} />
                            <View style={styles.timelineContent}>
                              <Text style={styles.timelineLabel}>Requested</Text>
                              <Text style={styles.timelineDate}>{formatDate(selectedPayout.requestedAt)}</Text>
                            </View>
                          </View>
                          {selectedPayout.approvedAt && (
                            <View style={styles.timelineItem}>
                              <View style={styles.timelineDot} />
                              <View style={styles.timelineContent}>
                                <Text style={styles.timelineLabel}>Approved</Text>
                                <Text style={styles.timelineDate}>{formatDate(selectedPayout.approvedAt)}</Text>
                                {selectedPayout.approvedByName && (
                                  <Text style={styles.timelineMeta}>by {selectedPayout.approvedByName}</Text>
                                )}
                              </View>
                            </View>
                          )}
                          {selectedPayout.completedAt && (
                            <View style={styles.timelineItem}>
                              <View style={[styles.timelineDot, styles.timelineDotSuccess]} />
                              <View style={styles.timelineContent}>
                                <Text style={styles.timelineLabel}>Completed</Text>
                                <Text style={styles.timelineDate}>{formatDate(selectedPayout.completedAt)}</Text>
                                {selectedPayout.processedByName && (
                                  <Text style={styles.timelineMeta}>by {selectedPayout.processedByName}</Text>
                                )}
                              </View>
                            </View>
                          )}
                          {selectedPayout.rejectedAt && (
                            <View style={styles.timelineItem}>
                              <View style={[styles.timelineDot, styles.timelineDotError]} />
                              <View style={styles.timelineContent}>
                                <Text style={styles.timelineLabel}>Rejected</Text>
                                <Text style={styles.timelineDate}>{formatDate(selectedPayout.rejectedAt)}</Text>
                                {selectedPayout.rejectedByName && (
                                  <Text style={styles.timelineMeta}>by {selectedPayout.rejectedByName}</Text>
                                )}
                                {selectedPayout.rejectionReason && (
                                  <Text style={styles.timelineMeta}>{selectedPayout.rejectionReason}</Text>
                                )}
                              </View>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Notes */}
                      {selectedPayout.adminNotes && (
                        <View style={styles.detailCard}>
                          <View style={styles.detailSectionHeader}>
                            <Ionicons name="information-circle-outline" size={18} color={Colors.accent} />
                            <Text style={styles.detailSectionTitle}>Notes</Text>
                          </View>
                          <Text style={styles.notesText}>{selectedPayout.adminNotes}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Approve Form */}
                  {modalType === 'approve' && (
                    <View>
                      <View style={styles.confirmationBox}>
                        <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
                        <Text style={styles.confirmationMessage}>
                          Are you sure you want to approve this payout request?
                        </Text>
                      </View>

                      <View style={styles.detailCard}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Merchant</Text>
                          <Text style={styles.detailValue}>{selectedPayout.merchantName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Net Amount</Text>
                          <Text style={[styles.detailValue, styles.highlightText]}>
                            {formatCurrency(selectedPayout.netAmount)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Notes (Optional)</Text>
                        <TextInput
                          style={styles.textArea}
                          placeholder="Add any notes for this approval..."
                          placeholderTextColor={Colors.textSubtleLight}
                          value={approveNotes}
                          onChangeText={setApproveNotes}
                          multiline
                          numberOfLines={4}
                        />
                      </View>
                    </View>
                  )}

                  {/* Reject Form */}
                  {modalType === 'reject' && (
                    <View>
                      <View style={styles.confirmationBox}>
                        <Ionicons name="close-circle" size={48} color={Colors.error} />
                        <Text style={styles.confirmationMessage}>
                          {selectedPayout.status === 'pending' || selectedPayout.status === 'processing'
                            ? 'This payout has been approved. Rejecting it will cancel the approval and make the transactions available for a new payout request.'
                            : 'Please provide a reason for rejecting this payout request.'}
                        </Text>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Rejection Reason *</Text>
                        <TextInput
                          style={styles.textArea}
                          placeholder="Enter reason for rejection..."
                          placeholderTextColor={Colors.textSubtleLight}
                          value={rejectReason}
                          onChangeText={setRejectReason}
                          multiline
                          numberOfLines={4}
                          required
                        />
                      </View>
                    </View>
                  )}

                  {/* Process Form */}
                  {modalType === 'process' && (
                    <View>
                      <View style={styles.confirmationBox}>
                        <Ionicons name="send" size={48} color={Colors.info} />
                        <Text style={styles.confirmationMessage}>
                          Mark this payout as completed by providing transaction details.
                        </Text>
                      </View>

                      <View style={styles.detailCard}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Merchant</Text>
                          <Text style={styles.detailValue}>{selectedPayout.merchantName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Net Amount</Text>
                          <Text style={[styles.detailValue, styles.highlightText]}>
                            {formatCurrency(selectedPayout.netAmount)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>
                          {selectedPayout.transferMode === 'crypto' 
                            ? 'Transaction Hash *' 
                            : 'UTR / Transaction Reference *'}
                        </Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder={
                            selectedPayout.transferMode === 'crypto' 
                              ? 'Enter blockchain transaction hash (e.g., 0x...)' 
                              : 'Enter UTR or transaction reference'
                          }
                          placeholderTextColor={Colors.textSubtleLight}
                          value={processUtr}
                          onChangeText={setProcessUtr}
                          required
                        />
                        {selectedPayout.transferMode === 'crypto' && (
                          <Text style={styles.formHint}>
                            Enter the transaction hash from the blockchain explorer
                          </Text>
                        )}
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Notes (Optional)</Text>
                        <TextInput
                          style={styles.textArea}
                          placeholder="Add any additional notes..."
                          placeholderTextColor={Colors.textSubtleLight}
                          value={processNotes}
                          onChangeText={setProcessNotes}
                          multiline
                          numberOfLines={4}
                        />
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={closeModal}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              {modalType === 'approve' && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary, styles.modalButtonApprove]}
                  onPress={handleApprovePayout}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={Colors.textLight} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.textLight} />
                      <Text style={styles.modalButtonText}>Approve Payout</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {modalType === 'reject' && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary, styles.modalButtonReject]}
                  onPress={handleRejectPayout}
                  disabled={actionLoading || !rejectReason.trim()}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={Colors.textLight} />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={18} color={Colors.textLight} />
                      <Text style={styles.modalButtonText}>Reject Payout</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {modalType === 'process' && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary, styles.modalButtonProcess]}
                  onPress={handleProcessPayout}
                  disabled={actionLoading || !processUtr.trim()}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={Colors.textLight} />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color={Colors.textLight} />
                      <Text style={styles.modalButtonText}>Complete Payout</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  backgroundGraphic: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    opacity: 0.15,
    zIndex: 0,
    height: '60%',
  },
  xGraphic: {
    width: '120%',
    height: '85%',
    opacity: 0.2,
    tintColor: Colors.accent,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  spacer: {
    height: 80,
    minHeight: 80,
  },
  mainCard: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 12,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textLight,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.bgTertiary,
  },
  refreshSpinning: {
    transform: [{ rotate: '180deg' }],
  },
  summarySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  summaryCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  summaryCardError: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  summaryCardContent: {
    flex: 1,
  },
  summaryCardTitle: {
    fontSize: 11,
    color: Colors.textSubtleLight,
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
  },
  summaryCardSubtext: {
    fontSize: 10,
    color: Colors.textSubtleLight,
    marginTop: 2,
  },
  filtersSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textLight,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonText: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  statusFilterDropdown: {
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  statusFilterOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusFilterOptionActive: {
    backgroundColor: Colors.accent + '20',
  },
  statusFilterOptionText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  statusFilterOptionTextActive: {
    color: Colors.accent,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSubtleLight,
  },
  payoutsList: {
    gap: 12,
  },
  payoutCard: {
    backgroundColor: Colors.bgTertiary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  payoutIdContainer: {
    flex: 1,
    marginRight: 8,
  },
  payoutId: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  payoutBody: {
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  infoValue: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  transferModeBadge: {
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  transferModeText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  approveButton: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '20',
  },
  rejectButton: {
    borderColor: Colors.error,
    backgroundColor: Colors.error + '20',
  },
  processButton: {
    borderColor: Colors.info,
    backgroundColor: Colors.info + '20',
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSubtleLight,
    marginTop: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textLight,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: '70%',
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  modalButtonSecondary: {
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalButtonPrimary: {
    backgroundColor: Colors.accent,
  },
  modalButtonApprove: {
    backgroundColor: Colors.success,
  },
  modalButtonReject: {
    backgroundColor: Colors.error,
  },
  modalButtonProcess: {
    backgroundColor: Colors.info,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  // Detail Styles
  detailCard: {
    backgroundColor: Colors.bgTertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amountCard: {
    backgroundColor: Colors.success + '10',
    borderColor: Colors.success + '30',
  },
  successCard: {
    backgroundColor: Colors.success + '10',
    borderColor: Colors.success + '30',
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSubtleLight,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  highlightText: {
    color: Colors.accent,
    fontWeight: 'bold',
  },
  successText: {
    color: Colors.success,
    fontWeight: '600',
  },
  amountSummary: {
    gap: 8,
  },
  amountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountItemPrimary: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  amountItemLabel: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  amountItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  amountItemValueLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  amountNegative: {
    color: Colors.error,
  },
  amountOperator: {
    fontSize: 16,
    color: Colors.textSubtleLight,
    textAlign: 'center',
  },
  confirmationBox: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  confirmationMessage: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 8,
  },
  formHint: {
    fontSize: 11,
    color: Colors.textSubtleLight,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.textLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    backgroundColor: Colors.bgTertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.textLight,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  notesText: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 20,
  },
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.accent,
    marginTop: 4,
  },
  timelineDotSuccess: {
    backgroundColor: Colors.success,
  },
  timelineDotError: {
    backgroundColor: Colors.error,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 11,
    color: Colors.textSubtleLight,
  },
  timelineMeta: {
    fontSize: 11,
    color: Colors.textSubtleLight,
    marginTop: 2,
    fontStyle: 'italic',
  },
});
