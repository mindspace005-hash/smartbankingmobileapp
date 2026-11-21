import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { BookText, FileSpreadsheet, Percent } from 'lucide-react-native';
import { useThemeColors } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { PigmyBookScreen } from './PigmyBookScreen';
import { CollectionReport, CommissionReport } from '../../types';
import { RADIUS, TABULAR_NUMS } from '../../theme/tokens';
import { StatCard } from '../../components/StatCard';
import { triggerLightHaptic } from '../../utils/haptics';

type ReportSubTab = 'PIGMY_BOOK' | 'COLLECTIONS' | 'COMMISSION';

export const ReportsHubScreen: React.FC = () => {
  const { colors, t } = useThemeColors();
  const { fetchCollectionReport, fetchCommissionReport } = useAuth();
  const [subTab, setSubTab] = useState<ReportSubTab>('PIGMY_BOOK');
  const [collectionReport, setCollectionReport] = useState<CollectionReport | null>(null);
  const [commissionReport, setCommissionReport] = useState<CommissionReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subTab === 'PIGMY_BOOK') return;
    let active = true;
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const todayIso = today.toISOString().split('T')[0];

    const load = async () => {
      setLoading(true);
      try {
        if (subTab === 'COLLECTIONS') {
          const rep = await fetchCollectionReport(monthStart, todayIso);
          if (active) setCollectionReport(rep);
        } else {
          const comm = await fetchCommissionReport(monthStart, todayIso);
          if (active) setCommissionReport(comm);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [subTab]);

  const tabs: { key: ReportSubTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'PIGMY_BOOK',
      label: t.pigmyBook,
      icon: <BookText size={14} color={subTab === 'PIGMY_BOOK' ? '#FFFFFF' : colors.textSecondary} />,
    },
    {
      key: 'COLLECTIONS',
      label: t.collectionReport,
      icon: <FileSpreadsheet size={14} color={subTab === 'COLLECTIONS' ? '#FFFFFF' : colors.textSecondary} />,
    },
    {
      key: 'COMMISSION',
      label: t.commissionReport,
      icon: <Percent size={14} color={subTab === 'COMMISSION' ? '#FFFFFF' : colors.textSecondary} />,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Sub Tab Switch */}
      <View style={[styles.tabWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {tabs.map((item) => {
          const active = subTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.tabPill,
                { backgroundColor: active ? colors.primaryDark : colors.surfaceMuted },
              ]}
              onPress={() => {
                triggerLightHaptic();
                setSubTab(item.key);
              }}
            >
              {item.icon}
              <Text
                style={[styles.tabText, { color: active ? '#FFFFFF' : colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {subTab === 'PIGMY_BOOK' ? (
        <PigmyBookScreen />
      ) : loading ? (
        <View style={styles.centerLoad}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : subTab === 'COLLECTIONS' ? (
        <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
          <View style={styles.statsRow}>
            <StatCard
              title="मासिक संकलन"
              value={`₹${Number(collectionReport?.totalCollectedAmount || 0).toLocaleString('en-IN')}`}
              accentColor={colors.primary}
            />
            <StatCard
              title="एकूण पावत्या"
              value={String(collectionReport?.totalReceiptsCount || 0)}
              subtitle={`${collectionReport?.uniqueAccountsCount || 0} खाती`}
              accentColor={colors.success}
            />
          </View>
          <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(collectionReport?.collections || []).slice(0, 30).map((c, idx) => (
              <View key={`${c.collectionId}_${idx}`} style={[styles.rowItem, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.text }}>{c.memberName}</Text>
                  <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
                    {c.accountNo} • {c.receiptNo}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{c.date}</Text>
                </View>
                <Text style={[TABULAR_NUMS, { fontSize: 14, fontWeight: '800', color: colors.successText }]}>
                  +₹{Number(c.amount || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
            {(collectionReport?.collections?.length || 0) === 0 && (
              <Text style={{ textAlign: 'center', color: colors.textMuted, padding: 24 }}>
                या महिन्यात कोणतेही संकलन आढळले नाही.
              </Text>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
          <View style={styles.statsRow}>
            <StatCard
              title="कमिशन दर"
              value={`${commissionReport?.commissionRate ?? 0}%`}
              subtitle={commissionReport?.rateType}
              accentColor={colors.primary}
            />
            <StatCard
              title="अपेक्षित कमिशन"
              value={`₹${Number(commissionReport?.calculatedCommission || 0).toLocaleString('en-IN')}`}
              accentColor={colors.success}
            />
            <StatCard
              title="जमा / पेड कमिशन"
              value={`₹${Number(commissionReport?.paidCommission || 0).toLocaleString('en-IN')}`}
              subtitle={`${commissionReport?.paidVouchersCount || 0} व्हाउचर`}
              accentColor={colors.info}
            />
            <StatCard
              title="येणे बाकी कमिशन"
              value={`₹${Number(commissionReport?.pendingCommission || 0).toLocaleString('en-IN')}`}
              accentColor={colors.warning}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabWrap: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: RADIUS.md,
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  centerLoad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollPad: {
    padding: 14,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  listCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
