
import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { colors } from '@/styles/commonStyles';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glassEffectStyle?: 'clear' | 'regular';
}

/**
 * GlassCard component using Apple's Liquid Glass UI on iOS 26+
 * Falls back to regular card on Android and older iOS versions
 */
export function GlassCard({ children, style, glassEffectStyle = 'regular' }: GlassCardProps) {
  if (Platform.OS === 'ios' && Platform.Version >= 26) {
    return (
      <GlassView
        style={[styles.glassCard, style]}
        glassEffectStyle={glassEffectStyle}
      >
        {children}
      </GlassView>
    );
  }

  // Fallback for Android and older iOS
  return (
    <View style={[styles.fallbackCard, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: 20,
    padding: 20,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fallbackCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
