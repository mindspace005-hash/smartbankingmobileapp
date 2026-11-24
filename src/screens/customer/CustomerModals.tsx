import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  MessageCircle,
  Landmark,
  ShieldCheck,
  RefreshCw,
  CalendarClock,
  BookOpen,
} from 'lucide-react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { CONFIG } from '../../config';
import {
  CustomerPortalAccountItem,
  CustomerLoanEmiItem,
} from '../../types';
import { StatusPill } from '../../components/ui/StatusPill';
import { RADIUS, TABULAR_NUMS } from '../../theme/tokens';
import { openWhatsAppMessage } from '../../utils/communication';
import { triggerLightHaptic } from '../../utils/haptics';

// 1. Enhanced Customer Passbook Modal (with WhatsApp Mini-Statement Share)
interface CustomerPassbookModalProps {
  visible: boolean;
  loading: boolean;
  customerName: string;
  passbookData: {
    productType: string;
    accountNo: string;
    currentBalance: number;
    transactions: {
      id: number;
      date: string;
      type: string;
      crAmount: number;
      drAmount: number;
      balance: number;
      narration: string;
      reference: string;
    }[];
  } | null;
  onClose: () => void;
}

export const CustomerPassbookModal: React.FC<CustomerPassbookModalProps> = ({
  visible,
  loading,
  customerName,
  passbookData,
  onClose,
}) => {
  const { colors } = useThemeColors();
  if (!visible || !passbookData) return null;

  const shareMiniStatement = () => {
    const top5 = passbookData.transactions.slice(0, 5);
    const lines = [
      `*${CONFIG.SANSTHA_NAME}*`,
      `📘 *डिजिटल मिनी-स्टेटमेंट (${passbookData.productType})*`,
      `खातेदार: ${customerName}`,
      `खाते क्र.: ${passbookData.accountNo}`,
      `चालू शिल्लक: ₹${Number(passbookData.currentBalance || 0).toLocaleString('en-IN')}`,
      `-------------------------`,
      ...top5.map(
        (t) =>
          `• ${t.date}: ${t.drAmount > 0 ? `-₹${t.drAmount}` : `+₹${t.crAmount}`} (Bal: ₹${Number(t.balance || 0).toLocaleString('en-IN')})`
      ),
    ].join('\n');
    openWhatsAppMessage(lines);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheetContainer, { backgroundColor: colors.card }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
                {passbookData.productType} DIGITAL PASSBOOK
              </Text>
              <Text style={{ fontSize: 16.5, fontWeight: '800', color: colors.text, marginTop: 1 }}>
                खाते क्र: {passbookData.accountNo || '...'}
              </Text>
              <Text style={[TABULAR_NUMS, { fontSize: 13.5, fontWeight: '800', color: colors.successText, marginTop: 2 }]}>
                चालू शिल्लक: ₹{Number(passbookData.currentBalance || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeCircle, { backgroundColor: colors.surfaceMuted }]} onPress={onClose}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {!loading && passbookData.transactions.length > 0 && (
            <TouchableOpacity
              style={[styles.shareStripBtn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}
              onPress={shareMiniStatement}
              activeOpacity={0.8}
            >
              <MessageCircle size={14} color="#047857" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#047857' }}>
                मिनी-स्टेटमेंट WhatsApp वर शेअर करा
              </Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 370 }} showsVerticalScrollIndicator={false}>
              {passbookData.transactions.length === 0 ? (
                <Text style={{ textAlign: 'center', paddingVertical: 28, color: colors.textMuted }}>
                  कोणतेही व्यवहार आढळले नाहीत.
                </Text>
              ) : (
                passbookData.transactions.map((tx, idx) => (
                  <View key={`${tx.id}_${idx}`} style={[styles.pbRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                        {tx.narration || tx.type}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                        {tx.date} {tx.reference ? `• ${tx.reference}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          TABULAR_NUMS,
                          {
                            fontSize: 14,
                            fontWeight: '900',
                            color: tx.drAmount > 0 ? colors.dangerText : colors.successText,
                          },
                        ]}
                      >
                        {tx.drAmount > 0 ? `-₹${tx.drAmount.toLocaleString('en-IN')}` : `+₹${tx.crAmount.toLocaleString('en-IN')}`}
                      </Text>
                      {tx.balance > 0 ? (
                        <Text style={[TABULAR_NUMS, { fontSize: 11, color: colors.textMuted }]}>
                          शिल्लक: ₹{Number(tx.balance).toLocaleString('en-IN')}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

// 2. Official Digital FD Receipt / Certificate Modal
interface FdCertificateModalProps {
  visible: boolean;
  fd: CustomerPortalAccountItem | null;
  customerName: string;
  cifNo: string;
  onClose: () => void;
  onRequestRenewal: (fd: CustomerPortalAccountItem) => void;
}

export const FdCertificateModal: React.FC<FdCertificateModalProps> = ({
  visible,
  fd,
  customerName,
  cifNo,
  onClose,
  onRequestRenewal,
}) => {
  const { colors } = useThemeColors();
  if (!visible || !fd) return null;

  const maturityAmt = fd.maturityAmount ?? Math.round(fd.balance * 1.23);

  const shareCertificate = () => {
    const msg = [
      `*${CONFIG.SANSTHA_NAME}*`,
      `📜 *डिजिटल मुदत ठेव पावती (FD Receipt)*`,
      `पावती क्र.: ${fd.receiptNo || fd.accountNo}`,
      `खातेदार: ${customerName} (${cifNo})`,
      `योजना: ${fd.schemeName}`,
      `ठेव रक्कम: ₹${fd.balance.toLocaleString('en-IN')}`,
      `व्याजदर: ${fd.interestRate || 9.0}% p.a.`,
      `मॅच्युरिटी रक्कम: ₹${maturityAmt.toLocaleString('en-IN')}`,
      `मॅच्युरिटी दिनांक: ${fd.maturityDate || '-'}`,
    ].join('\n');
    openWhatsAppMessage(msg);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheetContainer, { backgroundColor: colors.card }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
                FIXED DEPOSIT CERTIFICATE
              </Text>
              <Text style={{ fontSize: 16.5, fontWeight: '800', color: colors.text, marginTop: 1 }}>
                डिजिटल मुदत ठेव पावती
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeCircle, { backgroundColor: colors.surfaceMuted }]} onPress={onClose}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <LinearGradient
              colors={colors.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fdBanner}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Landmark size={16} color="#FDE68A" />
                  <Text style={{ color: '#FEF3C7', fontSize: 11.5, fontWeight: '800' }}>
                    {fd.receiptNo || fd.accountNo}
                  </Text>
                </View>
                <View style={styles.verifiedPill}>
                  <ShieldCheck size={11} color="#A7F3D0" />
                  <Text style={{ color: '#A7F3D0', fontSize: 10, fontWeight: '800' }}>VERIFIED</Text>
                </View>
              </View>

              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 10 }}>
                {fd.schemeName}
              </Text>

              <View style={styles.fdBannerGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>ठेव मुद्दल</Text>
                  <Text style={[TABULAR_NUMS, { color: '#FFFFFF', fontSize: 19, fontWeight: '900' }]}>
                    ₹{fd.balance.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ color: '#FDE68A', fontSize: 11, fontWeight: '700' }}>मॅच्युरिटी रक्कम</Text>
                  <Text style={[TABULAR_NUMS, { color: '#FEF3C7', fontSize: 19, fontWeight: '900' }]}>
                    ₹{maturityAmt.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            <View style={[styles.detailTable, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              {[
                { l: 'खातेदार नाव', v: `${customerName} (${cifNo})` },
                { l: 'खाते क्रमांक', v: fd.accountNo },
                { l: 'व्याजदर (Interest Rate)', v: `${fd.interestRate || 9.0}% वार्षिक` },
                { l: 'सुरुवात दिनांक', v: fd.startDate || '-' },
                { l: 'मॅच्युरिटी दिनांक', v: fd.maturityDate || '-' },
                { l: 'वारसदार (Nominee)', v: fd.nomineeName || 'नोंदणीकृत' },
                { l: 'Auto-Renew स्थिती', v: fd.autoRenew ? 'चालू (Enabled)' : 'बंद' },
              ].map((row, i) => (
                <View
                  key={i}
                  style={[styles.detailRow, i < 6 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                >
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{row.l}</Text>
                  <Text style={{ fontSize: 12.5, color: colors.text, fontWeight: '800', flex: 1, textAlign: 'right' }}>
                    {row.v}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primaryDark, flex: 1.2 }]}
                onPress={() => {
                  triggerLightHaptic();
                  onRequestRenewal(fd);
                }}
              >
                <RefreshCw size={14} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>नूतनीकरण विनंती</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' }]}
                onPress={shareCertificate}
              >
                <MessageCircle size={14} color="#047857" />
                <Text style={{ color: '#047857', fontSize: 12.5, fontWeight: '800' }}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// 3. Loan EMI Schedule Modal
interface LoanEmiScheduleModalProps {
  visible: boolean;
  loan: CustomerPortalAccountItem | null;
  schedule: CustomerLoanEmiItem[];
  onClose: () => void;
  onOpenPassbook: (loanId: number) => void;
}

export const LoanEmiScheduleModal: React.FC<LoanEmiScheduleModalProps> = ({
  visible,
  loan,
  schedule,
  onClose,
  onOpenPassbook,
}) => {
  const { colors } = useThemeColors();
  if (!visible || !loan) return null;

  const sanctioned = loan.sanctionedAmount || loan.balance;
  const paidPrincipal = Math.max(0, sanctioned - loan.balance);
  const progressPct = sanctioned > 0 ? Math.min(100, Math.round((paidPrincipal / sanctioned) * 100)) : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheetContainer, { backgroundColor: colors.card }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>LOAN EMI SCHEDULE</Text>
              <Text style={{ fontSize: 16.5, fontWeight: '800', color: colors.text, marginTop: 1 }}>
                {loan.schemeName}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                A/c {loan.accountNo} • व्याजदर {loan.interestRate || 13.5}%
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeCircle, { backgroundColor: colors.surfaceMuted }]} onPress={onClose}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.loanSummaryBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                परतफेड प्रगती ({loan.paidInstallments || 0}/{loan.totalInstallments || 48} हप्ते)
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '900', color: colors.primaryDark }}>{progressPct}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 4 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ fontSize: 11.5, color: colors.textMuted, fontWeight: '600' }}>
                मंजूर: ₹{sanctioned.toLocaleString('en-IN')}
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.dangerText, fontWeight: '800' }}>
                बाकी मुद्दल: ₹{loan.balance.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <CalendarClock size={14} color={colors.primaryDark} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>आगामी ६ हप्त्यांचे वेळापत्रक</Text>
            </View>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              onPress={() => {
                onClose();
                onOpenPassbook(loan.accountId);
              }}
            >
              <BookOpen size={13} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>पासबुक पहा</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            {schedule.map((row) => (
              <View key={row.installmentNo} style={[styles.emiRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                      हप्ता #{row.installmentNo} • {row.dueDate}
                    </Text>
                    <StatusPill
                      label={row.status === 'DUE' ? 'पुढील देय' : 'आगामी'}
                      tone={row.status === 'DUE' ? 'warning' : 'neutral'}
                    />
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                    मुद्दल ₹{row.principalPart.toLocaleString('en-IN')} + व्याज ₹{row.interestPart.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[TABULAR_NUMS, { fontSize: 14, fontWeight: '900', color: colors.primaryDark }]}>
                    ₹{row.emiAmount.toLocaleString('en-IN')}
                  </Text>
                  <Text style={[TABULAR_NUMS, { fontSize: 10.5, color: colors.textMuted }]}>
                    शिल्लक ₹{row.remainingBalance.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareStripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 10,
  },
  pbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: 10,
  },
  fdBanner: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  fdBannerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  detailTable: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 10,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  loanSummaryBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  emiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
});
