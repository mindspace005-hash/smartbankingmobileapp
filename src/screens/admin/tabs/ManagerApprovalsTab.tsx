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
  CheckCircle2,
  XCircle,
  PauseCircle,
  UserPlus,
  HandCoins,
  FileCheck2,
  Clock,
} from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useThemeColors } from '../../../context/ThemeContext';
import { useToast } from '../../../components/ui/ToastProvider';
import { StatusPill } from '../../../components/ui/StatusPill';
import { SectionHeader } from '../../../components/ui/AppCard';
import { ManagerApprovalCategory, ManagerApprovalItem, ManagerApprovalStatus } from '../../../types';
import { RADIUS, TABULAR_NUMS } from '../../../theme/tokens';
import { triggerLightHaptic, triggerSuccessHaptic, triggerErrorHaptic } from '../../../utils/haptics';
import { useManagerDashboard } from '../ManagerDashboardContext';

type FilterType = 'ALL' | ManagerApprovalCategory;

export const ManagerApprovalsTab: React.FC = () => {
  const { updateManagerApproval } = useAuth();
  const { colors } = useThemeColors();
  const { showToast } = useToast();
  const { refreshing, reloadData, data } = useManagerDashboard();

  const [categoryFilter, setCategoryFilter] = useState<FilterType>('ALL');

  const approvals = data?.approvals || [];

  const counts = useMemo(() => {
    const pending = approvals.filter((a) => a.status === 'PENDING');
    return {
      allPending: pending.length,
      kyc: pending.filter((a) => a.category === 'CUSTOMER_KYC').length,
      loan: pending.filter((a) => a.category === 'LOAN_APP').length,
      voucher: pending.filter((a) => a.category === 'VOUCHER').length,
      approved: approvals.filter((a) => a.status === 'APPROVED').length,
      rejected: approvals.filter((a) => a.status === 'REJECTED' || a.status === 'HOLD').length,
    };
  }, [approvals]);

  const filteredPending = useMemo(
    () =>
      approvals.filter(
        (a) => a.status === 'PENDING' && (categoryFilter === 'ALL' || a.category === categoryFilter)
      ),
    [approvals, categoryFilter]
  );

  const processedItems = useMemo(
    () =>
      approvals.filter(
        (a) => a.status !== 'PENDING' && (categoryFilter === 'ALL' || a.category === categoryFilter)
      ),
    [approvals, categoryFilter]
  );

  const handleDecision = async (item: ManagerApprovalItem, status: ManagerApprovalStatus) => {
    await updateManagerApproval(item.id, status);
    if (status === 'APPROVED') {
      triggerSuccessHaptic();
      showToast(`${item.title} — मंजूर केले!`, 'success', 'मंजुरी पूर्ण');
    } else if (status === 'HOLD') {
      triggerLightHaptic();
      showToast(`${item.title} — पुनर्विचारासाठी थांबवले.`, 'warning', 'Hold');
    } else {
      triggerErrorHaptic();
      showToast(`${item.title} — नाकारले.`, 'error', 'अर्ज नाकारला');
    }
  };

  const getCategoryMeta = (cat: ManagerApprovalCategory) => {
    if (cat === 'CUSTOMER_KYC') {
      return { label: 'ग्राहक KYC', bg: '#DCFCE7', accent: '#047857', icon: <UserPlus size={15} color="#047857" /> };
    }
    if (cat === 'LOAN_APP') {
      return { label: 'कर्ज मंजुरी', bg: '#FEF3C7', accent: '#B45309', icon: <HandCoins size={15} color="#B45309" /> };
    }
    return { label: 'व्हाउचर चेक', bg: '#E0E7FF', accent: '#3730A3', icon: <FileCheck2 size={15} color="#3730A3" /> };
  };

  const filterChips: { key: FilterType; label: string; count: number }[] = [
    { key: 'ALL', label: 'सर्व', count: counts.allPending },
    { key: 'CUSTOMER_KYC', label: 'ग्राहक KYC', count: counts.kyc },
    { key: 'LOAN_APP', label: 'कर्ज अर्ज', count: counts.loan },
    { key: 'VOUCHER', label: 'व्हाउचर', count: counts.voucher },
  ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reloadData} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Summary Strip */}
      <View style={styles.summaryRow}>
        <View style={[styles.sumBox, { backgroundColor: colors.warningBg, borderColor: '#FCD34D' }]}>
          <Text style={[styles.sumVal, TABULAR_NUMS, { color: colors.warningText }]}>{counts.allPending}</Text>
          <Text style={[styles.sumLbl, { color: colors.warningText }]}>प्रलंबित</Text>
        </View>
        <View style={[styles.sumBox, { backgroundColor: colors.successBg, borderColor: '#86EFAC' }]}>
          <Text style={[styles.sumVal, TABULAR_NUMS, { color: colors.successText }]}>{counts.approved}</Text>
          <Text style={[styles.sumLbl, { color: colors.successText }]}>आज मंजूर</Text>
        </View>
        <View style={[styles.sumBox, { backgroundColor: colors.dangerBg, borderColor: '#FCA5A5' }]}>
          <Text style={[styles.sumVal, TABULAR_NUMS, { color: colors.dangerText }]}>{counts.rejected}</Text>
          <Text style={[styles.sumLbl, { color: colors.dangerText }]}>नाकारले / Hold</Text>
        </View>
      </View>

      {/* Category Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipBar}>
        {filterChips.map((chip) => {
          const active = categoryFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primaryDark : colors.card,
                  borderColor: active ? colors.primaryDark : colors.border,
                },
              ]}
              onPress={() => {
                triggerLightHaptic();
                setCategoryFilter(chip.key);
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#FFFFFF' : colors.textSecondary }}>
                {chip.label} ({chip.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <SectionHeader title={`मंजुरीच्या प्रतीक्षेत (${filteredPending.length})`} />

      {filteredPending.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <CheckCircle2 size={28} color={colors.success} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 8 }}>
            सर्व अर्ज तपासले गेले आहेत!
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            या विभागात सध्या कोणतीही मंजुरी प्रलंबित नाही.
          </Text>
        </View>
      ) : (
        filteredPending.map((item) => {
          const meta = getCategoryMeta(item.category);
          return (
            <View
              key={item.id}
              style={[styles.approvalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.catBadge, { backgroundColor: meta.bg }]}>
                  {meta.icon}
                  <Text style={{ fontSize: 11, fontWeight: '800', color: meta.accent }}>{meta.label}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} color={colors.textMuted} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>{item.requestedAt}</Text>
                </View>
              </View>

              <View style={styles.titleAmountRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>{item.subtitle}</Text>
                </View>
                <Text style={[styles.itemAmount, TABULAR_NUMS, { color: colors.primaryDark }]}>
                  ₹{item.amount.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={[styles.detailGrid, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                {item.details.map((d, idx) => (
                  <View key={idx} style={styles.detailCell}>
                    <Text style={{ fontSize: 10.5, color: colors.textMuted, fontWeight: '600' }}>{d.label}</Text>
                    <Text style={{ fontSize: 12, color: colors.text, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>
                      {d.value}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginBottom: 10 }}>
                पाठवणारा: {item.requestedBy} • {item.branchName}
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btnApprove, { backgroundColor: colors.successText }]}
                  onPress={() => handleDecision(item, 'APPROVED')}
                  activeOpacity={0.82}
                >
                  <CheckCircle2 size={15} color="#FFFFFF" />
                  <Text style={styles.btnApproveText}>मंजूर करा</Text>
                </TouchableOpacity>

                {item.category === 'LOAN_APP' && (
                  <TouchableOpacity
                    style={[styles.btnHold, { backgroundColor: colors.warningBg, borderColor: '#FCD34D' }]}
                    onPress={() => handleDecision(item, 'HOLD')}
                    activeOpacity={0.82}
                  >
                    <PauseCircle size={15} color={colors.warningText} />
                    <Text style={[styles.btnHoldText, { color: colors.warningText }]}>Hold</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.btnReject, { backgroundColor: colors.dangerBg, borderColor: '#FCA5A5' }]}
                  onPress={() => handleDecision(item, 'REJECTED')}
                  activeOpacity={0.82}
                >
                  <XCircle size={15} color={colors.dangerText} />
                  <Text style={[styles.btnRejectText, { color: colors.dangerText }]}>नाकारा</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {processedItems.length > 0 && (
        <>
          <SectionHeader title={`आज निर्णय झालेले (${processedItems.length})`} />
          {processedItems.map((item) => (
            <View
              key={item.id}
              style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  ₹{item.amount.toLocaleString('en-IN')} • {item.requestedBy}
                </Text>
              </View>
              <StatusPill
                label={
                  item.status === 'APPROVED'
                    ? 'मंजूर'
                    : item.status === 'HOLD'
                    ? 'Hold'
                    : 'नाकारले'
                }
                tone={
                  item.status === 'APPROVED'
                    ? 'success'
                    : item.status === 'HOLD'
                    ? 'warning'
                    : 'danger'
                }
              />
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sumBox: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sumVal: { fontSize: 18, fontWeight: '900' },
  sumLbl: { fontSize: 11, fontWeight: '800', marginTop: 1 },
  chipBar: {
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  emptyCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
  },
  approvalCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  titleAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  itemTitle: { fontSize: 14.5, fontWeight: '800' },
  itemAmount: { fontSize: 16, fontWeight: '900' },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 9,
    gap: 8,
    marginBottom: 8,
  },
  detailCell: {
    width: '47%',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnApprove: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  btnApproveText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  btnHold: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  btnHoldText: { fontSize: 12, fontWeight: '800' },
  btnReject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  btnRejectText: { fontSize: 12.5, fontWeight: '800' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
});
