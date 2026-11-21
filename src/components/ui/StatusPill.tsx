import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { RADIUS } from '../../theme/tokens';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface StatusPillProps {
  label: string;
  tone?: Tone;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const TONE_MAP: Record<Tone, { bg: string; text: string; border: string }> = {
  success: { bg: '#DCFCE7', text: '#047857', border: '#A7F3D0' },
  warning: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
  danger: { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' },
  info: { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' },
  primary: { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
  neutral: { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' },
};

export const StatusPill: React.FC<StatusPillProps> = ({ label, tone = 'neutral', icon, style }) => {
  const palette = TONE_MAP[tone];
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: palette.bg, borderColor: palette.border },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
