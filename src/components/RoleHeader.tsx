import React from 'react';
import { useThemeColors, ThemeColors } from '../context/ThemeContext';
// import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { NetworkIndicator } from './NetworkIndicator';

export const RoleHeader: React.FC = () => {
  const { currentRole, currentUser, logout } = useAuth();
  const { colors } = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const roleColor =
    currentRole === 'ADMIN' ? '#F59E0B' : currentRole === 'AGENT' ? colors.primaryLight : '#EC4899';
  const roleLabel =
    currentRole === 'ADMIN' ? '👑 Admin' : currentRole === 'AGENT' ? '💼 Agent' : '👤 Customer';

  return (
    <View style={styles.container}>
      {/* Decorative circle */}
      <View style={styles.decCircle} />

      <View style={styles.inner}>
        <View>
          <Text style={styles.appTitle}>PAT Financial Pigmi</Text>
          <Text style={styles.userName}>{currentUser.name}</Text>
        </View>

        <View style={styles.rightRow}>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.75}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
          <NetworkIndicator />
        </View>
      </View>
    </View>
  );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  decCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#6366F120',
    top: -60,
    right: -30,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    color: '#C7D2FE',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 3,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
