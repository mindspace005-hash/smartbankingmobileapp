import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Linking, Alert, ScrollView } from 'react-native';
import { CheckCircle2, MessageCircle, Send, Check, ShieldCheck, Clock } from 'lucide-react-native';
import { CollectionRecord } from '../types';
import { useThemeColors } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { CONFIG } from '../config';
import { RADIUS, TABULAR_NUMS } from '../theme/tokens';
import { triggerLightHaptic } from '../utils/haptics';

interface ReceiptModalProps {
  visible: boolean;
  receipt: CollectionRecord | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ visible, receipt, onClose }) => {
  const { colors } = useThemeColors();
  const { accounts } = useAuth();
  if (!receipt) return null;

  const account = accounts.find((a) => a.id === receipt.accountId);
  const oldNo = receipt.oldAccountNo || account?.oldAccountNo || '';
  const phone = account?.customerPhone || '';

  const prodTitle =
    receipt.productTitle ||
    (receipt.productType === 'LOAN'
      ? 'कर्ज हप्ता वसुली (Loan EMI)'
      : receipt.productType === 'SAVING'
      ? 'बचत ठेव (Saving)'
      : receipt.productType === 'RD'
      ? 'आवर्ती ठेव (RD)'
      : 'दैनिक ठेव (Pigmy)');

  const headerTitle =
    receipt.productType === 'LOAN'
      ? 'LOAN EMI RECEIPT'
      : receipt.productType === 'SAVING'
      ? 'SAVING DEPOSIT RECEIPT'
      : receipt.productType === 'RD'
      ? 'RD INSTALLMENT RECEIPT'
      : 'PIGMI DEPOSIT RECEIPT';

  const buildShareMessage = () => {
    const acStr = oldNo ? `${receipt.accountNumber} (जुना: ${oldNo})` : receipt.accountNumber;
    return `Dear ${receipt.customerName}, your ${prodTitle} amount of Rs.${receipt.amount} for A/c ${acStr} is collected successfully (Ref: ${receipt.receiptNo}). - ${CONFIG.SANSTHA_NAME}`;
  };

  const sendSMS = () => {
    triggerLightHaptic();
    const url = `sms:${phone}?body=${encodeURIComponent(buildShareMessage())}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open SMS app'));
  };

  const sendWhatsApp = () => {
    triggerLightHaptic();
    let formattedPhone = phone;
    if (formattedPhone && !formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone;
    }
    const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(buildShareMessage())}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'पावती / व्हाउचर क्र.', value: receipt.voucherNo || receipt.receiptNo, highlight: true },
    { label: 'खाते प्रकार (Product)', value: prodTitle },
    { label: 'ग्राहक नाव', value: receipt.customerName },
    { label: 'खाते क्र.', value: receipt.accountNumber },
    ...(oldNo ? [{ label: 'जुना खाते क्र.', value: oldNo, highlight: true }] : []),
    ...(receipt.productType === 'LOAN'
      ? [
          { label: 'व्याज जमा (Interest)', value: `₹${(receipt.regularInterestCollected ?? 0).toLocaleString('en-IN')}` },
          { label: 'मुद्दल जमा (Principal)', value: `₹${(receipt.principalCollected ?? 0).toLocaleString('en-IN')}` },
          ...(receipt.newPrincipalBalance !== undefined
            ? [{ label: 'उर्वरित मुद्दल', value: `₹${receipt.newPrincipalBalance.toLocaleString('en-IN')}`, highlight: true }]
            : []),
        ]
      : []),
    ...(receipt.productType === 'SAVING' && receipt.newBalance !== undefined
      ? [{ label: 'नवीन शिल्लक', value: `₹${receipt.newBalance.toLocaleString('en-IN')}`, highlight: true }]
      : []),
    ...(receipt.productType === 'RD'
      ? [
          ...(receipt.paidInstallments !== undefined ? [{ label: 'हप्ता क्र.', value: `${receipt.paidInstallments}` }] : []),
          ...(receipt.totalDepositedAmount !== undefined
            ? [{ label: 'एकूण ठेव', value: `₹${receipt.totalDepositedAmount.toLocaleString('en-IN')}`, highlight: true }]
            : []),
        ]
      : []),
    ...(receipt.productType === 'PIGMY' && receipt.newBalance !== undefined
      ? [{ label: 'नवीन शिल्लक', value: `₹${receipt.newBalance.toLocaleString('en-IN')}`, highlight: true }]
      : []),
    { label: 'पेमेंट मोड', value: receipt.paymentMode, highlight: true },
    { label: 'एजंट नाव', value: receipt.agentName || '-' },
    { label: 'तारीख व वेळ', value: receipt.timestamp },
    ...(receipt.notes || receipt.remarks ? [{ label: 'शेरा (Remarks)', value: String(receipt.notes || receipt.remarks) }] : []),
  ];

  const isSynced = receipt.syncStatus === 'SYNCED';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.ticketCard, { backgroundColor: colors.card }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollInner}>
            {/* Top Status Badge */}
            <View style={styles.headerBlock}>
              <View style={styles.successRing}>
                <CheckCircle2 size={32} color="#10B981" strokeWidth={2.4} />
              </View>
              <Text style={[styles.statusHeadline, { color: '#047857' }]}>VERIFIED & CREDITED</Text>
              <Text style={[styles.bankSubTitle, { color: colors.textSecondary }]}>{CONFIG.SANSTHA_NAME}</Text>
            </View>

            {/* Amount Box */}
            <View style={[styles.amountBand, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <Text style={[styles.receiptType, { color: colors.textMuted }]}>{headerTitle}</Text>
              <Text style={[styles.heroAmount, TABULAR_NUMS, { color: colors.primaryDark }]}>
                ₹{receipt.amount.toLocaleString('en-IN')}
              </Text>
              <View
                style={[
                  styles.syncPill,
                  { backgroundColor: isSynced ? '#DCFCE7' : '#FEF3C7' },
                ]}
              >
                {isSynced ? (
                  <ShieldCheck size={12} color="#047857" />
                ) : (
                  <Clock size={12} color="#B45309" />
                )}
                <Text style={{ fontSize: 11, fontWeight: '700', color: isSynced ? '#047857' : '#B45309' }}>
                  {isSynced ? 'Synced to CBS' : 'Saved Offline • Pending Sync'}
                </Text>
              </View>
            </View>

            {/* Ticket Perforation Divider */}
            <View style={styles.perforationRow}>
              <View style={styles.notchLeft} />
              <View style={[styles.dashedLine, { borderColor: colors.border }]} />
              <View style={styles.notchRight} />
            </View>

            {/* Details Table */}
            <View style={styles.detailsSection}>
              {rows.map((item, idx) => (
                <View key={`${item.label}_${idx}`} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{item.label}</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      TABULAR_NUMS,
                      { color: item.highlight ? colors.primary : colors.text },
                      item.highlight && { fontWeight: '800' },
                    ]}
                    numberOfLines={2}
                  >
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={[styles.footerNote, { color: colors.textMuted }]}>
              डिजिटल ई-पावती • सहकारातून समृद्धीकडे
            </Text>
          </ScrollView>

          {/* Bottom Action Row */}
          <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.shareBtn, styles.waBtn]} onPress={sendWhatsApp} activeOpacity={0.8}>
              <MessageCircle size={16} color="#FFFFFF" />
              <Text style={styles.shareBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareBtn, styles.smsBtn]} onPress={sendSMS} activeOpacity={0.8}>
              <Send size={15} color="#FFFFFF" />
              <Text style={styles.shareBtnText}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.primaryDark }]}
              onPress={() => {
                triggerLightHaptic();
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  ticketCard: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '88%',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    elevation: 16,
  },
  scrollInner: {
    paddingTop: 22,
    paddingBottom: 14,
  },
  headerBlock: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  successRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusHeadline: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  bankSubTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  amountBand: {
    marginHorizontal: 20,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  receiptType: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 8,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  notchLeft: {
    width: 14,
    height: 24,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  notchRight: {
    width: 14,
    height: 24,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  dashedLine: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    marginHorizontal: 6,
  },
  detailsSection: {
    paddingHorizontal: 22,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1.2,
    textAlign: 'right',
  },
  footerNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 16,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    borderTopWidth: 1,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  waBtn: {
    backgroundColor: '#16A34A',
  },
  smsBtn: {
    backgroundColor: '#0284C7',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  doneBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
