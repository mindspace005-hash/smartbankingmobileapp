import React from 'react';
import { useThemeColors, ThemeColors } from '../context/ThemeContext';
// import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { CollectionRecord } from '../types';
import { useAuth } from '../context/AuthContext';

interface ReceiptModalProps {
  visible: boolean;
  receipt: CollectionRecord | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ visible, receipt, onClose }) => {
  const { colors } = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const { accounts } = useAuth();
  if (!receipt) return null;

  const account = accounts.find(a => a.id === receipt.accountId);
  const oldNo = receipt.oldAccountNo || account?.oldAccountNo || '';
  const phone = account?.customerPhone || '';

  const prodTitle = receipt.productTitle || (
    receipt.productType === 'LOAN' ? 'कर्ज हप्ता वसुली (Loan EMI)' :
    receipt.productType === 'SAVING' ? 'बचत ठेव (Saving)' :
    receipt.productType === 'RD' ? 'आवर्ती ठेव (RD)' :
    'दैनिक ठेव (Pigmy)'
  );

  const headerTitle = (
    receipt.productType === 'LOAN' ? 'LOAN EMI RECEIPT' :
    receipt.productType === 'SAVING' ? 'SAVING DEPOSIT RECEIPT' :
    receipt.productType === 'RD' ? 'RD INSTALLMENT RECEIPT' :
    'PIGMI DEPOSIT RECEIPT'
  );

  const sendSMS = () => {
    const acStr = oldNo ? `${receipt.accountNumber} (जुना: ${oldNo})` : receipt.accountNumber;
    const message = `Dear ${receipt.customerName}, your ${prodTitle} amount of Rs.${receipt.amount} for A/c ${acStr} is collected successfully (Ref: ${receipt.receiptNo}). Thank you!`;
    const url = `sms:${phone}?body=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open SMS app'));
  };

  const sendWhatsApp = () => {
    const acStr = oldNo ? `${receipt.accountNumber} (जुना: ${oldNo})` : receipt.accountNumber;
    const message = `Dear ${receipt.customerName}, your ${prodTitle} amount of Rs.${receipt.amount} for A/c ${acStr} is collected successfully (Ref: ${receipt.receiptNo}). Thank you!`;
    let formattedPhone = phone;
    if (formattedPhone && !formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone;
    }
    const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.successBadge}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.receiptTitle}>{headerTitle}</Text>
            <Text style={styles.statusText}>VERIFIED & CREDITED</Text>
          </View>

          {/* Amount */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Collected Amount</Text>
            <Text style={styles.amountValue}>₹{receipt.amount.toLocaleString('en-IN')}</Text>
          </View>

          {/* Details */}
          <View style={styles.detailsBox}>
            {[
              { label: 'पावती / व्हाउचर क्र.', value: receipt.voucherNo || receipt.receiptNo },
              { label: 'खाते प्रकार (Product)', value: prodTitle, highlight: true },
              { label: 'ग्राहक नाव', value: receipt.customerName },
              { label: 'खाते क्र.', value: receipt.accountNumber },
              ...(oldNo ? [{ label: 'जुना खाते क्र.', value: oldNo, highlight: true }] : []),
              ...(receipt.productType === 'LOAN' ? [
                { label: 'व्याज जमा (Interest)', value: `₹${(receipt.regularInterestCollected ?? 0).toLocaleString('en-IN')}` },
                { label: 'मुद्दल जमा (Principal)', value: `₹${(receipt.principalCollected ?? 0).toLocaleString('en-IN')}` },
                ...(receipt.newPrincipalBalance !== undefined ? [{ label: 'उर्वरित मुद्दल (Balance)', value: `₹${receipt.newPrincipalBalance.toLocaleString('en-IN')}`, highlight: true }] : []),
              ] : []),
              ...(receipt.productType === 'SAVING' && receipt.newBalance !== undefined ? [
                { label: 'नवीन शिल्लक (New Bal)', value: `₹${receipt.newBalance.toLocaleString('en-IN')}`, highlight: true }
              ] : []),
              ...(receipt.productType === 'RD' ? [
                ...(receipt.paidInstallments !== undefined ? [{ label: 'हप्ता क्र. (Installment)', value: `${receipt.paidInstallments}` }] : []),
                ...(receipt.totalDepositedAmount !== undefined ? [{ label: 'एकूण ठेव (Total Bal)', value: `₹${receipt.totalDepositedAmount.toLocaleString('en-IN')}`, highlight: true }] : []),
              ] : []),
              ...(receipt.productType === 'PIGMY' && receipt.newBalance !== undefined ? [
                { label: 'नवीन शिल्लक', value: `₹${receipt.newBalance.toLocaleString('en-IN')}`, highlight: true }
              ] : []),
              { label: 'Payment Mode', value: receipt.paymentMode, highlight: true },
              { label: 'Collector Agent', value: receipt.agentName },
              { label: 'Date & Time', value: receipt.timestamp },
              ...(receipt.syncReferenceId ? [{ label: 'Ref ID', value: receipt.syncReferenceId }] : []),
              ...(receipt.notes || receipt.remarks ? [{ label: 'Remarks', value: receipt.notes || receipt.remarks }] : []),
            ].map((item, idx, arr) => (
              <View key={item.label}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={[styles.detailValue, item.highlight && styles.highlightValue]}>
                    {item.value}
                  </Text>
                </View>
                {idx < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          <Text style={styles.footerNote}>
            Thank you for banking with PAT Financial Services.
          </Text>

          <View style={styles.notifyRow}>
            <TouchableOpacity 
              style={[styles.notifyBtn, { backgroundColor: '#4CAF50' }]} 
              onPress={() => sendWhatsApp()}
            >
              <Text style={styles.notifyBtnText}>💬 WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.notifyBtn, { backgroundColor: '#0ea5e9' }]} 
              onPress={() => sendSMS()}
            >
              <Text style={styles.notifyBtnText}>✉️ SMS</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.closeBtnText}>Close Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(67, 56, 202, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },

  // Header
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  successBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  checkMark: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  receiptTitle: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  statusText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },

  // Amount box
  amountBox: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  amountLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '500' },
  amountValue: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: '900',
    marginTop: 4,
  },

  // Details
  detailsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    alignItems: 'center',
  },
  detailLabel: { color: '#9CA3AF', fontSize: 13 },
  detailValue: { color: '#1E1B4B', fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  highlightValue: { color: '#D97706', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },

  footerNote: {
    color: '#D1D5DB',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },
  notifyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  notifyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  closeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
