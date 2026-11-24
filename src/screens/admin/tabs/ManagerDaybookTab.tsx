import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import {
  Search,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useThemeColors } from '../../../context/ThemeContext';
import { SectionHeader } from '../../../components/ui/AppCard';
import { CONFIG } from '../../../config';
import { ProductType } from '../../../types';
import { PRODUCT_THEME, RADIUS, TABULAR_NUMS } from '../../../theme/tokens';
import { triggerLightHaptic } from '../../../utils/haptics';
import { openWhatsAppMessage } from '../../../utils/communication';
import { useManagerDashboard, formatCompactInr } from '../ManagerDashboardContext';

export const ManagerDaybookTab: React.FC = () => {
  const { collections } = useAuth();
  const { colors } = useThemeColors();
  const { refreshing, reloadData, data, pendingApprovalsCount, onSelectReceipt } = useManagerDashboard();

  const [searchText, setSearchText] = useState('');
  const [productFilter, setProductFilter] = useState<'ALL' | ProductType>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'CASH' | 'UPI'>('ALL');

  const portfolio = data?.portfolio;
  const eodChecklist = data?.eodChecklist || [];

  const filteredCollections = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return collections.filter((c) => {
      const prod = c.productType || 'PIGMY';
      if (productFilter !== 'ALL' && prod !== productFilter) return false;
      if (modeFilter !== 'ALL' && c.paymentMode !== modeFilter) return false;
      if (q) {
        const hay = `${c.customerName} ${c.accountNumber} ${c.oldAccountNo || ''} ${c.receiptNo} ${c.agentName}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [collections, searchText, productFilter, modeFilter]);

  const handleShareExecutiveSummary = () => {
    if (!portfolio) return;
    const msg = [
      `*${CONFIG.SANSTHA_NAME}*`,
      `📊 *दैनिक शाखा मॅनेजर गोषवारा*`,
      `शाखा: ${portfolio.branchName}`,
      `दिनांक: ${portfolio.businessDate}`,
      `-------------------------`,
      `💰 एकूण ठेवी: ${formatCompactInr(portfolio.totalDeposits)}`,
      `🏦 एकूण कर्ज बाकी: ${formatCompactInr(portfolio.totalLoanOutstanding)}`,
      `📈 CD Ratio: ${portfolio.cdRatioPercent}% | NPA: ${portfolio.npaPercent}%`,
      `-------------------------`,
      `📥 आजचे फिल्ड संकलन: ₹${(portfolio.todayCashCollection + portfolio.todayUpiCollection).toLocaleString('en-IN')}`,
      `   • रोख (CASH): ₹${portfolio.todayCashCollection.toLocaleString('en-IN')}`,
      `   • UPI: ₹${portfolio.todayUpiCollection.toLocaleString('en-IN')}`,
      `💵 शाखा रोख शिल्लक: ₹${Math.round(portfolio.branchCashInHand).toLocaleString('en-IN')}`,
      `⚠️ कर्ज थकबाकी: ${formatCompactInr(portfolio.totalLoanOverdue)}`,
      `✅ प्रलंबित मंजुरी: ${pendingApprovalsCount}`,
      `-------------------------`,
      `- SmartBanking Executive App`,
    ].join('\n');
    openWhatsAppMessage(msg);
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reloadData} />}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Branch Daybook Card */}
      {portfolio && (
        <View style={[styles.daybookCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.daybookHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Wallet size={17} color={colors.primaryDark} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>
                आजचा शाखा रोजमेळ (Daybook)
              </Text>
            </View>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.textMuted }}>{portfolio.businessDate}</Text>
          </View>

          <View style={styles.daybookGrid}>
            <View style={[styles.dbCell, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={{ fontSize: 10.5, color: colors.textMuted, fontWeight: '600' }}>आरंभीची रोख</Text>
              <Text style={[TABULAR_NUMS, { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 2 }]}>
                ₹{Math.round(portfolio.openingCash).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={[styles.dbCell, { backgroundColor: colors.successBg }]}>
              <Text style={{ fontSize: 10.5, color: colors.successText, fontWeight: '700' }}>+ आजची जमा</Text>
              <Text style={[TABULAR_NUMS, { fontSize: 14, fontWeight: '900', color: colors.successText, marginTop: 2 }]}>
                ₹{Math.round(portfolio.todayReceipts).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={[styles.dbCell, { backgroundColor: colors.dangerBg }]}>
              <Text style={{ fontSize: 10.5, color: colors.dangerText, fontWeight: '700' }}>- आजचे वाटप/खर्च</Text>
              <Text style={[TABULAR_NUMS, { fontSize: 14, fontWeight: '900', color: colors.dangerText, marginTop: 2 }]}>
                ₹{Math.round(portfolio.todayPayments).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={[styles.dbCell, { backgroundColor: colors.infoBg }]}>
              <Text style={{ fontSize: 10.5, color: colors.infoText, fontWeight: '700' }}>= अखेरची रोख</Text>
              <Text style={[TABULAR_NUMS, { fontSize: 14.5, fontWeight: '900', color: colors.primaryDark, marginTop: 2 }]}>
                ₹{Math.round(portfolio.branchCashInHand).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: '#047857' }]}
            onPress={handleShareExecutiveSummary}
            activeOpacity={0.85}
          >
            <Share2 size={15} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
              आजचा शाखा गोषवारा WhatsApp वर पाठवा
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* EOD Checklist */}
      {eodChecklist.length > 0 && (
        <>
          <SectionHeader title="EOD (दिवस अखेर) तयारी चेकलिस्ट" />
          <View style={[styles.eodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {eodChecklist.map((chk, idx) => (
              <View
                key={chk.id}
                style={[
                  styles.eodRow,
                  idx < eodChecklist.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                {chk.status === 'OK' ? (
                  <CheckCircle2 size={17} color={colors.success} />
                ) : (
                  <AlertTriangle size={17} color={colors.warning} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{chk.label}</Text>
                  <Text
                    style={{
                      fontSize: 11.5,
                      color: chk.status === 'OK' ? colors.textMuted : colors.warningText,
                      fontWeight: '600',
                      marginTop: 1,
                    }}
                  >
                    {chk.detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Searchable & Filterable Receipts */}
      <SectionHeader title={`सर्व पावत्या व व्यवहार (${filteredCollections.length})`} />

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="ग्राहक नाव, खाते क्र., पावती क्र. शोधा..."
          placeholderTextColor={colors.textMuted}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <X size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipBar}>
        {(
          [
            { key: 'ALL', label: 'सर्व उत्पादने' },
            { key: 'PIGMY', label: 'पिग्मी' },
            { key: 'LOAN', label: 'कर्ज EMI' },
            { key: 'SAVING', label: 'बचत' },
            { key: 'RD', label: 'RD' },
          ] as const
        ).map((f) => {
          const active = productFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primaryDark : colors.card,
                  borderColor: active ? colors.primaryDark : colors.border,
                },
              ]}
              onPress={() => {
                triggerLightHaptic();
                setProductFilter(f.key);
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? '#FFFFFF' : colors.textSecondary }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {(['ALL', 'CASH', 'UPI'] as const).map((m) => {
          const active = modeFilter === m;
          return (
            <TouchableOpacity
              key={`mode_${m}`}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surfaceMuted,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                triggerLightHaptic();
                setModeFilter(m);
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? '#FFFFFF' : colors.textSecondary }}>
                {m === 'ALL' ? 'Cash + UPI' : m}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filteredCollections.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '700' }}>
            निवडलेल्या फिल्टरनुसार कोणतीही पावती आढळली नाही.
          </Text>
        </View>
      ) : (
        filteredCollections.map((rec) => {
          const prod = PRODUCT_THEME[rec.productType || 'PIGMY'] || PRODUCT_THEME.PIGMY;
          return (
            <TouchableOpacity
              key={rec.id}
              style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                triggerLightHaptic();
                onSelectReceipt(rec);
              }}
              activeOpacity={0.78}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <View style={[styles.prodTag, { backgroundColor: prod.bg }]}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: prod.accent }}>{prod.labelMr}</Text>
                  </View>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.textMuted }}>{rec.paymentMode}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{rec.customerName}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {rec.accountNumber} • {rec.agentName} • {rec.timestamp}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[TABULAR_NUMS, { fontSize: 15, fontWeight: '900', color: colors.successText }]}>
                  +₹{rec.amount.toLocaleString('en-IN')}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{rec.receiptNo}</Text>
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
  daybookCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  daybookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  daybookGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dbCell: {
    width: '48.5%',
    borderRadius: RADIUS.md,
    padding: 10,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
  },
  eodCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 4,
    marginBottom: 14,
  },
  eodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  chipBar: { gap: 7, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  emptyCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  recCard: {
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
