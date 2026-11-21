import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { RADIUS } from '../../theme/tokens';

export const SkeletonCard: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, idx) => (
        <Animated.View key={idx} style={[styles.card, { opacity: pulse }]}>
          <View style={styles.avatar} />
          <View style={styles.lines}>
            <View style={[styles.line, { width: '62%' }]} />
            <View style={[styles.line, { width: '40%', height: 10 }]} />
          </View>
          <View style={[styles.badge]} />
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingVertical: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E2E8F0',
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 13,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  badge: {
    width: 64,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
  },
});
