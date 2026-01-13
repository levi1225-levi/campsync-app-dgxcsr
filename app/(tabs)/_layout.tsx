
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';

export default function TabLayout() {
  // Define the tabs configuration with VALID Material icon names
  const tabs: TabBarItem[] = [
    {
      name: '(home)',
      route: '/(tabs)/(home)/',
      icon: 'home',
      label: 'Home',
    },
    {
      name: 'campers',
      route: '/(tabs)/campers',
      icon: 'group',
      label: 'Campers',
    },
    {
      name: 'check-in',
      route: '/(tabs)/check-in',
      icon: 'check-circle',
      label: 'Check-In',
    },
    {
      name: 'nfc-scanner',
      route: '/(tabs)/nfc-scanner',
      icon: 'contactless',
      label: 'NFC',
    },
    {
      name: 'profile',
      route: '/(tabs)/profile',
      icon: 'person',
      label: 'Profile',
    },
  ];

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="(home)" />
        <Stack.Screen name="campers" />
        <Stack.Screen name="check-in" />
        <Stack.Screen name="nfc-scanner" />
        <Stack.Screen name="profile" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
