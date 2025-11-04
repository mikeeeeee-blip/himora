import React, { useState } from 'react';
import { FiMenu, FiLogOut, FiLink } from 'react-icons/fi';
import { MdDashboard, MdPayments } from 'react-icons/md';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { TbArrowsTransferDown } from 'react-icons/tb';
import { HiOutlineChartBar } from 'react-icons/hi2';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import { USER_ROLES } from '../constants/api';

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
        { path: '/superadmin/merchants', label: 'Merchants', icon: <HiOutlineChartBar /> },
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
    <aside className={`fixed inset-y-0 left-0 bg-bg-secondary text-white border-r border-white/10 flex flex-col z-[1000] transition-all duration-300 ${collapsed ? 'w-[76px]' : 'w-60'}`}>
      <div className="h-16 flex items-center gap-2.5 px-3 border-b border-white/10">
        <button 
          className="bg-bg-tertiary border border-white/10 text-white rounded-lg p-2 cursor-pointer transition-all duration-200 hover:bg-accent hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary" 
          onClick={() => setCollapsed(v => !v)} 
          aria-label="Toggle sidebar"
        >
          <FiMenu />
        </button>
        {!collapsed && (
          <div className="font-medium tracking-wide text-white font-['Albert_Sans']">
            Ninex<span className="text-accent font-medium ml-1 font-['Albert_Sans']">Group</span>
          </div>
        )}
      </div>

      <nav className="grid p-3 gap-1.5">
        {navItems.map(item => (
          <button
            key={item.path}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-transparent border-none text-white/80 cursor-pointer transition-all duration-200 text-left font-['Albert_Sans'] ${
              isActive(item.path) 
                ? 'bg-gradient-to-r from-accent to-bg-tertiary text-white shadow-lg font-medium' 
                : 'hover:bg-bg-tertiary hover:text-white hover:translate-x-1'
            } focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary`}
            onClick={() => navigate(item.path)}
          >
            <span className="w-[22px] text-center" aria-hidden>{item.icon}</span>
            {!collapsed && <span className="font-medium text-sm font-['Albert_Sans']">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-auto p-3 border-t border-white/10">
        {!collapsed && (
          <div className="text-left py-2 mb-2">
            <div className="text-xs text-white/60 uppercase tracking-wider font-medium mb-0.5 font-['Albert_Sans']">Business</div>
            <div className="text-sm text-white font-medium tracking-wide mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis font-['Albert_Sans']">
              {localStorage.getItem('businessName') || 'Your Business'}
            </div>
          </div>
        )}

        <button
          className="w-full bg-red-500/20 border border-red-500/40 text-red-400 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 font-['Albert_Sans'] font-medium flex items-center gap-2 hover:bg-red-500/30 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-bg-primary active:translate-y-0"
          onClick={() => {
            authService.logout();
            navigate('/login');
          }}
        >
          <FiLogOut /> {!collapsed && 'Logout'}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;


