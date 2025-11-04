import React, { useEffect } from 'react';
import { FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const typeClasses = {
    success: 'bg-green-500/20 text-green-400 border-green-500/40',
    error: 'bg-red-500/20 text-red-400 border-red-500/40',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    info: 'bg-accent/20 text-accent border-accent/40',
  };

  return (
    <div 
      className={`fixed top-4 right-4 px-4 py-3 rounded-lg border shadow-lg flex items-center gap-2 z-50 animate-slide-in ${typeClasses[type] || typeClasses.success}`}
      role="status" 
      aria-live="polite"
    >
      <span className="text-lg flex-shrink-0">{type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}</span>
      <span className="text-sm font-medium font-['Albert_Sans'] flex-1">{message}</span>
      <button 
        className="text-lg leading-none hover:opacity-70 transition-opacity ml-2" 
        onClick={onClose} 
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
