import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import paymentService from '../../services/paymentService';
import Navbar from '../Navbar';
import { 
  FiArrowLeft, 
  FiCheckCircle, 
  FiCopy, 
  FiXCircle,
  FiClock,
  FiDollarSign,
  FiUser,
  FiCreditCard,
  FiCalendar,
  FiDownload
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TransactionDetailPage = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTransaction();
    // eslint-disable-next-line
  }, [transactionId]);

  const fetchTransaction = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await paymentService.getTransactionDetail(transactionId);
      setTransaction(response.transaction);
    } catch (e) {
      setError(e.message || 'Failed to fetch transaction');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
const getStatusConfig = (status) => {
  const configs = {
    paid: { icon: FiCheckCircle, color: '#10b981', bg: '#d1fae5', label: 'PAID' },
    failed: { icon: FiXCircle, color: '#ef4444', bg: '#fee2e2', label: 'FAILED' },
    pending: { icon: FiClock, color: '#f59e0b', bg: '#fef3c7', label: 'PENDING' },
    created: { icon: FiClock, color: '#3b82f6', bg: '#dbeafe', label: 'CREATED' }, // ✅ ADD
    cancelled: { icon: FiXCircle, color: '#64748b', bg: '#f1f5f9', label: 'CANCELLED' }, // ✅ ADD
    expired: { icon: FiXCircle, color: '#94a3b8', bg: '#f8fafc', label: 'EXPIRED' } // ✅ ADD
  };
  return configs[status?.toLowerCase()] || configs.pending;
};


  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const downloadReceipt = () => {
    const doc = new jsPDF();
    
    // Colors matching your dashboard
    const primaryBlue = [37, 99, 235];
    const darkBlue = [29, 78, 216];
    const textPrimary = [30, 41, 59];
    const textSecondary = [100, 116, 139];
    const bgLight = [248, 250, 252];
    
    // Header with gradient background
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, 210, 50, 'F');
    
    // Company/Logo
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Ninex Group', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Receipt', 20, 35);
    
    // Status badge
    const statusConfig = getStatusConfig(transaction.status);
    const statusColors = {
      paid: [16, 185, 129],
      failed: [239, 68, 68],
      pending: [245, 158, 11]
    };
    const statusColor = statusColors[transaction.status?.toLowerCase()] || statusColors.pending;
    
    doc.setFillColor(...statusColor);
    doc.roundedRect(150, 15, 40, 12, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(transaction.status?.toUpperCase() || 'PENDING', 170, 23, { align: 'center' });
    
    // Amount section
    doc.setFillColor(...bgLight);
    doc.rect(0, 50, 210, 50, 'F');
    
    doc.setFontSize(28);
    doc.setTextColor(...primaryBlue);
    doc.setFont('helvetica', 'bold');
    doc.text(`₹${transaction.amount?.toLocaleString()}`, 105, 70, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(...textSecondary);
    doc.setFont('helvetica', 'normal');
    doc.text(transaction.currency || 'INR', 105, 77, { align: 'center' });
    
    // Commission and GST details
    if (transaction.commission !== undefined && transaction.commission !== null) {
      const baseRate = 3.8;
      const gstRate = 18;
      const baseCommission = (transaction.amount * baseRate) / 100;
      const gstAmount = (baseCommission * gstRate) / 100;
      
      doc.setFontSize(9);
      doc.setTextColor(...textSecondary);
      doc.setFont('helvetica', 'normal');
      doc.text(`Commission: ₹${Number(transaction.commission).toFixed(2)}`, 105, 85, { align: 'center' });
      doc.text(`GST (18%): ₹${Number(gstAmount).toFixed(2)}`, 105, 92, { align: 'center' });
    }
    
    // Transaction Details
    let yPos = transaction.commission !== undefined && transaction.commission !== null ? 105 : 95;
    
    doc.setFontSize(14);
    doc.setTextColor(...textPrimary);
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction Details', 20, yPos);
    
    yPos += 10;
    
    const detailsData = [
      ['Transaction ID', transaction.transactionId || '-'],
      ['Order ID', transaction.orderId || '-'],
      ['Payment Gateway', transaction.paymentGateway || '-'],
      ['Payment Method', transaction.paymentMethod || '-'],
      ['Description', transaction.description || '-'],
      ['Date & Time', formatDate(transaction.createdAt)],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [],
      body: detailsData,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 5,
        textColor: textPrimary,
      },
      columnStyles: {
        0: { 
          fontStyle: 'bold', 
          textColor: textSecondary,
          cellWidth: 60 
        },
        1: { 
          fontStyle: 'normal',
          textColor: textPrimary,
        }
      },
      margin: { left: 20, right: 20 }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // Customer Details
    if (transaction.customerName || transaction.customerEmail || transaction.customerPhone) {
      doc.setFontSize(14);
      doc.setTextColor(...textPrimary);
      doc.setFont('helvetica', 'bold');
      doc.text('Customer Details', 20, yPos);
      
      yPos += 10;
      
      const customerData = [];
      if (transaction.customerName) customerData.push(['Name', transaction.customerName]);
      if (transaction.customerEmail) customerData.push(['Email', transaction.customerEmail]);
      if (transaction.customerPhone) customerData.push(['Phone', transaction.customerPhone]);
      
      autoTable(doc, {
        startY: yPos,
        head: [],
        body: customerData,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 5,
          textColor: textPrimary,
        },
        columnStyles: {
          0: { 
            fontStyle: 'bold', 
            textColor: textSecondary,
            cellWidth: 60 
          },
          1: { 
            fontStyle: 'normal',
            textColor: textPrimary,
          }
        },
        margin: { left: 20, right: 20 }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // Payment Timeline
    if (transaction.paidAt || transaction.expectedSettlementDate) {
      doc.setFontSize(14);
      doc.setTextColor(...textPrimary);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Timeline', 20, yPos);
      
      yPos += 10;
      
      const timelineData = [];
      if (transaction.createdAt) timelineData.push(['Created', formatDate(transaction.createdAt)]);
      if (transaction.paidAt) timelineData.push(['Paid', formatDate(transaction.paidAt)]);
      if (transaction.updatedAt) timelineData.push(['Updated', formatDate(transaction.updatedAt)]);
      if (transaction.expectedSettlementDate) {
        timelineData.push(['Expected Settlement', formatDate(transaction.expectedSettlementDate)]);
      }
      if (transaction.settlementDate) {
        timelineData.push(['Settlement Date', formatDate(transaction.settlementDate)]);
      }
      
      autoTable(doc, {
        startY: yPos,
        head: [],
        body: timelineData,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 5,
          textColor: textPrimary,
        },
        columnStyles: {
          0: { 
            fontStyle: 'bold', 
            textColor: textSecondary,
            cellWidth: 60 
          },
          1: { 
            fontStyle: 'normal',
            textColor: textPrimary,
          }
        },
        margin: { left: 20, right: 20 }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    // Payment References (UTR, Bank Details)
if (transaction.utr || transaction.acquirerData?.utr || transaction.bank_transaction_id) {
  doc.setFontSize(14);
  doc.setTextColor(...textPrimary);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment References', 20, yPos);
  
  yPos += 10;
  
  const paymentRefData = [];
  if (transaction.utr || transaction.acquirerData?.utr || transaction.acquirerData?.rrn) {
    paymentRefData.push(['UTR/RRN', transaction.utr || transaction.acquirerData?.utr || transaction.acquirerData?.rrn]);
  }
  if (transaction.bank_transaction_id || transaction.acquirerData?.bank_transaction_id) {
    paymentRefData.push(['Bank Transaction ID', transaction.bank_transaction_id || transaction.acquirerData?.bank_transaction_id]);
  }
  if (transaction.acquirerData?.auth_code) {
    paymentRefData.push(['Auth Code', transaction.acquirerData.auth_code]);
  }
  if (transaction.acquirerData?.card_last4) {
    paymentRefData.push(['Card', `**** **** **** ${transaction.acquirerData.card_last4}${transaction.acquirerData.card_network ? ` (${transaction.acquirerData.card_network})` : ''}`]);
  }
  if (transaction.acquirerData?.bank_name) {
    paymentRefData.push(['Bank Name', transaction.acquirerData.bank_name]);
  }
  if (transaction.acquirerData?.vpa) {
    paymentRefData.push(['UPI ID', transaction.acquirerData.vpa]);
  }
  
  if (paymentRefData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [],
      body: paymentRefData,
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: 5,
        textColor: textPrimary,
      },
      columnStyles: {
        0: { 
          fontStyle: 'bold', 
          textColor: textSecondary,
          cellWidth: 60 
        },
        1: { 
          fontStyle: 'normal',
          textColor: textPrimary,
          font: 'courier'
        }
      },
      margin: { left: 20, right: 20 }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
  }
}

    // Gateway Reference IDs
    if (transaction.razorpayPaymentId || transaction.razorpayOrderId) {
      // Add new page if needed
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(...textPrimary);
      doc.setFont('helvetica', 'bold');
      doc.text('Gateway References', 20, yPos);
      
      yPos += 10;
      
      const gatewayData = [];
      if (transaction.razorpayPaymentLinkId) {
        gatewayData.push(['Payment Link ID', transaction.razorpayPaymentLinkId]);
      }
      if (transaction.razorpayOrderId) {
        gatewayData.push(['Razorpay Order ID', transaction.razorpayOrderId]);
      }
      if (transaction.razorpayPaymentId) {
        gatewayData.push(['Razorpay Payment ID', transaction.razorpayPaymentId]);
      }
      if (transaction.razorpayReferenceId) {
        gatewayData.push(['Reference ID', transaction.razorpayReferenceId]);
      }
      
      autoTable(doc, {
        startY: yPos,
        head: [],
        body: gatewayData,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 5,
          textColor: textPrimary,
          font: 'courier'
        },
        columnStyles: {
          0: { 
            fontStyle: 'bold', 
            textColor: textSecondary,
            cellWidth: 60,
            font: 'helvetica'
          },
          1: { 
            fontStyle: 'normal',
            textColor: textPrimary,
            font: 'courier'
          }
        },
        margin: { left: 20, right: 20 }
      });
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(...primaryBlue);
      doc.setLineWidth(0.5);
      doc.line(20, 280, 190, 280);
      
      doc.setFontSize(9);
      doc.setTextColor(...textSecondary);
      doc.setFont('helvetica', 'normal');
      doc.text('This is a computer-generated receipt and does not require a signature.', 105, 287, { align: 'center' });
      
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, 190, 292, { align: 'right' });
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 20, 292);
    }
    
    // Save the PDF
    const fileName = `Receipt_${transaction.transactionId || 'Transaction'}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F383D]">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] pt-24">
          <div className="w-16 h-16 border-4 border-white/20 border-t-accent rounded-full animate-spin"></div>
          <p className="mt-4 text-white/70 font-['Albert_Sans']">Loading transaction details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1F383D]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh] pt-24 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#122D32] border border-white/10 rounded-xl p-8 text-center max-w-md w-full"
          >
            <FiXCircle className="text-red-400 text-5xl mx-auto mb-4" />
            <h3 className="text-2xl font-medium text-white mb-2 font-['Albert_Sans']">
              Oops! Something went wrong
            </h3>
            <p className="text-white/70 mb-6 font-['Albert_Sans']">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="bg-accent hover:bg-accent/90 text-white px-6 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              Go Back
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!transaction) return null;

  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-[#1F383D]">
      <Navbar />

      {/* Split Layout: Top Half (Graphic) + Bottom Half (Data) */}
      <div className="relative">
        {/* Fixed X Graphic - Background Layer */}
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ top: "4rem" }}
        >
          <img
            src="/X.png"
            alt="X graphic"
            className="object-contain hidden sm:block"
            style={{
              filter: "drop-shadow(0 0 40px rgba(94, 234, 212, 0.5))",
              width: "120%",
              height: "85%",
              maxWidth: "none",
              maxHeight: "none",
            }}
          />
          <img
            src="/X.png"
            alt="X graphic"
            className="object-contain sm:hidden"
            style={{
              filter: "drop-shadow(0 0 20px rgba(94, 234, 212, 0.5))",
              width: "100%",
              height: "70%",
              maxWidth: "none",
              maxHeight: "none",
            }}
          />
        </div>

        {/* Scrollable Content Section - Overlays on top */}
        <section className="relative z-10 min-h-screen bg-transparent">
          <div className="bg-transparent pt-24 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1400px] mx-auto">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                {/* Back Button */}
                <motion.button
                  variants={itemVariants}
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 bg-[#122D32] border border-white/10 text-white px-4 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:bg-white/5 hover:-translate-x-1"
                >
                  <FiArrowLeft />
                  <span className="hidden sm:inline">Back to Transactions</span>
                </motion.button>

                {/* Hero Card */}
                <motion.div
                  variants={itemVariants}
                  className="relative bg-gradient-to-br from-accent/40 to-accent/70 border border-white/10 rounded-xl p-6 sm:p-8 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
                  <div className="relative text-center">
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold font-['Albert_Sans'] mb-4"
                      style={{
                        backgroundColor: statusConfig.bg,
                        color: statusConfig.color,
                      }}
                    >
                      <StatusIcon />
                      <span>{statusConfig.label}</span>
                    </motion.div>
                    <motion.h1
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-2 font-['Albert_Sans']"
                    >
                      ₹{transaction.amount?.toLocaleString()}
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-white/70 text-lg mb-4 font-['Albert_Sans']"
                    >
                      {transaction.currency}
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 font-mono text-sm text-white"
                    >
                      <span>ID: {transaction.transactionId}</span>
                      <button
                        onClick={() => copyToClipboard(transaction.transactionId)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          copied
                            ? "bg-green-500 text-white"
                            : "bg-white/20 hover:bg-white/30 text-white"
                        }`}
                      >
                        <FiCopy className="text-xs" />
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Transaction Info */}
                  <motion.div
                    variants={itemVariants}
                    className="bg-[#122D32] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                      <FiDollarSign className="text-accent text-xl" />
                      <h3 className="text-lg font-semibold text-white font-['Albert_Sans']">
                        Transaction Info
                      </h3>
                    </div>
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                          Order ID
                        </span>
                        <span className="text-sm text-white font-semibold text-right max-w-[60%] break-words font-['Albert_Sans']">
                          {transaction.orderId}
                        </span>
                      </div>
                      <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                          Gateway
                        </span>
                        <span className="px-2.5 py-1 bg-accent/20 text-accent rounded-full text-xs font-semibold font-['Albert_Sans']">
                          {transaction.paymentGateway}
                        </span>
                      </div>
                      <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                          Method
                        </span>
                        <span className="text-sm text-white font-semibold text-right max-w-[60%] break-words font-['Albert_Sans']">
                          {transaction.paymentMethod}
                        </span>
                      </div>
                      <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                          Description
                        </span>
                        <span className="text-sm text-white/80 font-normal text-right max-w-[60%] break-words font-['Albert_Sans']">
                          {transaction.description}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Financial Details */}
                  <motion.div
                    variants={itemVariants}
                    className="bg-[#122D32] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                      <FiDollarSign className="text-accent text-xl" />
                      <h3 className="text-lg font-semibold text-white font-['Albert_Sans']">
                        Financial Details
                      </h3>
                    </div>
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                          Amount
                        </span>
                        <span className="text-sm text-white font-semibold text-right font-['Albert_Sans']">
                          ₹{transaction.amount?.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                          Commission
                        </span>
                        <span className="text-sm text-white font-semibold text-right font-['Albert_Sans']">
                          {transaction.commission !== undefined && transaction.commission !== null
                            ? `₹${Number(transaction.commission).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}`
                            : "₹0.00"}
                        </span>
                      </div>
                      <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                          GST Rate Amount
                        </span>
                        <span className="text-sm text-white font-semibold text-right font-['Albert_Sans']">
                          {(() => {
                            // Calculate GST amount
                            // GST rate is 18% (from commissionCalculator.js)
                            const baseRate = 3.8; // 3.8% base commission rate
                            const gstRate = 18; // 18% GST rate
                            let gstAmount = 0;
                            
                            if (transaction.amount && transaction.amount > 0) {
                              // Calculate base commission first, then GST on it
                              const baseCommission = (transaction.amount * baseRate) / 100;
                              gstAmount = (baseCommission * gstRate) / 100;
                            }
                            
                            return `₹${Number(gstAmount).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}`;
                          })()}
                        </span>
                      </div>
                      {transaction.netAmount !== undefined && transaction.netAmount !== null && (
                        <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                          <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                            Net Amount
                          </span>
                          <span className="text-sm text-white font-semibold text-right font-['Albert_Sans']">
                            ₹{Number(transaction.netAmount).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                  {/* Payment References - UTR, Bank Details */}
                  {(transaction.utr ||
                    transaction.bank_transaction_id ||
                    transaction.acquirerData) && (
                    <motion.div
                      variants={itemVariants}
                      className="bg-[#122D32] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                        <FiCreditCard className="text-accent text-xl" />
                        <h3 className="text-lg font-semibold text-white font-['Albert_Sans']">
                          Payment References
                        </h3>
                      </div>
                      <div className="p-4 sm:p-6 space-y-4">
                        {(transaction.utr ||
                          transaction.acquirerData?.utr ||
                          transaction.acquirerData?.rrn) && (
                          <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                            <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                              UTR/RRN
                            </span>
                            <span className="text-sm font-mono text-white/90 bg-white/5 px-2 py-1 rounded text-right max-w-[60%] break-words">
                              {transaction.utr ||
                                transaction.acquirerData?.utr ||
                                transaction.acquirerData?.rrn ||
                                "-"}
                            </span>
                          </div>
                        )}

                        {(transaction.bank_transaction_id ||
                          transaction.acquirerData?.bank_transaction_id) && (
                          <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                            <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                              Bank Txn ID
                            </span>
                            <span className="text-sm font-mono text-white/90 bg-white/5 px-2 py-1 rounded text-right max-w-[60%] break-words">
                              {transaction.bank_transaction_id ||
                                transaction.acquirerData?.bank_transaction_id ||
                                "-"}
                            </span>
                          </div>
                        )}

                        {transaction.acquirerData?.auth_code && (
                          <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                            <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                              Auth Code
                            </span>
                            <span className="text-sm font-mono text-white/90 bg-white/5 px-2 py-1 rounded text-right max-w-[60%] break-words">
                              {transaction.acquirerData.auth_code}
                            </span>
                          </div>
                        )}

                        {transaction.acquirerData?.card_last4 && (
                          <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                            <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                              Card
                            </span>
                            <span className="text-sm text-white font-semibold text-right max-w-[60%] break-words font-['Albert_Sans']">
                              **** **** **** {transaction.acquirerData.card_last4}
                              {transaction.acquirerData.card_network && (
                                <span className="ml-2 px-2.5 py-1 bg-accent/20 text-accent rounded-full text-xs font-semibold">
                                  {transaction.acquirerData.card_network}
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {transaction.acquirerData?.bank_name && (
                          <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                            <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                              Bank
                            </span>
                            <span className="text-sm text-white font-semibold text-right max-w-[60%] break-words font-['Albert_Sans']">
                              {transaction.acquirerData.bank_name}
                            </span>
                          </div>
                        )}

                        {transaction.acquirerData?.vpa && (
                          <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                            <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                              UPI ID
                            </span>
                            <span className="text-sm font-mono text-white/90 bg-white/5 px-2 py-1 rounded text-right max-w-[60%] break-words">
                              {transaction.acquirerData.vpa}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Customer Info */}
                  <motion.div
                    variants={itemVariants}
                    className="bg-[#122D32] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                      <FiUser className="text-accent text-xl" />
                      <h3 className="text-lg font-semibold text-white font-['Albert_Sans']">
                        Customer Details
                      </h3>
                    </div>
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                          Name
                        </span>
                        <span className="text-sm text-white font-semibold text-right max-w-[60%] break-words font-['Albert_Sans']">
                          {transaction.customerName || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                          Email
                        </span>
                        <span className="text-sm font-mono text-white/90 text-right max-w-[60%] break-words">
                          {transaction.customerEmail || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                          Phone
                        </span>
                        <span className="text-sm text-white font-semibold text-right max-w-[60%] break-words font-['Albert_Sans']">
                          {transaction.customerPhone || "-"}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Timeline */}
                  <motion.div
                    variants={itemVariants}
                    className="bg-[#122D32] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                      <FiCalendar className="text-accent text-xl" />
                      <h3 className="text-lg font-semibold text-white font-['Albert_Sans']">
                        Timeline
                      </h3>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="space-y-6">
                        <div className="flex gap-4 relative">
                          <div className="relative">
                            <div className="w-6 h-6 rounded-full bg-[#263F43] border-2 border-accent flex-shrink-0"></div>
                            {transaction.paidAt && (
                              <div className="absolute left-1/2 top-6 w-0.5 h-6 bg-gradient-to-b from-accent/50 to-transparent -translate-x-1/2"></div>
                            )}
                          </div>
                          <div className="flex-1 pb-6">
                            <span className="block text-sm font-semibold text-white font-['Albert_Sans'] mb-1">
                              Created
                            </span>
                            <span className="block text-xs text-white/60 font-['Albert_Sans']">
                              {formatDate(transaction.createdAt)}
                            </span>
                          </div>
                        </div>
                        {transaction.paidAt && (
                          <div className="flex gap-4 relative">
                            <div className="relative">
                              <div className="w-6 h-6 rounded-full bg-accent border-2 border-accent flex-shrink-0 shadow-lg shadow-accent/30"></div>
                              {transaction.updatedAt && (
                                <div className="absolute left-1/2 top-6 w-0.5 h-6 bg-gradient-to-b from-accent/50 to-transparent -translate-x-1/2"></div>
                              )}
                            </div>
                            <div className="flex-1 pb-6">
                              <span className="block text-sm font-semibold text-white font-['Albert_Sans'] mb-1">
                                Paid
                              </span>
                              <span className="block text-xs text-white/60 font-['Albert_Sans']">
                                {formatDate(transaction.paidAt)}
                              </span>
                            </div>
                          </div>
                        )}
                        {transaction.updatedAt && (
                          <div className="flex gap-4">
                            <div className="w-6 h-6 rounded-full bg-[#263F43] border-2 border-accent flex-shrink-0"></div>
                            <div className="flex-1">
                              <span className="block text-sm font-semibold text-white font-['Albert_Sans'] mb-1">
                                Updated
                              </span>
                              <span className="block text-xs text-white/60 font-['Albert_Sans']">
                                {formatDate(transaction.updatedAt)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Settlement Info */}
                  <motion.div
                    variants={itemVariants}
                    className="bg-[#122D32] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                      <FiCreditCard className="text-accent text-xl" />
                      <h3 className="text-lg font-semibold text-white font-['Albert_Sans']">
                        Settlement
                      </h3>
                    </div>
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                          Status
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase font-['Albert_Sans'] ${
                            transaction.settlementStatus === "settled"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {transaction.settlementStatus || "unsettled"}
                        </span>
                      </div>
                      <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                        <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                          Expected
                        </span>
                        <span className="text-sm text-white font-semibold text-right max-w-[60%] break-words font-['Albert_Sans']">
                          {formatDate(transaction.expectedSettlementDate)}
                        </span>
                      </div>
                      {transaction.settlementDate && (
                        <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                          <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                            Settled On
                          </span>
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold font-['Albert_Sans']">
                            {formatDate(transaction.settlementDate)}
                          </span>
                        </div>
                      )}
                      {transaction.payoutStatus && (
                        <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
                          <span className="text-sm text-white/60 font-medium font-['Albert_Sans']">
                            Payout Status
                          </span>
                          <span className="text-sm text-white font-semibold text-right max-w-[60%] break-words font-['Albert_Sans']">
                            {transaction.payoutStatus}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Gateway Details */}
                {(transaction.razorpayPaymentLinkId ||
                  transaction.razorpayOrderId) && (
                  <motion.div
                    variants={itemVariants}
                    className="bg-[#122D32] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200"
                  >
                    <div className="px-4 sm:px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                      <h3 className="text-lg font-semibold text-white font-['Albert_Sans']">
                        Gateway Reference IDs
                      </h3>
                    </div>
                    <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {transaction.razorpayPaymentLinkId && (
                        <div className="bg-[#263F43] border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all">
                          <span className="block text-xs text-white/60 font-semibold uppercase mb-2 font-['Albert_Sans']">
                            Payment Link ID
                          </span>
                          <span className="block font-mono text-sm text-white/90 break-all font-['Albert_Sans']">
                            {transaction.razorpayPaymentLinkId}
                          </span>
                        </div>
                      )}
                      {transaction.razorpayOrderId && (
                        <div className="bg-[#263F43] border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all">
                          <span className="block text-xs text-white/60 font-semibold uppercase mb-2 font-['Albert_Sans']">
                            Order ID
                          </span>
                          <span className="block font-mono text-sm text-white/90 break-all font-['Albert_Sans']">
                            {transaction.razorpayOrderId}
                          </span>
                        </div>
                      )}
                      {transaction.razorpayPaymentId && (
                        <div className="bg-[#263F43] border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all">
                          <span className="block text-xs text-white/60 font-semibold uppercase mb-2 font-['Albert_Sans']">
                            Payment ID
                          </span>
                          <span className="block font-mono text-sm text-white/90 break-all font-['Albert_Sans']">
                            {transaction.razorpayPaymentId}
                          </span>
                        </div>
                      )}
                      {transaction.razorpayReferenceId && (
                        <div className="bg-[#263F43] border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all">
                          <span className="block text-xs text-white/60 font-semibold uppercase mb-2 font-['Albert_Sans']">
                            Reference ID
                          </span>
                          <span className="block font-mono text-sm text-white/90 break-all font-['Albert_Sans']">
                            {transaction.razorpayReferenceId}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Action Button */}
                <motion.button
                  variants={itemVariants}
                  onClick={downloadReceipt}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white px-6 py-3.5 rounded-lg font-semibold font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg shadow-accent/20"
                >
                  <FiDownload className="text-lg" />
                  Download Receipt
                </motion.button>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TransactionDetailPage;
