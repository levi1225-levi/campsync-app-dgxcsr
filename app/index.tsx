
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';

// Trigger lint update
export default function Index() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    console.log('Index screen - isLoading:', isLoading, 'user:', user?.email);
    
    if (!isLoading) {
      // Add a small delay to ensure navigation is ready
      const timeout = setTimeout(() => {
        try {
          if (!user) {
            console.log('No user, redirecting to sign-in');
            router.replace('/sign-in');
          } else {
            console.log('User found, role:', user.role);
            // Authenticated, redirect based on role
            if (user.role === 'parent') {
              if (!user.registrationComplete) {
                console.log('Redirecting to parent-registration');
                router.replace('/parent-registration');
              } else {
                console.log('Redirecting to parent-dashboard');
                router.replace('/parent-dashboard');
              }
            } else {
              console.log('Redirecting to home tabs');
              // Admin, Camp Admin, or Staff
              router.replace('/(tabs)/(home)/');
            }
          }
        } catch (error) {
          console.error('Navigation error in index:', error);
        }
      }, 100);

      return () => clearTimeout(timeout);
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
