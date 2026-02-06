
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Platform, Modal } from "react-native";
import * as Network from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "react-error-boundary";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "@/styles/commonStyles";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "index",
};

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  console.error("App Error:", error);
  console.error("Error stack:", error.stack);
  
  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.title}>Something went wrong</Text>
      <Text style={errorStyles.message}>
        {error.message || 'An unexpected error occurred'}
      </Text>
      <TouchableOpacity style={errorStyles.button} onPress={resetErrorBoundary}>
        <Text style={errorStyles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isOffline, setIsOffline] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Monitor network status
  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        const offline = !networkState.isConnected || networkState.isInternetReachable === false;
        
        console.log('Network state changed - Connected:', networkState.isConnected, 'Internet:', networkState.isInternetReachable);
        
        if (offline && !isOffline) {
          console.log('🔌 App went offline');
          setIsOffline(true);
          setShowOfflineModal(true);
        } else if (!offline && isOffline) {
          console.log('✅ App back online');
          setIsOffline(false);
          setShowOfflineModal(false);
        }
      } catch (error) {
        console.error('Error checking network:', error);
      }
    };

    // Check immediately
    checkNetwork();

    // Check every 10 seconds
    const interval = setInterval(checkNetwork, 10000);

    return () => clearInterval(interval);
  }, [isOffline]);

  if (!loaded) {
    return null;
  }

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "rgb(0, 122, 255)",
      background: "rgb(242, 242, 247)",
      card: "rgb(255, 255, 255)",
      text: "rgb(0, 0, 0)",
      border: "rgb(216, 216, 220)",
      notification: "rgb(255, 59, 48)",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "rgb(10, 132, 255)",
      background: "rgb(1, 1, 1)",
      card: "rgb(28, 28, 30)",
      text: "rgb(255, 255, 255)",
      border: "rgb(44, 44, 46)",
      notification: "rgb(255, 69, 58)",
    },
  };

  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('ErrorBoundary caught error:', error);
        console.error('Error info:', errorInfo);
      }}
    >
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <AuthProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="register" />
              <Stack.Screen name="forgot-password" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="camper-profile" />
              <Stack.Screen name="edit-camper" />
              <Stack.Screen name="create-camper" />
              <Stack.Screen name="bulk-import-campers" />
              <Stack.Screen name="user-management" />
              <Stack.Screen name="manage-authorization-codes" />
              <Stack.Screen name="parent-dashboard" />
              <Stack.Screen name="parent-registration" />
              <Stack.Screen name="request-access" />
              <Stack.Screen name="accept-invitation" />
              <Stack.Screen name="edit-profile" />
            </Stack>
            <SystemBars style="auto" />

            {/* Offline Mode Modal */}
            <Modal
              visible={showOfflineModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowOfflineModal(false)}
            >
              <View style={offlineStyles.overlay}>
                <View style={offlineStyles.modal}>
                  <Text style={offlineStyles.icon}>🔌</Text>
                  <Text style={offlineStyles.title}>You are offline</Text>
                  <Text style={offlineStyles.message}>
                    You can still scan NFC wristbands to view camper information. All data is stored on the wristbands for offline access.
                  </Text>
                  <TouchableOpacity
                    style={offlineStyles.button}
                    onPress={() => setShowOfflineModal(false)}
                  >
                    <Text style={offlineStyles.buttonText}>Got it</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </GestureHandlerRootView>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const offlineStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
