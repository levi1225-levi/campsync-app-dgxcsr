
import { LinearGradient } from 'expo-linear-gradient';
import { incrementCodeUsage, findCampersByParentEmail } from '@/services/authorizationCode.service';
import { supabase } from '@/app/integrations/supabase/client';
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
  Image,
  ImageSourcePropType,
} from 'react-native';
import { router } from 'expo-router';
import { colors, commonStyles, buttonStyles } from '@/styles/commonStyles';
import { validateAuthorizationCode } from '@/services/authorizationCode.service';
import { IconSymbol } from '@/components/IconSymbol';
import React, { useState } from 'react';

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  logoContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 70,
    padding: 20,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  infoCard: {
    backgroundColor: colors.info + '15',
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  demoCodesCard: {
    backgroundColor: colors.warning + '15',
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  demoCodesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  demoCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  demoCodeLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  demoCode: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  formContainer: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  inputIcon: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  validateButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  validatedCard: {
    backgroundColor: colors.success + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  validatedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 8,
  },
  validatedText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  registerButton: {
    marginTop: 8,
  },
  signInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  signInText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  signInLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 'auto',
  },
  footerIcon: {
    fontSize: 16,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function RegisterScreen() {
  const [authCode, setAuthCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [validatedCode, setValidatedCode] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleValidateCode = async () => {
    console.log('Validating authorization code:', authCode);

    if (!authCode.trim()) {
      Alert.alert('Error', 'Please enter an authorization code');
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateAuthorizationCode(authCode.trim().toUpperCase());
      console.log('Validation result:', result);

      if (result.valid) {
        setValidatedCode(result);
        Alert.alert('Success', `Valid ${result.role} authorization code!`);
      } else {
        Alert.alert('Invalid Code', result.message || 'This authorization code is not valid');
      }
    } catch (error) {
      console.error('Validation error:', error);
      Alert.alert('Error', 'Failed to validate authorization code');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRegister = async () => {
    console.log('=== Registration Attempt ===');
    console.log('Email:', email);
    console.log('Full Name:', fullName);
    console.log('Role:', validatedCode?.role);

    if (!email || !password || !confirmPassword || !fullName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsRegistering(true);
    try {
      console.log('Creating Supabase auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || null,
          },
        },
      });

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No user data returned from signup');
      }

      console.log('Auth user created:', authData.user.id);

      console.log('Creating user profile...');
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: validatedCode.role,
        registration_complete: validatedCode.role !== 'parent',
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }

      console.log('User profile created successfully');

      await incrementCodeUsage(validatedCode.code);
      console.log('Authorization code usage incremented');

      if (validatedCode.role === 'parent') {
        console.log('Parent role detected, handling parent linking...');
        await handleParentLinking(authData.user.id, email.toLowerCase().trim(), validatedCode);
      }

      Alert.alert(
        'Success',
        'Account created successfully! Please check your email to verify your account before signing in.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/sign-in'),
          },
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during registration';
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleParentLinking = async (userId: string, email: string, validatedCode: any) => {
    console.log('=== Parent Linking Process ===');
    console.log('User ID:', userId);
    console.log('Email:', email);
    console.log('Validated Code:', validatedCode);

    try {
      console.log('Creating parent_guardians record...');
      const { error: parentError } = await supabase.from('parent_guardians').insert({
        id: userId,
        email: email,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      });

      if (parentError) {
        console.error('Parent guardian creation error:', parentError);
        throw parentError;
      }

      console.log('Parent guardian record created successfully');

      if (validatedCode.linked_camper_ids && validatedCode.linked_camper_ids.length > 0) {
        console.log('Linking to campers:', validatedCode.linked_camper_ids);

        const camperLinks = validatedCode.linked_camper_ids.map((camperId: string) => ({
          parent_id: userId,
          camper_id: camperId,
          relationship: 'Parent/Guardian',
        }));

        const { error: linkError } = await supabase.from('parent_camper_links').insert(camperLinks);

        if (linkError) {
          console.error('Camper linking error:', linkError);
          throw linkError;
        }

        console.log('Camper links created successfully');
      } else {
        console.log('No linked campers found in authorization code');
      }
    } catch (error) {
      console.error('Parent linking error:', error);
      throw error;
    }
  };

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
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            <Image
              source={resolveImageSource(require('@/assets/images/ab23ec0a-a7bd-406b-b915-7c9d5b3dffb6.png'))}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>CampSync</Text>
          <Text style={styles.subtitle}>Create Your Account</Text>
        </LinearGradient>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Authorization Required</Text>
          <Text style={styles.infoText}>
            You need a valid authorization code from your camp administrator to create an account. This ensures only authorized users can access the system.
          </Text>
        </View>

        <View style={styles.demoCodesCard}>
          <Text style={styles.demoCodesTitle}>🎯 Demo Authorization Codes</Text>
          <View style={styles.demoCodeRow}>
            <Text style={styles.demoCodeLabel}>Super Admin:</Text>
            <Text style={styles.demoCode}>SUPER_ADMIN_2024</Text>
          </View>
          <View style={styles.demoCodeRow}>
            <Text style={styles.demoCodeLabel}>Camp Admin:</Text>
            <Text style={styles.demoCode}>CAMP_ADMIN_2024</Text>
          </View>
          <View style={styles.demoCodeRow}>
            <Text style={styles.demoCodeLabel}>Staff:</Text>
            <Text style={styles.demoCode}>STAFF_2024</Text>
          </View>
          <View style={styles.demoCodeRow}>
            <Text style={styles.demoCodeLabel}>Parent:</Text>
            <Text style={styles.demoCode}>PARENT_2024</Text>
          </View>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Step 1: Validate Code</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>🔑</Text>
            <TextInput
              style={styles.input}
              placeholder="Authorization Code"
              placeholderTextColor={colors.textSecondary}
              value={authCode}
              onChangeText={setAuthCode}
              autoCapitalize="characters"
              editable={!validatedCode && !isValidating}
            />
          </View>

          <TouchableOpacity
            style={[buttonStyles.primary, styles.validateButton]}
            onPress={handleValidateCode}
            disabled={isValidating || !!validatedCode}
          >
            {isValidating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={buttonStyles.text}>
                {validatedCode ? '✓ Code Validated' : 'Validate Code'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {validatedCode && (
          <>
            <View style={styles.validatedCard}>
              <Text style={styles.validatedTitle}>✓ Code Validated</Text>
              <Text style={styles.validatedText}>Role: {validatedCode.role}</Text>
              <Text style={styles.validatedText}>
                You can now complete your registration below.
              </Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Step 2: Account Details</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={colors.textSecondary}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  editable={!isRegistering}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isRegistering}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>📱</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Phone (Optional)"
                  placeholderTextColor={colors.textSecondary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!isRegistering}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!isRegistering}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isRegistering}
                >
                  <Text style={styles.inputIcon}>{showPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!isRegistering}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isRegistering}
                >
                  <Text style={styles.inputIcon}>{showConfirmPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[buttonStyles.primary, styles.registerButton]}
                onPress={handleRegister}
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={buttonStyles.text}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/sign-in')}>
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerIcon}>🔒</Text>
          <Text style={styles.footerText}>
            Secure registration with role-based access
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
