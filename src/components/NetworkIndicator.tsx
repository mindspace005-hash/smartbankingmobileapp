import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle, StyleProp } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useThemeColors } from '../context/ThemeContext';
import { RADIUS } from '../theme/tokens';

interface Props {
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export const NetworkIndicator: React.FC<Props> = ({ style, compact = false }) => {
  const { t } = useThemeColors();
  const [status, setStatus] = useState<'online' | 'weak' | 'offline'>('online');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (!state.isConnected) {
        setStatus('offline');
      } else if (
        state.isInternetReachable === false ||
        (state.type === 'cellular' &&
          state.details?.cellularGeneration &&
          ['2g', '3g'].includes(state.details.cellularGeneration))
      ) {
        setStatus('weak');
      } else {
        setStatus('online');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.45, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const colorMap = {
    online: { dot: '#10B981', bg: 'rgba(16, 185, 129, 0.16)', text: '#A7F3D0', label: t.online },
    weak: { dot: '#F59E0B', bg: 'rgba(245, 158, 11, 0.18)', text: '#FDE68A', label: t.weakNet },
    offline: { dot: '#EF4444', bg: 'rgba(239, 68, 68, 0.2)', text: '#FECACA', label: t.offline },
  }[status];

  if (compact) {
    return (
      <Animated.View
        style={[
          styles.bulb,
          { backgroundColor: colorMap.dot, opacity: pulseAnim, shadowColor: colorMap.dot },
          style,
        ]}
      />
    );
  }

  return (
    <View style={[styles.pill, { backgroundColor: colorMap.bg, borderColor: colorMap.dot + '55' }, style]}>
      <Animated.View style={[styles.dot, { backgroundColor: colorMap.dot, opacity: pulseAnim }]} />
      <Text style={[styles.label, { color: colorMap.text }]}>{colorMap.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bulb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
});
