import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CalendarDays, Users, IndianRupee } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useThemeColors } from '../../context/ThemeContext';
import { DailyBarChart } from '../../components/agent/DailyBarChart';
import { RADIUS, TABULAR_NUMS } from '../../theme/tokens';
import { triggerLightHaptic } from '../../utils/haptics';

type FilterOption = 'Today' | 'Last 7 Days' | 'This Month' | 'Last Month';

interface DailySummary {
  date: string;
  customers: number;
  amount: number;
}

export const PigmyBookScreen = () => {
  const { colors } = useThemeColors();
  const [filter, setFilter] = useState<FilterOption>('Last 7 Days');
  const [data, setData] = useState<DailySummary[]>([]);
  const [totalCollection, setTotalCollection] = useState(0);
  const [loading, setLoading] = useState(false);

  const filterOptions: { key: FilterOption; label: string }[] = [
    { key: 'Today', label: 'आज' },
    { key: 'Last 7 Days', label: '७ दिवस' },
    { key: 'This Month', label: 'हा महिना' },
    { key: 'Last Month', label: 'मागील महिना' },
  ];

  const { collections, fetchPigmyBookReport } = useAuth();

  useEffect(() => {
    let active = true;
    const mapFilterToApi = (f: FilterOption): 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' => {
      switch (f) {
        case 'Last 7 Days':
          return 'LAST_7_DAYS';
        case 'This Month':
          return 'THIS_MONTH';
        case 'Last Month':
          return 'LAST_MONTH';
        default:
          return 'TODAY';
      }
    };

    const loadReport = async () => {
      setLoading(true);
      try {
        const res = await fetchPigmyBookReport(mapFilterToApi(filter));
        if (!active) return;
        setTotalCollection(res.totalCollection || 0);
        setData(res.dailyRecords || []);
      } catch {
        if (!active) return;
        if (filter === 'Today') {
          const todayStr = new Date().toLocaleDateString();
          const todayCollections = collections.filter((c) => c.timestamp.startsWith(todayStr));
          let sum = 0;
          const uniqueCustomers = new Set<string>();
          todayCollections.forEach((c) => {
            sum += c.amount;
            uniqueCustomers.add(String(c.accountId));
          });
          setTotalCollection(sum);
          setData(
            todayCollections.length > 0
              ? [{ date: todayStr, customers: uniqueCustomers.size, amount: sum }]
              : []
          );
        } else {
          setTotalCollection(0);
          setData([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReport();
    return () => {
      active = false;
    };
  }, [filter, collections]);

  const chartData = data.map((d) => ({
    label: d.date.slice(0, 5),
    value: Number(d.amount || 0),
  }));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipBar}>
        {filterOptions.map((opt) => {
          const active = filter === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primaryDark : colors.card,
                  borderColor: active ? colors.primaryDark : colors.border,
                },
              ]}
              onPress={() => {
                triggerLightHaptic();
                setFilter(opt.key);
              }}
            >
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Summary Strip */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sumItem}>
          <View style={[styles.sumIcon, { backgroundColor: colors.infoBg }]}>
            <IndianRupee size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.sumLabel, { color: colors.textMuted }]}>एकूण संकलन</Text>
            <Text style={[styles.sumVal, TABULAR_NUMS, { color: colors.primaryDark }]}>
              ₹{totalCollection.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
        <View style={[styles.sumDivider, { backgroundColor: colors.border }]} />
        <View style={styles.sumItem}>
          <View style={[styles.sumIcon, { backgroundColor: colors.successBg }]}>
            <CalendarDays size={18} color={colors.successText} />
          </View>
          <View>
            <Text style={[styles.sumLabel, { color: colors.textMuted }]}>सक्रिय दिवस</Text>
            <Text style={[styles.sumVal, TABULAR_NUMS, { color: colors.text }]}>{data.length}</Text>
          </View>
        </View>
      </View>

      {/* Trend Chart */}
      {!loading && chartData.length > 1 && (
        <DailyBarChart title="दैनिक वसुली ट्रेंड (Collection Trend)" data={chartData} accentColor={colors.primary} />
      )}

      {/* Daily List */}
      <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.th, { flex: 1.3, color: colors.textSecondary }]}>तारीख</Text>
          <Text style={[styles.th, { flex: 0.9, textAlign: 'center', color: colors.textSecondary }]}>ग्राहक</Text>
          <Text style={[styles.th, { flex: 1.1, textAlign: 'right', color: colors.textSecondary }]}>रक्कम</Text>
        </View>

        {loading ? (
          <View style={{ padding: 28, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : data.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            निवडलेल्या कालावधीत कोणतीही नोंद आढळली नाही.
          </Text>
        ) : (
          data.map((item, idx) => (
            <View
              key={`${item.date}_${idx}`}
              style={[
                styles.tableRow,
                { borderBottomColor: colors.border },
                idx % 2 === 1 && { backgroundColor: colors.surfaceMuted + '70' },
              ]}
            >
              <Text style={[styles.td, { flex: 1.3, color: colors.text }]}>{item.date}</Text>
              <View style={{ flex: 0.9, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                <Users size={12} color={colors.textMuted} />
                <Text style={[styles.td, TABULAR_NUMS, { color: colors.textSecondary }]}>{item.customers}</Text>
              </View>
              <Text style={[styles.tdAmt, TABULAR_NUMS, { flex: 1.1, color: colors.successText }]}>
                ₹{Number(item.amount || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 32 },
  chipBar: {
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  sumItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sumIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sumDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 10,
  },
  sumLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  sumVal: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 1,
  },
  tableCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  th: {
    fontSize: 11.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  td: {
    fontSize: 13,
    fontWeight: '600',
  },
  tdAmt: {
    fontSize: 13.5,
    fontWeight: '800',
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    padding: 28,
    fontSize: 13,
  },
});
