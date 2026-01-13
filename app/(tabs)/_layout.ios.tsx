
import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';
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
            return <Text style={{ fontSize: 24 }}>🏠</Text>;
          },
        }}
      />
      <Tabs.Screen
        name="campers"
        options={{
          title: 'Campers',
          tabBarIcon: ({ color }) => {
            return <Text style={{ fontSize: 24 }}>👥</Text>;
          },
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: 'Check-In',
          tabBarIcon: ({ color }) => {
            return <Text style={{ fontSize: 24 }}>✅</Text>;
          },
        }}
      />
      <Tabs.Screen
        name="nfc-scanner"
        options={{
          title: 'NFC',
          tabBarIcon: ({ color }) => {
            return <Text style={{ fontSize: 24 }}>📱</Text>;
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => {
            return <Text style={{ fontSize: 24 }}>👤</Text>;
          },
        }}
      />
    </Tabs>
  );
}
