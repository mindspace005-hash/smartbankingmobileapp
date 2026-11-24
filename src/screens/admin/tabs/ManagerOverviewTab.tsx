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
  Landmark,
  Wallet,
  PiggyBank,
  CalendarClock,
  HandCoins,
  Users,
  RefreshCw,
  ClipboardCheck,
  ShieldAlert,
  Clock,
  ChevronRight,
  Banknote,
  Building2,
} from 'lucide-react-native';
import { useThemeColors } from '../../../context/ThemeContext';
import { DailyBarChart } from '../../../components/agent/DailyBarChart';
import { StatusPill } from '../../../components/ui/StatusPill';
import { SectionHeader } from '../../../components/ui/AppCard';
import { SkeletonCard } from '../../../components/ui/SkeletonCard';
import { PRODUCT_THEME, RADIUS, TABULAR_NUMS } from '../../../theme/tokens';
import { triggerLightHaptic } from '../../../utils/haptics';
import { useManagerDashboard, formatCompactInr } from '../ManagerDashboardContext';

export const ManagerOverviewTab: React.FC<any> = ({ navigation }) => {
  const { colors } = useThemeColors();
  const {
    selectedBranchId,
    setSelectedBranchId,
    refreshing,
    reloadData,
    data,
    pendingApprovalsCount,
  } = useManagerDashboard();

  if (!data) {
    return (
      <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <SkeletonCard count={4} />
      </ScrollView>
    );
  }

  const { branches, portfolio, agents, maturityItems } = data;
  const lockedOrNearLimitAgents = agents.filter(
    (a) => a.isLocked || (a.cashLimit > 0 && a.cashInHand / a.cashLimit >= 0.8)
  ).length;
  const upcoming7DaysMaturity = maturityItems.filter(
    (m) => m.bucket === 'UPCOMING_7' || m.bucket === 'MATURED_UNCLOSED'
  ).length;

  const totalTodayField = portfolio.todayCashCollection + portfolio.todayUpiCollection;
  const cashPct = totalTodayField > 0 ? Math.round((portfolio.todayCashCollection / totalTodayField) * 100) : 100;
  const upiPct = 100 - cashPct;

  const agentChartData = agents.slice(0, 7).map((a) => ({
    label: (a.name || 'Ag').split(' ')[0].slice(0, 6),
    value: Number(a.todayCollectedAmount || 0),
  }));

  const cdTone =
    portfolio.cdRatioPercent > 85
      ? '#FCA5A5'
      : portfolio.cdRatioPercent > 75
      ? '#FDE68A'
      : '#A7F3D0';

  const portfolioCards = [
    {
      key: 'fd',
      title: 'मुदत ठेव (FD)',
      value: formatCompactInr(portfolio.fd.totalBalance),
      sub: `${portfolio.fd.activeAccounts} खाती • ${portfolio.fd.extraValue || ''}`,
      accent: colors.primaryDark,
      bg: colors.infoBg,
      icon: <Landmark size={17} color={colors.primaryDark} />,
    },
    {
      key: 'saving',
      title: 'बचत ठेव (Saving)',
      value: formatCompactInr(portfolio.saving.totalBalance),
      sub: `${portfolio.saving.activeAccounts} सक्रिय खाती`,
      accent: PRODUCT_THEME.SAVING.accent,
      bg: PRODUCT_THEME.SAVING.bg,
      icon: <Wallet size={17} color={PRODUCT_THEME.SAVING.accent} />,
    },
    {
      key: 'pigmy',
      title: 'दैनिक पिग्मी (Pigmy)',
      value: formatCompactInr(portfolio.pigmy.totalBalance),
      sub: `${portfolio.pigmy.activeAccounts} खाती • ${portfolio.pigmy.extraValue || ''}`,
      accent: PRODUCT_THEME.PIGMY.accent,
      bg: PRODUCT_THEME.PIGMY.bg,
      icon: <PiggyBank size={17} color={PRODUCT_THEME.PIGMY.accent} />,
    },
    {
      key: 'rd',
      title: 'आवर्ती ठेव (RD)',
      value: formatCompactInr(portfolio.rd.totalBalance),
      sub: `${portfolio.rd.activeAccounts} सक्रिय खाती`,
      accent: PRODUCT_THEME.RD.accent,
      bg: PRODUCT_THEME.RD.bg,
      icon: <CalendarClock size={17} color={PRODUCT_THEME.RD.accent} />,
    },
    {
      key: 'loan',
      title: 'कर्ज व थकबाकी',
      value: formatCompactInr(portfolio.loan.totalBalance),
      sub: `थकीत ${formatCompactInr(portfolio.totalLoanOverdue)} • NPA ${portfolio.npaPercent}%`,
      accent: PRODUCT_THEME.LOAN.accent,
      bg: PRODUCT_THEME.LOAN.bg,
      icon: <HandCoins size={17} color={PRODUCT_THEME.LOAN.accent} />,
    },
    {
      key: 'shares',
      title: 'भागभांडवल (Shares)',
      value: formatCompactInr(portfolio.shares.totalBalance),
      sub: `${portfolio.totalMembers} एकूण सभासद`,
      accent: '#7C3AED',
      bg: '#EDE9FE',
      icon: <Users size={17} color="#7C3AED" />,
    },
  ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reloadData} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Branch Switcher + Business Date / EOD Row */}
      <View style={styles.branchHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Building2 size={14} color={colors.primaryDark} />
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.text }} numberOfLines={1}>
            दिनांक: {portfolio.businessDate}
          </Text>
          <StatusPill
            label={portfolio.eodStatus === 'OPEN' ? 'Day Open' : 'EOD Pending'}
            tone={portfolio.eodStatus === 'OPEN' ? 'success' : 'warning'}
          />
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            triggerLightHaptic();
            reloadData();
          }}
          activeOpacity={0.75}
        >
          <RefreshCw size={13} color={colors.primary} />
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.primary }}>रिफ्रेश</Text>
        </TouchableOpacity>
      </View>

      {branches.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.branchChipBar}
        >
          {branches.map((br) => {
            const active = selectedBranchId === br.id;
            return (
              <TouchableOpacity
                key={String(br.id)}
                style={[
                  styles.branchChip,
                  {
                    backgroundColor: active ? colors.primaryDark : colors.card,
                    borderColor: active ? colors.primaryDark : colors.border,
                  },
                ]}
                onPress={() => {
                  triggerLightHaptic();
                  setSelectedBranchId(br.id);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: active ? '#FFFFFF' : colors.textSecondary,
                  }}
                >
                  {br.shortName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Executive Liquidity Hero Card */}
      <LinearGradient
        colors={colors.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <Text style={[styles.heroBranchTag, { color: colors.headerSubtext }]} numberOfLines={1}>
            {portfolio.branchName} • EXECUTIVE OVERVIEW
          </Text>
          <View style={styles.cdBadge}>
            <Text style={[styles.cdBadgeText, { color: cdTone }]}>
              CD Ratio {portfolio.cdRatioPercent}%
            </Text>
          </View>
        </View>

        <View style={styles.heroMainGrid}>
          <View style={styles.heroMetricCol}>
            <Text style={[styles.heroLabel, { color: colors.headerSubtext }]}>एकूण ठेवी (Total Deposits)</Text>
            <Text style={[styles.heroValue, TABULAR_NUMS]}>{formatCompactInr(portfolio.totalDeposits)}</Text>
            <Text style={styles.heroSubValue}>FD + Saving + Pigmy + RD</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroMetricCol}>
            <Text style={[styles.heroLabel, { color: colors.headerSubtext }]}>एकूण कर्ज बाकी (Loans)</Text>
            <Text style={[styles.heroValue, TABULAR_NUMS]}>{formatCompactInr(portfolio.totalLoanOutstanding)}</Text>
            <Text style={styles.heroSubValue}>NPA {portfolio.npaPercent}%</Text>
          </View>
        </View>

        <View style={styles.heroBottomStrip}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Banknote size={15} color="#FDE68A" />
            <Text style={styles.heroBottomLabel}>शाखा रोख शिल्लक (Cash in Hand)</Text>
          </View>
          <Text style={[styles.heroBottomValue, TABULAR_NUMS]}>
            ₹{Math.round(portfolio.branchCashInHand).toLocaleString('en-IN')}
          </Text>
        </View>
      </LinearGradient>

      {/* Action Center Alerts Strip (1-Tap Navigation) */}
      <SectionHeader title="तातडीच्या कृती (Action Center)" />
      <View style={styles.alertsWrap}>
        <TouchableOpacity
          style={[styles.alertRow, { backgroundColor: colors.warningBg, borderColor: '#FCD34D' }]}
          onPress={() => {
            triggerLightHaptic();
            navigation.navigate('ManagerApprovals');
          }}
          activeOpacity={0.8}
        >
          <ClipboardCheck size={17} color={colors.warningText} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, { color: colors.warningText }]}>
              {pendingApprovalsCount} प्रलंबित मंजुरी (Approvals)
            </Text>
            <Text style={[styles.alertSub, { color: colors.warningText }]}>
              नवीन ग्राहक KYC, कर्ज अर्ज व उच्च व्हाउचर्स तपासा
            </Text>
          </View>
          <ChevronRight size={16} color={colors.warningText} />
        </TouchableOpacity>

        {lockedOrNearLimitAgents > 0 && (
          <TouchableOpacity
            style={[styles.alertRow, { backgroundColor: colors.dangerBg, borderColor: '#FCA5A5' }]}
            onPress={() => {
              triggerLightHaptic();
              navigation.navigate('ManagerAgents');
            }}
            activeOpacity={0.8}
          >
            <ShieldAlert size={17} color={colors.dangerText} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: colors.dangerText }]}>
                {lockedOrNearLimitAgents} एजंट रोख मर्यादेजवळ / लॉक
              </Text>
              <Text style={[styles.alertSub, { color: colors.dangerText }]}>
                रोख जमा स्वीकारण्यासाठी किंवा अनलॉक करण्यासाठी टॅप करा
              </Text>
            </View>
            <ChevronRight size={16} color={colors.dangerText} />
          </TouchableOpacity>
        )}

        {upcoming7DaysMaturity > 0 && (
          <TouchableOpacity
            style={[styles.alertRow, { backgroundColor: colors.infoBg, borderColor: colors.border }]}
            onPress={() => {
              triggerLightHaptic();
              navigation.navigate('ManagerRisk');
            }}
            activeOpacity={0.8}
          >
            <Clock size={17} color={colors.infoText} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: colors.infoText }]}>
                {upcoming7DaysMaturity} FD / RD आगामी ७ दिवसांत मॅच्युअर
              </Text>
              <Text style={[styles.alertSub, { color: colors.infoText }]}>
                नूतनीकरण व रोख नियोजनासाठी यादी पहा
              </Text>
            </View>
            <ChevronRight size={16} color={colors.infoText} />
          </TouchableOpacity>
        )}
      </View>

      {/* 6-Product Portfolio Grid */}
      <SectionHeader title="संपूर्ण पतसंस्था पोर्टफोलिओ (६ विभाग)" />
      <View style={styles.portfolioGrid}>
        {portfolioCards.map((item) => (
          <View
            key={item.key}
            style={[styles.portCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.portCardTop}>
              <View style={[styles.portIconBox, { backgroundColor: item.bg }]}>{item.icon}</View>
              <Text style={[styles.portTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            <Text style={[styles.portValue, TABULAR_NUMS, { color: colors.text }]}>{item.value}</Text>
            <Text style={[styles.portSub, { color: colors.textMuted }]} numberOfLines={1}>
              {item.sub}
            </Text>
          </View>
        ))}
      </View>

      {/* Today's Field Collection Cash vs UPI Split */}
      <View style={[styles.splitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.splitTopRow}>
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }}>
            आजचे फिल्ड संकलन (Cash vs UPI)
          </Text>
          <Text style={[TABULAR_NUMS, { fontSize: 14, fontWeight: '900', color: colors.successText }]}>
            ₹{totalTodayField.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={[styles.splitBarTrack, { backgroundColor: colors.surfaceMuted }]}>
          <View style={{ width: `${cashPct}%`, backgroundColor: colors.primary, height: '100%' }} />
          <View style={{ width: `${upiPct}%`, backgroundColor: '#F59E0B', height: '100%' }} />
        </View>
        <View style={styles.splitLegendRow}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryDark }}>
            ● रोख (CASH): ₹{portfolio.todayCashCollection.toLocaleString('en-IN')} ({cashPct}%)
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#B45309' }}>
            ● UPI: ₹{portfolio.todayUpiCollection.toLocaleString('en-IN')} ({upiPct}%)
          </Text>
        </View>
      </View>

      {/* Agent Performance Bar Chart */}
      {agentChartData.length > 0 && (
        <DailyBarChart
          title="एजंटनुसार आजचे संकलन (Field Agents)"
          data={agentChartData}
          accentColor={colors.primary}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  branchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  branchChipBar: {
    gap: 8,
    paddingBottom: 12,
  },
  branchChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  heroBranchTag: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cdBadge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: RADIUS.pill,
  },
  cdBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  heroMainGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroMetricCol: {
    flex: 1,
  },
  heroDivider: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginHorizontal: 12,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 2,
  },
  heroSubValue: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
  },
  heroBottomStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  heroBottomLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
  },
  heroBottomValue: {
    color: '#FEF3C7',
    fontSize: 15,
    fontWeight: '900',
  },
  alertsWrap: {
    gap: 8,
    marginBottom: 16,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  alertSub: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.85,
    marginTop: 1,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  portCard: {
    width: '48.3%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 12,
  },
  portCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  portIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portTitle: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
  },
  portValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  portSub: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 3,
  },
  splitCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  splitTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  splitBarTrack: {
    height: 9,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 9,
  },
  splitLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
});
