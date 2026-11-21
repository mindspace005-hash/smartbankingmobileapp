import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Landmark,
  TrendingUp,
  Briefcase,
  RefreshCw,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useThemeColors } from '../../context/ThemeContext';
import { StatCard } from '../../components/StatCard';
import { DailyBarChart } from '../../components/agent/DailyBarChart';
import { StatusPill } from '../../components/ui/StatusPill';
import { SectionHeader } from '../../components/ui/AppCard';
import { CollectionRecord } from '../../types';
import { RADIUS, TABULAR_NUMS } from '../../theme/tokens';
import { triggerLightHaptic } from '../../utils/haptics';

interface AdminDashboardProps {
  onSelectReceipt: (receipt: CollectionRecord) => void;
}

interface AdminSummaryData {
  totalBalance: number;
  todaysCollection: number;
  todaysReceiptsCount: number;
  activeAccountsCount: number;
  activeAgentsCount: number;
}

interface AdminCtxValue {
  refreshing: boolean;
  loadSummary: () => Promise<void>;
  summary: AdminSummaryData | null;
  onSelectReceipt: (receipt: CollectionRecord) => void;
}

const AdminCtx = createContext<AdminCtxValue | undefined>(undefined);
const useAdminCtx = () => {
  const c = useContext(AdminCtx);
  if (!c) throw new Error('useAdminCtx must be used inside AdminDashboard');
  return c;
};

const Tab = createBottomTabNavigator();

// Top-level stable tab components (prevent remounting on state updates)
const AdminOverviewTab: React.FC = () => {
  const { accounts, collections, agents } = useAuth();
  const { colors } = useThemeColors();
  const { refreshing, loadSummary, summary, onSelectReceipt } = useAdminCtx();

  const totalBalance = summary?.totalBalance ?? accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalCollectedToday = summary?.todaysCollection ?? collections.reduce((sum, c) => sum + c.amount, 0);
  const activeAccountsCount = summary?.activeAccountsCount ?? accounts.filter((a) => a.status === 'ACTIVE').length;
  const activeAgentsCount = summary?.activeAgentsCount ?? agents.length;
  const todaysReceiptsCount = summary?.todaysReceiptsCount ?? collections.length;

  const agentChartData = agents.slice(0, 7).map((a) => ({
    label: (a.name || 'Ag').split(' ')[0].slice(0, 6),
    value: Number(a.todayCollectedAmount || 0),
  }));

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSummary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topActionRow}>
        <Text style={[styles.heading, { color: colors.text }]}>Financial Control Center</Text>
        <TouchableOpacity
          style={[styles.refreshPill, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            triggerLightHaptic();
            loadSummary();
          }}
        >
          <RefreshCw size={13} color={colors.primary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Total Balance"
          value={`₹${totalBalance.toLocaleString('en-IN')}`}
          subtitle="Active Pigmy"
          accentColor="#10B981"
          iconElement={<Landmark size={18} color="#10B981" />}
        />
        <StatCard
          title="Today's Collection"
          value={`₹${totalCollectedToday.toLocaleString('en-IN')}`}
          subtitle={`${todaysReceiptsCount} receipts`}
          accentColor={colors.primary}
          iconElement={<TrendingUp size={18} color={colors.primary} />}
        />
        <StatCard
          title="Active Accounts"
          value={`${activeAccountsCount}`}
          subtitle="Verified members"
          accentColor="#F59E0B"
          iconElement={<Users size={18} color="#F59E0B" />}
        />
        <StatCard
          title="Field Agents"
          value={`${activeAgentsCount}`}
          subtitle="Active on field"
          accentColor={colors.primaryMid}
          iconElement={<Briefcase size={18} color={colors.primaryMid} />}
        />
      </View>

      {agentChartData.length > 0 && (
        <DailyBarChart
          title="एजंटनुसार आजचे संकलन (Agent Collection)"
          data={agentChartData}
          accentColor={colors.primary}
        />
      )}

      <SectionHeader title={`अलीकडील पावत्या (${collections.slice(0, 6).length})`} />
      {collections.slice(0, 6).map((rec) => (
        <TouchableOpacity
          key={rec.id}
          style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => onSelectReceipt(rec)}
          activeOpacity={0.78}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.custName, { color: colors.text }]}>{rec.customerName}</Text>
            <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
              {rec.accountNumber} • {rec.agentName} • {rec.paymentMode}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[TABULAR_NUMS, { fontSize: 14.5, fontWeight: '800', color: colors.successText }]}>
              +₹{rec.amount.toLocaleString('en-IN')}
            </Text>
            <Text style={{ fontSize: 10.5, color: colors.textMuted }}>{rec.receiptNo}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const AdminAgentsTab: React.FC = () => {
  const { agents } = useAuth();
  const { colors } = useThemeColors();
  const { refreshing, loadSummary } = useAdminCtx();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSummary} />}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title={`Field Agents (${agents.length})`} />
      {agents.map((agent) => {
        const progress =
          agent.todayTargetAmount > 0
            ? Math.min(100, Math.round((agent.todayCollectedAmount / agent.todayTargetAmount) * 100))
            : 0;
        return (
          <View
            key={agent.id}
            style={[styles.agentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.agentHeader}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.infoBg }]}>
                <Text style={{ fontWeight: '800', color: colors.primary }}>{agent.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.custName, { color: colors.text }]}>{agent.name}</Text>
                <Text style={{ fontSize: 11.5, color: colors.textMuted }}>
                  {agent.assignedCustomersCount} Customers • {agent.phone}
                </Text>
              </View>
              <StatusPill label={`${progress}%`} tone={progress >= 75 ? 'success' : 'primary'} />
            </View>

            <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
              <View style={[styles.fill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
            </View>

            <View style={styles.agentFooter}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Collected:{' '}
                <Text style={[TABULAR_NUMS, { fontWeight: '800', color: colors.successText }]}>
                  ₹{agent.todayCollectedAmount.toLocaleString('en-IN')}
                </Text>
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                Target: ₹{agent.todayTargetAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const AdminReceiptsTab: React.FC = () => {
  const { collections } = useAuth();
  const { colors } = useThemeColors();
  const { refreshing, loadSummary, onSelectReceipt } = useAdminCtx();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadSummary} />}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title={`All Recent Deposits (${collections.length})`} />
      {collections.map((rec) => (
        <TouchableOpacity
          key={rec.id}
          style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => onSelectReceipt(rec)}
          activeOpacity={0.78}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.custName, { color: colors.text }]}>{rec.customerName}</Text>
            <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
              {rec.accountNumber} • {rec.paymentMode} • {rec.timestamp}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[TABULAR_NUMS, { fontSize: 14.5, fontWeight: '800', color: colors.successText }]}>
              +₹{rec.amount.toLocaleString('en-IN')}
            </Text>
            <Text style={{ fontSize: 10.5, color: colors.textMuted }}>{rec.receiptNo}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSelectReceipt }) => {
  const { fetchAdminSummary } = useAuth();
  const { colors } = useThemeColors();
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<AdminSummaryData | null>(null);

  const loadSummary = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchAdminSummary();
      if (data) setSummary(data);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAdminSummary]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const ctxValue = useMemo(
    () => ({ refreshing, loadSummary, summary, onSelectReceipt }),
    [refreshing, loadSummary, summary, onSelectReceipt]
  );

  return (
    <AdminCtx.Provider value={ctxValue}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
          },
        }}
      >
        <Tab.Screen
          name="AdminOverview"
          component={AdminOverviewTab}
          options={{
            tabBarLabel: 'Overview',
            tabBarIcon: ({ color, size }) => <LayoutDashboard size={size - 2} color={color} />,
          }}
        />
        <Tab.Screen
          name="AdminAgents"
          component={AdminAgentsTab}
          options={{
            tabBarLabel: 'Agents',
            tabBarIcon: ({ color, size }) => <Users size={size - 2} color={color} />,
          }}
        />
        <Tab.Screen
          name="AdminReceipts"
          component={AdminReceiptsTab}
          options={{
            tabBarLabel: 'Receipts',
            tabBarIcon: ({ color, size }) => <Receipt size={size - 2} color={color} />,
          }}
        />
      </Tab.Navigator>
    </AdminCtx.Provider>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heading: {
    fontSize: 17,
    fontWeight: '800',
  },
  refreshPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 9,
    gap: 10,
  },
  custName: {
    fontSize: 14,
    fontWeight: '700',
  },
  agentCard: {
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 10,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 8,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  agentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
