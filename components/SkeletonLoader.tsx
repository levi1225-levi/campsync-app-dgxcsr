
import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface SkeletonLoaderProps {
  count?: number;
}

export function SkeletonLoader({ count = 3 }: SkeletonLoaderProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.row}>
            <Animated.View style={[styles.avatar, { opacity }]} />
            <View style={styles.content}>
              <Animated.View style={[styles.titleLine, { opacity }]} />
              <Animated.View style={[styles.subtitleLine, { opacity }]} />
            </View>
            <Animated.View style={[styles.badge, { opacity }]} />
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.border,
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  titleLine: {
    height: 18,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  subtitleLine: {
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: '40%',
  },
  badge: {
    width: 48,
    height: 32,
    backgroundColor: colors.border,
    borderRadius: 16,
  },
});
