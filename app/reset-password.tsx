
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, commonStyles, buttonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  const checkResetToken = useCallback(async () => {
    console.log('=== Checking Password Reset Token ===');
    console.log('URL params:', params);

    try {
      // Check if we have a valid session from the reset link
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('Session check:', { hasSession: !!session, error });

      if (error) {
        console.error('Session error:', error);
        setIsValidToken(false);
        Alert.alert(
          'Invalid Link',
          'This password reset link is invalid or has expired. Please request a new one.',
          [{ text: 'OK', onPress: () => router.replace('/forgot-password') }]
        );
        return;
      }

      if (!session) {
        console.log('No session found - link may be invalid or expired');
        setIsValidToken(false);
        Alert.alert(
          'Invalid Link',
          'This password reset link is invalid or has expired. Please request a new one.',
          [{ text: 'OK', onPress: () => router.replace('/forgot-password') }]
        );
        return;
      }

      console.log('Valid reset token found');
      setIsValidToken(true);
    } catch (error) {
      console.error('Error checking reset token:', error);
      setIsValidToken(false);
      Alert.alert(
        'Error',
        'Failed to verify password reset link. Please try again.',
        [{ text: 'OK', onPress: () => router.replace('/forgot-password') }]
      );
    } finally {
      setIsCheckingToken(false);
    }
  }, [params, router]);

  useEffect(() => {
    checkResetToken();
  }, [checkResetToken]); // FIXED: Added checkResetToken to dependencies

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true };
  };

  const handleResetPassword = async () => {
    console.log('=== Resetting Password ===');

    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      Alert.alert('Invalid Password', validation.message || 'Please choose a stronger password');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Updating password...');
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Password update error:', error);
        throw error;
      }

      console.log('Password updated successfully');
      
      Alert.alert(
        'Success',
        'Your password has been reset successfully. You can now sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/sign-in');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Password reset error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Error', `Failed to reset password: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[commonStyles.textSecondary, { marginTop: 16 }]}>
          Verifying reset link...
        </Text>
      </View>
    );
  }

  if (!isValidToken) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <IconSymbol
          ios_icon_name="exclamationmark.triangle.fill"
          android_material_icon_name="warning"
          size={64}
          color={colors.warning}
        />
        <Text style={[commonStyles.cardTitle, { marginTop: 16, textAlign: 'center' }]}>
          Invalid Reset Link
        </Text>
        <Text style={[commonStyles.textSecondary, { marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }]}>
          This password reset link is invalid or has expired.
        </Text>
        <TouchableOpacity
          style={[buttonStyles.primary, { marginTop: 24 }]}
          onPress={() => router.replace('/forgot-password')}
        >
          <Text style={buttonStyles.text}>Request New Link</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <IconSymbol
              ios_icon_name="lock.rotation"
              android_material_icon_name="lock-reset"
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Choose a strong password for your account
          </Text>
        </View>

        {/* Password Requirements Card */}
        <View style={[commonStyles.card, styles.requirementsCard]}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          <View style={styles.requirementRow}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={16}
              color={colors.success}
            />
            <Text style={styles.requirementText}>At least 8 characters long</Text>
          </View>
          <View style={styles.requirementRow}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={16}
              color={colors.success}
            />
            <Text style={styles.requirementText}>One uppercase letter</Text>
          </View>
          <View style={styles.requirementRow}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={16}
              color={colors.success}
            />
            <Text style={styles.requirementText}>One lowercase letter</Text>
          </View>
          <View style={styles.requirementRow}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={16}
              color={colors.success}
            />
            <Text style={styles.requirementText}>One number</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>New Password</Text>

          <View style={styles.inputContainer}>
            <IconSymbol
              ios_icon_name="lock.fill"
              android_material_icon_name="lock"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={colors.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              <IconSymbol
                ios_icon_name={showPassword ? 'eye.fill' : 'eye.slash.fill'}
                android_material_icon_name={showPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <IconSymbol
              ios_icon_name="lock.fill"
              android_material_icon_name="lock"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoComplete="password-new"
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
            >
              <IconSymbol
                ios_icon_name={showConfirmPassword ? 'eye.fill' : 'eye.slash.fill'}
                android_material_icon_name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[buttonStyles.primary, styles.resetButton]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={buttonStyles.text}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <IconSymbol
            ios_icon_name="lock.shield.fill"
            android_material_icon_name="security"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.footerText}>
            Your password is encrypted and secure
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 60 : 40,
    paddingBottom: 40,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  requirementsCard: {
    backgroundColor: colors.card,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  formContainer: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  resetButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
