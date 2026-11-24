import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  PiggyBank,
  Wallet,
  CalendarClock,
  Landmark,
  HandCoins,
  BookOpen,
  X,
  Info,
  RefreshCw,
} from 'lucide-react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/StatCard';
import { StatusPill } from '../../components/ui/StatusPill';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { SectionHeader } from '../../components/ui/AppCard';
import { CollectionRecord } from '../../types';
import { PRODUCT_THEME, RADIUS, TABULAR_NUMS } from '../../theme/tokens';
import { triggerLightHaptic } from '../../utils/haptics';

interface CustomerDashboardProps {
  onSelectReceipt: (receipt: CollectionRecord) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = () => {
  const { colors } = useThemeColors();
  const { currentUser, fetchCustomerPortalOverview, fetchCustomerAccountPassbook } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [portalAccounts, setPortalAccounts] = useState<{
    pigmyAccounts: any[];
    savingAccounts: any[];
    rdAccounts: any[];
    fdAccounts: any[];
    loanAccounts: any[];
  }>({
    pigmyAccounts: [],
    savingAccounts: [],
    rdAccounts: [],
    fdAccounts: [],
    loanAccounts: [],
  });

  const [passbookLoading, setPassbookLoading] = useState(false);
  const [passbookData, setPassbookData] = useState<{
    productType: string;
    accountNo: string;
    currentBalance: number;
    transactions: any[];
  } | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchCustomerPortalOverview();
      setSummary(data.summary);
      setPortalAccounts({
        pigmyAccounts: data.accounts?.pigmyAccounts || [],
        savingAccounts: data.accounts?.savingAccounts || [],
        rdAccounts: data.accounts?.rdAccounts || [],
        fdAccounts: data.accounts?.fdAccounts || [],
        loanAccounts: data.accounts?.loanAccounts || [],
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'खाते माहिती लोड करताना अडचण आली.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchCustomerPortalOverview]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openPassbook = async (productType: string, accountId: number) => {
    if (productType === 'FD') return;
    triggerLightHaptic();
    setPassbookLoading(true);
    setPassbookData({ productType, accountNo: '', currentBalance: 0, transactions: [] });
    try {
      const pb = await fetchCustomerAccountPassbook(productType, accountId);
      setPassbookData(pb);
    } catch {
      setPassbookData(null);
    } finally {
      setPassbookLoading(false);
    }
  };

  const totalDeposits = Number(summary?.totalSavingsAndDeposits ?? 0);
  const totalLoans = Number(summary?.totalLoanOutstanding ?? 0);
  const counts = summary?.counts || { pigmy: 0, saving: 0, rd: 0, fd: 0, loan: 0 };

  const allAccounts = [
    ...portalAccounts.pigmyAccounts,
    ...portalAccounts.savingAccounts,
    ...portalAccounts.rdAccounts,
    ...portalAccounts.fdAccounts,
    ...portalAccounts.loanAccounts,
  ];

  const getProductVisual = (type: string) => {
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
          />
        }
      >
        {/* Hero Customer Balance Card */}
        <LinearGradient
          colors={colors.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTag, { color: colors.headerSubtext }]}>
                {summary?.branchName || 'खातेदार डिजिटल पोर्टल'}
              </Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {summary?.customerName || currentUser.name || 'खातेदार'}
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.headerSubtext, marginTop: 2 }}>
                CIF: {summary?.cifNo || currentUser.accountNumber || '-'} • {summary?.mobileNo || currentUser.phone || '-'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => {
                triggerLightHaptic();
                setRefreshing(true);
                loadData();
              }}
            >
              <RefreshCw size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCol}>
              <Text style={[styles.heroStatLabel, { color: colors.headerSubtext }]}>एकूण ठेवी (Deposits)</Text>
              <Text style={[styles.heroStatValue, TABULAR_NUMS]}>
                ₹{totalDeposits.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatCol}>
              <Text style={[styles.heroStatLabel, { color: colors.headerSubtext }]}>एकूण कर्ज बाकी (Loan)</Text>
              <Text style={[styles.heroStatValue, TABULAR_NUMS]}>
                ₹{totalLoans.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Product Counts Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="पिग्मी / बचत"
            value={String((counts.pigmy || 0) + (counts.saving || 0))}
            subtitle={`${counts.pigmy || 0} पिग्मी • ${counts.saving || 0} बचत`}
            accentColor={colors.primary}
            iconElement={<PiggyBank size={18} color={colors.primary} />}
          />
          <StatCard
            title="RD / FD व कर्ज"
            value={String((counts.rd || 0) + (counts.fd || 0) + (counts.loan || 0))}
            subtitle={`${counts.rd || 0} RD • ${counts.fd || 0} FD • ${counts.loan || 0} कर्ज`}
            accentColor="#B45309"
            iconElement={<Landmark size={18} color="#B45309" />}
          />
        </View>

        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: colors.infoBg, borderColor: colors.border }]}>
          <Info size={16} color={colors.infoText} />
          <Text style={{ flex: 1, fontSize: 12, color: colors.infoText, fontWeight: '600' }}>
            तुमच्या सर्व खात्यांची अद्ययावत माहिती व डिजिटल पासबुक इथे उपलब्ध आहे. पासबुक पाहण्यासाठी कोणत्याही खात्यावर टॅप करा.
          </Text>
        </View>

        <SectionHeader title={`तुमची खाती (${allAccounts.length})`} />

        {loading ? (
          <SkeletonCard count={4} />
        ) : error ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.dangerText, textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        ) : allAccounts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.textMuted }}>
              या CIF अंतर्गत कोणतेही सक्रिय खाते आढळले नाही.
            </Text>
          </View>
        ) : (
          allAccounts.map((acc) => {
            const vis = getProductVisual(acc.productType);
            const canOpenPb = acc.productType !== 'FD';
            return (
              <TouchableOpacity
                key={`${acc.productType}_${acc.accountId}`}
                style={[styles.accCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openPassbook(acc.productType, acc.accountId)}
                activeOpacity={canOpenPb ? 0.78 : 1}
              >
                <View style={[styles.accIcon, { backgroundColor: vis.bg }]}>{vis.icon}</View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={[styles.accScheme, { color: vis.accent }]} numberOfLines={1}>
                      {acc.schemeName || acc.productType}
                    </Text>
                    <StatusPill label={acc.status || 'Active'} tone={acc.status === 'Active' ? 'success' : 'neutral'} />
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    A/c: {acc.accountNo} {acc.oldAccountNo ? `• जुना #${acc.oldAccountNo}` : ''}
                  </Text>
                  {acc.maturityDate ? (
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                      मॅच्युरिटी: {acc.maturityDate} • {acc.interestRate}% p.a.
                    </Text>
                  ) : null}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[TABULAR_NUMS, { fontSize: 15, fontWeight: '900', color: colors.text }]}>
                    ₹{Number(acc.balance || 0).toLocaleString('en-IN')}
                  </Text>
                  {canOpenPb && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                      <BookOpen size={11} color={colors.primary} />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.primary }}>Passbook</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Customer Passbook Bottom Sheet */}
      {passbookData && (
        <Modal visible={true} animationType="slide" transparent onRequestClose={() => setPassbookData(null)}>
          <View style={styles.sheetOverlay}>
            <View style={[styles.sheetContainer, { backgroundColor: colors.card }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
                    {passbookData.productType} PASSBOOK
                  </Text>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>
                    खाते क्र: {passbookData.accountNo || '...'}
                  </Text>
                  <Text style={[TABULAR_NUMS, { fontSize: 13, fontWeight: '700', color: colors.successText, marginTop: 2 }]}>
                    शिल्लक: ₹{Number(passbookData.currentBalance || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeCircle, { backgroundColor: colors.surfaceMuted }]}
                  onPress={() => setPassbookData(null)}
                >
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {passbookLoading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  {passbookData.transactions.length === 0 ? (
                    <Text style={{ textAlign: 'center', paddingVertical: 28, color: colors.textMuted }}>
                      कोणतेही व्यवहार आढळले नाहीत.
                    </Text>
                  ) : (
                    passbookData.transactions.map((tx, idx) => (
                      <View key={`${tx.id}_${idx}`} style={[styles.pbRow, { borderBottomColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                            {tx.narration || tx.type}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
                            {tx.date} {tx.reference ? `• ${tx.reference}` : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text
                            style={[
                              TABULAR_NUMS,
                              {
                                fontSize: 14,
                                fontWeight: '800',
                                color: tx.drAmount > 0 ? colors.dangerText : colors.successText,
                              },
                            ]}
                          >
                            {tx.drAmount > 0 ? `-₹${tx.drAmount}` : `+₹${tx.crAmount}`}
                          </Text>
                          {tx.balance > 0 ? (
                            <Text style={[TABULAR_NUMS, { fontSize: 11, color: colors.textMuted }]}>
                              Bal: ₹{Number(tx.balance).toLocaleString('en-IN')}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 14, paddingBottom: 32 },
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 14,
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroTag: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroName: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 2,
  },
  refreshBtn: {
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
    padding: 12,
    marginTop: 14,
  },
  heroStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 14,
  },
  accCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 9,
  },
  accIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accScheme: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  emptyCard: {
    padding: 24,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: 10,
  },
});
