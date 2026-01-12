
import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => {
            // Use a simple text icon as fallback
            return <span style={{ fontSize: 24 }}>🏠</span>;
          },
        }}
      />
      <Tabs.Screen
        name="campers"
        options={{
          title: 'Campers',
          tabBarIcon: ({ color }) => {
            return <span style={{ fontSize: 24 }}>👥</span>;
          },
        }}
      />
      <Tabs.Screen
        name="nfc-scanner"
        options={{
          title: 'NFC',
          tabBarIcon: ({ color }) => {
            return <span style={{ fontSize: 24 }}>📱</span>;
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => {
            return <span style={{ fontSize: 24 }}>👤</span>;
          },
        }}
      />
    </Tabs>
  );
}
