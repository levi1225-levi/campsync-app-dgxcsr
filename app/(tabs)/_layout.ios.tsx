
import React from 'react';
import { Platform } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Label>Home</Label>
        <Icon sf={{ default: 'house', selected: 'house.fill' }} drawable="home" />
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="campers">
        <Label>Campers</Label>
        <Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} drawable="group" />
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="check-in">
        <Label>Check-In</Label>
        <Icon sf={{ default: 'checkmark.circle', selected: 'checkmark.circle.fill' }} drawable="check-circle" />
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="nfc-scanner">
        <Label>NFC</Label>
        <Icon sf={{ default: 'wave.3.right', selected: 'wave.3.right.circle.fill' }} drawable="nfc" />
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="wristband-updates">
        <Label>Updates</Label>
        <Icon sf={{ default: 'arrow.clockwise', selected: 'arrow.clockwise.circle.fill' }} drawable="sync" />
      </NativeTabs.Trigger>
      
      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon sf={{ default: 'person.circle', selected: 'person.circle.fill' }} drawable="account-circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
