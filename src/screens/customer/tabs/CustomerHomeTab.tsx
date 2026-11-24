import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Eye,
  EyeOff,
  RefreshCw,
  BookOpen,
  Home,
  FileBadge2,
  HandCoins,
  Calculator,
  Percent,
  Award,
  Headphones,
  CalendarClock,
  ChevronRight,
} from 'lucide-react-native';
import { useThemeColors } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { SectionHeader } from '../../../components/ui/AppCard';
import { SkeletonCard } from '../../../components/ui/SkeletonCard';
import { StatusPill } from '../../../components/ui/StatusPill';
import { PRODUCT_THEME, RADIUS, TABULAR_NUMS } from '../../../theme/tokens';
import { triggerLightHaptic } from '../../../utils/haptics';
import { useCustomerDashboard } from '../CustomerDashboardContext';

export const CustomerHomeTab: React.FC<any> = ({ navigation }) => {
  const { colors } = useThemeColors();
  const { currentUser } = useAuth();
  const {
    data,
    loading,
    refreshing,
    error,
    reloadData,
    hideBalances,
    toggleHideBalances,
    maskInr,
    openPassbook,
    openFdCertificate,
    triggerServiceModal,
  } = useCustomerDashboard();

  if (loading && !data) {
    return (
      <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <SkeletonCard count={4} />
      </ScrollView>
    );
  }

  const summary = data?.summary;
  const dueReminders = data?.dueReminders || [];
  const recentActivity = data?.recentActivity || [];
  const firstPigmy = data?.accounts.pigmyAccounts[0];
  const firstFd = data?.accounts.fdAccounts[0];

  const quickActions = [
    {
      key: 'passbook',
      label: 'पासबुक',
      bg: PRODUCT_THEME.PIGMY.bg,
      icon: <BookOpen size={19} color={PRODUCT_THEME.PIGMY.accent} />,
      onPress: () => {
        if (firstPigmy) {
          openPassbook('PIGMY', firstPigmy.accountId);
        } else {
          navigation.navigate('CustomerAccounts');
        }
      },
    },
    {
      key: 'pickup',
      label: 'एजंट बोलवा',
      bg: '#DCFCE7',
      icon: <Home size={19} color="#047857" />,
      onPress: () => {
        triggerServiceModal({ type: 'DOORSTEP_PICKUP' });
        navigation.navigate('CustomerServices');
      },
    },
    {
      key: 'fd',
      label: 'FD प्रमाणपत्र',
      bg: colors.infoBg,
      icon: <FileBadge2 size={19} color={colors.primaryDark} />,
      onPress: () => {
        if (firstFd) {
          openFdCertificate(firstFd);
        } else {
          navigation.navigate('CustomerAccounts');
        }
      },
    },
    {
      key: 'loan',
      label: 'कर्ज अर्ज',
      bg: PRODUCT_THEME.LOAN.bg,
      icon: <HandCoins size={19} color={PRODUCT_THEME.LOAN.accent} />,
      onPress: () => {
        triggerServiceModal({ type: 'LOAN_APPLY' });
        navigation.navigate('CustomerServices');
      },
    },
    {
      key: 'calc',
      label: 'कॅल्क्युलेटर',
      bg: '#EDE9FE',
      icon: <Calculator size={19} color="#6D28D9" />,
      onPress: () => navigation.navigate('CustomerCalculators'),
    },
    {
      key: 'rates',
      label: 'व्याजदर',
      bg: '#FEF3C7',
      icon: <Percent size={19} color="#B45309" />,
      onPress: () => navigation.navigate('CustomerCalculators'),
    },
    {
      key: 'shares',
      label: 'भागभांडवल',
      bg: '#FCE7F3',
      icon: <Award size={19} color="#BE185D" />,
      onPress: () => navigation.navigate('CustomerAccounts'),
    },
    {
      key: 'help',
      label: 'शाखा मदत',
      bg: colors.surfaceMuted,
      icon: <Headphones size={19} color={colors.textSecondary} />,
      onPress: () => navigation.navigate('CustomerProfile'),
    },
  ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reloadData} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Wealth Card with Balance Privacy Toggle */}
      <LinearGradient
        colors={colors.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTag, { color: colors.headerSubtext }]} numberOfLines={1}>
              {summary?.branchName || 'खातेदार डिजिटल बँकिंग'}
            </Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {summary?.customerName || currentUser.name || 'खातेदार'}
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.headerSubtext, marginTop: 2 }}>
              CIF: {summary?.cifNo || currentUser.accountNumber || '-'} • सभासद: {data?.shareAccount.memberNo || '-'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => {
                triggerLightHaptic();
                toggleHideBalances();
              }}
              activeOpacity={0.75}
            >
              {hideBalances ? <EyeOff size={15} color="#FEF3C7" /> : <Eye size={15} color="#FFFFFF" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => {
                triggerLightHaptic();
                reloadData();
              }}
              activeOpacity={0.75}
            >
              <RefreshCw size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroCol}>
            <Text style={[styles.heroStatLbl, { color: colors.headerSubtext }]}>एकूण ठेवी</Text>
            <Text style={[styles.heroStatVal, TABULAR_NUMS]}>
              {maskInr(summary?.totalSavingsAndDeposits ?? 0)}
            </Text>
          </View>
          <View style={styles.heroDiv} />
          <View style={styles.heroCol}>
            <Text style={[styles.heroStatLbl, { color: colors.headerSubtext }]}>कर्ज बाकी</Text>
            <Text style={[styles.heroStatVal, TABULAR_NUMS]}>
              {maskInr(summary?.totalLoanOutstanding ?? 0)}
            </Text>
          </View>
          <View style={styles.heroDiv} />
          <View style={styles.heroCol}>
            <Text style={[styles.heroStatLbl, { color: colors.headerSubtext }]}>भागभांडवल</Text>
            <Text style={[styles.heroStatVal, TABULAR_NUMS]}>
              {maskInr(summary?.totalShareAmount ?? 0)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {error ? (
        <View style={[styles.errCard, { backgroundColor: colors.dangerBg, borderColor: '#FCA5A5' }]}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.dangerText }}>{error}</Text>
        </View>
      ) : null}

      {/* Upcoming Due Reminders */}
      {dueReminders.length > 0 && (
        <>
          <SectionHeader title="आगामी देय हप्ते (Upcoming Dues)" />
          <View style={{ gap: 8, marginBottom: 14 }}>
            {dueReminders.map((due) => (
              <View
                key={due.id}
                style={[styles.dueCard, { backgroundColor: colors.warningBg, borderColor: '#FCD34D' }]}
              >
                <CalendarClock size={18} color={colors.warningText} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.warningText }}>{due.title}</Text>
                  <Text style={{ fontSize: 11.5, color: colors.warningText, opacity: 0.9, marginTop: 1 }}>
                    देय दिनांक: {due.dueDate} ({due.daysLeft} दिवस बाकी) • ₹{due.amount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.dueActionBtn, { backgroundColor: colors.warningText }]}
                  onPress={() => {
                    triggerLightHaptic();
                    triggerServiceModal({
                      type: 'DOORSTEP_PICKUP',
                      title: due.title,
                      amount: String(due.amount),
                    });
                    navigation.navigate('CustomerServices');
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>एजंट बोलवा</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Quick Banking Services Grid (2x4) */}
      <SectionHeader title="त्वरित डिजिटल सेवा (Quick Services)" />
      <View style={styles.quickGrid}>
        {quickActions.map((act) => (
          <TouchableOpacity
            key={act.key}
            style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              triggerLightHaptic();
              act.onPress();
            }}
            activeOpacity={0.78}
          >
            <View style={[styles.quickIconBox, { backgroundColor: act.bg }]}>{act.icon}</View>
            <Text style={[styles.quickLabel, { color: colors.text }]} numberOfLines={1}>
              {act.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Unified Recent Activity Feed */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>अलीकडील व्यवहार</Text>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
          onPress={() => navigation.navigate('CustomerAccounts')}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>सर्व खाती पहा</Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {recentActivity.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 12.5, color: colors.textMuted, fontWeight: '600' }}>
            पासबुक पाहण्यासाठी 'खाती' टॅबमधील कोणत्याही खात्यावर टॅप करा.
          </Text>
        </View>
      ) : (
        recentActivity.slice(0, 6).map((tx) => {
          const isDebit = tx.drAmount > 0;
          const prodKey = tx.productType === 'FD' ? 'PIGMY' : tx.productType;
          const theme = PRODUCT_THEME[prodKey] || PRODUCT_THEME.PIGMY;
          return (
            <TouchableOpacity
              key={tx.id}
              style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openPassbook(tx.productType, tx.accountId)}
              activeOpacity={0.78}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <View style={[styles.prodTag, { backgroundColor: theme.bg }]}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: theme.accent }}>{tx.productType}</Text>
                  </View>
                  <StatusPill label={tx.date} tone="neutral" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  {tx.narration}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                  A/c {tx.accountNo} • {tx.reference}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    TABULAR_NUMS,
                    { fontSize: 14.5, fontWeight: '900', color: isDebit ? colors.dangerText : colors.successText },
                  ]}
                >
                  {isDebit ? `-₹${tx.drAmount.toLocaleString('en-IN')}` : `+₹${tx.crAmount.toLocaleString('en-IN')}`}
                </Text>
                <Text style={[TABULAR_NUMS, { fontSize: 10.5, color: colors.textMuted, marginTop: 2 }]}>
                  शिल्लक {maskInr(tx.balance)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  heroTag: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  heroName: { color: '#FFFFFF', fontSize: 18.5, fontWeight: '800', marginTop: 2 },
  heroIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    paddingHorizontal: 6,
    marginTop: 14,
  },
  heroCol: { flex: 1, alignItems: 'center' },
  heroDiv: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroStatLbl: { fontSize: 10.5, fontWeight: '700' },
  heroStatVal: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 3 },
  errCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  dueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  dueActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickTile: {
    width: '23.1%',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 6,
  },
  quickIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLabel: { fontSize: 10.5, fontWeight: '800', textAlign: 'center' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14.5, fontWeight: '800' },
  emptyCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 9,
    gap: 10,
  },
  prodTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
