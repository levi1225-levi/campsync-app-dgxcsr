
import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { colors, commonStyles, buttonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { validateAuthorizationCode } from '@/services/authorizationCode.service';
import { supabase } from '@/app/integrations/supabase/client';
import { incrementCodeUsage, findCampersByParentEmail } from '@/services/authorizationCode.service';

export default function RegisterScreen() {
  const [step, setStep] = useState<'code' | 'details'>('code');
  const [authCode, setAuthCode] = useState('');
  const [validatedCode, setValidatedCode] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleValidateCode = async () => {
    console.log('=== Validating Authorization Code ===');
    if (!authCode.trim()) {
      Alert.alert('Error', 'Please enter an authorization code');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Code entered:', authCode.trim().toUpperCase());
      const result = await validateAuthorizationCode(authCode.trim().toUpperCase());
      console.log('Validation result:', result);

      if (!result.valid) {
        console.log('Code validation failed:', result.error);
        Alert.alert('Invalid Code', result.error || 'The authorization code is invalid or expired');
        return;
      }

      console.log('Code validated successfully! Role:', result.role);
      setValidatedCode(result);
      setStep('details');
      Alert.alert(
        'Code Validated ✓',
        `You will be registered as: ${result.role?.replace('-', ' ').toUpperCase()}`
      );
    } catch (error) {
      console.error('Error validating code:', error);
      Alert.alert('Error', 'Failed to validate authorization code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    console.log('=== Starting Registration Process ===');
    console.log('Email:', email);
    console.log('Full name:', fullName);
    console.log('Role:', validatedCode?.role);

    // Validation
    if (!email || !password || !confirmPassword || !fullName) {
      console.log('Validation failed: missing required fields');
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      console.log('Validation failed: passwords do not match');
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      console.log('Validation failed: password too short');
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    console.log('Validation passed, proceeding with registration...');
    setIsLoading(true);
    
    try {
      // Re-validate the authorization code
      console.log('Step 1: Re-validating authorization code...');
      const revalidation = await validateAuthorizationCode(authCode.trim().toUpperCase());
      console.log('Revalidation result:', revalidation);
      
      if (!revalidation.valid) {
        console.log('Revalidation failed:', revalidation.error);
        Alert.alert('Error', 'Authorization code is no longer valid. Please start over.');
        setStep('code');
        setIsLoading(false);
        return;
      }

      // Create user account with Supabase Auth
      console.log('Step 2: Creating Supabase auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed',
          data: {
            full_name: fullName,
            phone: phone || null,
          }
        }
      });

      console.log('Auth response:', { 
        hasUser: !!authData?.user, 
        userId: authData?.user?.id,
        hasSession: !!authData?.session,
        error: authError 
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        let errorMessage = authError.message;
        
        // Provide more helpful error messages
        if (errorMessage.includes('already registered')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        }
        
        Alert.alert('Registration Failed', errorMessage);
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        console.error('No user returned from Supabase');
        Alert.alert('Error', 'Failed to create user account. Please try again.');
        setIsLoading(false);
        return;
      }

      console.log('User created successfully! User ID:', authData.user.id);

      // Create user profile with role from authorization code
      console.log('Step 3: Creating user profile...');
      const profileData = {
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        full_name: fullName,
        phone: phone || null,
        role: revalidation.role,
        registration_complete: revalidation.role !== 'parent',
      };
      console.log('Profile data:', profileData);

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert(profileData);

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        Alert.alert(
          'Profile Creation Failed', 
          `Failed to create user profile: ${profileError.message}\n\nPlease contact support with this error.`
        );
        setIsLoading(false);
        return;
      }

      console.log('User profile created successfully!');

      // Handle parent-specific linking
      if (revalidation.role === 'parent') {
        console.log('Step 4: Handling parent linking...');
        try {
          await handleParentLinking(authData.user.id, email.toLowerCase().trim(), revalidation);
          console.log('Parent linking completed successfully!');
        } catch (linkError) {
          console.error('Parent linking error:', linkError);
          // Don't fail the entire registration if linking fails
          Alert.alert(
            'Warning',
            'Account created but there was an issue linking to campers. Please contact support.'
          );
        }
      }

      // Increment code usage atomically
      if (revalidation.code_id) {
        console.log('Step 5: Incrementing code usage...');
        try {
          await incrementCodeUsage(revalidation.code_id);
          console.log('Code usage incremented successfully!');
        } catch (codeError) {
          console.error('Error incrementing code usage:', codeError);
          // Don't fail registration if this fails
        }
      }

      console.log('=== Registration Completed Successfully! ===');

      // Show success message
      Alert.alert(
        'Registration Successful! ✓',
        'Please check your email to verify your account before signing in. The verification link will expire in 24 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('Navigating to sign-in...');
              router.replace('/sign-in');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Unexpected registration error:', error);
      Alert.alert(
        'Registration Error', 
        `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support.`
      );
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const handleParentLinking = async (
    userId: string,
    email: string,
    validatedCode: any
  ) => {
    try {
      console.log('Starting parent linking for user:', userId);
      
      // A) Code-based linking
      const codeCamperIds = validatedCode.linked_camper_ids || [];
      console.log('Code-based camper IDs:', codeCamperIds);

      // B) Email-based auto-matching
      const emailCamperIds = await findCampersByParentEmail(email);
      console.log('Email-based camper IDs:', emailCamperIds);

      // Union of both (no duplicates)
      const allCamperIds = Array.from(new Set([...codeCamperIds, ...emailCamperIds]));
      console.log('All linked camper IDs:', allCamperIds);

      // Create parent_guardian record
      console.log('Creating parent_guardian record...');
      const { error: parentError } = await supabase
        .from('parent_guardians')
        .insert({
          id: userId,
          email,
          full_name: fullName,
          phone: phone || null,
        });

      if (parentError) {
        console.error('Error creating parent guardian:', parentError);
        throw parentError;
      }

      console.log('Parent guardian record created successfully!');

      // Create parent-camper links
      if (allCamperIds.length > 0) {
        console.log('Creating parent-camper links for', allCamperIds.length, 'campers...');
        const links = allCamperIds.map(camperId => ({
          parent_id: userId,
          camper_id: camperId,
          relationship: 'Parent/Guardian',
        }));

        const { error: linkError } = await supabase
          .from('parent_camper_links')
          .insert(links);

        if (linkError) {
          console.error('Error creating parent-camper links:', linkError);
          throw linkError;
        }

        console.log('Parent-camper links created successfully!');
      } else {
        console.log('No campers to link');
      }
    } catch (error) {
      console.error('Error in parent linking:', error);
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              console.log('Back button pressed, current step:', step);
              if (step === 'details') {
                setStep('code');
              } else {
                router.back();
              }
            }}
          >
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <IconSymbol
              ios_icon_name="tent.fill"
              android_material_icon_name="camping"
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            {step === 'code' ? 'Enter your authorization code' : 'Complete your profile'}
          </Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step === 'code' && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === 'details' && styles.stepDotActive]} />
        </View>

        {/* Step 1: Authorization Code */}
        {step === 'code' && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Authorization Code</Text>
            <Text style={commonStyles.textSecondary}>
              Enter the authorization code provided by your camp administrator
            </Text>

            <View style={styles.inputContainer}>
              <IconSymbol
                ios_icon_name="key.fill"
                android_material_icon_name="vpn-key"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="XXXX-XXXX-XXXX"
                placeholderTextColor={colors.textSecondary}
                value={authCode}
                onChangeText={setAuthCode}
                autoCapitalize="characters"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[buttonStyles.primary, styles.button]}
              onPress={handleValidateCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={buttonStyles.text}>Validate Code</Text>
              )}
            </TouchableOpacity>

            {/* Demo Codes */}
            <View style={[commonStyles.card, styles.demoCard]}>
              <Text style={styles.demoTitle}>Demo Authorization Codes</Text>
              <Text style={styles.demoItem}>• SUPER_ADMIN_2024 - Super Admin</Text>
              <Text style={styles.demoItem}>• DEMO_PARENT_2024 - Parent</Text>
            </View>

            {/* Help Link */}
            <TouchableOpacity
              style={styles.helpLink}
              onPress={() => router.push('/request-access' as any)}
            >
              <IconSymbol
                ios_icon_name="questionmark.circle.fill"
                android_material_icon_name="help"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.helpLinkText}>Don&apos;t have a code?</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: User Details */}
        {step === 'details' && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Your Information</Text>

            <View style={styles.inputContainer}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Full Name *"
                placeholderTextColor={colors.textSecondary}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <IconSymbol
                ios_icon_name="envelope.fill"
                android_material_icon_name="email"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Email *"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <IconSymbol
                ios_icon_name="phone.fill"
                android_material_icon_name="phone"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone (optional)"
                placeholderTextColor={colors.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
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
                placeholder="Password *"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <IconSymbol
                  ios_icon_name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                  android_material_icon_name={showPassword ? 'visibility-off' : 'visibility'}
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
                placeholder="Confirm Password *"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                <IconSymbol
                  ios_icon_name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'}
                  android_material_icon_name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[buttonStyles.primary, styles.button]}
              onPress={() => {
                console.log('Create Account button pressed!');
                handleRegister();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={buttonStyles.text}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/sign-in')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  formContainer: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    marginTop: 16,
  },
  demoCard: {
    backgroundColor: '#E3F2FD',
    marginTop: 24,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  demoItem: {
    fontSize: 13,
    color: colors.text,
    marginVertical: 2,
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  helpLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
