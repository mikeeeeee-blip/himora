import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import paymentService from '../../services/paymentService';
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
import './TransactionDetailPage.css';

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
    doc.rect(0, 50, 210, 30, 'F');
    
    doc.setFontSize(28);
    doc.setTextColor(...primaryBlue);
    doc.setFont('helvetica', 'bold');
    doc.text(`₹${transaction.amount?.toLocaleString()}`, 105, 70, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(...textSecondary);
    doc.setFont('helvetica', 'normal');
    doc.text(transaction.currency || 'INR', 105, 77, { align: 'center' });
    
    // Transaction Details
    let yPos = 95;
    
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

  if (loading) {
    return (
      <div className="txd-bg">
        <div className="txd-loader">
          <div className="txd-spinner"></div>
          <p>Loading transaction details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="txd-bg">
        <div className="txd-error-card">
          <FiXCircle className="txd-error-icon" />
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="txd-error-btn">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!transaction) return null;

  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="txd-bg">
      <div className="txd-container">
        <button className="txd-back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> <span>Back to Transactions</span>
        </button>

        {/* Hero Card */}
        <div className="txd-hero-card">
          <div className="txd-hero-bg"></div>
          <div className="txd-hero-content">
            <div 
              className="txd-status-badge" 
              style={{ 
                backgroundColor: statusConfig.bg,
                color: statusConfig.color 
              }}
            >
              <StatusIcon />
              <span>{statusConfig.label}</span>
            </div>
            <h1 className="txd-amount">₹{transaction.amount?.toLocaleString()}</h1>
            <p className="txd-currency">{transaction.currency}</p>
            <div className="txd-hero-id">
              <span>ID: {transaction.transactionId}</span>
              <button 
                className={`txd-copy-btn ${copied ? 'copied' : ''}`}
                onClick={() => copyToClipboard(transaction.transactionId)}
              >
                <FiCopy />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div className="txd-grid">
          {/* Transaction Info */}
          <div className="txd-glass-card">
            <div className="txd-card-header">
              <FiDollarSign className="txd-card-icon" />
              <h3>Transaction Info</h3>
            </div>
            <div className="txd-card-body">
              <div className="txd-row">
                <span className="txd-label">Order ID</span>
                <span className="txd-value">{transaction.orderId}</span>
              </div>
              <div className="txd-row">
                <span className="txd-label">Gateway</span>
                <span className="txd-value txd-badge">{transaction.paymentGateway}</span>
              </div>
              <div className="txd-row">
                <span className="txd-label">Method</span>
                <span className="txd-value">{transaction.paymentMethod}</span>
              </div>
              <div className="txd-row">
                <span className="txd-label">Description</span>
                <span className="txd-value txd-desc">{transaction.description}</span>
              </div>
            </div>
          </div>
{/* Payment References - UTR, Bank Details */}
{(transaction.utr || transaction.bank_transaction_id || transaction.acquirerData) && (
  <div className="txd-glass-card">
    <div className="txd-card-header">
      <FiCreditCard className="txd-card-icon" />
      <h3>Payment References</h3>
    </div>
    <div className="txd-card-body">
      {(transaction.utr || transaction.acquirerData?.utr || transaction.acquirerData?.rrn) && (
        <div className="txd-row">
          <span className="txd-label">UTR/RRN</span>
          <span className="txd-value txd-mono">
            {transaction.utr || transaction.acquirerData?.utr || transaction.acquirerData?.rrn || '-'}
          </span>
        </div>
      )}
      
      {(transaction.bank_transaction_id || transaction.acquirerData?.bank_transaction_id) && (
        <div className="txd-row">
          <span className="txd-label">Bank Txn ID</span>
          <span className="txd-value txd-mono">
            {transaction.bank_transaction_id || transaction.acquirerData?.bank_transaction_id || '-'}
          </span>
        </div>
      )}
      
      {transaction.acquirerData?.auth_code && (
        <div className="txd-row">
          <span className="txd-label">Auth Code</span>
          <span className="txd-value txd-mono">{transaction.acquirerData.auth_code}</span>
        </div>
      )}
      
      {transaction.acquirerData?.card_last4 && (
        <div className="txd-row">
          <span className="txd-label">Card</span>
          <span className="txd-value">
            **** **** **** {transaction.acquirerData.card_last4} 
            {transaction.acquirerData.card_network && (
              <span className="txd-badge" style={{ marginLeft: '8px' }}>
                {transaction.acquirerData.card_network}
              </span>
            )}
          </span>
        </div>
      )}
      
      {transaction.acquirerData?.bank_name && (
        <div className="txd-row">
          <span className="txd-label">Bank</span>
          <span className="txd-value">{transaction.acquirerData.bank_name}</span>
        </div>
      )}
      
      {transaction.acquirerData?.vpa && (
        <div className="txd-row">
          <span className="txd-label">UPI ID</span>
          <span className="txd-value txd-mono">{transaction.acquirerData.vpa}</span>
        </div>
      )}
    </div>
  </div>
)}

          {/* Customer Info */}
          <div className="txd-glass-card">
            <div className="txd-card-header">
              <FiUser className="txd-card-icon" />
              <h3>Customer Details</h3>
            </div>
            <div className="txd-card-body">
              <div className="txd-row">
                <span className="txd-label">Name</span>
                <span className="txd-value">{transaction.customerName || '-'}</span>
              </div>
              <div className="txd-row">
                <span className="txd-label">Email</span>
                <span className="txd-value txd-email">{transaction.customerEmail || '-'}</span>
              </div>
              <div className="txd-row">
                <span className="txd-label">Phone</span>
                <span className="txd-value">{transaction.customerPhone || '-'}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="txd-glass-card">
            <div className="txd-card-header">
              <FiCalendar className="txd-card-icon" />
              <h3>Timeline</h3>
            </div>
            <div className="txd-card-body">
              <div className="txd-timeline">
                <div className="txd-timeline-item">
                  <div className="txd-timeline-dot"></div>
                  <div className="txd-timeline-content">
                    <span className="txd-timeline-label">Created</span>
                    <span className="txd-timeline-date">{formatDate(transaction.createdAt)}</span>
                  </div>
                </div>
                {transaction.paidAt && (
                  <div className="txd-timeline-item">
                    <div className="txd-timeline-dot active"></div>
                    <div className="txd-timeline-content">
                      <span className="txd-timeline-label">Paid</span>
                      <span className="txd-timeline-date">{formatDate(transaction.paidAt)}</span>
                    </div>
                  </div>
                )}
                {transaction.updatedAt && (
                  <div className="txd-timeline-item">
                    <div className="txd-timeline-dot"></div>
                    <div className="txd-timeline-content">
                      <span className="txd-timeline-label">Updated</span>
                      <span className="txd-timeline-date">{formatDate(transaction.updatedAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Settlement Info */}
        {/* Settlement Info */}
<div className="txd-glass-card">
  <div className="txd-card-header">
    <FiCreditCard className="txd-card-icon" />
    <h3>Settlement</h3>
  </div>
  <div className="txd-card-body">
    <div className="txd-row">
      <span className="txd-label">Status</span>
      <span className={`txd-value ${transaction.settlementStatus === 'settled' ? 'txd-badge-success' : 'txd-badge-warning'}`}>
        {transaction.settlementStatus || 'unsettled'}
      </span>
    </div>
    <div className="txd-row">
      <span className="txd-label">Expected</span>
      <span className="txd-value">{formatDate(transaction.expectedSettlementDate)}</span>
    </div>
    {transaction.settlementDate && (
      <div className="txd-row">
        <span className="txd-label">Settled On</span>
        <span className="txd-value txd-badge-success">{formatDate(transaction.settlementDate)}</span>
      </div>
    )}
    {transaction.payoutStatus && (
      <div className="txd-row">
        <span className="txd-label">Payout Status</span>
        <span className="txd-value">{transaction.payoutStatus}</span>
      </div>
    )}
  </div>
</div>

        </div>

        {/* Gateway Details */}
        {(transaction.razorpayPaymentLinkId || transaction.razorpayOrderId) && (
          <div className="txd-glass-card txd-full-width">
            <div className="txd-card-header">
              <h3>Gateway Reference IDs</h3>
            </div>
            <div className="txd-card-body txd-gateway-grid">
              {transaction.razorpayPaymentLinkId && (
                <div className="txd-ref-item">
                  <span className="txd-ref-label">Payment Link ID</span>
                  <span className="txd-ref-value">{transaction.razorpayPaymentLinkId}</span>
                </div>
              )}
              {transaction.razorpayOrderId && (
                <div className="txd-ref-item">
                  <span className="txd-ref-label">Order ID</span>
                  <span className="txd-ref-value">{transaction.razorpayOrderId}</span>
                </div>
              )}
              {transaction.razorpayPaymentId && (
                <div className="txd-ref-item">
                  <span className="txd-ref-label">Payment ID</span>
                  <span className="txd-ref-value">{transaction.razorpayPaymentId}</span>
                </div>
              )}
              {transaction.razorpayReferenceId && (
                <div className="txd-ref-item">
                  <span className="txd-ref-label">Reference ID</span>
                  <span className="txd-ref-value">{transaction.razorpayReferenceId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button className="txd-download-btn" onClick={downloadReceipt}>
          <FiDownload />
          Download Receipt
        </button>
      </div>
    </div>
  );
};

export default TransactionDetailPage;
