import React from 'react';
const Badge = ({ children, tone = 'neutral' }) => {
  const toneClasses = {
    neutral: 'bg-bg-tertiary text-white/90',
    success: 'bg-green-500/20 text-green-400 border-green-500/40',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    error: 'bg-red-500/20 text-red-400 border-red-500/40',
    info: 'bg-accent/20 text-accent border-accent/40',
  };
  
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium font-['Albert_Sans'] border ${toneClasses[tone] || toneClasses.neutral}`}>
      {children}
    </span>
  );
};

export default Badge;
