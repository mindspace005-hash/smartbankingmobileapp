import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LogOut, Palette, Globe, Sparkles } from 'lucide-react-native';
import { useThemeColors } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { CONFIG } from '../config';
import { NetworkIndicator } from './NetworkIndicator';
import { RADIUS } from '../theme/tokens';
import { UserRole } from '../types';
import { triggerLightHaptic } from '../utils/haptics';

const DEMO_ROLE_OPTIONS: { key: UserRole; label: string }[] = [
  { key: 'AGENT', label: 'पिग्मी एजंट' },
  { key: 'ADMIN', label: 'मॅनेजर' },
  { key: 'CUSTOMER', label: 'खातेदार' },
];

export const RoleHeader: React.FC = () => {
  const { currentRole, currentUser, isDemoMode, switchDemoRole, logout } = useAuth();
  const { colors, language, toggleTheme, toggleLanguage } = useThemeColors();

  const initials = (currentUser.name || 'AG')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  const roleBadge = currentRole === 'ADMIN' ? 'Manager' : currentRole === 'AGENT' ? 'Agent' : 'Khatedar';

  return (
    <LinearGradient
      colors={[colors.primaryDark, colors.primaryMid]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.inner}>
        <View style={styles.leftRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials || 'U'}</Text>
            </View>
            <NetworkIndicator compact style={styles.avatarStatusDot} />
          </View>
          <View style={styles.nameCol}>
            <Text style={[styles.sansthaTitle, { color: colors.headerSubtext }]} numberOfLines={1}>
              {CONFIG.SANSTHA_NAME}
            </Text>
            <View style={styles.userRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {currentUser.name || 'Agent'}
              </Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>{roleBadge}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.rightRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              triggerLightHaptic();
              toggleLanguage();
            }}
            activeOpacity={0.75}
          >
            <Globe size={13} color="#FFFFFF" />
            <Text style={styles.langText}>{language === 'mr' ? 'MR' : 'EN'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              triggerLightHaptic();
              toggleTheme();
            }}
            activeOpacity={0.75}
          >
            <Palette size={14} color="#FDE68A" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, styles.logoutIconBtn]}
            onPress={() => {
              triggerLightHaptic();
              logout();
            }}
            activeOpacity={0.75}
          >
            <LogOut size={14} color="#FECACA" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Instant 1-Tap Demo Portal Switcher */}
      {isDemoMode && (
        <View style={styles.demoStrip}>
          <View style={styles.demoBadge}>
            <Sparkles size={11} color="#FDE68A" />
            <Text style={styles.demoBadgeText}>DEMO</Text>
          </View>
          <View style={styles.demoSwitchRow}>
            {DEMO_ROLE_OPTIONS.map((opt) => {
              const active = currentRole === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.demoPill,
                    active && { backgroundColor: '#FFFFFF' },
                  ]}
                  onPress={() => {
                    if (!active) {
                      triggerLightHaptic();
                      switchDemoRole(opt.key);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.demoPillText,
                      { color: active ? colors.primaryDark : 'rgba(255,255,255,0.88)' },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarStatusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  nameCol: {
    flex: 1,
  },
  sansthaTitle: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  roleTag: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: RADIUS.pill,
  },
  roleTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  langText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  logoutIconBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  demoStrip: {
    marginTop: 9,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(251, 191, 36, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.5)',
  },
  demoBadgeText: {
    color: '#FEF3C7',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  demoSwitchRow: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderRadius: RADIUS.pill,
    padding: 2,
    gap: 2,
  },
  demoPill: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
