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
import { Search, X, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useThemeColors } from '../../../context/ThemeContext';
import { useAgentDashboard } from '../AgentDashboardContext';
import { SkeletonCard } from '../../../components/ui/SkeletonCard';
import { StatusPill } from '../../../components/ui/StatusPill';
import { RADIUS } from '../../../theme/tokens';
import { triggerLightHaptic } from '../../../utils/haptics';

export const AgentCollectTab: React.FC = () => {
  const { isLoadingAccounts, refreshAgentData } = useAuth();
  const { colors, t } = useThemeColors();
  const { myAssignedAccounts, handleSelectCustomer, isAccCollectedToday } = useAgentDashboard();

  const [searchQuery, setSearchQuery] = useState('');
  const [collectFilter, setCollectFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const searched = !q
      ? myAssignedAccounts
      : myAssignedAccounts
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

    if (collectFilter === 'ALL') return searched;
    return searched.filter((acc) => {
      const done = isAccCollectedToday(acc);
      return collectFilter === 'DONE' ? done : !done;
    });
  }, [myAssignedAccounts, searchQuery, collectFilter, isAccCollectedToday]);

  return (
    <View style={[styles.screenBg, { backgroundColor: colors.background }]}>
      <View style={[styles.searchHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
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

        <View style={styles.filterChips}>
          {(
            [
              { key: 'ALL', label: `${t.all} (${myAssignedAccounts.length})` },
              {
                key: 'PENDING',
                label: `${t.pending} (${myAssignedAccounts.filter((a) => !isAccCollectedToday(a)).length})`,
              },
              {
                key: 'DONE',
                label: `${t.done} (${myAssignedAccounts.filter((a) => isAccCollectedToday(a)).length})`,
              },
            ] as const
          ).map((chip) => {
            const active = collectFilter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.primaryDark : colors.surfaceMuted,
                    borderColor: active ? colors.primaryDark : colors.border,
                  },
                ]}
                onPress={() => {
                  triggerLightHaptic();
                  setCollectFilter(chip.key);
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : colors.textSecondary }}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
              कोणतेही खाते सापडले नाही
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
              शोध किंवा फिल्टर बदलून पुन्हा पहा, किंवा खाली ओढून रिफ्रेश करा.
            </Text>
          </View>
        ) : (
          filtered.map((acc) => {
            const done = isAccCollectedToday(acc);
            const initials = (acc.customerName || 'C')
              .split(' ')
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() || '')
              .join('');

            return (
              <TouchableOpacity
                key={acc.id}
                style={[styles.custCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleSelectCustomer(acc)}
                activeOpacity={0.8}
              >
                <View style={[styles.custAvatar, { backgroundColor: done ? colors.successBg : colors.infoBg }]}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: done ? colors.successText : colors.primary }}>
                    {initials}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={[styles.custName, { color: colors.text }]} numberOfLines={1}>
                      {acc.customerName}
                    </Text>
                    {acc.oldAccountNo ? (
                      <StatusPill label={`जुना #${acc.oldAccountNo}`} tone="success" />
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
                    A/c: {acc.accountNumber} • Bal: ₹{Number(acc.currentBalance || 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: 2 }}>
                    हप्ता: ₹{acc.dailyTargetAmount}/day
                  </Text>
                </View>

                {done ? (
                  <StatusPill label="जमा ✓" tone="success" />
                ) : (
                  <View style={[styles.collectMiniBtn, { backgroundColor: colors.primaryDark }]}>
                    <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>वसुली</Text>
                    <ChevronRight size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
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
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
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
  collectMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
  },
  emptyCard: {
    padding: 24,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
});
