
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  // Define the tabs configuration with VALID Material icon names
  const tabs: TabBarItem[] = [
    {
      name: '(home)',
      route: '/(tabs)/(home)/',
      icon: 'home', // Valid Material icon
      label: 'Home',
    },
    {
      name: 'campers',
      route: '/(tabs)/campers',
      icon: 'group', // Valid Material icon (was "people")
      label: 'Campers',
    },
    {
      name: 'nfc-scanner',
      route: '/(tabs)/nfc-scanner',
      icon: 'contactless', // Valid Material icon (was "nfc")
      label: 'NFC',
    },
    {
      name: 'profile',
      route: '/(tabs)/profile',
      icon: 'person', // Valid Material icon
      label: 'Profile',
    },
  ];

  // For Android and Web, use Stack navigation with custom floating tab bar
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen key="home" name="(home)" />
        <Stack.Screen key="campers" name="campers" />
        <Stack.Screen key="nfc-scanner" name="nfc-scanner" />
        <Stack.Screen key="profile" name="profile" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
