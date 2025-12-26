import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  FiRefreshCw,
  FiPlus,
  FiX,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiInfo,
  FiPercent,
  FiDollarSign,
  FiDownload,
  FiTrendingUp,
} from 'react-icons/fi';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import paymentService from '../../services/paymentService';
import Navbar from '../Navbar';
import ExportCSV from '../ExportCSV';
import Toast from '../ui/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const PayoutsPage = () => {
  const [payouts, setPayouts] = useState([]);
  const [payoutsSummary, setPayoutsSummary] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestData, setRequestData] = useState({
    amount: '',
    transferMode: 'upi',
    beneficiaryDetails: {
      upiId: '',
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      bankName: '',
      branchName: '',
      // Crypto fields
      walletAddress: '',
      networkName: '',
      currencyName: ''
    },
    notes: ''
  });

  const [error, setError] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [feePreview, setFeePreview] = useState({
  grossAmount: 0,
  commission: 0,
  netAmount: 0,
  note: '',
  warning: ''
});

  const [eligibility, setEligibility] = useState({
    can_request_payout: false,
    minimum_payout_amount: 0,
    maximum_payout_amount: 0
  });
  const FEE_FLAT_500_1000 = 35.40;
const FEE_PERCENT_ABOVE_1000 = 0.0177; // 1.77%
const SMALL_TXN_EXTRA_CHARGE = 10; // when freePayoutsRemaining === 0 and amount < 500

const computePayoutCharge = (amount, freePayoutsRemaining) => {
  // Ensure numeric
  const a = Number(amount) || 0;

  // Default — no commission
  let commission = 0;
  let note = '';

  // If merchant has free payouts left, treat as free for amounts < 500
  // but you asked: apply special rules only when freePayoutsRemaining == 0
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
    // If free payouts remain, preserve original behavior (no charge shown),
    // but still apply tiered charges if you want: current request says only when freePayoutsRemaining == 0
    if (a >= 500 && a <= 1000) {
      commission = FEE_FLAT_500_1000; // optional: keep visible even when free remain (you can change)
      note = `Flat fee of ₹${FEE_FLAT_500_1000.toFixed(2)} applies for amounts between ₹500 and ₹1000.`;
    } else if (a > 1000) {
      commission = parseFloat((a * FEE_PERCENT_ABOVE_1000).toFixed(2));
      note = `Fee of 1.77% applies for amounts above ₹1000 (₹${commission.toFixed(2)}).`;
    }
  }

  const grossAmount = a;
  const netAmount = parseFloat((grossAmount - commission).toFixed(2));

  // Special warning text for the exact use-cases you requested
  let warning = '';
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
    warning
  };
};
  // Function to generate and download invoice PDF
  const downloadInvoicePDF = (payout) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Payout Invoice', 14, 22);

    doc.setFontSize(12);
    doc.text(`Payout ID: ${payout.payoutId}`, 14, 32);
    doc.text(`Status: ${payout.status}`, 14, 38);
    doc.text(`Requested At: ${formatDate(payout.requestedAt)}`, 14, 44);

    if (payout.approvedAt) {
      doc.text(`Approved At: ${formatDate(payout.approvedAt)}`, 14, 50);
    }
    if (payout.completedAt) {
      doc.text(`Completed At: ${formatDate(payout.completedAt)}`, 14, 56);
    }
    if (payout.utr) {
      doc.text(`UTR / Transaction Ref: ${payout.utr}`, 14, 62);
    }

    // Beneficiary Details Section
    doc.setFontSize(14);
    doc.text('Beneficiary Details:', 14, 72);

    doc.setFontSize(12);
    const beneficiary = payout.beneficiaryDetails || {};
    let y = 80;
    if (beneficiary.accountHolderName) {
      doc.text(`Account Holder Name: ${beneficiary.accountHolderName}`, 14, y);
      y += 6;
    }
    if (beneficiary.bankName) {
      doc.text(`Bank Name: ${beneficiary.bankName}`, 14, y);
      y += 6;
    }
    if (beneficiary.branchName) {
      doc.text(`Branch Name: ${beneficiary.branchName}`, 14, y);
      y += 6;
    }
    if (beneficiary.accountNumber) {
      doc.text(`Account Number: ${beneficiary.accountNumber}`, 14, y);
      y += 6;
    }
    if (beneficiary.ifscCode) {
      doc.text(`IFSC Code: ${beneficiary.ifscCode}`, 14, y);
      y += 6;
    }
    if (beneficiary.upiId) {
      doc.text(`UPI ID: ${beneficiary.upiId}`, 14, y);
      y += 6;
    }
    if (beneficiary.walletAddress) {
      doc.text(`Wallet Address: ${beneficiary.walletAddress}`, 14, y);
      y += 6;
    }
    if (beneficiary.networkName) {
      doc.text(`Network: ${beneficiary.networkName}`, 14, y);
      y += 6;
    }
    if (beneficiary.currencyName) {
      doc.text(`Currency: ${beneficiary.currencyName}`, 14, y);
      y += 6;
    }

    // Payment Details Table
    autoTable(doc, {
      startY: y + 8,
      head: [['Description', 'Amount (₹)']],
      body: [
        ['Gross Amount', payout.amount.toFixed(2)],
        ['Commission Deducted', `- ${payout.commission.toFixed(2)}`],
        ['Net Amount Paid', payout.netAmount.toFixed(2)]
      ],
    });

    doc.save(`PayoutInvoice_${payout.payoutId}.pdf`);
  };

  const [pagination, setPagination] = useState({});
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    start_date: '',
    end_date: '',
    search: '',
    sort_by: 'createdAt',
    sort_order: 'desc',
  });

  useEffect(() => {
    fetchPayouts();
    loadEligibility();
    fetchChartData();
    
    // Refresh balance every 30 seconds to prevent stale data
    const balanceInterval = setInterval(() => {
      loadEligibility();
    }, 30000);
    
    return () => clearInterval(balanceInterval);
  }, [filters.page, filters.start_date, filters.end_date]);

  const loadEligibility = async () => {
    try {
      const bal = await paymentService.getBalance();
      console.log('Balance data:', bal);
      setBalance(bal);
      const pe = bal.payout_eligibility || bal.payoutEligibility || {};
      setEligibility({
        can_request_payout: pe.can_request_payout ?? false,
        minimum_payout_amount: pe.minimum_payout_amount ?? 0,
        maximum_payout_amount: pe.maximum_payout_amount ?? 0,
      });
    } catch (e) {
      console.error('Error loading eligibility:', e);
    }
  };

  // Fetch chart data for analytics
  const fetchChartData = async () => {
    setChartLoading(true);
    try {
      const endDate =
        filters.end_date || new Date().toISOString().split('T')[0];
      const startDate =
        filters.start_date ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

      const result = await paymentService.searchPayouts({
        startDate,
        endDate,
        limit: 1000,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });
      const data = result.payouts || [];

      // Group by date
      const grouped = {};
      data.forEach((item) => {
        const date = new Date(
          item.requestedAt || item.createdAt
        ).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        if (!grouped[date]) {
          grouped[date] = {
            date,
            amount: 0,
            count: 0,
            success: 0,
            failed: 0,
          };
        }
        grouped[date].amount += item.amount || 0;
        grouped[date].count += 1;
        if (item.status === 'completed') {
          grouped[date].success += 1;
        } else if (item.status === 'failed' || item.status === 'cancelled') {
          grouped[date].failed += 1;
        }
      });

      setChartData(Object.values(grouped));
    } catch (error) {
      console.error('Chart data fetch error:', error);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchPayouts = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await paymentService.searchPayouts({
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        startDate: filters.start_date,
        endDate: filters.end_date,
        search: filters.search,
        sortBy: filters.sort_by,
        sortOrder: filters.sort_order,
      });
      console.log('Payouts data:', data);
      setPayouts(data.payouts || []);
      setPayoutsSummary(data.summary || null);
      setPagination(data.pagination || {});
    } catch (error) {
      setError(error.message);
      setToast({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const formatCurrencyChart = (value) => {
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#122D32] border border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2 font-['Albert_Sans']">
            {new Date(label).toLocaleDateString('en-IN', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          {payload.map((entry, index) => (
            <p
              key={index}
              className="text-white/80 text-sm font-['Albert_Sans']"
              style={{ color: entry.color }}
            >
              {entry.name}:{' '}
              {entry.name === 'Amount'
                ? formatCurrency(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // ✅ Fixed: Only format if payouts exist
  const formatForExport = () => {
    if (!payouts || payouts.length === 0) {
      return [];
    }

    return payouts.map(payout => ({
      'Payout ID': payout.payoutId || 'N/A',
      'Amount': payout.amount ? `₹${payout.amount}` : 'N/A',
      'Commission': payout.commission ? `₹${payout.commission}` : 'N/A',
      'Net Amount': payout.netAmount ? `₹${payout.netAmount}` : 'N/A',
      'Status': payout.status || 'N/A',
      'Transfer Mode': payout.transferMode === 'bank_transfer' ? 'Bank Transfer' : 
                       payout.transferMode === 'crypto' ? 'Crypto' : 
                       payout.transferMode === 'upi' ? 'UPI' : 'N/A',
      'UPI ID': payout.beneficiaryDetails?.upiId || 'N/A',
      'Wallet Address': payout.beneficiaryDetails?.walletAddress || 'N/A',
      'Network': payout.beneficiaryDetails?.networkName || 'N/A',
      'Currency': payout.beneficiaryDetails?.currencyName || 'N/A',
      'Account Number': payout.beneficiaryDetails?.accountNumber || 'N/A',
      'IFSC Code': payout.beneficiaryDetails?.ifscCode || 'N/A',
      'Account Holder': payout.beneficiaryDetails?.accountHolderName || 'N/A',
      'Bank Name': payout.beneficiaryDetails?.bankName || 'N/A',
      'Requested At': payout.requestedAt ? formatDate(payout.requestedAt) : 'N/A',
      'Approved At': payout.approvedAt ? formatDate(payout.approvedAt) : 'N/A',
      'Completed At': payout.completedAt ? formatDate(payout.completedAt) : 'N/A',
      'Notes': payout.adminNotes || 'N/A',
      'UTR': payout.utr || 'N/A'
    }));
  };

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    setRequestLoading(true);
    setError('');

    try {
        if (!eligibility.can_request_payout) {
            throw new Error('You are not eligible to request a payout at this time. Wait for settlement to complete.');
        }

        // ✅ Parse amount properly to avoid precision issues
        const payoutAmount = parseFloat(requestData.amount);


      const freeLeft = (balance?.merchant?.freePayoutsRemaining ?? 0);
      const { commission, netAmount, grossAmount, warning } = computePayoutCharge(payoutAmount, freeLeft);

      // Show the required warnings to the user
      if (warning) {
        // You can show toast OR require explicit confirm for critical changes
        const proceed = window.confirm(`${warning}\n\nProceed with payout request?`);
        if (!proceed) {
          throw new Error('Payout request cancelled by user.');
        }
      }







        if (!payoutAmount || payoutAmount <= 0) {
            throw new Error('Please enter a valid payout amount.');
        }
        console.log((payoutAmount + commission) , "hi " , eligibility.maximum_payout_amount)
        if ( (payoutAmount + commission) > balance.balance.available_balance) {
            throw new Error(`The requested amount exceeds your available balance of ${formatCurrency(balance.balance.available_balance)}.`);
        }

        
      // Build payout payload — include commission fields so backend can persist them
        let beneficiaryDetails = {};
        
        if (requestData.transferMode === 'upi') {
          beneficiaryDetails = {
            upiId: requestData.beneficiaryDetails.upiId
          };
        } else if (requestData.transferMode === 'crypto') {
          beneficiaryDetails = {
            walletAddress: requestData.beneficiaryDetails.walletAddress,
            networkName: requestData.beneficiaryDetails.networkName,
            currencyName: requestData.beneficiaryDetails.currencyName
          };
        } else {
          beneficiaryDetails = {
            accountNumber: requestData.beneficiaryDetails.accountNumber,
            ifscCode: requestData.beneficiaryDetails.ifscCode,
            accountHolderName: requestData.beneficiaryDetails.accountHolderName,
            bankName: requestData.beneficiaryDetails.bankName,
            branchName: requestData.beneficiaryDetails.branchName
          };
        }

        const payoutData = {
          amount: payoutAmount , // todo : remove the commition if you are calculating int the backed 
          transferMode: requestData.transferMode,
          beneficiaryDetails,
          notes: requestData.notes
        };

        await paymentService.requestPayout(payoutData);
        setShowRequestForm(false);
        setToast({ message: 'Payout request submitted successfully!', type: 'success' });
        resetForm();
        // Refresh data immediately to get updated balance
        await Promise.all([
          fetchPayouts(),
          loadEligibility()
        ]);
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.message || 'Failed to request payout';
        setError(errorMessage);
        setToast({ message: errorMessage, type: 'error' });
        
        // If balance mismatch error, refresh balance to show correct value
        if (error.response?.data?.availableBalance !== undefined) {
          console.log('Balance mismatch detected, refreshing balance...');
          setTimeout(() => {
            loadEligibility();
          }, 500);
        }
    } finally {
        setRequestLoading(false);
    }
};



  const resetForm = () => {
    setRequestData({
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
        currencyName: ''
      },
      notes: ''
    });
  };



const handleInputChange = (field, value) => {
  if (field.includes('.')) {
    const [parent, child] = field.split('.');
    setRequestData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: value
      }
    }));
  } else {
    setRequestData(prev => ({
      ...prev,
      [field]: value
    }));
  }

  // If amount changed, recompute fee preview
  if (field === 'amount') {
    const freeLeft = (balance?.merchant?.freePayoutsRemaining ?? 0);
    const preview = computePayoutCharge(value, freeLeft);
    setFeePreview(preview);
  }
};


  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <FiCheck className="w-3 h-3 text-white" />;
      case 'failed':
      case 'cancelled':
      case 'rejected':
        return <FiX className="w-3 h-3 text-white" />;
      case 'requested':
      case 'pending':
      case 'processing':
        return <FiClock className="w-3 h-3 text-white" />;
      default:
        return <FiAlertCircle className="w-3 h-3 text-white" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#1F383D]">
      <Navbar />

      {/* Split Layout: Top Half (Graphic) + Bottom Half (Data) */}
      <div className="relative">
        {/* Fixed X Graphic - Background Layer */}
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ top: '4rem' }}
        >
          <img
            src="/X.png"
            alt="X graphic"
            className="object-contain hidden sm:block"
            style={{
              filter: 'drop-shadow(0 0 40px rgba(94, 234, 212, 0.5))',
              width: '120%',
              height: '85%',
              maxWidth: 'none',
              maxHeight: 'none',
            }}
          />
          <img
            src="/X.png"
            alt="X graphic"
            className="object-contain sm:hidden"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(94, 234, 212, 0.5))',
              width: '100%',
              height: '70%',
              maxWidth: 'none',
              maxHeight: 'none',
            }}
          />
        </div>

        {/* Scrollable Content Section - Overlays on top */}
        <section className="relative z-10 min-h-screen bg-transparent">
          <div className="bg-transparent pt-24 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1400px] mx-auto">
              <main className="space-y-6 sm:space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8 mb-6 sm:mb-8"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-5">
          <div>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-white mb-3 font-['Albert_Sans'] flex items-center gap-3">
                        <RiMoneyDollarCircleLine className="text-accent" />
                        Payouts Management
                      </h1>
                      <p className="text-white/70 text-base sm:text-lg font-['Albert_Sans']">
                        Request and track your payout withdrawals
                      </p>
          </div>

                    <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => {
                fetchPayouts();
                loadEligibility();
              }}
              disabled={loading}
                        className="bg-accent hover:bg-bg-tertiary text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
                        <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>

            {payouts.length > 0 && (
              <ExportCSV
                data={formatForExport()}
                filename={`payouts_${new Date().toISOString().split('T')[0]}.csv`}
                          className="bg-bg-secondary text-white border border-accent px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:bg-bg-tertiary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
              />
            )}

            <button
              onClick={() => setShowRequestForm(!showRequestForm)}
                        className="bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!eligibility.can_request_payout}
            >
                        {showRequestForm ? (
                          <>
                            <FiX /> Cancel
                          </>
                        ) : (
                          <>
                            <FiPlus /> Request Payout
                          </>
                        )}
            </button>
          </div>
        </div>
                </motion.div>

                {/* Analytics Chart */}
                {chartData.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                        <FiTrendingUp className="text-accent text-xl" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-medium text-white font-['Albert_Sans']">
                          Payout Analytics
                        </h3>
                        <p className="text-white/60 text-xs sm:text-sm font-['Albert_Sans']">
                          Payout trends over time
                        </p>
                      </div>
                    </div>
                    {chartLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={chartData}>
                          <defs>
                            <linearGradient
                              id="payoutAmountGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#475C5F"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#475C5F"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#ffffff10"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: '#ffffff60', fontSize: 12 }}
                            tickFormatter={(value) =>
                              new Date(value).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                              })
                            }
                            stroke="#ffffff20"
                          />
                          <YAxis
                            yAxisId="amount"
                            tick={{ fill: '#ffffff60', fontSize: 12 }}
                            tickFormatter={formatCurrencyChart}
                            stroke="#ffffff20"
                          />
                          <YAxis
                            yAxisId="count"
                            orientation="right"
                            tick={{ fill: '#ffffff60', fontSize: 12 }}
                            stroke="#ffffff20"
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                            formatter={(value) => (
                              <span className="text-white/80 text-xs font-['Albert_Sans']">
                                {value}
                              </span>
                            )}
                          />
                          <Area
                            yAxisId="amount"
                            type="monotone"
                            dataKey="amount"
                            fill="url(#payoutAmountGradient)"
                            stroke="#475C5F"
                            strokeWidth={2}
                            name="Amount"
                          />
                          <Line
                            yAxisId="count"
                            type="monotone"
                            dataKey="count"
                            stroke="#5EEAD4"
                            strokeWidth={2}
                            dot={{ fill: '#5EEAD4', r: 3 }}
                            name="Count"
                          />
                          <Bar
                            yAxisId="count"
                            dataKey="success"
                            fill="#10b981"
                            name="Success"
                          />
                          <Bar
                            yAxisId="count"
                            dataKey="failed"
                            fill="#ef4444"
                            name="Failed"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </motion.div>
                )}

                {/* Filter bar */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input
                      className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                      value={filters.search}
                      onChange={(e) =>
                        handleFilterChange('search', e.target.value)
                      }
                      placeholder="Search payouts..."
                    />
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                      value={filters.start_date}
                      onChange={(e) =>
                        handleFilterChange('start_date', e.target.value)
                      }
                    />
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] text-sm"
                      value={filters.end_date}
                      onChange={(e) =>
                        handleFilterChange('end_date', e.target.value)
                      }
                    />
                    <button
                      className="w-full sm:w-auto bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={fetchPayouts}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Apply Filters'}
                    </button>
                  </div>
                </motion.div>

          {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg font-['Albert_Sans'] flex items-center gap-2">
              <FiAlertCircle /> {error}
            </div>
          )}

          {/* Balance Summary Cards */}
          {balance && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
                  >
              {/* Available Wallet Balance */}
                    <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <FiDollarSign className="text-accent text-xl" />
                </div>
                      <div className="flex-1">
                        <div className="text-white/60 text-sm font-medium font-['Albert_Sans'] mb-1">
                          Available Wallet Balance
                        </div>
                        <div className="text-white text-2xl font-semibold font-['Albert_Sans'] mb-1">
                    {formatCurrency(balance.balance?.available_balance || 0)} 
                  </div>
                        {balance.balance?.blocked_balance && parseFloat(balance.balance.blocked_balance) > 0 ? (
                          <div className="text-orange-400 text-xs font-['Albert_Sans']">
                            ⚠️ Freezed: {formatCurrency(balance.balance.blocked_balance)}
                          </div>
                        ) : (
                          <div className="text-green-400 text-xs font-['Albert_Sans']">
                            ✓ Ready to withdraw
                          </div>
                        )}
                </div>
              </div>

              {/* Unsettled Balance */}
                    <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                        <FiClock className="text-yellow-400 text-xl" />
                </div>
                      <div className="flex-1">
                        <div className="text-white/60 text-sm font-medium font-['Albert_Sans'] mb-1">
                          Unsettled Balance
                        </div>
                        <div className="text-white text-2xl font-semibold font-['Albert_Sans'] mb-1">
                    {formatCurrency(balance.balance?.unsettled_revenue || 0)}
                  </div>
                        <div className="text-yellow-400 text-xs font-['Albert_Sans']">
                    ⏳ Waiting for settlement
                  </div>
                </div>
              </div>

              {/* Pending Payouts */}
                    <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <FiClock className="text-blue-400 text-xl" />
                </div>
                      <div className="flex-1">
                        <div className="text-white/60 text-sm font-medium font-['Albert_Sans'] mb-1">
                          Pending Payouts
                        </div>
                        <div className="text-white text-2xl font-semibold font-['Albert_Sans'] mb-1">
                    {formatCurrency(balance.balance?.pending_payouts || 0)}
                  </div>
                        <div className="text-blue-400 text-xs font-['Albert_Sans']">
                    Awaiting processing
                  </div>
                </div>
              </div>

              {/* Total Paid Out */}
                    <div className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <FiCheck className="text-green-400 text-xl" />
                </div>
                      <div className="flex-1">
                        <div className="text-white/60 text-sm font-medium font-['Albert_Sans'] mb-1">
                          Total Paid Out
                        </div>
                        <div className="text-white text-2xl font-semibold font-['Albert_Sans'] mb-1">
                    {formatCurrency(balance.balance?.total_paid_out || 0)}
                  </div>
                        <div className="text-green-400 text-xs font-['Albert_Sans']">
                    Successfully paid out
                  </div>
                </div>
              </div>
                  </motion.div>
                )}

                {/* Commission Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="bg-[#122D32] border border-white/10 rounded-xl p-4 sm:p-6"
                >
                  <div className="flex items-start gap-3">
                    <FiInfo className="text-accent text-xl flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-white font-semibold mb-2 font-['Albert_Sans']">
                        Payout Charges:
                      </h4>
                      <p className="text-white/80 text-sm font-['Albert_Sans']">
                        {balance?.merchant?.freePayoutsRemaining > 0 && (
                          <span className="text-green-400">
                            Under ₹500: FREE ({balance.merchant.freePayoutsRemaining} left) |{' '}
                          </span>
                        )}
                        ₹500-₹1000: Flat ₹30.40 | Above ₹1000: 1.77%
                      </p>
                  </div>
                </div>
                </motion.div>

          {/* Eligibility Notice */}
          {!eligibility.can_request_payout && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 px-4 py-3 rounded-lg font-['Albert_Sans'] flex items-start gap-2"
                  >
                    <FiAlertCircle className="text-xl flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Cannot Request Payout:</strong>{' '}
                      {balance?.payout_eligibility?.reason ||
                        'No settled balance available.'}
              {balance?.settlement_info?.unsettled_transactions > 0 && (
                        <span>
                          {' '}
                          Your unsettled funds will be available after{' '}
                          {balance.settlement_info.next_settlement}.
                        </span>
              )}
            </div>
                  </motion.div>
          )}

          {/* Request Form */}
          {showRequestForm && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-[#122D32] border border-white/10 rounded-xl p-6 sm:p-8"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <FiPlus className="text-accent text-xl" />
                      <h3 className="text-xl font-semibold text-white font-['Albert_Sans']">
                        Request New Payout
                      </h3>
                    </div>
                    <p className="text-white/70 text-sm mb-6 font-['Albert_Sans']">
                Select a settlement date to withdraw all transactions settled on that day
                    </p>

                    <form onSubmit={handleRequestPayout} className="space-y-4">
                {requestData.amount && (
                        <div className="bg-[#263F43] border border-white/10 rounded-lg p-3 text-sm text-white/80 font-['Albert_Sans']">
                          <strong>Fee preview:</strong>{' '}
                          {feePreview.commission
                            ? `₹${feePreview.commission.toFixed(2)} fee — `
                            : 'No fee — '}
                    <span>{feePreview.warning || feePreview.note}</span>
                  </div>
                )}

                      <div>
                        <label className="block text-white text-sm font-medium mb-2 font-['Albert_Sans']">
                          Amount (₹) *
                        </label>
                  <input
                    type="number"
                    value={requestData.amount}
                          onChange={(e) =>
                            handleInputChange('amount', e.target.value)
                          }
                    required
                          placeholder={`Max: ${formatCurrency(
                            eligibility.maximum_payout_amount
                          )}`}
                    max={eligibility.maximum_payout_amount} 
                    min="1"
                          className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                  />
                </div>

                      <div>
                        <label className="block text-white text-sm font-medium mb-2 font-['Albert_Sans']">
                          Transfer Mode *
                        </label>
                    <select
                      value={requestData.transferMode}
                      onChange={(e) => {
                        handleInputChange('transferMode', e.target.value);
                      }}
                          className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                    >
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="crypto">Crypto</option>
                    </select>
                </div>

                {requestData.transferMode === 'upi' ? (
                        <div>
                          <label className="block text-white text-sm font-medium mb-2 font-['Albert_Sans']">
                            UPI ID *
                          </label>
                    <input
                      type="text"
                      value={requestData.beneficiaryDetails.upiId}
                            onChange={(e) =>
                              handleInputChange(
                                'beneficiaryDetails.upiId',
                                e.target.value
                              )
                            }
                      required
                      placeholder="merchant@paytm"
                      pattern="[a-zA-Z0-9._-]+@[a-zA-Z]+"
                            className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                    />
                          <small className="text-white/60 text-xs mt-1 block font-['Albert_Sans']">
                      Example: merchant@paytm, user@ybl
                    </small>
                  </div>
                ) : requestData.transferMode === 'crypto' ? (
                  <>
                    <div>
                      <label className="block text-white text-sm font-medium mb-2 font-['Albert_Sans']">
                        Wallet Address *
                      </label>
                      <input
                        type="text"
                        value={requestData.beneficiaryDetails.walletAddress}
                        onChange={(e) =>
                          handleInputChange(
                            'beneficiaryDetails.walletAddress',
                            e.target.value
                          )
                        }
                        required
                        placeholder="0x..."
                        minLength="10"
                        className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                      />
                      <small className="text-white/60 text-xs mt-1 block font-['Albert_Sans']">
                        Enter the recipient wallet address
                      </small>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white text-sm font-medium mb-2 font-['Albert_Sans']">
                          Network *
                        </label>
                        <select
                          value={requestData.beneficiaryDetails.networkName}
                          onChange={(e) =>
                            handleInputChange(
                              'beneficiaryDetails.networkName',
                              e.target.value
                            )
                          }
                          required
                          className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                        >
                          <option value="">Select Network</option>
                          <option value="Ethereum">Ethereum</option>
                          <option value="Polygon">Polygon</option>
                          <option value="BSC">BSC (Binance Smart Chain)</option>
                          <option value="Bitcoin">Bitcoin</option>
                          <option value="Solana">Solana</option>
                          <option value="Arbitrum">Arbitrum</option>
                          <option value="Optimism">Optimism</option>
                          <option value="Avalanche">Avalanche</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-white text-sm font-medium mb-2 font-['Albert_Sans']">
                          Currency *
                        </label>
                        <select
                          value={requestData.beneficiaryDetails.currencyName}
                          onChange={(e) =>
                            handleInputChange(
                              'beneficiaryDetails.currencyName',
                              e.target.value
                            )
                          }
                          required
                          className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                        >
                          <option value="">Select Currency</option>
                          <option value="USDT">USDT</option>
                          <option value="USDC">USDC</option>
                          <option value="BTC">BTC</option>
                          <option value="ETH">ETH</option>
                          <option value="MATIC">MATIC</option>
                          <option value="BNB">BNB</option>
                          <option value="SOL">SOL</option>
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-white text-sm font-medium mb-2 font-['Albert_Sans']">
                                Account Holder Name *
                              </label>
                        <input
                          type="text"
                                value={
                                  requestData.beneficiaryDetails
                                    .accountHolderName
                                }
                                onChange={(e) =>
                                  handleInputChange(
                                    'beneficiaryDetails.accountHolderName',
                                    e.target.value
                                  )
                                }
                          required
                          placeholder="Full name as per bank"
                                className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                        />
                      </div>

                            <div>
                              <label className="block text-white text-sm font-medium mb-2 font-['Albert_Sans']">
                                Account Number *
                              </label>
                        <input
                          type="text"
                                value={
                                  requestData.beneficiaryDetails.accountNumber
                                }
                                onChange={(e) =>
                                  handleInputChange(
                                    'beneficiaryDetails.accountNumber',
                                    e.target.value
                                  )
                                }
                          required
                          placeholder="1234567890123456"
                          minLength="9"
                          maxLength="18"
                                className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                        />
                      </div>
                    </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-white text-sm font-medium mb-2 font-['Albert_Sans']">
                                IFSC Code *
                              </label>
                        <input
                          type="text"
                                value={
                                  requestData.beneficiaryDetails.ifscCode
                                }
                                onChange={(e) =>
                                  handleInputChange(
                                    'beneficiaryDetails.ifscCode',
                                    e.target.value.toUpperCase()
                                  )
                                }
                          required
                          placeholder="SBIN0001234"
                          pattern="[A-Z]{4}0[A-Z0-9]{6}"
                          maxLength="11"
                                className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                        />
                      </div>

                            <div>
                              <label className="block text-white text-sm font-medium mb-2 font-['Albert_Sans']">
                                Bank Name
                              </label>
                        <input
                          type="text"
                                value={
                                  requestData.beneficiaryDetails.bankName
                                }
                                onChange={(e) =>
                                  handleInputChange(
                                    'beneficiaryDetails.bankName',
                                    e.target.value
                                  )
                                }
                          placeholder="State Bank of India"
                                className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                        />
                      </div>
                    </div>

                          <div>
                            <label className="block text-white text-sm font-medium mb-2 font-['Albert_Sans']">
                              Branch Name
                            </label>
                      <input
                        type="text"
                              value={
                                requestData.beneficiaryDetails.branchName
                              }
                              onChange={(e) =>
                                handleInputChange(
                                  'beneficiaryDetails.branchName',
                                  e.target.value
                                )
                              }
                        placeholder="Katraj Branch"
                              className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans']"
                      />
                    </div>
                  </>
                )}

                      <div>
                        <label className="block text-white text-sm font-medium mb-2 font-['Albert_Sans']">
                          Notes
                        </label>
                  <textarea
                    value={requestData.notes}
                          onChange={(e) =>
                            handleInputChange('notes', e.target.value)
                          }
                    placeholder="Optional: Add notes for this payout"
                    rows="3"
                          className="w-full px-4 py-2.5 bg-[#263F43] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 font-['Albert_Sans'] resize-none"
                  />
                </div>

                      <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestForm(false);
                      resetForm();
                    }}
                          className="px-6 py-2.5 bg-[#263F43] hover:bg-[#263F43]/80 text-white rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                          disabled={
                            requestLoading || !eligibility.can_request_payout
                          }
                          className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {requestLoading
                            ? 'Processing...'
                            : 'Submit Payout Request'}
                  </button>
                </div>
              </form>
                  </motion.div>
          )}


          {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-white/70 font-['Albert_Sans']">
                      Loading payouts...
                    </p>
            </div>
                ) : payouts.length > 0 ? (
                  <div className="bg-[#122D32] border border-white/10 rounded-xl overflow-auto shadow-lg">
                    <table className="w-full border-collapse">
                      <thead className="bg-green-600/20 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                            Payout ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                            Net Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                            Commission
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                            Transfer Mode
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                            Requested At
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider border-b border-white/10 font-['Albert_Sans']">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-[#263F43]">
                    {payouts.map((payout, index) => (
                          <tr
                            key={payout.payoutId || index}
                            className="hover:bg-green-600/10 transition-colors duration-150"
                          >
                            <td className="px-4 py-3 text-sm text-white border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                            {payout.payoutId || `PAYOUT-${index + 1}`}
                            </td>
                            <td className="px-4 py-3 text-sm text-white font-semibold border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                            {formatCurrency(payout.amount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-green-400 font-semibold border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                                {formatCurrency(payout.netAmount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-white font-semibold border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                              {formatCurrency(payout.commission)}
                            </td>
                            <td className="px-4 py-3 text-sm border-b border-white/10 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase font-['Albert_Sans'] ${
                                  payout.status === 'completed'
                                    ? 'bg-green-500 text-white'
                                    : payout.status === 'rejected'
                                    ? 'bg-amber-500 text-white'
                                    : payout.status === 'failed' ||
                                      payout.status === 'cancelled'
                                    ? 'bg-red-500 text-white'
                                    : payout.status === 'requested' ||
                                      payout.status === 'pending' ||
                                      payout.status === 'processing'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-500 text-white'
                                }`}
                              >
                                {getStatusIcon(payout.status)}
                                <span>{payout.status || 'Pending'}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-white border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                              {payout.transferMode === 'bank_transfer'
                                ? 'Bank Transfer'
                                : payout.transferMode === 'crypto'
                                ? 'Crypto'
                                : 'UPI'}
                            </td>
                            <td className="px-4 py-3 text-sm text-white/90 border-b border-white/10 whitespace-nowrap font-['Albert_Sans']">
                              {formatDate(payout.requestedAt)}
                            </td>
                            <td className="px-4 py-3 text-sm border-b border-white/10 whitespace-nowrap">
                              {(payout.status === 'approved' ||
                                payout.status === 'pending' ||
                                payout.status === 'completed') && (
                                <button
                                  onClick={() => downloadInvoicePDF(payout)}
                                  className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-medium font-['Albert_Sans'] flex items-center gap-1.5 transition-all duration-200"
                                >
                                  <FiDownload className="text-xs" />
                                  Invoice
                                </button>
                            )}
                            </td>
                          </tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-[#122D32] border border-white/10 rounded-xl p-12 text-center">
                    <RiMoneyDollarCircleLine className="text-6xl text-white/20 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2 font-['Albert_Sans']">
                      No Payouts Found
                    </h3>
                    <p className="text-white/70 mb-6 font-['Albert_Sans']">
                      No payout requests have been made yet.
                    </p>
                  <button
                    onClick={() => setShowRequestForm(true)}
                      className="bg-accent hover:bg-accent/90 text-white px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!eligibility.can_request_payout}
                  >
                    Request Your First Payout
                  </button>
                </div>
              )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between bg-[#122D32] border border-white/10 rounded-xl p-4">
                    <p className="text-white/70 text-sm font-['Albert_Sans']">
                      Page {pagination.currentPage || filters.page} of{' '}
                      {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(filters.page - 1)}
                        disabled={filters.page === 1}
                        className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium font-['Albert_Sans'] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(filters.page + 1)}
                        disabled={filters.page >= (pagination.totalPages || 1)}
                        className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium font-['Albert_Sans'] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Next
                      </button>
            </div>
        </div>
                )}
      </main>
            </div>
          </div>
        </section>
      </div>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </div>
  );
};

export default PayoutsPage;
