import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ShieldCheck,
  Phone,
  MessageCircle,
  Home,
  KeyRound,
  Globe,
  Palette,
  Building2,
  LifeBuoy,
  X,
  CheckCircle2,
  UserCheck,
} from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useThemeColors } from '../../../context/ThemeContext';
import { useToast } from '../../../components/ui/ToastProvider';
import { StatusPill } from '../../../components/ui/StatusPill';
import { SectionHeader } from '../../../components/ui/AppCard';
import { CONFIG } from '../../../config';
import { RADIUS } from '../../../theme/tokens';
import { openPhoneDialer, openWhatsAppMessage } from '../../../utils/communication';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '../../../utils/haptics';
import { useCustomerDashboard } from '../CustomerDashboardContext';

export const CustomerProfileTab: React.FC<any> = ({ navigation }) => {
  const { changeCustomerMpin } = useAuth();
  const { colors, language, toggleLanguage, toggleTheme } = useThemeColors();
  const { showToast } = useToast();
  const { data, triggerServiceModal } = useCustomerDashboard();

  const [showPinModal, setShowPinModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  const profile = data?.profile;

  const handleSavePin = async () => {
    setSavingPin(true);
    try {
      const res = await changeCustomerMpin(oldPin, newPin);
      triggerSuccessHaptic();
      showToast(res.message, 'success', 'सुरक्षा अपडेट');
      setShowPinModal(false);
      setOldPin('');
      setNewPin('');
    } catch (err: any) {
      triggerErrorHaptic();
      showToast(err?.message || 'mPIN बदलताना त्रुटी आली.', 'error');
    } finally {
      setSavingPin(false);
    }
  };

  if (!profile) return null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Digital Member Identity Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileTop}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryDark }]}>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>
                {profile.customerName.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{profile.customerName}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                CIF: {profile.cifNo} • सभासद क्र. {profile.memberNo}
              </Text>
            </View>
            {profile.kycVerified && (
              <StatusPill
                label="KYC Verified"
                tone="success"
                icon={<ShieldCheck size={11} color="#047857" />}
              />
            )}
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            {[
              { l: 'मोबाईल क्रमांक', v: profile.mobileNo },
              { l: 'आधार क्रमांक', v: profile.maskedAadhaar },
              { l: 'पॅन (PAN)', v: profile.maskedPan },
              { l: 'वारसदार (Nominee)', v: `${profile.nomineeName} (${profile.nomineeRelation})` },
              { l: 'पत्ता', v: profile.address },
            ].map((row, i) => (
              <View
                key={i}
                style={[styles.infoRow, i < 4 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              >
                <Text style={{ fontSize: 11.5, color: colors.textMuted, fontWeight: '600' }}>{row.l}</Text>
                <Text style={{ fontSize: 12, color: colors.text, fontWeight: '700', flex: 1, textAlign: 'right' }}>
                  {row.v}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Assigned Pigmy Agent Contact Card */}
        <SectionHeader title="तुमचे नेमलेले पिग्मी एजंट" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11 }}>
            <View style={[styles.iconBox, { backgroundColor: colors.infoBg }]}>
              <UserCheck size={19} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.text }}>{profile.assignedAgentName}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                मोबाईल: {profile.assignedAgentPhone} • अधिकृत डोरस्टेप एजंट
              </Text>
            </View>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
              onPress={() => openPhoneDialer(profile.assignedAgentPhone)}
            >
              <Phone size={14} color={colors.primaryDark} />
              <Text style={[styles.utilText, { color: colors.text }]}>कॉल</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}
              onPress={() =>
                openWhatsAppMessage(
                  `नमस्कार ${profile.assignedAgentName}, मी ${profile.customerName} (CIF: ${profile.cifNo}). कृपया आज वसुलीसाठी याल का?`,
                  profile.assignedAgentPhone
                )
              }
            >
              <MessageCircle size={14} color="#047857" />
              <Text style={[styles.utilText, { color: '#047857' }]}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark }]}
              onPress={() => {
                triggerLightHaptic();
                triggerServiceModal({ type: 'DOORSTEP_PICKUP' });
                navigation.navigate('CustomerServices');
              }}
            >
              <Home size={14} color="#FFFFFF" />
              <Text style={[styles.utilText, { color: '#FFFFFF' }]}>बोलवा</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security & App Preferences */}
        <SectionHeader title="सुरक्षा व अ‍ॅप सेटिंग्ज" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 4 }]}>
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            onPress={() => {
              triggerLightHaptic();
              setShowPinModal(true);
            }}
          >
            <KeyRound size={17} color={colors.primaryDark} />
            <Text style={[styles.settingText, { color: colors.text }]}>लॉगिन mPIN बदला</Text>
            <StatusPill label="बदला" tone="primary" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            onPress={() => {
              triggerLightHaptic();
              toggleLanguage();
            }}
          >
            <Globe size={17} color={colors.primaryDark} />
            <Text style={[styles.settingText, { color: colors.text }]}>अ‍ॅप भाषा (Language)</Text>
            <StatusPill label={language === 'mr' ? 'मराठी' : 'English'} tone="neutral" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              triggerLightHaptic();
              toggleTheme();
            }}
          >
            <Palette size={17} color={colors.primaryDark} />
            <Text style={[styles.settingText, { color: colors.text }]}>रंग थीम बदला (Theme)</Text>
            <StatusPill label="Switch" tone="neutral" />
          </TouchableOpacity>
        </View>

        {/* Branch Helpdesk & Support Ticket */}
        <SectionHeader title="शाखा संपर्क व तक्रार निवारण" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 11 }}>
            <View style={[styles.iconBox, { backgroundColor: colors.warningBg }]}>
              <Building2 size={18} color={colors.warningText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{profile.branchName}</Text>
              <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>{profile.branchAddress}</Text>
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: 2 }}>
                {profile.branchTimings}
              </Text>
            </View>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
              onPress={() => openPhoneDialer(profile.branchPhone)}
            >
              <Phone size={14} color={colors.primaryDark} />
              <Text style={[styles.utilText, { color: colors.text }]}>शाखा फोन</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.utilBtn, { backgroundColor: colors.infoBg, borderColor: colors.border, flex: 1.4 }]}
              onPress={() => {
                triggerLightHaptic();
                triggerServiceModal({
                  type: 'SUPPORT_TICKET',
                  title: 'ग्राहक मदत / तक्रार',
                });
                navigation.navigate('CustomerServices');
              }}
            >
              <LifeBuoy size={14} color={colors.primaryDark} />
              <Text style={[styles.utilText, { color: colors.primaryDark }]}>तक्रार / मदत तिकीट नोंदवा</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 10.5, color: colors.textMuted, textAlign: 'center', marginTop: 10 }}>
            {CONFIG.SANSTHA_NAME} • ग्राहक सेवा पोर्टल
          </Text>
        </View>
      </ScrollView>

      {/* Change mPIN Modal */}
      <Modal visible={showPinModal} animationType="slide" transparent onRequestClose={() => setShowPinModal(false)}>
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.sheetBox, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>लॉगिन mPIN बदला</Text>
              <TouchableOpacity
                style={[styles.closeCircle, { backgroundColor: colors.surfaceMuted }]}
                onPress={() => setShowPinModal(false)}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 5 }}>
              सध्याचा mPIN (डेमोसाठी ऐच्छिक)
            </Text>
            <TextInput
              style={[styles.pinInput, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text }]}
              value={oldPin}
              onChangeText={setOldPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 5 }}>
              नवीन ४–६ अंकी mPIN *
            </Text>
            <TextInput
              style={[styles.pinInput, { backgroundColor: colors.surfaceMuted, borderColor: colors.primary, color: colors.text }]}
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              placeholder="किमान ४ अंक"
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primaryDark }]}
              onPress={handleSavePin}
              disabled={savingPin}
            >
              <CheckCircle2 size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                {savingPin ? 'सेव्ह होत आहे...' : 'नवीन mPIN सेव्ह करा'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 13,
    marginBottom: 14,
  },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 11,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8.5,
    gap: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnRow: { flexDirection: 'row', gap: 8 },
  utilBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  utilText: { fontSize: 12, fontWeight: '800' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  settingText: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'flex-end',
  },
  sheetBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 26,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinInput: {
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 48,
    borderRadius: RADIUS.md,
    marginTop: 4,
  },
});
