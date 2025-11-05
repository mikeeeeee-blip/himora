import React, { useState, useEffect, useRef } from "react";
import {
  FiHome,
  FiSearch,
  FiBell,
  FiSettings,
  FiLogOut,
  FiLink,
  FiMenu,
  FiX,
} from "react-icons/fi";
import { MdDashboard, MdPayments } from "react-icons/md";
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import { TbArrowsTransferDown } from "react-icons/tb";
import { HiOutlineChartBar } from "react-icons/hi2";
import { useNavigate, useLocation } from "react-router-dom";
import authService from "../services/authService";
import { USER_ROLES } from "../constants/api";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        !event.target.closest("[data-mobile-menu-button]")
      ) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showMobileMenu]);

  const isActive = (path) => {
    // For dashboard routes, check if pathname starts with the path
    if (path === "/admin" || path === "/superadmin") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const getNavItems = () => {
    const userRole = authService.getRole();
    if (userRole === USER_ROLES.SUPERADMIN) {
      return [
        { path: "/superadmin", label: "Home", icon: <FiHome /> },
        {
          path: "/superadmin/merchants",
          label: "Payin",
          icon: <HiOutlineChartBar />,
        },
        {
          path: "/superadmin/payouts",
          label: "Payout",
          icon: <TbArrowsTransferDown />,
        },
        {
          path: "/superadmin/transactions",
          label: "Transactions",
          icon: <HiOutlineChartBar />,
        },
        { path: "/admin/webhooks", label: "Webhooks", icon: <FiLink /> },
      ];
    }
    return [
      { path: "/admin", label: "Home", icon: <FiHome /> },
      {
        path: "/admin/payins",
        label: "Payin",
        icon: <RiMoneyDollarCircleLine />,
      },
      {
        path: "/admin/payouts",
        label: "Payout",
        icon: <TbArrowsTransferDown />,
      },
      {
        path: "/admin/transactions",
        label: "Transactions",
        icon: <HiOutlineChartBar />,
      },
      { path: "/admin/webhooks", label: "Webhooks", icon: <FiLink /> },
    ];
  };

  const navItems = getNavItems();
  const businessName = localStorage.getItem("businessName") || "User";
  const userInitials = businessName.substring(0, 2).toUpperCase();

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      // Handle search functionality
      console.log("Searching for:", searchQuery);
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#001D22] z-[1000] flex items-center justify-between px-4 sm:px-6">
        {/* Left Section - Logo and Mobile Menu Button */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          <button
            data-mobile-menu-button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            aria-label="Toggle menu"
          >
            {showMobileMenu ? (
              <FiX className="text-xl" />
            ) : (
              <FiMenu className="text-xl" />
            )}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br  rounded-lg flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0">
            {/* src="/X.png" */}
            <img
              src="/X.png"
              alt="Ninex Group Logo"
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
            />
            </div>
            <span className="text-white font-medium text-base sm:text-lg font-['Albert_Sans'] hidden sm:block whitespace-nowrap">
              NineX<span className="text-accent">Group</span>
            </span>
          </div>

          {/* Vertical Divider after Logo - Hidden on mobile */}
          <div className="h-6 w-px bg-white/20 mx-2 sm:mx-4 hidden md:block"></div>

          {/* Navigation Items - Desktop Only */}
          <div className="hidden lg:flex items-center gap-0">
            {navItems.map((item, index) => (
              <React.Fragment key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm font-['Albert_Sans'] transition-all duration-200 ${
                    isActive(item.path)
                      ? "bg-white text-bg-primary shadow-md"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
                {index < navItems.length - 1 && (
                  <div className="h-6 w-px bg-white/20 mx-2"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Center Section - Search Bar - Hidden on mobile, shown on tablet+ */}
        <div className="flex-1 max-w-xs mx-2 sm:mx-4 hidden md:block">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-base" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Search or ask with AI"
              className="w-full pl-9 pr-8 py-1.5 bg-bg-tertiary border border-white/10 rounded-full text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-medium">
              /
            </div>
          </div>
        </div>

        {/* Vertical Divider before Right Section - Hidden on mobile */}
        <div className="h-6 w-px bg-white/20 mx-2 hidden md:block"></div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Search Button */}
          <button
            onClick={() => {
              // You can implement a mobile search modal here
              console.log("Mobile search clicked");
            }}
            className="md:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            aria-label="Search"
          >
            <FiSearch className="text-xl" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              aria-label="Notifications"
            >
              <FiBell className="text-xl" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-bg-secondary"></span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-72 sm:w-80 bg-bg-secondary border border-white/10 rounded-lg shadow-xl py-2 z-50 max-h-96 overflow-y-auto">
                <div className="px-4 py-2 border-b border-white/10">
                  <h3 className="text-white font-medium text-sm font-['Albert_Sans']">
                    Notifications
                  </h3>
                </div>
                <div className="px-4 py-8 text-center text-white/60 text-sm font-['Albert_Sans']">
                  No new notifications
                </div>
              </div>
            )}
          </div>

          {/* User Avatar */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm hover:ring-2 hover:ring-accent transition-all duration-200"
              aria-label="User menu"
            >
              {userInitials}
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-12 w-48 bg-bg-secondary border border-white/10 rounded-lg shadow-xl py-2 z-50">
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-white font-medium text-sm font-['Albert_Sans']">
                    {businessName}
                  </p>
                  <p className="text-white/60 text-xs font-['Albert_Sans']">
                    {authService.getRole() === USER_ROLES.SUPERADMIN
                      ? "Superadmin"
                      : "Admin"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/20 flex items-center gap-2 text-sm font-['Albert_Sans'] transition-colors"
                >
                  <FiLogOut />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        ></div>
      )}

      {/* Mobile Menu Sidebar */}
      <div
        ref={mobileMenuRef}
        className={`fixed top-16 left-0 bottom-0 w-80 max-w-[85vw] bg-[#001D22] border-r border-white/10 z-[1001] transform transition-transform duration-300 ease-in-out lg:hidden ${
          showMobileMenu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Search Bar */}
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-base" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Search or ask with AI"
                className="w-full pl-9 pr-8 py-2.5 bg-bg-tertiary border border-white/10 rounded-full text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-['Albert_Sans']"
              />
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="space-y-1 px-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm font-['Albert_Sans'] transition-all duration-200 ${
                    isActive(item.path)
                      ? "bg-white text-bg-primary shadow-md"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* User Info Section */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-sm">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm font-['Albert_Sans'] truncate">
                  {businessName}
                </p>
                <p className="text-white/60 text-xs font-['Albert_Sans']">
                  {authService.getRole() === USER_ROLES.SUPERADMIN
                    ? "Superadmin"
                    : "Admin"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowMobileMenu(false);
                handleLogout();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium text-sm font-['Albert_Sans'] transition-colors"
            >
              <FiLogOut />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
