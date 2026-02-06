
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import * as Network from 'expo-network';

export default function Index() {
  const { user, isLoading } = useAuth();
  const [isOffline, setIsOffline] = useState(false);
  const [checkingNetwork, setCheckingNetwork] = useState(true);

  useEffect(() => {
    const checkNetworkStatus = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        const offline = !networkState.isConnected || networkState.isInternetReachable === false;
        console.log('Network status - Connected:', networkState.isConnected, 'Internet:', networkState.isInternetReachable);
        setIsOffline(offline);
        setCheckingNetwork(false);
      } catch (error) {
        console.error('Error checking network:', error);
        setIsOffline(false);
        setCheckingNetwork(false);
      }
    };

    checkNetworkStatus();
  }, []);

  useEffect(() => {
    console.log('Index screen - isLoading:', isLoading, 'user:', user?.email, 'isOffline:', isOffline, 'checkingNetwork:', checkingNetwork);
    
    if (!isLoading && !checkingNetwork) {
      // Add a small delay to ensure navigation is ready
      const timeout = setTimeout(() => {
        try {
          // If offline and no user, redirect to NFC scanner for offline access
          if (isOffline && !user) {
            console.log('Offline mode detected - redirecting to NFC scanner for offline access');
            router.replace('/(tabs)/nfc-scanner');
            return;
          }

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
  }, [user, isLoading, isOffline, checkingNetwork]);

  const statusText = checkingNetwork 
    ? 'Checking network status...' 
    : isOffline 
    ? 'Offline mode - Loading NFC scanner...' 
    : 'Loading...';

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.statusText}>{statusText}</Text>
      {isOffline && !checkingNetwork && (
        <Text style={styles.offlineText}>
          ✅ You can scan wristbands offline
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  offlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    marginTop: 12,
    textAlign: 'center',
  },
});
