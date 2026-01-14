
import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glassEffectStyle?: 'clear' | 'regular';
}

/**
 * GlassCard component with fallback styling
 * Note: expo-glass-effect requires iOS 18+ and specific configuration
 * Using standard card styling for maximum compatibility
 */
export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
