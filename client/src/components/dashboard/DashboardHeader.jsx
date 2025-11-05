import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const DashboardHeader = ({ 
  userName, 
  dateRange, 
  onDateRangeChange,
  onCreatePaymentLink 
}) => {
  const navigate = useNavigate();
  
  const getCurrentDateRange = () => {
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    return `Displaying the data from ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  };

  return (
    <div className="relative mb-8">
      {/* Decorative X Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-20 w-96 h-96 opacity-10">
        <div className="relative w-full h-full">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[300px] font-bold text-teal-400/20 leading-none font-['Albert_Sans']">
              X
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left Section - Greeting */}
        <div>
          <h1 className="text-4xl font-medium text-white mb-2 font-['Albert_Sans']">
            Hello {userName || 'User'}!
          </h1>
          <p className="text-white/70 text-sm font-['Albert_Sans']">
            {getCurrentDateRange()}
          </p>
        </div>

        {/* Right Section - Date Range & Action */}
        <div className="flex items-center gap-4">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 bg-bg-secondary border border-white/10 rounded-lg p-1">
            {['Daily', 'Weekly', 'Monthly'].map((range) => (
              <button
                key={range}
                onClick={() => onDateRangeChange && onDateRangeChange(range.toLowerCase())}
                className={`px-4 py-2 rounded-md text-sm font-medium font-['Albert_Sans'] transition-all duration-200 ${
                  dateRange === range.toLowerCase()
                    ? 'bg-accent text-white shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Create Payment Link Button */}
          <button
            onClick={() => onCreatePaymentLink ? onCreatePaymentLink() : navigate('/admin/payments')}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-5 py-2.5 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-bg-primary"
          >
            <FiPlus className="text-lg" />
            Create payment link
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;

