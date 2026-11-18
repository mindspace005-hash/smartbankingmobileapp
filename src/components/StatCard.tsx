import React from 'react';
import { useThemeColors, ThemeColors } from '../context/ThemeContext';
// import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
  icon?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  accentColor: propAccentColor,
  icon = '💰',
}) => {
  const { colors } = useThemeColors();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const accentColor = propAccentColor || colors.primary;
  return (
    <View style={[styles.card, { borderTopColor: accentColor }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBg, { backgroundColor: accentColor + '18' }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      </View>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    marginBottom: 12,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    marginBottom: 10,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { fontSize: 18 },
  value: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  title: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
