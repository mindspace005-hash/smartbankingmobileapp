import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  ArrowDownToLine,
  RefreshCw,
  AlertTriangle,
  UserPlus,
  BookOpen,
  BookText,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useThemeColors } from '../../../context/ThemeContext';
import { useAgentDashboard } from '../AgentDashboardContext';
import { AgentCashWalletCard } from '../../../components/agent/AgentCashWalletCard';
import { StatusPill } from '../../../components/ui/StatusPill';
import { SectionHeader } from '../../../components/ui/AppCard';
import { PRODUCT_THEME, RADIUS, TABULAR_NUMS } from '../../../theme/tokens';
import { triggerLightHaptic } from '../../../utils/haptics';

export const AgentHomeTab: React.FC<any> = ({ navigation }) => {
  const {
    currentUser,
    getDashboardSummary,
    checkLockStatus,
    isLoadingAccounts,
    refreshAgentData,
  } = useAuth();
  const { colors, t } = useThemeColors();
  const {
    todayCollections,
    pendingSyncCount,
    isSyncing,
    handleSyncNow,
    openCreateCustomer,
    onSelectReceipt,
  } = useAgentDashboard();

  const dashboardSummary = getDashboardSummary();
  const lockStatus = checkLockStatus();

  return (
    <ScrollView
      style={[styles.screenBg, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollPad}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoadingAccounts} onRefresh={refreshAgentData} />}
    >
      {lockStatus.status === 'LOCKED' && (
        <View style={[styles.alertCard, { backgroundColor: colors.dangerBg, borderColor: '#FCA5A5' }]}>
          <AlertTriangle size={18} color={colors.dangerText} />
          <Text style={[styles.alertCardText, { color: colors.dangerText }]}>{lockStatus.message}</Text>
        </View>
      )}

      <AgentCashWalletCard
        summary={dashboardSummary}
        lockStatus={lockStatus}
        maxLimit={currentUser.limit || 20000}
      />

      {pendingSyncCount > 0 && (
        <View style={[styles.syncBanner, { backgroundColor: colors.warningBg, borderColor: '#FCD34D' }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.warningText }}>
              {pendingSyncCount} {t.pendingSyncAlert}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.syncNowBtn, { backgroundColor: colors.warningText }]}
            onPress={handleSyncNow}
            disabled={isSyncing}
          >
            <RefreshCw size={13} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
              {isSyncing ? '...' : t.syncNow}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <SectionHeader title={t.quickActions} />
      <View style={styles.quickGrid}>
        <QuickTile
          icon={<ArrowDownToLine size={20} color={colors.primary} />}
          bg={colors.infoBg}
          label={t.collect}
          onPress={() => {
            triggerLightHaptic();
            navigation.navigate('Collect');
          }}
        />
        <QuickTile
          icon={<UserPlus size={20} color="#047857" />}
          bg="#DCFCE7"
          label={t.newCustomer}
          onPress={() => {
            triggerLightHaptic();
            openCreateCustomer();
          }}
        />
        <QuickTile
          icon={<BookOpen size={20} color={colors.primaryDark} />}
          bg={colors.surfaceMuted}
          label={t.passbook}
          onPress={() => {
            triggerLightHaptic();
            navigation.navigate('Customers');
          }}
        />
        <QuickTile
          icon={<BookText size={20} color="#B45309" />}
          bg="#FEF3C7"
          label={t.pigmyBook}
          onPress={() => {
            triggerLightHaptic();
            navigation.navigate('Reports');
          }}
        />
      </View>

      <SectionHeader title={`${t.todayEntries} (${todayCollections.length})`} />
      {todayCollections.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            आज कोणतीही वसुली नोंदवलेली नाही.
          </Text>
        </View>
      ) : (
        todayCollections.slice(0, 15).map((c) => {
          const prod = PRODUCT_THEME[c.productType || 'PIGMY'] || PRODUCT_THEME.PIGMY;
          const synced = c.syncStatus === 'SYNCED';
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                triggerLightHaptic();
                onSelectReceipt(c);
              }}
              activeOpacity={0.78}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.txTopRow}>
                  <View style={[styles.prodTag, { backgroundColor: prod.bg }]}>
                    <Text style={{ color: prod.accent, fontSize: 10.5, fontWeight: '800' }}>{prod.labelMr}</Text>
                  </View>
                  <StatusPill
                    label={synced ? 'Synced' : 'Pending'}
                    tone={synced ? 'success' : 'warning'}
                    icon={synced ? <CheckCircle2 size={10} color="#047857" /> : <Clock size={10} color="#B45309" />}
                  />
                </View>
                <Text style={[styles.txCustName, { color: colors.text }]} numberOfLines={1}>
                  {c.customerName}
                </Text>
                <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
                  {c.accountNumber} • {c.receiptNo}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[TABULAR_NUMS, { fontSize: 15.5, fontWeight: '800', color: colors.successText }]}>
                  +₹{c.amount.toLocaleString('en-IN')}
                </Text>
                <Text style={{ fontSize: 10.5, color: colors.textMuted, marginTop: 3 }}>{c.paymentMode}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
};

const QuickTile: React.FC<{
  icon: React.ReactNode;
  bg: string;
  label: string;
  onPress: () => void;
}> = ({ icon, bg, label, onPress }) => {
  const { colors } = useThemeColors();
  return (
    <TouchableOpacity
      style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={[styles.quickIconBox, { backgroundColor: bg }]}>{icon}</View>
      <Text style={[styles.quickLabel, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  screenBg: { flex: 1 },
  scrollPad: { padding: 14, paddingBottom: 28 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 12,
  },
  alertCardText: { flex: 1, fontSize: 12.5, fontWeight: '700' },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 14,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  quickTile: {
    width: '48.4%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingVertical: 15,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  quickIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 9,
    gap: 10,
  },
  txTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  prodTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txCustName: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 24,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
});
