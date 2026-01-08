
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger key="home" name="(home)">
        <Icon sf="house.fill" />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="campers" name="campers">
        <Icon sf="person.2.fill" />
        <Label>Campers</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="nfc" name="nfc-scanner">
        <Icon sf="wave.3.right" />
        <Label>NFC</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger key="profile" name="profile">
        <Icon sf="person.fill" />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
