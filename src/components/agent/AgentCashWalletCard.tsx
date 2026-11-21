import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wallet, ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { DashboardSummary, RemittanceStatus } from '../../types';
import { RADIUS, TABULAR_NUMS } from '../../theme/tokens';

interface AgentCashWalletCardProps {
  summary: DashboardSummary;
  lockStatus: RemittanceStatus;
  maxLimit?: number;
}

export const AgentCashWalletCard: React.FC<AgentCashWalletCardProps> = ({
  summary,
  lockStatus,
  maxLimit = 20000,
}) => {
  const { colors, t } = useThemeColors();
  const isLocked = lockStatus.status === 'LOCKED';
  const cashInHand = summary.pendingCashInHand ?? summary.closingBalance;
  const pct = maxLimit > 0 ? Math.min(100, Math.round((cashInHand / maxLimit) * 100)) : 0;
  const barColor = isLocked || pct >= 95 ? '#F87171' : pct >= 75 ? '#FBBF24' : '#34D399';

  return (
    <LinearGradient
      colors={colors.gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.decGlow} />

      {/* Top Row */}
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <View style={styles.walletIconBox}>
            <Wallet size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.walletTitle}>{t.cashInHand}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isLocked ? 'rgba(239,68,68,0.28)' : 'rgba(16,185,129,0.22)' },
          ]}
        >
          {isLocked ? (
            <ShieldAlert size={13} color="#FECACA" />
          ) : (
            <ShieldCheck size={13} color="#A7F3D0" />
          )}
          <Text style={[styles.statusText, { color: isLocked ? '#FECACA' : '#A7F3D0' }]}>
            {isLocked ? 'LOCKED' : 'ACTIVE'}
          </Text>
        </View>
      </View>

      {/* Main Balance */}
      <Text style={[styles.heroAmount, TABULAR_NUMS]}>
        ₹{cashInHand.toLocaleString('en-IN')}
      </Text>

      {/* 3 Metric Columns */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>{t.opening}</Text>
          <Text style={[styles.metricValue, TABULAR_NUMS]}>
            ₹{summary.openingBalance.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>{t.todayCollection}</Text>
          <Text style={[styles.metricValue, TABULAR_NUMS]}>
            ₹{summary.todaysCollection.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>{t.receipts}</Text>
          <Text style={[styles.metricValue, TABULAR_NUMS]}>{summary.totalReceipts}</Text>
        </View>
      </View>

      {/* Cash Limit Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressText}>
            {t.cashLimit}: ₹{cashInHand.toLocaleString('en-IN')} / ₹{maxLimit.toLocaleString('en-IN')}
          </Text>
          <Text style={[styles.progressPct, { color: barColor }]}>{pct}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  decGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletTitle: {
    color: '#DBEAFE',
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  metricLabel: {
    color: '#BFDBFE',
    fontSize: 10.5,
    fontWeight: '600',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  progressSection: {
    marginTop: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    color: '#E2E8F0',
    fontSize: 11.5,
    fontWeight: '600',
  },
  progressPct: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
