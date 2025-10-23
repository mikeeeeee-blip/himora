import React from 'react';
import './ui.css';

const Badge = ({ children, tone = 'neutral' }) => {
  return <span className={`badge badge-${tone}`}>{children}</span>;
};

export default Badge;
