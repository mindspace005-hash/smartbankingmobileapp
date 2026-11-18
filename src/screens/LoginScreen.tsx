import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Dimensions,
} from 'react-native';
import { UserRole } from '../types';
import { useThemeColors } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { NetworkIndicator } from '../components/NetworkIndicator';
import { CONFIG } from '../config';

const { height } = Dimensions.get('window');

interface LoginCredential {
  username: string;
  password: string;
  role: UserRole;
  name: string;
  icon: string;
  roleLabel: string;
  accentColor: string;
  agentId?: string;
  phone?: string;
}

const MOCK_CREDENTIALS: LoginCredential[] = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'ADMIN',
    name: 'Rajesh Kumar',
    icon: '👑',
    roleLabel: 'Administrator',
    accentColor: '#F59E0B',
  },
  {
    username: 'cust',
    password: 'cust123',
    role: 'CUSTOMER',
    name: 'Aniket Sharma',
    icon: '👤',
    roleLabel: 'Customer',
    accentColor: '#EC4899',
  },
];

interface LoginScreenProps {
  onLogin: (username?: string, password?: string, role?: UserRole, credential?: any) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { agents } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  
  const { theme, colors, toggleTheme } = useThemeColors();
  const isCream = theme === 'cream';

  // Use only static mocks (Admin, Customer) for demo logins
  const dynamicCredentials: LoginCredential[] = [
    ...MOCK_CREDENTIALS
  ];

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }
    setLoading(true);

    // Check old method for Admin, Customer, and Demo Agents
    const mockMatched = dynamicCredentials.find(
      (c) =>
        c.username.toLowerCase() === username.trim().toLowerCase() &&
        c.password === password
    );

    if (mockMatched) {
      try {
        await onLogin(undefined, undefined, mockMatched.role, mockMatched);
      } catch (e: any) {
        setError(e.message || 'Login failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Dynamic Login via API
    try {
      await onLogin(username.trim(), password, 'AGENT');
    } catch (err: any) {
      let errorMsg = 'Invalid username or password.';
      if (err.response && err.response.data && err.response.data.message) {
        errorMsg = err.response.data.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fillCredential = (cred: LoginCredential) => {
    setUsername(cred.username);
    setPassword(cred.password);
    setError('');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.primaryDark }]}>
      {/* ── Header Section ── */}
      <View style={[styles.headerSection, { backgroundColor: colors.primaryDark }]}>
        <NetworkIndicator style={{ position: 'absolute', top: 54, right: 70 }} />
        {/* Theme Toggle Button */}
        <TouchableOpacity
          style={styles.themeToggleBtn}
          onPress={toggleTheme}
          activeOpacity={0.8}
        >
          <Text style={styles.themeToggleText}>{isCream ? '🌙' : '☀️'}</Text>
        </TouchableOpacity>

        {/* Decorative circles */}
        <View style={[styles.decCircle1, { backgroundColor: colors.primaryLight + '33' }]} />
        <View style={[styles.decCircle2, { backgroundColor: colors.primaryLight + '20' }]} />

        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoEmoji}>🏦</Text>
          </View>
        </View>

        <Text style={styles.welcomeTitle}>Mindspace</Text>
        <Text style={[styles.welcomeSub, isCream && { color: '#FFEDD5' }]}>Sign in to continue</Text>
      </View>

      {/* ── White Card Section ── */}
      <ScrollView
        style={[styles.cardScroll, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.cardContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.signInTitle}>Sign In</Text>
          <Text style={styles.signInSub}>Enter your credentials below</Text>

          {/* Error */}
          {error !== '' && (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          {/* Username */}
          <View style={[
            styles.inputField,
            { backgroundColor: colors.background, borderColor: isCream ? '#FFEDD5' : '#EDE9FE' },
            usernameFocused && [styles.inputFocused, { borderColor: colors.primary, shadowColor: colors.primary, backgroundColor: isCream ? '#FFF7ED' : '#EEF2FF' }],
            error !== '' && !username && styles.inputError,
          ]}>
            <Text style={styles.fieldIcon}>👤</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Username"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={(t) => { setUsername(t); setError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setUsernameFocused(true)}
              onBlur={() => setUsernameFocused(false)}
            />
          </View>

          {/* Password */}
          <View style={[
            styles.inputField,
            { backgroundColor: colors.background, borderColor: isCream ? '#FFEDD5' : '#EDE9FE' },
            passwordFocused && [styles.inputFocused, { borderColor: colors.primary, shadowColor: colors.primary, backgroundColor: isCream ? '#FFF7ED' : '#EEF2FF' }],
          ]}>
            <Text style={styles.fieldIcon}>🔒</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              secureTextEntry={!showPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </Pressable>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }, loading && { opacity: 0.75 }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.signInBtnText}>Sign In  →</Text>
            )}
          </TouchableOpacity>



          <Text style={styles.footer}>PAT Financial Pigmi System v1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#4338CA',
  },

  // ── Header ──
  themeToggleBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  themeToggleText: {
    fontSize: 20,
  },
  headerSection: {
    backgroundColor: '#4338CA',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  decCircle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#6366F133',
    top: -60,
    right: -60,
  },
  decCircle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#818CF820',
    bottom: -40,
    left: -30,
  },
  logoWrap: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoEmoji: { fontSize: 32 },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  welcomeSub: {
    color: '#C7D2FE',
    fontSize: 14,
    marginTop: 6,
  },

  // ── White Card ──
  cardScroll: {
    flex: 1,
    backgroundColor: '#F5F3FF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  cardContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingTop: 32,
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  signInTitle: {
    color: '#1E1B4B',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  signInSub: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 24,
  },

  // ── Error ──
  errorRow: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Inputs ──
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 14,
  },
  inputFocused: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  fieldIcon: { fontSize: 16, marginRight: 10 },
  textInput: {
    flex: 1,
    color: '#1E1B4B',
    fontSize: 15,
    fontWeight: '500',
  },
  eyeIcon: { fontSize: 16, paddingLeft: 8 },

  // ── Button ──
  signInBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  // ── Divider ──
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Demo Cards ──
  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  demoIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoIconText: { fontSize: 20 },
  demoInfo: { flex: 1 },
  demoName: {
    color: '#1E1B4B',
    fontSize: 14,
    fontWeight: '700',
  },
  demoRole: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  tapChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tapChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  footer: {
    color: '#D1D5DB',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: 0.4,
  },
});
