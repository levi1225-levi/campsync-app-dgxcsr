
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function Index() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Not authenticated, go to sign-in
        router.replace('/sign-in');
      } else {
        // Authenticated, redirect based on role
        if (user.role === 'parent') {
          if (!user.registrationComplete) {
            router.replace('/parent-registration');
          } else {
            router.replace('/parent-dashboard');
          }
        } else {
          // Admin, Camp Admin, or Staff
          router.replace('/(tabs)/(home)/');
        }
      }
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
