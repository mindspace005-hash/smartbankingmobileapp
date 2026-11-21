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
import { Search, X, UserPlus, BookOpen } from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useThemeColors } from '../../../context/ThemeContext';
import { useAgentDashboard } from '../AgentDashboardContext';
import { SkeletonCard } from '../../../components/ui/SkeletonCard';
import { RADIUS, TABULAR_NUMS } from '../../../theme/tokens';
import { triggerLightHaptic } from '../../../utils/haptics';

export const AgentCustomersTab: React.FC = () => {
  const { isLoadingAccounts, refreshAgentData } = useAuth();
  const { colors, t } = useThemeColors();
  const { myAssignedAccounts, openAccountPassbook, openCreateCustomer } = useAgentDashboard();

  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return myAssignedAccounts;
    return myAssignedAccounts
      .filter((a) => {
        const oldAcc = (a.oldAccountNo || '').toLowerCase();
        const newAcc = (a.accountNumber || '').toLowerCase();
        const name = (a.customerName || '').toLowerCase();
        const cif = (a.cifNo || '').toLowerCase();
        return oldAcc.includes(q) || newAcc.includes(q) || name.includes(q) || cif.includes(q);
      })
      .sort((a, b) => {
        const aOld = (a.oldAccountNo || '').toLowerCase();
        const bOld = (b.oldAccountNo || '').toLowerCase();
        if (aOld === q && bOld !== q) return -1;
        if (bOld === q && aOld !== q) return 1;
        return 0;
      });
  }, [myAssignedAccounts, searchQuery]);

  return (
    <View style={[styles.screenBg, { backgroundColor: colors.background }]}>
      <View style={[styles.searchHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.searchBar, { flex: 1, backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
            <Search size={17} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              blurOnSubmit={false}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.addCustBtn, { backgroundColor: colors.primaryDark }]}
            onPress={() => {
              triggerLightHaptic();
              openCreateCustomer();
            }}
          >
            <UserPlus size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollPad}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={isLoadingAccounts} onRefresh={refreshAgentData} />}
      >
        {isLoadingAccounts && myAssignedAccounts.length === 0 ? (
          <SkeletonCard count={5} />
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
              कोणताही खातेदार सापडला नाही
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
              कृपया नाव किंवा खाते क्रमांक तपासून पुन्हा शोधा.
            </Text>
          </View>
        ) : (
          filtered.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[styles.custCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openAccountPassbook(acc)}
              activeOpacity={0.78}
            >
              <View style={[styles.custAvatar, { backgroundColor: colors.infoBg }]}>
                <BookOpen size={18} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.custName, { color: colors.text }]}>{acc.customerName}</Text>
                <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
                  खाते क्र: {acc.accountNumber} {acc.oldAccountNo ? `• जुना #${acc.oldAccountNo}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[TABULAR_NUMS, { fontSize: 14, fontWeight: '800', color: colors.primaryDark }]}>
                  ₹{Number(acc.currentBalance || 0).toLocaleString('en-IN')}
                </Text>
                <Text style={{ fontSize: 10.5, color: colors.primary, fontWeight: '700', marginTop: 2 }}>
                  Passbook →
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenBg: { flex: 1 },
  scrollPad: { padding: 14, paddingBottom: 28 },
  searchHeader: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
  },
  addCustBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  custCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 9,
  },
  custAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  custName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 24,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
});
