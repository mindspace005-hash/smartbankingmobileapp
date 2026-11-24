import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Home,
  HandCoins,
  Landmark,
  FileText,
  X,
  Send,
  Clock,
} from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useThemeColors } from '../../../context/ThemeContext';
import { useToast } from '../../../components/ui/ToastProvider';
import { StatusPill } from '../../../components/ui/StatusPill';
import { SectionHeader } from '../../../components/ui/AppCard';
import { CustomerServiceRequestType } from '../../../types';
import { RADIUS, TABULAR_NUMS } from '../../../theme/tokens';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '../../../utils/haptics';
import { useCustomerDashboard } from '../CustomerDashboardContext';

export const CustomerServicesTab: React.FC = () => {
  const { isDemoMode, submitCustomerServiceRequest } = useAuth();
  const { colors } = useThemeColors();
  const { showToast } = useToast();
  const {
    data,
    refreshing,
    reloadData,
    serviceModalPrefill,
    clearServiceModalPrefill,
  } = useCustomerDashboard();

  const [activeType, setActiveType] = useState<CustomerServiceRequestType | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [slotInput, setSlotInput] = useState('सकाळ (९ ते १२)');
  const [notesInput, setNotesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openModalFor = (
    type: CustomerServiceRequestType,
    prefill?: { title?: string; amount?: string; subtitle?: string }
  ) => {
    setActiveType(type);
    setNotesInput(prefill?.subtitle || '');
    if (type === 'DOORSTEP_PICKUP') {
      setSelectedOption(prefill?.title || 'दैनिक पिग्मी ठेव');
      setAmountInput(prefill?.amount || '500');
      setSlotInput('सकाळ (९ ते १२)');
      setTitleInput('');
    } else if (type === 'LOAN_APPLY') {
      setSelectedOption(prefill?.title || 'सुवर्ण तारण कर्ज');
      setAmountInput(prefill?.amount || '100000');
      setSlotInput('२४ महिने');
      setTitleInput('');
    } else if (type === 'DEPOSIT_OPEN') {
      setSelectedOption(prefill?.title || 'मुदत ठेव (FD)');
      setAmountInput(prefill?.amount || '50000');
      setSlotInput('२४ महिने');
      setTitleInput('');
    } else if (type === 'CERTIFICATE') {
      setSelectedOption(prefill?.title || 'वार्षिक व्याज प्रमाणपत्र');
      setAmountInput('');
      setTitleInput('');
    } else {
      setSelectedOption('खाते / व्यवहार मदत');
      setAmountInput('');
      setTitleInput(prefill?.title || '');
    }
  };

  useEffect(() => {
    if (serviceModalPrefill) {
      openModalFor(serviceModalPrefill.type, serviceModalPrefill);
      clearServiceModalPrefill();
    }
  }, [serviceModalPrefill, clearServiceModalPrefill]);

  const handleSubmit = async () => {
    if (!activeType) return;
    const numericAmt = parseFloat(amountInput) || undefined;
    if ((activeType === 'LOAN_APPLY' || activeType === 'DEPOSIT_OPEN') && (!numericAmt || numericAmt <= 0)) {
      triggerErrorHaptic();
      showToast('कृपया वैध रक्कम प्रविष्ट करा.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      let reqTitle = selectedOption || titleInput.trim() || 'ग्राहक सेवा विनंती';
      let reqSub = notesInput.trim();
      let details: { label: string; value: string }[] | undefined;

      if (activeType === 'DOORSTEP_PICKUP') {
        reqTitle = `एजंट घरी बोलवा — ${selectedOption}`;
        reqSub = `वेळ: ${slotInput}${numericAmt ? ` • अंदाजे ₹${numericAmt.toLocaleString('en-IN')}` : ''}`;
      } else if (activeType === 'LOAN_APPLY') {
        reqTitle = `${selectedOption} अर्ज`;
        reqSub = `कालावधी: ${slotInput} • रक्कम: ₹${(numericAmt || 0).toLocaleString('en-IN')}`;
        details = [
          { label: 'कर्ज प्रकार', value: selectedOption },
          { label: 'मागितलेली रक्कम', value: `₹${(numericAmt || 0).toLocaleString('en-IN')}` },
          { label: 'अपेक्षित कालावधी', value: slotInput },
          { label: 'शेरा', value: notesInput.trim() || 'खातेदार मोबाईल अ‍ॅपवरून अर्ज' },
        ];
      } else if (activeType === 'DEPOSIT_OPEN') {
        reqTitle = `नवीन ${selectedOption} विनंती`;
        reqSub = `कालावधी: ${slotInput} • रक्कम: ₹${(numericAmt || 0).toLocaleString('en-IN')}`;
        details = [
          { label: 'ठेव योजना', value: selectedOption },
          { label: 'ठेव रक्कम', value: `₹${(numericAmt || 0).toLocaleString('en-IN')}` },
          { label: 'कालावधी', value: slotInput },
          { label: 'शेरा', value: notesInput.trim() || 'नवीन ठेव खाते विनंती' },
        ];
      } else if (activeType === 'CERTIFICATE') {
        reqTitle = selectedOption;
        reqSub = notesInput.trim() || 'शाखेकडून डिजिटल / प्रिंट प्रत विनंती';
      } else {
        reqTitle = titleInput.trim() || selectedOption;
        reqSub = notesInput.trim() || 'ग्राहक तक्रार / मदत विनंती';
      }

      const created = await submitCustomerServiceRequest({
        type: activeType,
        title: reqTitle,
        subtitle: reqSub,
        amount: numericAmt,
        preferredSlot: slotInput,
        details,
      });

      triggerSuccessHaptic();
      showToast(
        activeType === 'LOAN_APPLY' || activeType === 'DEPOSIT_OPEN'
          ? `अर्ज क्र. ${created.referenceNo} मॅनेजर मंजुरीसाठी पाठवला!`
          : `विनंती क्र. ${created.referenceNo} यशस्वीरीत्या नोंदवली!`,
        'success',
        'विनंती नोंदवली'
      );
      setActiveType(null);
      if (!isDemoMode) {
        await reloadData();
      }
    } catch (err: any) {
      triggerErrorHaptic();
      showToast(err?.message || 'विनंती पाठवताना त्रुटी आली.', 'error', 'सर्व्हर त्रुटी');
    } finally {
      setSubmitting(false);
    }
  };

  const serviceCards: {
    type: CustomerServiceRequestType;
    title: string;
    desc: string;
    bg: string;
    icon: React.ReactNode;
  }[] = [
    {
      type: 'DOORSTEP_PICKUP',
      title: 'एजंटला घरी बोलवा',
      desc: 'पिग्मी, RD किंवा कर्ज हप्ता वसुलीसाठी एजंटची वेळ बुक करा',
      bg: '#DCFCE7',
      icon: <Home size={20} color="#047857" />,
    },
    {
      type: 'LOAN_APPLY',
      title: 'नवीन कर्ज अर्ज',
      desc: 'सुवर्ण, व्यवसाय किंवा वाहन कर्जासाठी झटपट ऑनलाइन अर्ज',
      bg: '#FEF3C7',
      icon: <HandCoins size={20} color="#B45309" />,
    },
    {
      type: 'DEPOSIT_OPEN',
      title: 'नवीन FD / RD खाते',
      desc: 'उच्च व्याजदराची मुदत ठेव किंवा आवर्ती ठेव सुरू करण्याची विनंती',
      bg: colors.infoBg,
      icon: <Landmark size={20} color={colors.primaryDark} />,
    },
    {
      type: 'CERTIFICATE',
      title: 'प्रमाणपत्र व सेवा',
      desc: 'व्याज प्रमाणपत्र, पासबुक प्रिंट, स्टेटमेंट किंवा KYC अपडेट',
      bg: '#EDE9FE',
      icon: <FileText size={20} color="#6D28D9" />,
    },
  ];

  const requests = data?.serviceRequests || [];

  const getOptionPresets = (): string[] => {
    if (activeType === 'DOORSTEP_PICKUP') return ['दैनिक पिग्मी ठेव', 'मासिक RD हप्ता', 'कर्ज EMI हप्ता', 'बचत ठेव'];
    if (activeType === 'LOAN_APPLY') return ['सुवर्ण तारण कर्ज', 'व्यवसाय कर्ज', 'वाहन कर्ज', 'वैयक्तिक कर्ज'];
    if (activeType === 'DEPOSIT_OPEN') return ['मुदत ठेव (FD)', 'आवर्ती ठेव (RD)', 'दामदुप्पट FD', 'नवीन पिग्मी'];
    if (activeType === 'CERTIFICATE') return ['वार्षिक व्याज प्रमाणपत्र', 'नवीन पासबुक प्रिंट', 'खाते स्टेटमेंट (PDF)', 'पत्ता / मोबाईल बदल'];
    return ['व्यवहार चौकशी', 'व्याज संबंधित', 'अ‍ॅप तांत्रिक मदत'];
  };

  const getSlotPresets = (): string[] => {
    if (activeType === 'DOORSTEP_PICKUP') return ['सकाळ (९ ते १२)', 'दुपार (१२ ते ४)', 'संध्याकाळ (४ ते ७)'];
    return ['१२ महिने', '२४ महिने', '३६ महिने', '६० महिने'];
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reloadData} />}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="ऑनलाइन खातेदार सेवा (Self-Service)" />
        <View style={styles.cardsGrid}>
          {serviceCards.map((s) => (
            <TouchableOpacity
              key={s.type}
              style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                triggerLightHaptic();
                openModalFor(s.type);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: s.bg }]}>{s.icon}</View>
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text, marginTop: 8 }}>{s.title}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 3, lineHeight: 15 }}>{s.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title={`माझ्या अर्जांची स्थिती (${requests.length})`} />
        {requests.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '600' }}>
              अजून कोणतीही विनंती पाठवलेली नाही.
            </Text>
          </View>
        ) : (
          requests.map((req) => (
            <View
              key={req.id}
              style={[styles.reqRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.primary }}>{req.referenceNo}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Clock size={10} color={colors.textMuted} />
                    <Text style={{ fontSize: 10.5, color: colors.textMuted }}>{req.createdAt}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }}>{req.title}</Text>
                <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>{req.subtitle}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <StatusPill
                  label={
                    req.status === 'APPROVED'
                      ? 'मंजूर'
                      : req.status === 'COMPLETED'
                      ? 'पूर्ण'
                      : req.status === 'REJECTED'
                      ? 'नाकारले'
                      : 'प्रलंबित'
                  }
                  tone={
                    req.status === 'APPROVED' || req.status === 'COMPLETED'
                      ? 'success'
                      : req.status === 'REJECTED'
                      ? 'danger'
                      : 'warning'
                  }
                />
                {req.amount ? (
                  <Text style={[TABULAR_NUMS, { fontSize: 12.5, fontWeight: '800', color: colors.text }]}>
                    ₹{req.amount.toLocaleString('en-IN')}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Request Submission Bottom Sheet */}
      {activeType && (
        <Modal visible={true} animationType="slide" transparent onRequestClose={() => setActiveType(null)}>
          <KeyboardAvoidingView
            style={styles.sheetOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.sheetContainer, { backgroundColor: colors.card }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={{ fontSize: 16.5, fontWeight: '800', color: colors.text }}>
                  {activeType === 'DOORSTEP_PICKUP'
                    ? 'एजंटला घरी बोलवा'
                    : activeType === 'LOAN_APPLY'
                    ? 'नवीन कर्ज अर्ज'
                    : activeType === 'DEPOSIT_OPEN'
                    ? 'नवीन FD / RD खाते विनंती'
                    : activeType === 'CERTIFICATE'
                    ? 'प्रमाणपत्र व खाते सेवा'
                    : 'तक्रार / सपोर्ट तिकीट'}
                </Text>
                <TouchableOpacity
                  style={[styles.closeCircle, { backgroundColor: colors.surfaceMuted }]}
                  onPress={() => setActiveType(null)}
                >
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.label, { color: colors.textSecondary }]}>प्रकार निवडा</Text>
                <View style={styles.presetWrap}>
                  {getOptionPresets().map((opt) => {
                    const active = selectedOption === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: active ? colors.primaryDark : colors.surfaceMuted,
                            borderColor: active ? colors.primaryDark : colors.border,
                          },
                        ]}
                        onPress={() => {
                          triggerLightHaptic();
                          setSelectedOption(opt);
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#FFFFFF' : colors.textSecondary }}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {(activeType === 'DOORSTEP_PICKUP' || activeType === 'LOAN_APPLY' || activeType === 'DEPOSIT_OPEN') && (
                  <>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>अपेक्षित रक्कम (₹)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
                      ]}
                      value={amountInput}
                      onChangeText={setAmountInput}
                      keyboardType="numeric"
                      placeholder="उदा. 50000"
                      placeholderTextColor={colors.textMuted}
                    />

                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      {activeType === 'DOORSTEP_PICKUP' ? 'सोयीची वेळ निवडा' : 'अपेक्षित कालावधी'}
                    </Text>
                    <View style={styles.presetWrap}>
                      {getSlotPresets().map((sl) => {
                        const active = slotInput === sl;
                        return (
                          <TouchableOpacity
                            key={sl}
                            style={[
                              styles.presetChip,
                              {
                                backgroundColor: active ? colors.primary : colors.surfaceMuted,
                                borderColor: active ? colors.primary : colors.border,
                              },
                            ]}
                            onPress={() => {
                              triggerLightHaptic();
                              setSlotInput(sl);
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? '#FFFFFF' : colors.textSecondary }}>
                              {sl}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                <Text style={[styles.label, { color: colors.textSecondary }]}>अतिरिक्त माहिती / शेरा (ऐच्छिक)</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
                  ]}
                  value={notesInput}
                  onChangeText={setNotesInput}
                  placeholder="तुमचा संदेश इथे लिहा..."
                  placeholderTextColor={colors.textMuted}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primaryDark }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  <Send size={15} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' }}>
                    {submitting ? 'पाठवत आहे...' : 'विनंती पाठवा'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  serviceCard: {
    width: '48.3%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 13,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 9,
    gap: 10,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
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
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  presetChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 10,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 48,
    borderRadius: RADIUS.md,
    marginTop: 8,
  },
});
