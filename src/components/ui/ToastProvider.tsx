import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Animated, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { RADIUS } from '../../theme/tokens';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  title?: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string, durationMs?: number) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, durationMs = 3200) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ visible: true, message, title, type });
      translateY.setValue(-80);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 160 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      timerRef.current = setTimeout(hideToast, durationMs);
    },
    [hideToast, opacity, translateY]
  );

  const palette = {
    success: { bg: '#064E3B', border: '#10B981', icon: '#34D399' },
    error: { bg: '#7F1D1D', border: '#EF4444', icon: '#FCA5A5' },
    warning: { bg: '#78350F', border: '#F59E0B', icon: '#FCD34D' },
    info: { bg: '#1E293B', border: '#3B82F6', icon: '#93C5FD' },
  }[toast.type];

  const IconComp =
    toast.type === 'success'
      ? CheckCircle2
      : toast.type === 'error'
      ? AlertCircle
      : toast.type === 'warning'
      ? AlertTriangle
      : Info;

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast.visible && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrapper,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={[styles.toastBox, { backgroundColor: palette.bg, borderLeftColor: palette.border }]}>
            <IconComp size={20} color={palette.icon} strokeWidth={2.2} />
            <View style={styles.textWrap}>
              {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
              <Text style={styles.message} numberOfLines={3}>
                {toast.message}
              </Text>
            </View>
            <TouchableOpacity onPress={hideToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 44,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 16,
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 1,
  },
  message: {
    color: '#F1F5F9',
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 17,
  },
});
