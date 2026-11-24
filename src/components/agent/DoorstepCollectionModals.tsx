import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  PiggyBank,
  HandCoins,
  Wallet,
  CalendarClock,
  Banknote,
  Smartphone,
  ChevronDown,
  ArrowUpRight,
  BookOpen,
  UserPlus,
  Check,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../context/ThemeContext';
import {
  PigmiAccount,
  CustomerDoorstepProfile,
  ProductType,
  PassbookStatement,
  PigmyScheme,
} from '../../types';
import { PRODUCT_THEME, RADIUS, TABULAR_NUMS } from '../../theme/tokens';
import { StatusPill } from '../ui/StatusPill';
import { triggerLightHaptic } from '../../utils/haptics';

interface DoorstepHubModalProps {
  customer: PigmiAccount | null;
  profile: CustomerDoorstepProfile | null;
  loading: boolean;
  onClose: () => void;
  onSelectProduct: (type: ProductType, item: any, custName: string, oldAccNo?: string) => void;
}

export const DoorstepHubModal: React.FC<DoorstepHubModalProps> = ({
  customer,
  profile,
  loading,
  onClose,
  onSelectProduct,
}) => {
  const { colors } = useThemeColors();
  if (!customer) return null;

  const allPigmy = profile?.pigmyAccounts || [];
  const selectedPigmy = allPigmy.filter(
    (p) =>
      customer.accountNumber === p.accountNo ||
      customer.id === `acc_${p.accountId}` ||
      String(customer.id).replace('acc_', '') === String(p.accountId) ||
      (customer.oldAccountNo && p.oldAccountNo && customer.oldAccountNo.trim() === p.oldAccountNo.trim())
  );
  const displayPigmy = selectedPigmy.length > 0 ? selectedPigmy : allPigmy.length > 0 ? [allPigmy[0]] : [];

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheetContainer, { backgroundColor: colors.card }]}>
          <View style={styles.sheetHandle} />

          {/* Customer Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTag, { color: colors.primary }]}>DOORSTEP COLLECTION HUB</Text>
              <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
                {customer.customerName}
              </Text>
              <View style={styles.chipRow}>
                <StatusPill label={`CIF: ${profile?.cifNo || customer.cifNo || '-'}`} tone="neutral" />
                {customer.oldAccountNo ? (
                  <StatusPill label={`जुना क्र. ${customer.oldAccountNo}`} tone="success" />
                ) : null}
              </View>
            </View>
            <TouchableOpacity style={[styles.closeCircle, { backgroundColor: colors.surfaceMuted }]} onPress={onClose}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {loading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                ग्राहकाची सर्व खाती लोड होत आहेत...
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {/* Pigmy */}
              {displayPigmy.map((p) => (
                <ProductCard
                  key={`pigmy_${p.accountId}`}
                  theme={PRODUCT_THEME.PIGMY}
                  icon={<PiggyBank size={20} color={PRODUCT_THEME.PIGMY.accent} />}
                  title={p.productTitle || PRODUCT_THEME.PIGMY.labelMr}
                  accountNo={p.accountNo}
                  oldAccountNo={p.oldAccountNo || customer.oldAccountNo}
                  balanceLabel={`शिल्लक: ₹${Number(p.currentBalance || 0).toLocaleString('en-IN')}`}
                  targetLabel={`हप्ता: ₹${p.targetAmount}/day`}
                  onCollect={() => onSelectProduct('PIGMY', p, customer.customerName, p.oldAccountNo || customer.oldAccountNo)}
                />
              ))}

              {/* Loans */}
              {(profile?.loanAccounts || []).map((l) => (
                <ProductCard
                  key={`loan_${l.accountId}`}
                  theme={PRODUCT_THEME.LOAN}
                  icon={<HandCoins size={20} color={PRODUCT_THEME.LOAN.accent} />}
                  title={l.productTitle || l.schemeName || PRODUCT_THEME.LOAN.labelMr}
                  accountNo={l.accountNo}
                  balanceLabel={`बाकी मुद्दल: ₹${Number(l.currentBalance || 0).toLocaleString('en-IN')}`}
                  targetLabel={`EMI: ₹${l.targetAmount}`}
                  onCollect={() => onSelectProduct('LOAN', l, customer.customerName)}
                />
              ))}

              {/* Savings */}
              {(profile?.savingAccounts || []).map((s) => (
                <ProductCard
                  key={`sav_${s.accountId}`}
                  theme={PRODUCT_THEME.SAVING}
                  icon={<Wallet size={20} color={PRODUCT_THEME.SAVING.accent} />}
                  title={s.productTitle || s.schemeName || PRODUCT_THEME.SAVING.labelMr}
                  accountNo={s.accountNo}
                  balanceLabel={`शिल्लक: ₹${Number(s.currentBalance || 0).toLocaleString('en-IN')}`}
                  onCollect={() => onSelectProduct('SAVING', s, customer.customerName)}
                />
              ))}

              {/* RD */}
              {(profile?.rdAccounts || []).map((r) => (
                <ProductCard
                  key={`rd_${r.accountId}`}
                  theme={PRODUCT_THEME.RD}
                  icon={<CalendarClock size={20} color={PRODUCT_THEME.RD.accent} />}
                  title={r.productTitle || r.schemeName || PRODUCT_THEME.RD.labelMr}
                  accountNo={r.accountNo}
                  balanceLabel={`जमा ठेव: ₹${Number(r.currentBalance || 0).toLocaleString('en-IN')}`}
                  targetLabel={`मासिक हप्ता: ₹${r.targetAmount}`}
                  onCollect={() => onSelectProduct('RD', r, customer.customerName)}
                />
              ))}

              {displayPigmy.length === 0 &&
                (profile?.loanAccounts?.length || 0) === 0 &&
                (profile?.savingAccounts?.length || 0) === 0 &&
                (profile?.rdAccounts?.length || 0) === 0 && (
                  <Text style={[styles.emptyHubText, { color: colors.textMuted }]}>
                    या ग्राहकाकडे सध्या कोणतेही सक्रिय खाते आढळले नाही.
                  </Text>
                )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

interface ProductCardProps {
  theme: { accent: string; bg: string; border: string };
  icon: React.ReactNode;
  title: string;
  accountNo: string;
  oldAccountNo?: string;
  balanceLabel: string;
  targetLabel?: string;
  onCollect: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  theme,
  icon,
  title,
  accountNo,
  oldAccountNo,
  balanceLabel,
  targetLabel,
  onCollect,
}) => (
  <View style={[styles.prodCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
    <View style={[styles.prodIconBox, { backgroundColor: '#FFFFFF' }]}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.prodTitle, { color: theme.accent }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.prodSub}>
        A/c: {accountNo}
        {oldAccountNo ? ` (जुना #${oldAccountNo})` : ''}
      </Text>
      <Text style={[styles.prodBal, TABULAR_NUMS]}>{balanceLabel}</Text>
      {targetLabel ? <Text style={styles.prodTarget}>{targetLabel}</Text> : null}
    </View>
    <TouchableOpacity
      style={[styles.prodBtn, { backgroundColor: theme.accent }]}
      onPress={() => {
        triggerLightHaptic();
        onCollect();
      }}
      activeOpacity={0.82}
    >
      <Text style={styles.prodBtnText}>वसुली</Text>
      <ArrowUpRight size={14} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
);

interface QuickCollectSheetProps {
  visible: boolean;
  title: string;
  customerName: string;
  accountNo: string;
  oldAccountNo?: string;
  defaultAmount?: number;
  amount: string;
  onChangeAmount: (val: string) => void;
  paymentMode: 'CASH' | 'UPI';
  onChangeMode: (mode: 'CASH' | 'UPI') => void;
  notes: string;
  onChangeNotes: (val: string) => void;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const QuickCollectSheet: React.FC<QuickCollectSheetProps> = ({
  visible,
  title,
  customerName,
  accountNo,
  oldAccountNo,
  defaultAmount,
  amount,
  onChangeAmount,
  paymentMode,
  onChangeMode,
  notes,
  onChangeNotes,
  submitting = false,
  onCancel,
  onConfirm,
}) => {
  const { colors, t } = useThemeColors();
  const quickChips = Array.from(
    new Set([100, 200, 500, 1000, ...(defaultAmount && defaultAmount > 0 ? [defaultAmount] : [])])
  ).sort((a, b) => a - b);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.sheetOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheetContainer, { backgroundColor: colors.card }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTag, { color: colors.primary }]}>{title}</Text>
              <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
                {customerName}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                A/c: {accountNo}
                {oldAccountNo ? ` • जुना क्र. ${oldAccountNo}` : ''}
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeCircle, { backgroundColor: colors.surfaceMuted }]} onPress={onCancel}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Amount Input Box */}
          <View style={[styles.bigAmountBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.primary + '55' }]}>
            <Text style={[styles.rupeeSymbol, { color: colors.primary }]}>₹</Text>
            <TextInput
              style={[styles.bigAmountInput, TABULAR_NUMS, { color: colors.text }]}
              value={amount}
              onChangeText={onChangeAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          </View>

          {/* Quick Amount Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {quickChips.map((val) => {
              const active = Number(amount) === val;
              return (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.amtChip,
                    {
                      backgroundColor: active ? colors.primaryDark : colors.surfaceMuted,
                      borderColor: active ? colors.primaryDark : colors.border,
                    },
                  ]}
                  onPress={() => {
                    triggerLightHaptic();
                    onChangeAmount(String(val));
                  }}
                >
                  <Text style={[styles.amtChipText, TABULAR_NUMS, { color: active ? '#FFFFFF' : colors.text }]}>
                    ₹{val.toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Segmented Payment Mode */}
          <View style={[styles.modeSwitch, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modeTab, paymentMode === 'CASH' && { backgroundColor: colors.primaryDark }]}
              onPress={() => {
                triggerLightHaptic();
                onChangeMode('CASH');
              }}
            >
              <Banknote size={16} color={paymentMode === 'CASH' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[styles.modeTabText, { color: paymentMode === 'CASH' ? '#FFFFFF' : colors.textSecondary }]}>
                {t.cash}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, paymentMode === 'UPI' && { backgroundColor: colors.primaryDark }]}
              onPress={() => {
                triggerLightHaptic();
                onChangeMode('UPI');
              }}
            >
              <Smartphone size={16} color={paymentMode === 'UPI' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[styles.modeTabText, { color: paymentMode === 'UPI' ? '#FFFFFF' : colors.textSecondary }]}>
                {t.upi}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Remarks */}
          <TextInput
            style={[styles.remarksInput, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text }]}
            value={notes}
            onChangeText={onChangeNotes}
            placeholder="शेरा / Remarks (ऐच्छिक)"
            placeholderTextColor={colors.textMuted}
          />

          {/* Submit */}
          <TouchableOpacity onPress={onConfirm} disabled={submitting} activeOpacity={0.85} style={styles.ctaWrap}>
            <LinearGradient
              colors={[colors.primary, colors.primaryMid]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.ctaText}>
                    {t.recordDeposit} {Number(amount) > 0 ? `₹${Number(amount).toLocaleString('en-IN')}` : ''}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

interface PassbookModalProps {
  statement: PassbookStatement | null;
  oldAccountNo?: string;
  onClose: () => void;
}

export const PassbookModal: React.FC<PassbookModalProps> = ({ statement, oldAccountNo, onClose }) => {
  const { colors } = useThemeColors();
  if (!statement) return null;

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheetContainer, { backgroundColor: colors.card, maxHeight: '88%' }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={[styles.prodIconBox, { backgroundColor: colors.infoBg }]}>
                <BookOpen size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
                  {statement.memberName}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  खाते क्र: {statement.accountNo} {oldAccountNo ? `• जुना #${oldAccountNo}` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.closeCircle, { backgroundColor: colors.surfaceMuted }]} onPress={onClose}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.pbSummaryStrip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <View style={styles.pbSumCol}>
              <Text style={[styles.pbSumLabel, { color: colors.textMuted }]}>Total Credit</Text>
              <Text style={[styles.pbSumVal, TABULAR_NUMS, { color: colors.successText }]}>
                ₹{Number(statement.totalCredit || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.pbSumCol}>
              <Text style={[styles.pbSumLabel, { color: colors.textMuted }]}>Current Balance</Text>
              <Text style={[styles.pbSumVal, TABULAR_NUMS, { color: colors.primaryDark }]}>
                ₹{Number(statement.closingBalance || statement.currentTotalBalance || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {statement.transactions.length === 0 ? (
              <Text style={[styles.emptyHubText, { color: colors.textMuted }]}>कोणतेही व्यवहार आढळले नाहीत.</Text>
            ) : (
              statement.transactions.map((tx, idx) => (
                <View key={`${tx.collectionId}_${idx}`} style={[styles.pbTxRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{tx.receiptNo}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>{tx.date}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[TABULAR_NUMS, { fontSize: 14, fontWeight: '800', color: colors.successText }]}>
                      +₹{Number(tx.creditAmount || 0).toLocaleString('en-IN')}
                    </Text>
                    <Text style={[TABULAR_NUMS, { fontSize: 11, color: colors.textMuted }]}>
                      Bal: ₹{Number(tx.runningBalance || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

interface CreateCustomerModalProps {
  visible: boolean;
  schemes: PigmyScheme[];
  loadingSchemes: boolean;
  schemesError: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    phone: string;
    deposit: string;
    address: string;
    aadhaar: string;
    pan: string;
    oldAccNo: string;
    schemeId: number;
  }) => Promise<void>;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  visible,
  schemes,
  loadingSchemes,
  schemesError,
  onClose,
  onSubmit,
}) => {
  const { colors, t } = useThemeColors();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deposit, setDeposit] = useState('100');
  const [address, setAddress] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [pan, setPan] = useState('');
  const [oldAccNo, setOldAccNo] = useState('');
  const [schemeId, setSchemeId] = useState<number>(schemes[0]?.schemeId || 1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedScheme = schemes.find((s) => s.schemeId === schemeId) || schemes[0];

  useEffect(() => {
    if (schemes.length > 0 && !schemes.some((s) => s.schemeId === schemeId)) {
      setSchemeId(schemes[0].schemeId);
    }
  }, [schemes, schemeId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSubmit({
        name,
        phone,
        deposit,
        address,
        aadhaar,
        pan,
        oldAccNo,
        schemeId: selectedScheme?.schemeId || schemeId,
      });
      setName('');
      setPhone('');
      setAddress('');
      setAadhaar('');
      setPan('');
      setOldAccNo('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheetContainer, { backgroundColor: colors.card, maxHeight: '92%' }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.prodIconBox, { backgroundColor: colors.infoBg }]}>
                <UserPlus size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>{t.newCustomer}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>KYC व पिग्मी खाते नोंदणी</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.closeCircle, { backgroundColor: colors.surfaceMuted }]} onPress={onClose}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field label="पूर्ण नाव (Full Name) *" value={name} onChangeText={setName} placeholder="उदा. विकास शिंदे" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="मोबाईल क्र. *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} placeholder="9876543210" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="दैनिक ठेव (₹)" value={deposit} onChangeText={setDeposit} keyboardType="numeric" placeholder="100" />
              </View>
            </View>
            <Field label="पत्ता (Address)" value={address} onChangeText={setAddress} placeholder="गाव, तालुका, जिल्हा" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="आधार क्र." value={aadhaar} onChangeText={setAadhaar} keyboardType="numeric" maxLength={12} placeholder="12 digits" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="पॅन (PAN)" value={pan} onChangeText={setPan} autoCapitalize="characters" maxLength={10} placeholder="ABCDE1234F" />
              </View>
            </View>
            <Field label="जुना खाते क्र. (ऐच्छिक)" value={oldAccNo} onChangeText={setOldAccNo} placeholder="उदा. 9" />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>योजना निवडा (Scheme)</Text>
            <TouchableOpacity
              style={[styles.dropdownBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
              onPress={() => setShowDropdown((p) => !p)}
              disabled={schemes.length === 0}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: selectedScheme ? colors.text : colors.textMuted }}>
                {selectedScheme?.schemeName || (loadingSchemes ? 'Loading schemes...' : 'Select Scheme')}
              </Text>
              <ChevronDown size={18} color={colors.textMuted} />
            </TouchableOpacity>
            {schemesError ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{schemesError}</Text> : null}

            {showDropdown && schemes.length > 0 && (
              <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {schemes.map((s) => (
                  <TouchableOpacity
                    key={s.schemeId}
                    style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSchemeId(s.schemeId);
                      setShowDropdown(false);
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{s.schemeName}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.textMuted }}>{s.interestRate}% Interest</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 10 }}>
              <TouchableOpacity
                style={[styles.cancelFormBtn, { backgroundColor: colors.surfaceMuted }]}
                onPress={onClose}
              >
                <Text style={{ fontWeight: '700', color: colors.textSecondary }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveFormBtn, { backgroundColor: colors.primaryDark }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>नोंदवा (Submit)</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const Field: React.FC<any> = ({ label, ...props }) => {
  const { colors } = useThemeColors();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
        ]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '86%',
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sheetTag: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  loadingBlock: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sheetScroll: {
    maxHeight: 420,
  },
  prodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: RADIUS.lg,
    borderWidth: 1.2,
    marginBottom: 10,
  },
  prodIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prodTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  prodSub: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 1,
  },
  prodBal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 3,
  },
  prodTarget: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  prodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  prodBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  emptyHubText: {
    textAlign: 'center',
    paddingVertical: 28,
    fontSize: 13,
  },
  bigAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 18,
    height: 68,
    marginTop: 6,
  },
  rupeeSymbol: {
    fontSize: 28,
    fontWeight: '900',
    marginRight: 6,
  },
  bigAmountInput: {
    fontSize: 32,
    fontWeight: '900',
    minWidth: 110,
    textAlign: 'center',
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 14,
  },
  amtChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  amtChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  remarksInput: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13.5,
    marginBottom: 14,
  },
  ctaWrap: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  ctaBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
  },
  pbSummaryStrip: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  pbSumCol: {
    flex: 1,
    alignItems: 'center',
  },
  pbSumLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  pbSumVal: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  pbTxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 44,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 11,
    borderBottomWidth: 1,
  },
  cancelFormBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveFormBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
