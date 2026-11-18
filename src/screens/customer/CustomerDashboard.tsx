import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useThemeColors, ThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/StatCard';
import { CollectionRecord } from '../../types';

interface CustomerDashboardProps {
  onSelectReceipt: (receipt: CollectionRecord) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ onSelectReceipt }) => {
  const { colors } = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const { accounts, collections, addCollectionRecord, currentUser } = useAuth();

  const customerAccount =
    accounts.find((a) => a.accountNumber === currentUser.accountNumber) || accounts[0];
  const myCollections = collections.filter((c) => c.accountId === customerAccount.id);

  const [selfPayAmount, setSelfPayAmount] = useState<string>(customerAccount.dailyTargetAmount.toString());
  const [showSelfPay, setShowSelfPay] = useState<boolean>(false);

  const handleSelfPay = async () => {
    const amt = parseFloat(selfPayAmount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to deposit.');
      return;
    }
    try {
      const receipt = await addCollectionRecord(customerAccount.id, amt, 'UPI', 'Customer Online Self-Deposit');
      setShowSelfPay(false);
      Alert.alert(
        'Online Deposit Successful! 🎉',
        `₹${amt} added to your Pigmi account.`,
        [{ text: 'View Receipt', onPress: () => onSelectReceipt(receipt) }, { text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record online payment');
    }
  };

  const progressPercent = Math.min(
    100,
    Math.round((customerAccount.currentBalance / (customerAccount.dailyTargetAmount * 365)) * 100)
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>My Pigmi Passbook</Text>

      {/* Savings Card */}
      <View style={styles.savingsCard}>
        <View style={styles.savingsCardTop}>
          <View>
            <Text style={styles.savingsTag}>PIGMI DAILY SAVINGS</Text>
            <Text style={styles.savingsAccNo}>{customerAccount.accountNumber}</Text>
          </View>
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>{customerAccount.status}</Text>
          </View>
        </View>

        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>₹{customerAccount.currentBalance.toLocaleString('en-IN')}</Text>

        {/* Progress bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progressPercent}% of yearly goal</Text>
        </View>

        <View style={styles.savingsFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Daily</Text>
            <Text style={styles.footerValue}>₹{customerAccount.dailyTargetAmount}</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Interest</Text>
            <Text style={styles.footerValue}>{customerAccount.interestRatePercentage}% p.a.</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Agent</Text>
            <Text style={styles.footerValue}>{customerAccount.agentName}</Text>
          </View>
        </View>
      </View>

      {/* Other Accounts Grid */}
      <Text style={[styles.sectionHeader, { marginTop: 4 }]}>Other Accounts</Text>
      <View style={styles.statsGrid}>
        <StatCard title="Fixed Deposit" value="₹50,000" subtitle="7.5% p.a." accentColor="#10B981" icon="🏦" />
        <StatCard title="Recurring Dep." value="₹12,400" subtitle="6.8% p.a." accentColor="#F59E0B" icon="⏳" />
        <StatCard title="Personal Loan" value="₹1.2L" subtitle="11% p.a." accentColor="#EF4444" icon="💸" />
        <StatCard title="Savings A/C" value="₹8,900" subtitle="3.5% p.a." accentColor="#3B82F6" icon="📥" />
      </View>

      {/* UPI Pay Banner */}
      <TouchableOpacity
        style={styles.payBanner}
        onPress={() => setShowSelfPay(!showSelfPay)}
        activeOpacity={0.8}
      >
        <View>
          <Text style={styles.payBannerTitle}>📱 Online Self-Deposit via UPI</Text>
          <Text style={styles.payBannerSub}>Deposit directly if collector missed today</Text>
        </View>
        <Text style={styles.payBannerArrow}>{showSelfPay ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {showSelfPay && (
        <View style={styles.selfPayCard}>
          <Text style={styles.selfPayLabel}>Enter Deposit Amount (₹)</Text>
          <View style={styles.inputField}>
            <Text style={styles.inputPrefix}>₹</Text>
            <TextInput
              style={styles.payInput}
              value={selfPayAmount}
              onChangeText={setSelfPayAmount}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleSelfPay}>
            <Text style={styles.confirmBtnText}>Pay ₹{selfPayAmount} via GPay / PhonePe</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Passbook */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Digital Passbook</Text>
        <Text style={styles.cardSub}>Tap any entry to view official digital receipt</Text>

        {myCollections.map((rec) => (
          <TouchableOpacity
            key={rec.id}
            style={styles.passbookRow}
            onPress={() => onSelectReceipt(rec)}
            activeOpacity={0.65}
          >
            <View style={styles.passbookIconCircle}>
              <Text style={{ fontSize: 18 }}>🐷</Text>
            </View>
            <View style={styles.passbookDetails}>
              <Text style={styles.recNo}>{rec.receiptNo}</Text>
              <Text style={styles.recAgent}>Collected by {rec.agentName}</Text>
              <Text style={styles.recTime}>{rec.timestamp}</Text>
            </View>
            <View style={styles.passbookRight}>
              <Text style={styles.creditAmt}>+₹{rec.amount}</Text>
              <View style={styles.modeTag}>
                <Text style={styles.modeTagText}>{rec.paymentMode}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 About Your Pigmi Scheme</Text>
        <Text style={styles.infoBody}>
          Daily savings help you build wealth effortlessly. Your funds mature on{' '}
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{customerAccount.maturityDate}</Text>{' '}
          with guaranteed returns at {customerAccount.interestRatePercentage}% p.a.
        </Text>
      </View>
    </ScrollView>
  );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 14,
  },

  // Savings card
  savingsCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  savingsCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  savingsTag: {
    color: '#C7D2FE',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  savingsAccNo: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 3 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6EE7B7' },
  activeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  balanceLabel: { color: '#C7D2FE', fontSize: 12 },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 16,
  },
  progressWrap: { marginBottom: 16 },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A5B4FC',
    borderRadius: 3,
  },
  progressLabel: { color: '#C7D2FE', fontSize: 11 },
  savingsFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 14,
  },
  footerItem: { flex: 1 },
  footerLabel: { color: '#A5B4FC', fontSize: 10, fontWeight: '600' },
  footerValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: 3 },
  footerDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },

  // Pay banner
  payBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payBannerTitle: { color: '#1E1B4B', fontSize: 15, fontWeight: '700' },
  payBannerSub: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  payBannerArrow: { color: colors.primaryLight, fontSize: 14, fontWeight: '700' },

  selfPayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  selfPayLabel: { color: '#6B7280', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 12,
  },
  inputPrefix: { color: colors.primary, fontSize: 16, fontWeight: '700', marginRight: 6 },
  payInput: {
    flex: 1,
    color: '#1E1B4B',
    fontSize: 18,
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: { color: '#1E1B4B', fontSize: 16, fontWeight: '700' },
  cardSub: { color: '#9CA3AF', fontSize: 11, marginBottom: 14, marginTop: 3 },

  // Passbook
  passbookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  passbookIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  passbookDetails: { flex: 1 },
  recNo: { color: '#1E1B4B', fontSize: 13, fontWeight: '700' },
  recAgent: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  recTime: { color: '#D1D5DB', fontSize: 10, marginTop: 2 },
  passbookRight: { alignItems: 'flex-end' },
  creditAmt: { color: '#10B981', fontSize: 16, fontWeight: '800' },
  modeTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 4,
  },
  modeTagText: { color: '#D97706', fontSize: 10, fontWeight: '700' },

  // Info
  infoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoTitle: { color: '#3730A3', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  infoBody: { color: '#6B7280', fontSize: 12, lineHeight: 19 },
});
