import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calculator, Percent, ArrowRight, Sparkles } from 'lucide-react-native';
import { useThemeColors } from '../../../context/ThemeContext';
import { SectionHeader } from '../../../components/ui/AppCard';
import { RADIUS, TABULAR_NUMS } from '../../../theme/tokens';
import { triggerLightHaptic } from '../../../utils/haptics';
import { useCustomerDashboard } from '../CustomerDashboardContext';

type CalcMode = 'FD' | 'RD' | 'EMI';

export const CustomerCalculatorsTab: React.FC<any> = ({ navigation }) => {
  const { colors } = useThemeColors();
  const { data, triggerServiceModal } = useCustomerDashboard();

  const [mode, setMode] = useState<CalcMode>('FD');
  const [amountStr, setAmountStr] = useState('100000');
  const [monthsStr, setMonthsStr] = useState('24');
  const [rateStr, setRateStr] = useState('9.25');
  const [seniorCitizen, setSeniorCitizen] = useState(false);

  const switchMode = (next: CalcMode) => {
    triggerLightHaptic();
    setMode(next);
    if (next === 'FD') {
      setAmountStr('100000');
      setMonthsStr('24');
      setRateStr('9.25');
    } else if (next === 'RD') {
      setAmountStr('2000');
      setMonthsStr('36');
      setRateStr('8.50');
    } else {
      setAmountStr('200000');
      setMonthsStr('36');
      setRateStr('12.50');
      setSeniorCitizen(false);
    }
  };

  const calc = useMemo(() => {
    const P = Math.max(0, parseFloat(amountStr) || 0);
    const n = Math.max(1, parseInt(monthsStr, 10) || 1);
    const baseRate = Math.max(0, parseFloat(rateStr) || 0);
    const r = mode !== 'EMI' && seniorCitizen ? baseRate + 0.5 : baseRate;

    if (mode === 'FD') {
      // Quarterly compounding: A = P * (1 + r/400)^(4 * n/12)
      const maturity = Math.round(P * Math.pow(1 + r / 400, (4 * n) / 12));
      const interest = Math.max(0, maturity - P);
      return {
        effectiveRate: r,
        primaryLabel: 'अंदाजित मॅच्युरिटी रक्कम',
        primaryValue: maturity,
        investedLabel: 'ठेव मुद्दल',
        investedValue: P,
        interestLabel: 'मिळणारे व्याज',
        interestValue: interest,
      };
    }

    if (mode === 'RD') {
      // Monthly recurring deposit standard simple-quarterly approximation
      const totalInvested = P * n;
      const interest = Math.round((P * ((n * (n + 1)) / 24) * r) / 100);
      const maturity = totalInvested + interest;
      return {
        effectiveRate: r,
        primaryLabel: 'अंदाजित मॅच्युरिटी रक्कम',
        primaryValue: maturity,
        investedLabel: 'एकूण भरलेली रक्कम',
        investedValue: totalInvested,
        interestLabel: 'मिळणारे व्याज',
        interestValue: interest,
      };
    }

    // Loan EMI: P * i * (1+i)^n / ((1+i)^n - 1)
    const i = r / 1200;
    const emi =
      i > 0
        ? Math.round((P * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1))
        : Math.round(P / n);
    const totalPayable = emi * n;
    const totalInterest = Math.max(0, totalPayable - P);
    return {
      effectiveRate: r,
      primaryLabel: 'अंदाजित मासिक हप्ता (EMI)',
      primaryValue: emi,
      investedLabel: 'कर्ज मुद्दल',
      investedValue: P,
      interestLabel: 'एकूण व्याज',
      interestValue: totalInterest,
    };
  }, [amountStr, monthsStr, rateStr, mode, seniorCitizen]);

  const totalBar = calc.investedValue + calc.interestValue;
  const principalPct = totalBar > 0 ? Math.round((calc.investedValue / totalBar) * 100) : 100;

  const amountPresets =
    mode === 'RD'
      ? ['1000', '2000', '5000', '10000']
      : mode === 'FD'
      ? ['50000', '100000', '200000', '500000']
      : ['100000', '200000', '500000', '1000000'];

  const tenurePresets = ['12', '24', '36', '60'];
  const rates = data?.interestRates || [];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Calculator Mode Switch */}
      <View style={[styles.segBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(
          [
            { key: 'FD', label: 'FD कॅल्क्युलेटर' },
            { key: 'RD', label: 'RD कॅल्क्युलेटर' },
            { key: 'EMI', label: 'कर्ज EMI' },
          ] as const
        ).map((m) => {
          const active = mode === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.segBtn, active && { backgroundColor: colors.primaryDark }]}
              onPress={() => switchMode(m.key)}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#FFFFFF' : colors.textSecondary }}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Result Banner */}
      <LinearGradient
        colors={colors.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.resultCard}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Calculator size={15} color="#FDE68A" />
            <Text style={{ color: colors.headerSubtext, fontSize: 11.5, fontWeight: '700' }}>
              {calc.primaryLabel}
            </Text>
          </View>
          <View style={styles.ratePill}>
            <Text style={{ color: '#FEF3C7', fontSize: 11, fontWeight: '900' }}>
              {calc.effectiveRate.toFixed(2)}% p.a.
            </Text>
          </View>
        </View>

        <Text style={[styles.resultHeroValue, TABULAR_NUMS]}>
          ₹{calc.primaryValue.toLocaleString('en-IN')}
        </Text>

        {/* Visual Principal vs Interest Bar */}
        <View style={styles.ratioTrack}>
          <View style={{ width: `${principalPct}%`, height: '100%', backgroundColor: '#FFFFFF' }} />
          <View style={{ width: `${100 - principalPct}%`, height: '100%', backgroundColor: '#FCD34D' }} />
        </View>

        <View style={styles.resultSubRow}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10.5 }}>{calc.investedLabel}</Text>
            <Text style={[TABULAR_NUMS, { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }]}>
              ₹{calc.investedValue.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#FDE68A', fontSize: 10.5, fontWeight: '700' }}>{calc.interestLabel}</Text>
            <Text style={[TABULAR_NUMS, { color: '#FEF3C7', fontSize: 14, fontWeight: '900' }]}>
              ₹{calc.interestValue.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Calculator Inputs Card */}
      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.lbl, { color: colors.textSecondary }]}>
          {mode === 'RD' ? 'मासिक हप्ता रक्कम (₹)' : mode === 'FD' ? 'ठेव रक्कम (₹)' : 'कर्ज रक्कम (₹)'}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text }]}
          value={amountStr}
          onChangeText={setAmountStr}
          keyboardType="numeric"
        />
        <View style={styles.presetRow}>
          {amountPresets.map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.presetChip,
                {
                  backgroundColor: amountStr === p ? colors.primaryDark : colors.surfaceMuted,
                  borderColor: amountStr === p ? colors.primaryDark : colors.border,
                },
              ]}
              onPress={() => {
                triggerLightHaptic();
                setAmountStr(p);
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: amountStr === p ? '#FFFFFF' : colors.textSecondary }}>
                ₹{Number(p).toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.lbl, { color: colors.textSecondary }]}>कालावधी (महिने)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text }]}
              value={monthsStr}
              onChangeText={setMonthsStr}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.lbl, { color: colors.textSecondary }]}>व्याजदर (% वार्षिक)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text }]}
              value={rateStr}
              onChangeText={setRateStr}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.presetRow}>
          {tenurePresets.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.presetChip,
                {
                  backgroundColor: monthsStr === t ? colors.primary : colors.surfaceMuted,
                  borderColor: monthsStr === t ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                triggerLightHaptic();
                setMonthsStr(t);
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: monthsStr === t ? '#FFFFFF' : colors.textSecondary }}>
                {t} महिने
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode !== 'EMI' && (
          <TouchableOpacity
            style={[
              styles.seniorToggle,
              {
                backgroundColor: seniorCitizen ? '#FEF3C7' : colors.surfaceMuted,
                borderColor: seniorCitizen ? '#F59E0B' : colors.border,
              },
            ]}
            onPress={() => {
              triggerLightHaptic();
              setSeniorCitizen((p) => !p);
            }}
          >
            <Sparkles size={15} color={seniorCitizen ? '#B45309' : colors.textMuted} />
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '800', color: seniorCitizen ? '#B45309' : colors.textSecondary }}>
              ज्येष्ठ नागरिक (+०.५०% अतिरिक्त व्याज)
            </Text>
            <Text style={{ fontSize: 11.5, fontWeight: '900', color: seniorCitizen ? '#B45309' : colors.textMuted }}>
              {seniorCitizen ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.applyCta, { backgroundColor: colors.primaryDark }]}
          onPress={() => {
            triggerLightHaptic();
            triggerServiceModal({
              type: mode === 'EMI' ? 'LOAN_APPLY' : 'DEPOSIT_OPEN',
              title: mode === 'FD' ? 'मुदत ठेव (FD)' : mode === 'RD' ? 'आवर्ती ठेव (RD)' : 'व्यवसाय कर्ज',
              amount: amountStr,
              subtitle: `कॅल्क्युलेटरमधून विनंती • ${monthsStr} महिने • ${calc.effectiveRate.toFixed(2)}%`,
            });
            navigation.navigate('CustomerServices');
          }}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
            {mode === 'EMI' ? 'या कर्जासाठी अर्ज करा' : 'या ठेव योजनेसाठी विनंती पाठवा'}
          </Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Official Sanstha Interest Rate Card */}
      <SectionHeader title="संस्थेचे चालू व्याजदर तक्ता (Interest Rates)" />
      <View style={[styles.rateTableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {rates.map((r, idx) => (
          <View
            key={r.id}
            style={[
              styles.rateRow,
              idx < rates.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{r.tenureOrScheme}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>किमान: {r.minAmount}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Percent size={12} color={colors.primaryDark} />
                <Text style={[TABULAR_NUMS, { fontSize: 14, fontWeight: '900', color: colors.primaryDark }]}>
                  {r.generalRate}
                </Text>
              </View>
              {r.seniorRate ? (
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.successText }}>
                  ज्येष्ठ: {r.seniorRate}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  segBar: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: 12,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  resultCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  ratePill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  resultHeroValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
    marginBottom: 10,
  },
  ratioTrack: {
    height: 7,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 10,
  },
  resultSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  lbl: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  seniorToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 12,
  },
  applyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: RADIUS.md,
    marginTop: 4,
  },
  rateTableCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 4,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 10,
  },
});
