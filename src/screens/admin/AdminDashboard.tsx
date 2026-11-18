import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useThemeColors, ThemeColors } from '../../context/ThemeContext';
import { StatCard } from '../../components/StatCard';
import { CollectionRecord } from '../../types';

interface AdminDashboardProps {
  onSelectReceipt: (receipt: CollectionRecord) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSelectReceipt }) => {
  const { accounts, collections, agents } = useAuth();
  const { colors } = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalCollectedToday = collections
    .filter((c) => c.timestamp.includes('2026-08-08') || c.timestamp.includes('AM') || c.timestamp.includes('PM'))
    .reduce((sum, c) => sum + c.amount, 0);
  const activeAccountsCount = accounts.filter((a) => a.status === 'ACTIVE').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>Admin Financial Control Center</Text>

      {/* Action Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => Alert.alert('New Account', 'Create Customer Pigmi Account module ready.')}
        >
          <Text style={styles.primaryBtnText}>+ New Pigmi Account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Total Balance"
          value={`₹${totalBalance.toLocaleString('en-IN')}`}
          subtitle="Accrued in system"
          accentColor="#10B981"
          icon="🏛️"
        />
        <StatCard
          title="Today's Collection"
          value={`₹${totalCollectedToday.toLocaleString('en-IN')}`}
          subtitle={`${collections.length} receipts`}
          accentColor={colors.primary}
          icon="📈"
        />
        <StatCard
          title="Active Accounts"
          value={`${activeAccountsCount}`}
          subtitle="Verified customers"
          accentColor="#F59E0B"
          icon="👥"
        />
        <StatCard
          title="Field Agents"
          value={`${agents.length}`}
          subtitle="Active on field"
          accentColor="#EC4899"
          icon="💼"
        />
      </View>

      {/* Agent Monitor */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>Agent Field Monitor</Text>
          <View style={styles.liveDot}>
            <View style={styles.liveDotInner} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {agents.map((agent) => {
          const progress = Math.min(100, Math.round((agent.todayCollectedAmount / agent.todayTargetAmount) * 100));
          return (
            <View key={agent.id} style={styles.agentCard}>
              <View style={styles.agentRow}>
                <View style={styles.agentAvatar}>
                  <Text style={styles.agentAvatarText}>{agent.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.agentName}>{agent.name}</Text>
                  <Text style={styles.agentSub}>{agent.assignedCustomersCount} Customers • {agent.phone}</Text>
                </View>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressBadgeText}>{progress}%</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>

              <View style={styles.agentMetrics}>
                <Text style={styles.metricLabel}>
                  Collected: <Text style={styles.metricValue}>₹{agent.todayCollectedAmount.toLocaleString('en-IN')}</Text>
                </Text>
                <Text style={styles.metricLabel}>
                  Target: <Text style={styles.metricMuted}>₹{agent.todayTargetAmount.toLocaleString('en-IN')}</Text>
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Recent Deposits */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Pigmi Deposits</Text>
        {collections.map((rec) => (
          <TouchableOpacity
            key={rec.id}
            style={styles.listRow}
            onPress={() => onSelectReceipt(rec)}
            activeOpacity={0.6}
          >
            <View style={styles.listRowLeft}>
              <View style={styles.receiptDot} />
              <View>
                <Text style={styles.custName}>{rec.customerName}</Text>
                <Text style={styles.listSub}>{rec.accountNumber} • {rec.paymentMode}</Text>
                <Text style={styles.listTime}>{rec.timestamp}</Text>
              </View>
            </View>
            <View style={styles.listRowRight}>
              <Text style={styles.amountText}>+₹{rec.amount}</Text>
              <Text style={styles.receiptNo}>{rec.receiptNo}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    color: '#1E1B4B',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  liveDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },

  // Agent card
  agentCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  agentName: { color: '#1E1B4B', fontSize: 14, fontWeight: '700' },
  agentSub: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  progressBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  progressTrack: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  agentMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
  metricLabel: { color: '#9CA3AF', fontSize: 12 },
  metricValue: { color: colors.primary, fontWeight: '700' },
  metricMuted: { color: '#6B7280' },

  // List rows
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  listRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  receiptDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  custName: { color: '#1E1B4B', fontSize: 14, fontWeight: '600' },
  listSub: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  listTime: { color: '#D1D5DB', fontSize: 10, marginTop: 1 },
  listRowRight: { alignItems: 'flex-end' },
  amountText: { color: '#10B981', fontSize: 15, fontWeight: '800' },
  receiptNo: { color: '#D1D5DB', fontSize: 10, marginTop: 2 },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
