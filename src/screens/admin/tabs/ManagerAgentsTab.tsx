import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Lock,
  Unlock,
  Banknote,
  Phone,
  MessageCircle,
  Receipt,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useThemeColors } from '../../../context/ThemeContext';
import { useToast } from '../../../components/ui/ToastProvider';
import { StatusPill } from '../../../components/ui/StatusPill';
import { SectionHeader } from '../../../components/ui/AppCard';
import { CONFIG } from '../../../config';
import { ManagerAgentControlItem } from '../../../types';
import { RADIUS, TABULAR_NUMS } from '../../../theme/tokens';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '../../../utils/haptics';
import { openPhoneDialer, openWhatsAppMessage } from '../../../utils/communication';
import { useManagerDashboard } from '../ManagerDashboardContext';

export const ManagerAgentsTab: React.FC = () => {
  const { collections, toggleManagerAgentLock, acceptManagerAgentRemittance } = useAuth();
  const { colors } = useThemeColors();
  const { showToast } = useToast();
  const { refreshing, reloadData, data, onSelectReceipt } = useManagerDashboard();

  const [remitAgent, setRemitAgent] = useState<ManagerAgentControlItem | null>(null);
  const [remitAmount, setRemitAmount] = useState('');
  const [receiptsAgent, setReceiptsAgent] = useState<ManagerAgentControlItem | null>(null);

  const agents = data?.agents || [];

  const totals = useMemo(() => {
    const activeCount = agents.filter((a) => !a.isLocked).length;
    const todayTotal = agents.reduce((s, a) => s + Number(a.todayCollectedAmount || 0), 0);
    const pendingCash = agents.reduce((s, a) => s + Number(a.cashInHand || 0), 0);
    return { activeCount, todayTotal, pendingCash };
  }, [agents]);

  const handleOpenRemit = (agent: ManagerAgentControlItem) => {
    triggerLightHaptic();
    setRemitAgent(agent);
    setRemitAmount(String(agent.cashInHand || 0));
  };

  const handleConfirmRemit = async () => {
    if (!remitAgent) return;
    const amt = parseFloat(remitAmount);
    if (!amt || amt <= 0) {
      triggerErrorHaptic();
      showToast('कृपया वैध रोख रक्कम प्रविष्ट करा.', 'warning');
      return;
    }
    await acceptManagerAgentRemittance(remitAgent.id, amt);
    triggerSuccessHaptic();
    showToast(
      `${remitAgent.name} कडून ₹${amt.toLocaleString('en-IN')} रोख शाखेत जमा नोंदवली!`,
      'success',
      'रोख जमा पूर्ण'
    );
    setRemitAgent(null);
    setRemitAmount('');
  };

  const handleToggleLock = async (agent: ManagerAgentControlItem) => {
    await toggleManagerAgentLock(agent.id);
    triggerLightHaptic();
    showToast(
      agent.isLocked
        ? `${agent.name} यांना वसुलीसाठी अनलॉक केले.`
        : `${agent.name} यांची वसुली तात्पुरती लॉक केली.`,
      agent.isLocked ? 'success' : 'warning'
    );
  };

  const agentDrilldownReceipts = useMemo(() => {
    if (!receiptsAgent) return [];
    return collections.filter(
      (c) =>
        c.agentId === receiptsAgent.id ||
        (c.agentName && c.agentName.trim() === receiptsAgent.name.trim())
    );
  }, [collections, receiptsAgent]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reloadData} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Field Control Summary Strip */}
        <View style={styles.summaryRow}>
          <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sumVal, TABULAR_NUMS, { color: colors.primaryDark }]}>
              {totals.activeCount}/{agents.length}
            </Text>
            <Text style={[styles.sumLbl, { color: colors.textMuted }]}>सक्रिय एजंट</Text>
          </View>
          <View style={[styles.sumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sumVal, TABULAR_NUMS, { color: colors.successText }]}>
              ₹{totals.todayTotal.toLocaleString('en-IN')}
            </Text>
            <Text style={[styles.sumLbl, { color: colors.textMuted }]}>आजचे संकलन</Text>
          </View>
          <View
            style={[
              styles.sumCard,
              {
                backgroundColor: totals.pendingCash > 0 ? colors.warningBg : colors.successBg,
                borderColor: totals.pendingCash > 0 ? '#FCD34D' : '#86EFAC',
              },
            ]}
          >
            <Text
              style={[
                styles.sumVal,
                TABULAR_NUMS,
                { color: totals.pendingCash > 0 ? colors.warningText : colors.successText },
              ]}
            >
              ₹{totals.pendingCash.toLocaleString('en-IN')}
            </Text>
            <Text
              style={[
                styles.sumLbl,
                { color: totals.pendingCash > 0 ? colors.warningText : colors.successText },
              ]}
            >
              फिल्डवर रोख
            </Text>
          </View>
        </View>

        <SectionHeader title={`फिल्ड एजंट व रोख नियंत्रण (${agents.length})`} />

        {agents.map((agent) => {
          const targetPct =
            agent.todayTargetAmount > 0
              ? Math.min(100, Math.round((agent.todayCollectedAmount / agent.todayTargetAmount) * 100))
              : 0;
          const limitPct =
            agent.cashLimit > 0 ? Math.min(100, Math.round((agent.cashInHand / agent.cashLimit) * 100)) : 0;
          const isOverLimit = agent.cashInHand > agent.cashLimit;
          const isNearLimit = !isOverLimit && limitPct >= 80;

          return (
            <View
              key={agent.id}
              style={[
                styles.agentCard,
                {
                  backgroundColor: colors.card,
                  borderColor: agent.isLocked ? '#FCA5A5' : colors.border,
                },
              ]}
            >
              <View style={styles.agentHeader}>
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: agent.isLocked ? colors.dangerBg : colors.infoBg },
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: '900',
                      fontSize: 15,
                      color: agent.isLocked ? colors.dangerText : colors.primaryDark,
                    }}
                  >
                    {agent.name.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.agentName, { color: colors.text }]}>{agent.name}</Text>
                  <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 1 }}>
                    {agent.branchName} • {agent.assignedCustomersCount} खाती
                  </Text>
                </View>
                <StatusPill
                  label={agent.isLocked ? 'LOCKED' : agent.status === 'ACTIVE' ? 'ACTIVE' : 'ON FIELD'}
                  tone={agent.isLocked ? 'danger' : 'success'}
                />
              </View>

              {/* Collection Progress */}
              <View style={styles.metricRow}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '700' }}>
                  आजचे संकलन:{' '}
                  <Text style={[TABULAR_NUMS, { color: colors.successText, fontWeight: '900' }]}>
                    ₹{agent.todayCollectedAmount.toLocaleString('en-IN')}
                  </Text>{' '}
                  / ₹{agent.todayTargetAmount.toLocaleString('en-IN')}
                </Text>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: colors.primary }}>{targetPct}%</Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
                <View style={[styles.fill, { width: `${targetPct}%`, backgroundColor: colors.primary }]} />
              </View>

              {/* Cash vs UPI + Cash Limit Meter */}
              <View style={[styles.cashBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                <View style={styles.cashTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    {isOverLimit || isNearLimit ? (
                      <AlertTriangle size={14} color={isOverLimit ? colors.dangerText : colors.warningText} />
                    ) : (
                      <Banknote size={14} color={colors.primaryDark} />
                    )}
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>
                      हातात रोख: ₹{agent.cashInHand.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>
                    मर्यादा: ₹{agent.cashLimit.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[styles.trackSmall, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${limitPct}%`,
                        backgroundColor: isOverLimit
                          ? colors.danger
                          : isNearLimit
                          ? colors.warning
                          : colors.success,
                      },
                    ]}
                  />
                </View>
                <View style={styles.splitSubRow}>
                  <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
                    Cash: ₹{agent.todayCashAmount.toLocaleString('en-IN')} • UPI: ₹
                    {agent.todayUpiAmount.toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.textMuted, fontWeight: '600' }}>
                    शेवटचा भरणा: {agent.lastRemittanceDate}
                  </Text>
                </View>
              </View>

              {/* Manager Direct Actions */}
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={[
                    styles.primaryActionBtn,
                    {
                      backgroundColor: agent.cashInHand > 0 ? colors.primaryDark : colors.surfaceMuted,
                      borderColor: agent.cashInHand > 0 ? colors.primaryDark : colors.border,
                    },
                  ]}
                  onPress={() => handleOpenRemit(agent)}
                  disabled={agent.cashInHand <= 0}
                  activeOpacity={0.8}
                >
                  <Banknote size={14} color={agent.cashInHand > 0 ? '#FFFFFF' : colors.textMuted} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: agent.cashInHand > 0 ? '#FFFFFF' : colors.textMuted,
                    }}
                  >
                    {agent.cashInHand > 0 ? 'रोख जमा स्वीकारा' : 'रोख ० (जमा)'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryActionBtn,
                    {
                      backgroundColor: agent.isLocked ? colors.successBg : colors.dangerBg,
                      borderColor: agent.isLocked ? '#86EFAC' : '#FCA5A5',
                    },
                  ]}
                  onPress={() => handleToggleLock(agent)}
                  activeOpacity={0.8}
                >
                  {agent.isLocked ? (
                    <Unlock size={14} color={colors.successText} />
                  ) : (
                    <Lock size={14} color={colors.dangerText} />
                  )}
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '800',
                      color: agent.isLocked ? colors.successText : colors.dangerText,
                    }}
                  >
                    {agent.isLocked ? 'अनलॉक' : 'लॉक'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.utilRow}>
                <TouchableOpacity
                  style={[styles.utilChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
                  onPress={() => openPhoneDialer(agent.phone)}
                >
                  <Phone size={13} color={colors.primaryDark} />
                  <Text style={[styles.utilChipText, { color: colors.text }]}>कॉल</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.utilChip, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}
                  onPress={() =>
                    openWhatsAppMessage(
                      `नमस्कार ${agent.name}, आजच्या वसुलीपैकी तुमच्याकडे ₹${agent.cashInHand.toLocaleString('en-IN')} रोख शिल्लक आहे. कृपया संध्याकाळी ५ पूर्वी शाखेत जमा करा. - ${CONFIG.SANSTHA_NAME}`,
                      agent.phone
                    )
                  }
                >
                  <MessageCircle size={13} color="#047857" />
                  <Text style={[styles.utilChipText, { color: '#047857' }]}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.utilChip, { backgroundColor: colors.infoBg, borderColor: colors.border }]}
                  onPress={() => {
                    triggerLightHaptic();
                    setReceiptsAgent(agent);
                  }}
                >
                  <Receipt size={13} color={colors.infoText} />
                  <Text style={[styles.utilChipText, { color: colors.infoText }]}>पावत्या पहा</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Accept Agent Cash Remittance Modal */}
      {remitAgent && (
        <Modal visible={true} animationType="slide" transparent onRequestClose={() => setRemitAgent(null)}>
          <KeyboardAvoidingView
            style={styles.sheetOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.sheetBox, { backgroundColor: colors.card }]}>
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                    एजंट रोख जमा (Cash Remittance)
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {remitAgent.name} • प्रलंबित रोख: ₹{remitAgent.cashInHand.toLocaleString('en-IN')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeCircle, { backgroundColor: colors.surfaceMuted }]}
                  onPress={() => setRemitAgent(null)}
                >
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>
                शाखेत जमा केलेली रोख रक्कम (₹)
              </Text>
              <TextInput
                style={[
                  styles.amountInput,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.primary, color: colors.text },
                ]}
                value={remitAmount}
                onChangeText={setRemitAmount}
                keyboardType="numeric"
                placeholder="रक्कम प्रविष्ट करा"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primaryDark }]}
                onPress={handleConfirmRemit}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={17} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' }}>
                  रोख जमा स्वीकारा व सेटल करा
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Agent Receipts Drilldown Modal */}
      {receiptsAgent && (
        <Modal visible={true} animationType="slide" transparent onRequestClose={() => setReceiptsAgent(null)}>
          <View style={styles.sheetOverlay}>
            <View style={[styles.sheetBox, { backgroundColor: colors.card, maxHeight: '78%' }]}>
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
                    {receiptsAgent.name} — आजच्या पावत्या
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    एकूण संकलन: ₹{receiptsAgent.todayCollectedAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeCircle, { backgroundColor: colors.surfaceMuted }]}
                  onPress={() => setReceiptsAgent(null)}
                >
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {agentDrilldownReceipts.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: colors.textMuted, paddingVertical: 20, fontSize: 13 }}>
                    या एजंटच्या सविस्तर पावत्या सिंक झाल्यावर इथे दिसतील.
                  </Text>
                ) : (
                  agentDrilldownReceipts.map((rec) => (
                    <TouchableOpacity
                      key={rec.id}
                      style={[styles.recRow, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setReceiptsAgent(null);
                        onSelectReceipt(rec);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.text }}>{rec.customerName}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          {rec.accountNumber} • {rec.paymentMode} • {rec.receiptNo}
                        </Text>
                      </View>
                      <Text style={[TABULAR_NUMS, { fontSize: 14.5, fontWeight: '900', color: colors.successText }]}>
                        +₹{rec.amount.toLocaleString('en-IN')}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  sumCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  sumVal: { fontSize: 15, fontWeight: '900' },
  sumLbl: { fontSize: 10.5, fontWeight: '700', marginTop: 2 },
  agentCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  agentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentName: { fontSize: 14.5, fontWeight: '800' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 10,
  },
  trackSmall: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 7,
  },
  fill: { height: '100%', borderRadius: 4 },
  cashBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  cashTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  splitSubRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  actionsGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  primaryActionBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  secondaryActionBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  utilRow: { flexDirection: 'row', gap: 8 },
  utilChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  utilChipText: { fontSize: 11.5, fontWeight: '800' },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountInput: {
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: RADIUS.md,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: 10,
  },
});
