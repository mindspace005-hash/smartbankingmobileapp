import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IndianRupee } from 'lucide-react-native';
import { useThemeColors } from '../context/ThemeContext';
import { RADIUS, TABULAR_NUMS } from '../theme/tokens';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
  iconElement?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  accentColor: propAccentColor,
  iconElement,
}) => {
  const { colors } = useThemeColors();
  const accentColor = propAccentColor || colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.primaryDark,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconBg, { backgroundColor: accentColor + '16' }]}>
          {iconElement || <IndianRupee size={18} color={accentColor} strokeWidth={2.2} />}
        </View>
        <View style={[styles.accentDot, { backgroundColor: accentColor }]} />
      </View>

      <Text style={[styles.value, TABULAR_NUMS, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.title, { color: colors.textSecondary }]} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '47%',
    borderRadius: RADIUS.lg,
    padding: 15,
    borderWidth: 1,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.7,
  },
  value: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 3,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
