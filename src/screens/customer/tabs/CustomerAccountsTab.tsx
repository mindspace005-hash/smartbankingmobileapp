import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  PiggyBank,
  Wallet,
  CalendarClock,
  Landmark,
  HandCoins,
  BookOpen,
  FileBadge2,
  Award,
  CalendarDays,
} from 'lucide-react-native';
import { useThemeColors } from '../../../context/ThemeContext';
import { StatusPill } from '../../../components/ui/StatusPill';
import { SectionHeader } from '../../../components/ui/AppCard';
import { CustomerPortalAccountItem } from '../../../types';
import { PRODUCT_THEME, RADIUS, TABULAR_NUMS } from '../../../theme/tokens';
import { triggerLightHaptic } from '../../../utils/haptics';
import { useCustomerDashboard } from '../CustomerDashboardContext';

type AccountFilter = 'ALL' | 'PIGMY' | 'SAVING' | 'RD' | 'FD' | 'LOAN' | 'SHARES';

export const CustomerAccountsTab: React.FC = () => {
  const { colors } = useThemeColors();
  const {
    data,
    refreshing,
    reloadData,
    maskInr,
    openPassbook,
    openFdCertificate,
    openLoanSchedule,
  } = useCustomerDashboard();

  const [filter, setFilter] = useState<AccountFilter>('ALL');

  const allAccounts: CustomerPortalAccountItem[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.accounts.pigmyAccounts,
      ...data.accounts.savingAccounts,
      ...data.accounts.rdAccounts,
      ...data.accounts.fdAccounts,
      ...data.accounts.loanAccounts,
    ];
  }, [data]);

  const filteredAccounts = useMemo(() => {
    if (filter === 'SHARES') return [];
    if (filter === 'ALL') return allAccounts;
    return allAccounts.filter((a) => a.productType === filter);
  }, [allAccounts, filter]);

  const share = data?.shareAccount;
  const showShareCard = (filter === 'ALL' || filter === 'SHARES') && share && share.totalShareAmount > 0;

  const getVisual = (type: CustomerPortalAccountItem['productType']) => {
    switch (type) {
      case 'PIGMY':
        return { icon: <PiggyBank size={19} color={PRODUCT_THEME.PIGMY.accent} />, bg: PRODUCT_THEME.PIGMY.bg, accent: PRODUCT_THEME.PIGMY.accent };
      case 'SAVING':
        return { icon: <Wallet size={19} color={PRODUCT_THEME.SAVING.accent} />, bg: PRODUCT_THEME.SAVING.bg, accent: PRODUCT_THEME.SAVING.accent };
      case 'RD':
        return { icon: <CalendarClock size={19} color={PRODUCT_THEME.RD.accent} />, bg: PRODUCT_THEME.RD.bg, accent: PRODUCT_THEME.RD.accent };
      case 'LOAN':
        return { icon: <HandCoins size={19} color={PRODUCT_THEME.LOAN.accent} />, bg: PRODUCT_THEME.LOAN.bg, accent: PRODUCT_THEME.LOAN.accent };
      default:
        return { icon: <Landmark size={19} color={colors.primaryDark} />, bg: colors.infoBg, accent: colors.primaryDark };
    }
  };

  const filterChips: { key: AccountFilter; label: string }[] = [
    { key: 'ALL', label: 'सर्व खाती' },
    { key: 'PIGMY', label: 'पिग्मी' },
    { key: 'SAVING', label: 'बचत' },
    { key: 'RD', label: 'RD' },
    { key: 'FD', label: 'FD' },
    { key: 'LOAN', label: 'कर्ज' },
    { key: 'SHARES', label: 'भागभांडवल' },
  ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reloadData} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Product Filter Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipBar}>
        {filterChips.map((c) => {
          const active = filter === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primaryDark : colors.card,
                  borderColor: active ? colors.primaryDark : colors.border,
                },
              ]}
              onPress={() => {
                triggerLightHaptic();
                setFilter(c.key);
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#FFFFFF' : colors.textSecondary }}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filteredAccounts.length > 0 && (
        <>
          <SectionHeader title={`तुमची खाती (${filteredAccounts.length})`} />
          {filteredAccounts.map((acc) => {
            const vis = getVisual(acc.productType);
            const isFd = acc.productType === 'FD';
            const isLoan = acc.productType === 'LOAN';
            const isRd = acc.productType === 'RD';

            const rdPct =
              isRd && acc.totalInstallments && acc.totalInstallments > 0
                ? Math.min(100, Math.round(((acc.paidInstallments || 0) / acc.totalInstallments) * 100))
                : 0;

            const loanPaidPct =
              isLoan && acc.sanctionedAmount && acc.sanctionedAmount > 0
                ? Math.min(100, Math.round(((acc.sanctionedAmount - acc.balance) / acc.sanctionedAmount) * 100))
                : 0;

            return (
              <View
                key={`${acc.productType}_${acc.accountId}`}
                style={[styles.accCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.accTop}>
                  <View style={[styles.accIcon, { backgroundColor: vis.bg }]}>{vis.icon}</View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.accScheme, { color: vis.accent }]} numberOfLines={1}>
                        {acc.schemeName}
                      </Text>
                      <StatusPill label={acc.status || 'Active'} tone={acc.status === 'Active' ? 'success' : 'neutral'} />
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      A/c: {acc.accountNo} {acc.oldAccountNo ? `• जुना #${acc.oldAccountNo}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[TABULAR_NUMS, { fontSize: 16, fontWeight: '900', color: colors.text }]}>
                      {maskInr(acc.balance)}
                    </Text>
                    {acc.interestRate ? (
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.primary }}>
                        {acc.interestRate}% p.a.
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Product-specific rich meta strip */}
                {isRd && acc.totalInstallments ? (
                  <View style={[styles.metaBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.textSecondary }}>
                        भरलेले हप्ते: {acc.paidInstallments || 0} / {acc.totalInstallments}
                      </Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: PRODUCT_THEME.RD.accent }}>
                        मॅच्युरिटी: {acc.maturityDate}
                      </Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.border }]}>
                      <View style={{ width: `${rdPct}%`, height: '100%', backgroundColor: PRODUCT_THEME.RD.accent, borderRadius: 4 }} />
                    </View>
                  </View>
                ) : null}

                {isFd ? (
                  <View style={[styles.metaBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11.5, color: colors.textMuted, fontWeight: '600' }}>
                        मॅच्युरिटी दिनांक: <Text style={{ color: colors.text, fontWeight: '800' }}>{acc.maturityDate}</Text>
                      </Text>
                      {acc.maturityAmount ? (
                        <Text style={{ fontSize: 11.5, color: colors.successText, fontWeight: '800' }}>
                          मॅच्युरिटी: {maskInr(acc.maturityAmount)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {isLoan ? (
                  <View style={[styles.metaBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.textSecondary }}>
                        परतफेड प्रगती ({loanPaidPct}%)
                      </Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.warningText }}>
                        पुढचा EMI: {acc.nextEmiDate || '-'} (₹{(acc.targetAmount || 0).toLocaleString('en-IN')})
                      </Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.border }]}>
                      <View style={{ width: `${loanPaidPct}%`, height: '100%', backgroundColor: PRODUCT_THEME.LOAN.accent, borderRadius: 4 }} />
                    </View>
                  </View>
                ) : null}

                {acc.productType === 'PIGMY' && acc.agentName ? (
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
                    दैनिक ठेव: ₹{(acc.targetAmount || 0).toLocaleString('en-IN')} • एजंट: {acc.agentName}
                  </Text>
                ) : null}

                {/* Action Buttons */}
                <View style={styles.btnRow}>
                  {isFd ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.primaryDark }]}
                      onPress={() => openFdCertificate(acc)}
                      activeOpacity={0.82}
                    >
                      <FileBadge2 size={14} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                        डिजिटल FD प्रमाणपत्र पहा
                      </Text>
                    </TouchableOpacity>
                  ) : isLoan ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primaryDark }]}
                        onPress={() => openLoanSchedule(acc)}
                        activeOpacity={0.82}
                      >
                        <CalendarDays size={14} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>EMI वेळापत्रक</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border }]}
                        onPress={() => openPassbook('LOAN', acc.accountId)}
                        activeOpacity={0.82}
                      >
                        <BookOpen size={14} color={colors.primaryDark} />
                        <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: '800' }}>पासबुक पहा</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.infoBg, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => openPassbook(acc.productType, acc.accountId)}
                      activeOpacity={0.82}
                    >
                      <BookOpen size={14} color={colors.primaryDark} />
                      <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: '800' }}>
                        डिजिटल पासबुक व स्टेटमेंट पहा
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* Member Share Capital Certificate Card */}
      {showShareCard && share && (
        <>
          <SectionHeader title="सभासद भागभांडवल प्रमाणपत्र (Share Certificate)" />
          <View style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={[styles.accIcon, { backgroundColor: '#FCE7F3' }]}>
                <Award size={20} color="#BE185D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.text }}>
                  सभासद भागभांडवल (Share Capital)
                </Text>
                <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 1 }}>
                  सभासद क्र. {share.memberNo} • प्रमाणपत्र {share.certificateNo}
                </Text>
              </View>
              <StatusPill label={share.status} tone="success" />
            </View>

            <View style={[styles.shareGrid, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <View style={styles.shareCell}>
                <Text style={{ fontSize: 10.5, color: colors.textMuted }}>एकूण भागभांडवल</Text>
                <Text style={[TABULAR_NUMS, { fontSize: 15.5, fontWeight: '900', color: colors.primaryDark }]}>
                  {maskInr(share.totalShareAmount)}
                </Text>
              </View>
              <View style={styles.shareCell}>
                <Text style={{ fontSize: 10.5, color: colors.textMuted }}>एकूण शेअर्स</Text>
                <Text style={[TABULAR_NUMS, { fontSize: 15.5, fontWeight: '900', color: colors.text }]}>
                  {share.totalShares} × ₹{share.faceValue}
                </Text>
              </View>
              <View style={styles.shareCell}>
                <Text style={{ fontSize: 10.5, color: colors.textMuted }}>लाभांश ({share.lastDividendYear})</Text>
                <Text style={[TABULAR_NUMS, { fontSize: 14.5, fontWeight: '900', color: colors.successText }]}>
                  {share.lastDividendPercent}% ({maskInr(share.lastDividendAmount)})
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  chipBar: { gap: 7, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  accCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 13,
    marginBottom: 11,
  },
  accTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accScheme: { fontSize: 13.5, fontWeight: '800' },
  metaBox: {
    marginTop: 10,
    padding: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9.5,
    borderRadius: RADIUS.md,
  },
  shareCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 13,
    marginBottom: 12,
  },
  shareGrid: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  shareCell: { flex: 1 },
});
