import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme/useTheme';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (text: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const { colors } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));

  const showToast = useCallback((text: string, options?: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    const type = options?.type || 'info';
    const duration = options?.duration || 4000;

    setToast({ id, text, type });

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Auto dismiss
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setToast(current => current?.id === id ? null : current);
      });
    }, duration);
  }, [fadeAnim]);

  const getToastColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return { bg: colors.successSubtle || '#E6F4EA', border: colors.success || '#137333', text: colors.success || '#137333' };
      case 'warning':
        return { bg: colors.warnBg || '#FEF7E0', border: colors.warnBorder || '#B06000', text: colors.warnInk || '#B06000' };
      case 'error':
        return { bg: colors.errorSubtle || '#FCE8E6', border: colors.error || '#C5221F', text: colors.error || '#C5221F' };
      case 'info':
      default:
        return { bg: colors.accentSubtle || '#E8F0FE', border: colors.accent || '#1A73E8', text: colors.accent || '#1A73E8' };
    }
  };

  const toastStyles = toast ? getToastColors(toast.type) : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && toastStyles && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: fadeAnim,
              backgroundColor: toastStyles.bg,
              borderColor: toastStyles.border,
            },
          ]}
        >
          <Text style={[styles.toastText, { color: toastStyles.text }]}>
            {toast.text}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 90, // Positioned above the bottom tab bar
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 9999,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
