
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  // Define the tabs configuration
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
      icon: 'people',
      label: 'Campers',
    },
    {
      name: 'incidents',
      route: '/(tabs)/incidents',
      icon: 'report',
      label: 'Incidents',
    },
    {
      name: 'nfc-scanner',
      route: '/(tabs)/nfc-scanner',
      icon: 'nfc',
      label: 'NFC',
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
        <Stack.Screen key="incidents" name="incidents" />
        <Stack.Screen key="nfc-scanner" name="nfc-scanner" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
