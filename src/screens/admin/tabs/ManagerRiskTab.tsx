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
  AlertTriangle,
  CalendarClock,
  Phone,
  MessageCircle,
  Landmark,
} from 'lucide-react-native';
import { useThemeColors } from '../../../context/ThemeContext';
import { StatusPill } from '../../../components/ui/StatusPill';
import { SectionHeader } from '../../../components/ui/AppCard';
import { CONFIG } from '../../../config';
import { OverdueBucket, MaturityBucket } from '../../../types';
import { RADIUS, TABULAR_NUMS } from '../../../theme/tokens';
import { triggerLightHaptic } from '../../../utils/haptics';
import { openPhoneDialer, openWhatsAppMessage } from '../../../utils/communication';
import { useManagerDashboard, formatCompactInr } from '../ManagerDashboardContext';

export const ManagerRiskTab: React.FC = () => {
  const { colors } = useThemeColors();
  const { refreshing, reloadData, data } = useManagerDashboard();

  const [subTab, setSubTab] = useState<'OVERDUE' | 'MATURITY'>('OVERDUE');
  const [overdueFilter, setOverdueFilter] = useState<'ALL' | OverdueBucket>('ALL');
  const [maturityFilter, setMaturityFilter] = useState<'ALL' | MaturityBucket>('ALL');

  const overdueLoans = data?.overdueLoans || [];
  const maturityItems = data?.maturityItems || [];

  const filteredOverdue = useMemo(
    () => overdueLoans.filter((o) => overdueFilter === 'ALL' || o.bucket === overdueFilter),
    [overdueLoans, overdueFilter]
  );

  const filteredMaturity = useMemo(
    () => maturityItems.filter((m) => maturityFilter === 'ALL' || m.bucket === maturityFilter),
    [maturityItems, maturityFilter]
  );

  const totalOverdueAmt = useMemo(
    () => filteredOverdue.reduce((s, o) => s + o.overdueAmount, 0),
    [filteredOverdue]
  );

  const totalMaturityPayout = useMemo(
    () => filteredMaturity.reduce((s, m) => s + m.maturityAmount, 0),
    [filteredMaturity]
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reloadData} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Sub-Tab Segment */}
      <View style={[styles.segmentBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, subTab === 'OVERDUE' && { backgroundColor: colors.primaryDark }]}
          onPress={() => {
            triggerLightHaptic();
            setSubTab('OVERDUE');
          }}
        >
          <AlertTriangle size={14} color={subTab === 'OVERDUE' ? '#FFFFFF' : colors.dangerText} />
          <Text style={[styles.segmentText, { color: subTab === 'OVERDUE' ? '#FFFFFF' : colors.textSecondary }]}>
            कर्ज थकबाकी / NPA ({overdueLoans.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, subTab === 'MATURITY' && { backgroundColor: colors.primaryDark }]}
          onPress={() => {
            triggerLightHaptic();
            setSubTab('MATURITY');
          }}
        >
          <CalendarClock size={14} color={subTab === 'MATURITY' ? '#FFFFFF' : colors.primary} />
          <Text style={[styles.segmentText, { color: subTab === 'MATURITY' ? '#FFFFFF' : colors.textSecondary }]}>
            FD / RD मॅच्युरिटी ({maturityItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'OVERDUE' ? (
        <>
          <View style={styles.kpiRow}>
            <View style={[styles.kpiBox, { backgroundColor: colors.dangerBg, borderColor: '#FCA5A5' }]}>
              <Text style={[styles.kpiLbl, { color: colors.dangerText }]}>थकीत रक्कम</Text>
              <Text style={[styles.kpiVal, TABULAR_NUMS, { color: colors.dangerText }]}>
                ₹{totalOverdueAmt.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={[styles.kpiBox, { backgroundColor: colors.warningBg, borderColor: '#FCD34D' }]}>
              <Text style={[styles.kpiLbl, { color: colors.warningText }]}>शाखा NPA प्रमाण</Text>
              <Text style={[styles.kpiVal, TABULAR_NUMS, { color: colors.warningText }]}>
                {data?.portfolio.npaPercent ?? 0}%
              </Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipBar}>
            {(
              [
                { key: 'ALL', label: 'सर्व थकबाकी' },
                { key: 'NPA_90', label: '९०+ दिवस (NPA)' },
                { key: '60D', label: '६० दिवस' },
                { key: '30D', label: '३० दिवस' },
              ] as const
            ).map((f) => {
              const active = overdueFilter === f.key;
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
                    setOverdueFilter(f.key);
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#FFFFFF' : colors.textSecondary }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <SectionHeader title={`वसुली फॉलो-अप यादी (${filteredOverdue.length})`} />

          {filteredOverdue.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>
                या श्रेणीत थकबाकी खाते आढळले नाही.
              </Text>
            </View>
          ) : (
            filteredOverdue.map((loan) => (
              <View
                key={loan.id}
                style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.itemTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.text }}>{loan.customerName}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
                      {loan.loanScheme} • A/c {loan.accountNo}
                    </Text>
                  </View>
                  <StatusPill
                    label={loan.bucket === 'NPA_90' ? 'NPA 90+' : loan.bucket === '60D' ? '60D' : '30D'}
                    tone={loan.bucket === 'NPA_90' ? 'danger' : 'warning'}
                  />
                </View>

                <View style={[styles.detailStrip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                  <View style={styles.detailCol}>
                    <Text style={{ fontSize: 10.5, color: colors.textMuted }}>थकीत रक्कम ({loan.overdueInstallments} हप्ते)</Text>
                    <Text style={[TABULAR_NUMS, { fontSize: 14.5, fontWeight: '900', color: colors.dangerText }]}>
                      ₹{loan.overdueAmount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={{ fontSize: 10.5, color: colors.textMuted }}>एकूण मुद्दल बाकी</Text>
                    <Text style={[TABULAR_NUMS, { fontSize: 13.5, fontWeight: '800', color: colors.text }]}>
                      {formatCompactInr(loan.outstandingPrincipal)}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 9 }}>
                  शेवटचा हप्ता दिनांक: {loan.lastPaidDate} • मोबाईल: {loan.phone}
                </Text>

                <View style={styles.contactRow}>
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
                    onPress={() => openPhoneDialer(loan.phone)}
                  >
                    <Phone size={14} color={colors.primaryDark} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>कॉल करा</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC', flex: 1.5 }]}
                    onPress={() =>
                      openWhatsAppMessage(
                        `नमस्कार ${loan.customerName}, आपल्या ${loan.loanScheme} (खाते क्र. ${loan.accountNo}) चे ${loan.overdueInstallments} हप्ते (₹${loan.overdueAmount.toLocaleString('en-IN')}) थकीत आहेत. दंडव्याज टाळण्यासाठी कृपया लवकरात लवकर शाखेत किंवा एजंटकडे भरणा करा. - ${CONFIG.SANSTHA_NAME}`,
                        loan.phone
                      )
                    }
                  >
                    <MessageCircle size={14} color="#047857" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#047857' }}>WhatsApp रिमाइंडर पाठवा</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </>
      ) : (
        <>
          <View style={[styles.maturityHero, { backgroundColor: colors.infoBg, borderColor: colors.border }]}>
            <Landmark size={20} color={colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.infoText }}>
                एकूण देय मॅच्युरिटी रक्कम (Liquidity Planning)
              </Text>
              <Text style={[TABULAR_NUMS, { fontSize: 19, fontWeight: '900', color: colors.primaryDark }]}>
                ₹{totalMaturityPayout.toLocaleString('en-IN')} ({filteredMaturity.length} खाती)
              </Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipBar}>
            {(
              [
                { key: 'ALL', label: 'सर्व' },
                { key: 'UPCOMING_7', label: 'पुढील ७ दिवस' },
                { key: 'UPCOMING_30', label: 'पुढील ३० दिवस' },
                { key: 'MATURED_UNCLOSED', label: 'मॅच्युअर अनक्लोज्ड' },
              ] as const
            ).map((f) => {
              const active = maturityFilter === f.key;
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
                    setMaturityFilter(f.key);
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#FFFFFF' : colors.textSecondary }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <SectionHeader title={`FD / RD मॅच्युरिटी यादी (${filteredMaturity.length})`} />

          {filteredMaturity.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>
                या कालावधीत मॅच्युअर होणारे खाते नाही.
              </Text>
            </View>
          ) : (
            filteredMaturity.map((mat) => (
              <View
                key={mat.id}
                style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.itemTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.text }}>{mat.customerName}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
                      {mat.productType} • {mat.schemeName} ({mat.interestRate}%)
                    </Text>
                  </View>
                  <StatusPill
                    label={
                      mat.daysRemaining < 0
                        ? `${Math.abs(mat.daysRemaining)} दि. आधी`
                        : `${mat.daysRemaining} दिवस बाकी`
                    }
                    tone={mat.daysRemaining <= 7 ? 'warning' : 'primary'}
                  />
                </View>

                <View style={[styles.detailStrip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                  <View style={styles.detailCol}>
                    <Text style={{ fontSize: 10.5, color: colors.textMuted }}>मॅच्युरिटी रक्कम</Text>
                    <Text style={[TABULAR_NUMS, { fontSize: 15, fontWeight: '900', color: colors.primaryDark }]}>
                      ₹{mat.maturityAmount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={{ fontSize: 10.5, color: colors.textMuted }}>मॅच्युरिटी दिनांक</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }}>{mat.maturityDate}</Text>
                  </View>
                </View>

                <View style={styles.contactRow}>
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
                    onPress={() => openPhoneDialer(mat.phone)}
                  >
                    <Phone size={14} color={colors.primaryDark} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>कॉल करा</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactBtn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC', flex: 1.5 }]}
                    onPress={() =>
                      openWhatsAppMessage(
                        `नमस्कार ${mat.customerName}, आपली ${mat.productType} ठेव (खाते क्र. ${mat.accountNo}, मॅच्युरिटी रक्कम ₹${mat.maturityAmount.toLocaleString('en-IN')}) दिनांक ${mat.maturityDate} रोजी मॅच्युअर होत आहे. आकर्षक व्याजदरावर नूतनीकरणासाठी (Renewal) कृपया शाखेशी संपर्क साधा. - ${CONFIG.SANSTHA_NAME}`,
                        mat.phone
                      )
                    }
                  >
                    <MessageCircle size={14} color="#047857" />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#047857' }}>Renewal WhatsApp पाठवा</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  segmentBar: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
  },
  segmentText: { fontSize: 11.5, fontWeight: '800' },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpiBox: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
  },
  kpiLbl: { fontSize: 11, fontWeight: '700' },
  kpiVal: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  maturityHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 12,
  },
  chipBar: { gap: 8, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  emptyCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  itemCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 13,
    marginBottom: 11,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 9,
  },
  detailStrip: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 9,
    gap: 10,
    marginBottom: 8,
  },
  detailCol: { flex: 1 },
  contactRow: { flexDirection: 'row', gap: 8 },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
});
