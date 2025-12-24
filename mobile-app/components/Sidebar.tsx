import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [businessName, setBusinessName] = useState('Your Business');

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

  const isActive = (path: string) => pathname === path;

  const getNavItems = (): NavItem[] => {
    // This should check user role - simplified for now
    return [
      { path: '/(admin)/dashboard', label: 'Dashboard', icon: 'grid-outline' },
      { path: '/(admin)/transactions', label: 'Transactions', icon: 'receipt-outline' },
      { path: '/(admin)/payouts', label: 'Payouts', icon: 'arrow-down-outline' },
      { path: '/(admin)/payments', label: 'Payments', icon: 'card-outline' },
      { path: '/(admin)/webhooks', label: 'Webhooks', icon: 'link-outline' },
    ];
  };

  const navItems = getNavItems();

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setCollapsed(!collapsed)}
          style={styles.menuButton}
        >
          <Ionicons name="menu" size={20} color={Colors.textLight} />
        </TouchableOpacity>
        {!collapsed && (
          <Text style={styles.logoText}>
            Ninex<Text style={styles.logoAccent}>Group</Text>
          </Text>
        )}
      </View>

      {/* Navigation */}
      <ScrollView style={styles.nav}>
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.path}
            style={[
              styles.navItem,
              isActive(item.path) && styles.navItemActive,
            ]}
            onPress={() => router.push(item.path as any)}
          >
            <Ionicons
              name={item.icon as any}
              size={22}
              color={isActive(item.path) ? Colors.textLight : Colors.textMutedLight}
            />
            {!collapsed && (
              <Text
                style={[
                  styles.navItemText,
                  isActive(item.path) && styles.navItemTextActive,
                ]}
              >
                {item.label}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {!collapsed && (
          <View style={styles.businessInfo}>
            <Text style={styles.businessLabel}>Business</Text>
            <Text style={styles.businessName} numberOfLines={1}>
              {businessName}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          {!collapsed && <Text style={styles.logoutText}>Logout</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: Colors.bgSecondary,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'column',
    zIndex: 1000,
  },
  sidebarCollapsed: {
    width: 76,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textLight,
    letterSpacing: 0.5,
  },
  logoAccent: {
    color: Colors.accent,
  },
  nav: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  navItemActive: {
    backgroundColor: Colors.accent,
  },
  navItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMutedLight,
  },
  navItemTextActive: {
    color: Colors.textLight,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  businessInfo: {
    marginBottom: 12,
  },
  businessLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSubtleLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    borderRadius: 8,
    padding: 12,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.danger,
  },
});

