
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { router } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ children, allowedRoles, redirectTo }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to sign-in');
        router.replace('/sign-in');
      } else if (user && !allowedRoles.includes(user.role)) {
        console.log('User does not have permission, redirecting');
        if (redirectTo) {
          router.replace(redirectTo as any);
        } else {
          // Default redirect based on role
          if (user.role === 'parent') {
            router.replace('/parent-dashboard');
          } else {
            router.replace('/(tabs)/(home)/');
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, redirectTo]);

  if (isLoading) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <IconSymbol
          ios_icon_name="lock.fill"
          android_material_icon_name="lock"
          size={48}
          color={colors.textSecondary}
        />
        <Text style={styles.messageText}>Please sign in to continue</Text>
      </View>
    );
  }

  if (user && !allowedRoles.includes(user.role)) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle.fill"
          android_material_icon_name="warning"
          size={48}
          color={colors.warning}
        />
        <Text style={styles.messageText}>Access Denied</Text>
        <Text style={commonStyles.textSecondary}>
          You do not have permission to view this page.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
  messageText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
