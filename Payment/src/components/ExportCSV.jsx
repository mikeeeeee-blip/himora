import React from 'react';
import { FiDownload } from 'react-icons/fi';
import './ExportCSV.css';
const ExportCSV = ({ data, filename = 'transactions.csv', className = '' }) => {
  const convertToCSV = (objArray) => {
    if (!objArray || objArray.length === 0) {
      return '';
    }

    // Get headers from first object
    const headers = Object.keys(objArray[0]);
    
    // Create CSV header row
    const csvHeaders = headers.join(',');
    
    // Create CSV data rows
    const csvRows = objArray.map(obj => {
      return headers.map(header => {
        let value = obj[header];
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }
        
        // Convert dates to readable format
        if (header.includes('_at') || header.includes('_date')) {
          value = new Date(value).toLocaleString('en-IN');
        }
        
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(',');
    });
    
    // Combine headers and rows
    return [csvHeaders, ...csvRows].join('\n');
  };

  const downloadCSV = () => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <button 
      onClick={downloadCSV}
      className={`export-btn ${className}`}
      title="Export to CSV"
    >
      <FiDownload />
      Export CSV
    </button>
  );
};

export default ExportCSV;
