import React from 'react';

const Modal = ({ open, title, children, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, danger = false }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-bg-secondary border border-white/10 rounded-xl shadow-2xl max-w-md w-full p-6">
        {title && <h3 className="text-xl font-medium text-white mb-4 font-['Albert_Sans']">{title}</h3>}
        <div className="text-white/80 mb-6">{children}</div>
        <div className="flex gap-3 justify-end">
          <button 
            className="bg-bg-secondary text-white border border-accent px-4 py-2 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:bg-bg-tertiary hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className={`bg-gradient-to-r from-accent to-bg-tertiary hover:from-bg-tertiary hover:to-accent text-white px-4 py-2 rounded-lg font-medium font-['Albert_Sans'] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary ${
              danger ? 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-500' : ''
            }`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
