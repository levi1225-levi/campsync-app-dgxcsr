
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { UserRole } from '@/types/user';
import { colors } from '@/styles/commonStyles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, hasPermission } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      console.log('ProtectedRoute: No user, redirecting to sign-in');
      try {
        router.replace('/sign-in');
      } catch (error) {
        console.error('ProtectedRoute navigation error:', error);
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!hasPermission(allowedRoles)) {
    console.log('ProtectedRoute: User does not have permission');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
