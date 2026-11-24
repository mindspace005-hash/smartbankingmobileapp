import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Landmark,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Palette,
  Globe,
  ShieldCheck,
  Smartphone,
  KeyRound,
  Sparkles,
  Server,
  Briefcase,
  UserCheck,
  Users,
} from 'lucide-react-native';
import { UserRole } from '../types';
import { useThemeColors } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { CONFIG } from '../config';
import { NetworkIndicator } from '../components/NetworkIndicator';
import { RADIUS } from '../theme/tokens';
import { triggerErrorHaptic, triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface LoginScreenProps {
  onLogin: (username?: string, password?: string, role?: UserRole, credential?: any) => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { activateCustomerTempPin, loginDemo } = useAuth();
  const [connectionMode, setConnectionMode] = useState<'DEMO' | 'LIVE'>('DEMO');
  const [selectedPortal, setSelectedPortal] = useState<UserRole>('AGENT');
  const [customerSetupMode, setCustomerSetupMode] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cifNo, setCifNo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');

  const { colors, language, t, toggleTheme, toggleLanguage } = useThemeColors();

  const isDemo = connectionMode === 'DEMO';

  const portalLabel =
    selectedPortal === 'AGENT'
      ? 'पिग्मी एजंट'
      : selectedPortal === 'ADMIN'
      ? 'मॅनेजर'
      : 'खातेदार';

  const extractApiError = (err: any) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    if (typeof data === 'string' && data.trim().length > 0) {
      return data.trim();
    }
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string' && data.message.trim().length > 0) {
        return data.message.trim();
      }
      if (typeof data.title === 'string' && data.title.trim().length > 0 && status !== 401) {
        return data.title.trim();
      }
    }
    if (status === 401) {
      return 'माहिती जुळली नाही किंवा सर्व्हरवर खातेदार सेवा अपडेट करणे बाकी आहे (401).';
    }
    return err?.message || 'लॉगिन अयशस्वी झाले. कृपया माहिती तपासा.';
  };

  const handleQuickDemo = async (role: UserRole) => {
    setError('');
    triggerSuccessHaptic();
    setLoading(true);
    try {
      await loginDemo(role, username.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');

    // Demo Mode: zero strict validation — any credentials (or direct tap) opens selected portal smoothly
    if (isDemo) {
      await handleQuickDemo(selectedPortal);
      return;
    }

    // Live Server Mode: preserve full CBS authentication
    if (selectedPortal === 'CUSTOMER' && customerSetupMode) {
      if (!username.trim() || !cifNo.trim() || password.trim().length < 4) {
        triggerErrorHaptic();
        setError('मोबाईल क्र., CIF क्रमांक आणि किमान ४ अंकी नवीन mPIN आवश्यक आहे.');
        return;
      }
      triggerLightHaptic();
      setLoading(true);
      try {
        await activateCustomerTempPin(username.trim(), cifNo.trim(), password.trim());
      } catch (err: any) {
        triggerErrorHaptic();
        setError(extractApiError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!username.trim() || !password.trim()) {
      triggerErrorHaptic();
      setError('युजरनेम / मोबाईल क्र. आणि पासवर्ड आवश्यक आहे.');
      return;
    }

    triggerLightHaptic();
    setLoading(true);
    try {
      await onLogin(username.trim(), password, selectedPortal === 'CUSTOMER' ? 'CUSTOMER' : undefined);
    } catch (err: any) {
      triggerErrorHaptic();
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const portalTabs: { key: UserRole; label: string }[] = [
    { key: 'AGENT', label: 'पिग्मी एजंट' },
    { key: 'ADMIN', label: 'मॅनेजर' },
    { key: 'CUSTOMER', label: 'खातेदार' },
  ];

  const usernamePlaceholder = isDemo
    ? selectedPortal === 'AGENT'
      ? 'युजरनेम (उदा. agent — ऐच्छिक)'
      : selectedPortal === 'ADMIN'
      ? 'युजरनेम (उदा. manager — ऐच्छिक)'
      : 'मोबाईल / CIF (उदा. CIF0001 — ऐच्छिक)'
    : selectedPortal === 'CUSTOMER'
    ? 'नोंदणीकृत मोबाईल क्र. किंवा CIF'
    : t.usernamePlaceholder;

  const passwordPlaceholder = isDemo
    ? 'पासवर्ड / mPIN (डेमोसाठी ऐच्छिक)'
    : selectedPortal === 'CUSTOMER'
    ? customerSetupMode
      ? 'नवीन ४–६ अंकी mPIN सेट करा'
      : 'mPIN (किंवा पहिली वेळ असल्यास CIF क्र.)'
    : t.passwordPlaceholder;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={colors.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerSection}
        >
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          <View style={styles.topUtilityRow}>
            <NetworkIndicator />
            <View style={styles.utilityBtns}>
              <TouchableOpacity
                style={[
                  styles.utilityBtn,
                  isDemo && { backgroundColor: 'rgba(251, 191, 36, 0.28)', borderColor: '#FDE68A' },
                ]}
                onPress={() => {
                  triggerLightHaptic();
                  setConnectionMode((prev) => (prev === 'DEMO' ? 'LIVE' : 'DEMO'));
                  setCustomerSetupMode(false);
                  setError('');
                }}
                activeOpacity={0.75}
              >
                {isDemo ? <Sparkles size={13} color="#FDE68A" /> : <Server size={13} color="#FFFFFF" />}
                <Text style={[styles.utilityBtnText, isDemo && { color: '#FEF3C7' }]}>
                  {isDemo ? 'DEMO' : 'LIVE'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.utilityBtn}
                onPress={() => {
                  triggerLightHaptic();
                  toggleLanguage();
                }}
                activeOpacity={0.75}
              >
                <Globe size={14} color="#FFFFFF" />
                <Text style={styles.utilityBtnText}>{language === 'mr' ? 'MR' : 'EN'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.utilityBtn}
                onPress={() => {
                  triggerLightHaptic();
                  toggleTheme();
                }}
                activeOpacity={0.75}
              >
                <Palette size={15} color="#FDE68A" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.brandBlock}>
            <View style={styles.emblemOuter}>
              <Landmark size={34} color="#FFFFFF" strokeWidth={2} />
            </View>
            <Text style={styles.bankTitle}>{CONFIG.SANSTHA_NAME}</Text>
            <Text style={[styles.bankSub, { color: colors.headerSubtext }]}>{t.appTagline}</Text>
          </View>
        </LinearGradient>

        <View style={styles.cardWrap}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.primaryDark,
              },
            ]}
          >
            {/* Unified 3-Portal Role Switcher */}
            <View style={[styles.roleSwitch, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              {portalTabs.map((tab) => {
                const active = selectedPortal === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.roleTab, active && { backgroundColor: colors.primaryDark }]}
                    onPress={() => {
                      triggerLightHaptic();
                      setSelectedPortal(tab.key);
                      if (tab.key !== 'CUSTOMER') setCustomerSetupMode(false);
                      setError('');
                    }}
                  >
                    <Text
                      style={[styles.roleTabText, { color: active ? '#FFFFFF' : colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.signInTitle, { color: colors.text }]}>
                  {isDemo
                    ? `${portalLabel} डेमो लॉगिन`
                    : selectedPortal === 'CUSTOMER'
                    ? customerSetupMode
                      ? 'खातेदार तात्पुरता mPIN सेट करा'
                      : 'खातेदार लॉगिन'
                    : selectedPortal === 'ADMIN'
                    ? 'मॅनेजर / अ‍ॅडमिन लॉगिन'
                    : t.signInTitle}
                </Text>
                <Text style={[styles.signInSub, { color: colors.textMuted }]}>
                  {isDemo
                    ? 'कोणत्याही व्हॅलिडेशनशिवाय थेट डेमो सुरू करा'
                    : selectedPortal === 'CUSTOMER'
                    ? customerSetupMode
                      ? 'नोंदणीकृत मोबाईल व CIF क्र. ने नवीन mPIN सेट करा'
                      : 'मोबाईल क्र. / CIF आणि तुमचा mPIN प्रविष्ट करा'
                    : t.signInSub}
                </Text>
              </View>
            </View>

            {error !== '' && (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerBg, borderColor: '#FCA5A5' }]}>
                <AlertCircle size={16} color={colors.dangerText} />
                <Text style={[styles.errorText, { color: colors.dangerText }]}>{error}</Text>
              </View>
            )}

            {/* Username / Mobile Input */}
            <View
              style={[
                styles.inputField,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                usernameFocused && { borderColor: colors.primary, backgroundColor: '#FFFFFF' },
              ]}
            >
              {selectedPortal === 'CUSTOMER' ? (
                <Smartphone size={18} color={usernameFocused ? colors.primary : colors.textMuted} />
              ) : (
                <User size={18} color={usernameFocused ? colors.primary : colors.textMuted} />
              )}
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder={usernamePlaceholder}
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={(txt) => {
                  setUsername(txt);
                  if (error) setError('');
                }}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={!isDemo && selectedPortal === 'CUSTOMER' && customerSetupMode ? 'phone-pad' : 'default'}
                returnKeyType="next"
              />
            </View>

            {/* CIF Input (only during Live First-Time Temp PIN Activation) */}
            {!isDemo && selectedPortal === 'CUSTOMER' && customerSetupMode && (
              <View style={[styles.inputField, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <KeyRound size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="ग्राहक CIF क्रमांक (उदा. CIF0001)"
                  placeholderTextColor={colors.textMuted}
                  value={cifNo}
                  onChangeText={(txt) => {
                    setCifNo(txt);
                    if (error) setError('');
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            )}

            {/* Password / mPIN Input */}
            <View
              style={[
                styles.inputField,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                passwordFocused && { borderColor: colors.primary, backgroundColor: '#FFFFFF' },
              ]}
            >
              <Lock size={18} color={passwordFocused ? colors.primary : colors.textMuted} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder={passwordPlaceholder}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(txt) => {
                  setPassword(txt);
                  if (error) setError('');
                }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                keyboardType={!isDemo && selectedPortal === 'CUSTOMER' && customerSetupMode ? 'numeric' : 'default'}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.textMuted} />
                ) : (
                  <Eye size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.submitShadow}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryMid]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitText}>
                      {isDemo
                        ? `${portalLabel} डेमो सुरू करा`
                        : selectedPortal === 'CUSTOMER' && customerSetupMode
                        ? 'mPIN सेट करा आणि प्रवेश घ्या'
                        : t.signInBtn}
                    </Text>
                    <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Quick 1-Tap Demo Launch Buttons */}
            {isDemo && (
              <View style={styles.quickDemoBlock}>
                <View style={styles.quickDemoHeader}>
                  <Sparkles size={13} color={colors.primary} />
                  <Text style={[styles.quickDemoLabel, { color: colors.textSecondary }]}>
                    झटपट 1-Tap डेमो पोर्टल्स (सर्व वापरकर्ते)
                  </Text>
                </View>
                <View style={styles.quickDemoRow}>
                  <TouchableOpacity
                    style={[styles.quickDemoBtn, { backgroundColor: colors.infoBg, borderColor: colors.border }]}
                    onPress={() => handleQuickDemo('AGENT')}
                    disabled={loading}
                    activeOpacity={0.78}
                  >
                    <Briefcase size={15} color={colors.primaryDark} />
                    <Text style={[styles.quickDemoBtnText, { color: colors.primaryDark }]}>पिग्मी अ‍ॅप</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickDemoBtn, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                    onPress={() => handleQuickDemo('ADMIN')}
                    disabled={loading}
                    activeOpacity={0.78}
                  >
                    <UserCheck size={15} color="#B45309" />
                    <Text style={[styles.quickDemoBtnText, { color: '#B45309' }]}>मॅनेजर अ‍ॅप</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickDemoBtn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}
                    onPress={() => handleQuickDemo('CUSTOMER')}
                    disabled={loading}
                    activeOpacity={0.78}
                  >
                    <Users size={15} color="#047857" />
                    <Text style={[styles.quickDemoBtnText, { color: '#047857' }]}>खातेदार अ‍ॅप</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!isDemo && selectedPortal === 'CUSTOMER' && (
              <TouchableOpacity
                style={styles.toggleSetupBtn}
                onPress={() => {
                  triggerLightHaptic();
                  setCustomerSetupMode((p) => !p);
                  setError('');
                }}
              >
                <Text style={[styles.toggleSetupText, { color: colors.primary }]}>
                  {customerSetupMode
                    ? 'आधीच mPIN सेट आहे? परत लॉगिनवर जा'
                    : 'प्रथमच लॉगिन? मोबाईल + CIF ने तात्पुरता mPIN सेट करा'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.securityNoteRow}>
              <ShieldCheck size={14} color={colors.success} />
              <Text style={[styles.securityNoteText, { color: colors.textMuted }]}>
                {isDemo
                  ? 'Demo Mode Active • Live Server साठी वर DEMO वर टॅप करा'
                  : '256-bit Encrypted CBS Session • Device Protected'}
              </Text>
            </View>
          </View>

          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            PAT Financial Core Banking System • v1.0
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  headerSection: {
    paddingTop: 18,
    paddingBottom: 68,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  decCircle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -40,
  },
  decCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -20,
    left: -30,
  },
  topUtilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  utilityBtns: {
    flexDirection: 'row',
    gap: 7,
  },
  utilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  utilityBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  brandBlock: {
    alignItems: 'center',
  },
  emblemOuter: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.32)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bankTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  bankSub: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  cardWrap: {
    paddingHorizontal: 18,
    marginTop: -40,
    paddingBottom: 28,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  roleSwitch: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signInTitle: {
    fontSize: 18.5,
    fontWeight: '800',
  },
  signInSub: {
    fontSize: 12.5,
    marginTop: 3,
    marginBottom: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 11,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  submitShadow: {
    marginTop: 4,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    elevation: 4,
  },
  submitBtn: {
    height: 50,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  quickDemoBlock: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.25)',
  },
  quickDemoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 10,
  },
  quickDemoLabel: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  quickDemoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickDemoBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  quickDemoBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  toggleSetupBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleSetupText: {
    fontSize: 12.5,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  securityNoteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  securityNoteText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 20,
  },
});
