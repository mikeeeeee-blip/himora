import React, { useState } from 'react';
import { FiMenu, FiLogOut, FiLink } from 'react-icons/fi';
import { MdDashboard, MdPayments } from 'react-icons/md';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { TbArrowsTransferDown } from 'react-icons/tb';
import { HiOutlineChartBar } from 'react-icons/hi2';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import { USER_ROLES } from '../constants/api';
import './Sidebar.css';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const getNavItems = () => {
    const userRole = authService.getRole();
    if (userRole === USER_ROLES.SUPERADMIN) {
      return [
        { path: '/superadmin', label: 'Dashboard', icon: <MdDashboard /> },
        { path: '/superadmin/signup', label: 'Signup', icon: <HiOutlineChartBar /> },
        { path: '/superadmin/transactions', label: 'Transactions', icon: <HiOutlineChartBar /> },
        { path: '/superadmin/payouts', label: 'Payouts', icon: <TbArrowsTransferDown /> },
        { path: '/admin', label: 'Admin Features', icon: <MdPayments /> },
      ];
    }
    return [
      { path: '/admin', label: 'Dashboard', icon: <MdDashboard /> },
      { path: '/admin/transactions', label: 'Transactions', icon: <HiOutlineChartBar /> },
      { path: '/admin/payouts', label: 'Payouts', icon: <TbArrowsTransferDown /> },
      { path: '/admin/payins', label: 'Payins', icon: <RiMoneyDollarCircleLine /> },
      { path: '/admin/payments', label: 'Payments', icon: <MdPayments /> },
      { path: '/admin/webhooks', label: 'Webhooks', icon: <FiLink /> },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="collapse-btn" onClick={() => setCollapsed(v => !v)} aria-label="Toggle sidebar"><FiMenu /></button>
        {!collapsed && <div className="brand">Ninex<span className="brand-sub">Group</span></div>}
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.path}
            className={`side-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="side-icon" aria-hidden>{item.icon}</span>
            {!collapsed && <span className="side-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout" onClick={() => { authService.logout(); navigate('/login'); }}><FiLogOut /> {!collapsed && 'Logout'}</button>
      </div>
    </aside>
  );
};

export default Sidebar;


