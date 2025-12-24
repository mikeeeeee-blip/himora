import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import authService from '../services/authService';
import { USER_ROLES } from '../constants/api';
import { Colors } from '../constants/theme';

export default function LoginScreen() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const authenticated = await authService.isAuthenticated();
        if (authenticated) {
          const role = await authService.getRole();
          if (role === USER_ROLES.SUPERADMIN) {
            router.replace('/(superadmin)/dashboard');
          } else if (role === USER_ROLES.ADMIN) {
            router.replace('/(admin)/dashboard');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };
    checkAuth();
  }, [router]);

  const handleChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleSubmit = async () => {
    // Validate input
    const email = formData.email.trim();
    const password = formData.password.trim();

    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const { role, userId } = await authService.login(email, password);

      // Ensure auth is fully loaded before redirecting
      await authService.ensureAuthLoaded();
      
      // Verify token is available before redirecting
      const token = await authService.getToken();
      if (!token) {
        throw new Error('Token not available after login');
      }

      console.log('Login complete, redirecting to dashboard. Token available:', !!token);

      // ✅ Setup push notifications for superadmin
      if (role === USER_ROLES.SUPERADMIN && userId) {
        try {
          const { setupPushNotificationsForSuperAdmin } = await import('../services/pushNotificationService');
          // Setup push notifications in background (don't wait)
          setupPushNotificationsForSuperAdmin(userId).catch(err => {
            console.error('Failed to setup push notifications:', err);
          });
        } catch (pushError) {
          console.error('Error importing push notification service:', pushError);
        }
      }

      if (role === USER_ROLES.SUPERADMIN) {
        router.replace('/(superadmin)/dashboard');
      } else if (role === USER_ROLES.ADMIN) {
        router.replace('/(admin)/dashboard');
      } else {
        Alert.alert('Error', 'Invalid user role');
        await authService.logout();
      }
    } catch (error: any) {
      console.error('Login error in component:', error);
      Alert.alert('Login Failed', error.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Background X Graphic */}
          <View style={styles.backgroundGraphic}>
            <Image
              source={require('../assets/images/X.png')}
              style={styles.xGraphic}
              resizeMode="contain"
            />
          </View>

          {/* Login Card */}
          <View style={styles.loginCard}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <Image
                source={require('../assets/images/X.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Welcome Text */}
            <View style={styles.welcomeSection}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to access your dashboard</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Email Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Company Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email address"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.email}
                    onChangeText={(value) => handleChange('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity style={styles.modifyButton}>
                    <Ionicons name="create-outline" size={14} color={Colors.accent} />
                    <Text style={styles.modifyText}>Modify</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={formData.password}
                    onChangeText={(value) => handleChange('password', value)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="rgba(255, 255, 255, 0.6)"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me */}
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  )}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.buttonText}>Logging in...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backgroundGraphic: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.3,
    zIndex: 0,
  },
  xGraphic: {
    width: '120%',
    height: '85%',
    tintColor: Colors.accent,
  },
  loginCard: {
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 1,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSubtleLight,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMutedLight,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.textLight,
    paddingVertical: 12,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textLight,
    paddingVertical: 12,
    paddingRight: 8,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
  modifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modifyText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  eyeButton: {
    padding: 8,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 4,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
  },
  rememberMeText: {
    fontSize: 14,
    color: Colors.textSubtleLight,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
});
