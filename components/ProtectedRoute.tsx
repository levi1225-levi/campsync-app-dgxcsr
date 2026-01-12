
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    );
  }

  if (!hasPermission(allowedRoles)) {
    console.log('ProtectedRoute: User does not have permission');
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Access Denied</Text>
        <Text style={styles.errorSubtext}>
          You do not have permission to view this page
        </Text>
      </View>
    );
  }

  return <React.Fragment>{children}</React.Fragment>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
