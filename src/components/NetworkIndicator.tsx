import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, ViewStyle, StyleProp } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface Props {
  style?: StyleProp<ViewStyle>;
}

export const NetworkIndicator: React.FC<Props> = ({ style }) => {
  const [statusColor, setStatusColor] = useState<string>('#10B981'); // Default Green (Online)
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (!state.isConnected) {
        setStatusColor('#EF4444'); // Red (Offline)
      } else if (
        state.isInternetReachable === false || 
        (state.type === 'cellular' && state.details?.cellularGeneration && ['2g', '3g'].includes(state.details.cellularGeneration))
      ) {
        setStatusColor('#F59E0B'); // Amber (Limited range / Slow / No internet)
      } else {
        setStatusColor('#10B981'); // Green (Online)
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Subtle breathing animation to make it feel like a "live bulb"
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View 
      style={[
        styles.bulb, 
        { 
          backgroundColor: statusColor, 
          opacity: pulseAnim,
          shadowColor: statusColor 
        },
        style
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  bulb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  }
});
