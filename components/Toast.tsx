
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { BlurView } from 'expo-blur';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onDismiss?: () => void;
}

export function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = React.useRef(new Animated.Value(-100)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (onDismiss) {
            onDismiss();
          }
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, translateY, opacity, duration, onDismiss]);

  if (!visible) {
    return null;
  }

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'error' : 'info';
  const iosIconName = type === 'success' ? 'checkmark.circle.fill' : type === 'error' ? 'exclamationmark.circle.fill' : 'info.circle.fill';
  const backgroundColor = type === 'success' ? colors.success : type === 'error' ? colors.error : colors.info;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 16,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} style={styles.blurContainer}>
          <View style={[styles.content, { backgroundColor: `${backgroundColor}CC` }]}>
            <IconSymbol
              ios_icon_name={iosIconName}
              android_material_icon_name={iconName}
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.message}>{message}</Text>
          </View>
        </BlurView>
      ) : (
        <View style={[styles.content, { backgroundColor }]}>
          <IconSymbol
            ios_icon_name={iosIconName}
            android_material_icon_name={iconName}
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.message}>{message}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
