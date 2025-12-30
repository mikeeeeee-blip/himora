import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import authService from '../services/authService';
import { USER_ROLES } from '../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface NavbarProps {
  notificationCount?: number;
  onNotificationPress?: () => void;
}

export default function Navbar({ notificationCount = 0, onNotificationPress }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [businessName, setBusinessName] = useState('User');
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  React.useEffect(() => {
    const loadBusinessName = async () => {
      try {
        const name = await AsyncStorage.getItem('businessName');
        if (name) setBusinessName(name);
      } catch (error) {
        console.error('Error loading business name:', error);
      }
    };
    loadBusinessName();
  }, []);

  React.useEffect(() => {
    const loadNavItems = async () => {
      const role = await authService.getRole();
      
      if (role === USER_ROLES.SUPERADMIN) {
        setNavItems([
          { path: '/(superadmin)/dashboard', label: 'Home', icon: 'home-outline' },
          { path: '/(superadmin)/merchants', label: 'Merchants', icon: 'people-outline' },
          { path: '/(superadmin)/payouts', label: 'Payouts', icon: 'arrow-down-outline' },
          { path: '/(superadmin)/transactions', label: 'Transactions', icon: 'receipt-outline' },
          { path: '/(superadmin)/settings', label: 'Settings', icon: 'settings-outline' },
        ]);
      } else {
        setNavItems([
          { path: '/(admin)/dashboard', label: 'Home', icon: 'home-outline' },
          { path: '/(admin)/payments', label: 'Payin', icon: 'cash-outline' },
          { path: '/(admin)/payouts', label: 'Payout', icon: 'arrow-down-outline' },
          { path: '/(admin)/transactions', label: 'Transactions', icon: 'receipt-outline' },
          { path: '/(admin)/api', label: 'API', icon: 'key-outline' },
          { path: '/(admin)/webhooks', label: 'Webhooks', icon: 'link-outline' },
        ]);
      }
    };
    loadNavItems();
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === '/(admin)/dashboard' || path === '/(superadmin)/dashboard') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  const userInitials = businessName.substring(0, 2).toUpperCase();

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/login');
  };

  return (
    <>
      <View style={styles.navbar}>
        {/* Left Section - Logo and Mobile Menu */}
        <View style={styles.leftSection}>
          <TouchableOpacity
            onPress={() => setShowMobileMenu(true)}
            style={styles.mobileMenuButton}
          >
            <Ionicons name="menu" size={24} color={Colors.textMutedLight} />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/X.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>
              NineX<Text style={styles.logoAccent}>Group</Text>
            </Text>
          </View>
        </View>

        {/* Center Section - Search (Hidden on mobile) */}
        {/* <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.5)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search or ask with AI"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Text style={styles.searchHint}>/</Text>
        </View> */}

        {/* Right Section - Actions */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            onPress={() => {
              if (onNotificationPress) {
                onNotificationPress();
              } else {
                setShowNotifications(!showNotifications);
              }
            }}
            style={styles.iconButton}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.textMutedLight} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowUserMenu(!showUserMenu)}
            style={styles.avatarButton}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* User Menu Dropdown */}
      {showUserMenu && (
        <View style={styles.userMenu}>
          <View style={styles.userMenuHeader}>
            <Text style={styles.userMenuName}>{businessName}</Text>
            <Text style={styles.userMenuRole}>Admin</Text>
          </View>
          <TouchableOpacity
            style={styles.userMenuLogout}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            <Text style={styles.userMenuLogoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mobile Menu Modal */}
      <Modal
        visible={showMobileMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMobileMenu(false)}
      >
        <View style={styles.mobileMenuOverlay}>
          <View style={styles.mobileMenu}>
            <View style={styles.mobileMenuHeader}>
              <Text style={styles.mobileMenuTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setShowMobileMenu(false)}>
                <Ionicons name="close" size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.mobileMenuContent}>
              {navItems.map((item) => (
                <TouchableOpacity
                  key={item.path}
                  style={[
                    styles.mobileMenuItem,
                    isActive(item.path) && styles.mobileMenuItemActive,
                  ]}
                  onPress={() => {
                    router.push(item.path as any);
                    setShowMobileMenu(false);
                  }}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={24}
                    color={isActive(item.path) ? Colors.bgPrimary : Colors.textMutedLight}
                  />
                  <Text
                    style={[
                      styles.mobileMenuItemText,
                      isActive(item.path) && styles.mobileMenuItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.mobileMenuFooter}>
              <View style={styles.mobileMenuUser}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{userInitials}</Text>
                </View>
                <View>
                  <Text style={styles.mobileMenuUserName}>{businessName}</Text>
                  <Text style={styles.mobileMenuUserRole}>Admin</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.mobileMenuLogout}
                onPress={() => {
                  setShowMobileMenu(false);
                  handleLogout();
                }}
              >
                <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                <Text style={styles.mobileMenuLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  navbar: {
    height: 64,
    backgroundColor: Colors.bgPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  mobileMenuButton: {
    padding: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textLight,
  },
  logoAccent: {
    color: Colors.accent,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 20,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxWidth: 300,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textLight,
    paddingVertical: 8,
  },
  searchHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: Colors.textLight,
    fontSize: 10,
    fontWeight: '700',
  },
  avatarButton: {
    padding: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  userMenu: {
    position: 'absolute',
    top: 72,
    right: 16,
    width: 192,
    backgroundColor: Colors.bgSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  userMenuHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  userMenuName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 4,
  },
  userMenuRole: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  userMenuLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  userMenuLogoutText: {
    fontSize: 14,
    color: Colors.danger,
  },
  mobileMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  mobileMenu: {
    width: '85%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: Colors.bgPrimary,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  mobileMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mobileMenuTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textLight,
  },
  mobileMenuContent: {
    flex: 1,
    padding: 8,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  mobileMenuItemActive: {
    backgroundColor: Colors.textLight,
  },
  mobileMenuItemText: {
    fontSize: 16,
    color: Colors.textMutedLight,
  },
  mobileMenuItemTextActive: {
    color: Colors.bgPrimary,
    fontWeight: '500',
  },
  mobileMenuFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  mobileMenuUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  mobileMenuUserName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  mobileMenuUserRole: {
    fontSize: 12,
    color: Colors.textSubtleLight,
  },
  mobileMenuLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    borderRadius: 8,
  },
  mobileMenuLogoutText: {
    fontSize: 14,
    color: Colors.danger,
    fontWeight: '500',
  },
});

