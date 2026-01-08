
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/contexts/AuthContext";
import { colors } from "@/styles/commonStyles";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "sign-in",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.secondary,
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: colors.primary,
      background: '#1A1A1A',
      card: '#2A2A2A',
      text: '#FFFFFF',
      border: '#3A3A3A',
      notification: colors.secondary,
    },
  };

  return (
    <>
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <AuthProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack>
              {/* Authentication Screens */}
              <Stack.Screen 
                name="sign-in" 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="register" 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="forgot-password" 
                options={{ headerShown: false }} 
              />
              
              {/* Parent Screens */}
              <Stack.Screen 
                name="parent-dashboard" 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="parent-registration" 
                options={{ headerShown: false }} 
              />

              {/* Main app with tabs */}
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

              {/* Other Screens */}
              <Stack.Screen 
                name="camper-profile" 
                options={{ 
                  headerShown: true,
                  title: 'Camper Profile',
                  headerBackTitle: 'Back'
                }} 
              />
              <Stack.Screen 
                name="user-management" 
                options={{ 
                  headerShown: true,
                  title: 'User Management',
                  headerBackTitle: 'Back'
                }} 
              />
              <Stack.Screen 
                name="manage-authorization-codes" 
                options={{ 
                  headerShown: true,
                  title: 'Authorization Codes',
                  headerBackTitle: 'Back'
                }} 
              />
              <Stack.Screen 
                name="create-camper" 
                options={{ 
                  headerShown: true,
                  title: 'Create Camper',
                  headerBackTitle: 'Back'
                }} 
              />
              <Stack.Screen 
                name="bulk-import-campers" 
                options={{ 
                  headerShown: true,
                  title: 'Bulk Import',
                  headerBackTitle: 'Back'
                }} 
              />
              <Stack.Screen 
                name="accept-invitation" 
                options={{ 
                  headerShown: true,
                  title: 'Accept Invitation',
                  headerBackTitle: 'Back'
                }} 
              />
              <Stack.Screen 
                name="edit-profile" 
                options={{ 
                  headerShown: true,
                  title: 'Edit Profile',
                  headerBackTitle: 'Back'
                }} 
              />
              <Stack.Screen 
                name="request-access" 
                options={{ 
                  headerShown: true,
                  title: 'Request Access',
                  headerBackTitle: 'Back'
                }} 
              />

              {/* Modal Demo Screens */}
              <Stack.Screen
                name="modal"
                options={{
                  presentation: "modal",
                  title: "Standard Modal",
                }}
              />
              <Stack.Screen
                name="formsheet"
                options={{
                  presentation: "formSheet",
                  title: "Form Sheet Modal",
                  sheetGrabberVisible: true,
                  sheetAllowedDetents: [0.5, 0.8, 1.0],
                  sheetCornerRadius: 20,
                }}
              />
              <Stack.Screen
                name="transparent-modal"
                options={{
                  presentation: "transparentModal",
                  headerShown: false,
                }}
              />
            </Stack>
            <SystemBars style={"auto"} />
          </GestureHandlerRootView>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}
