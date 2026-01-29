
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
  Image,
  ImageSourcePropType,
} from 'react-native';
import { router } from 'expo-router';
import { colors, commonStyles, buttonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { validateAuthorizationCode } from '@/services/authorizationCode.service';
import { supabase } from '@/app/integrations/supabase/client';
import { incrementCodeUsage, findCampersByParentEmail } from '@/services/authorizationCode.service';
import { LinearGradient } from 'expo-linear-gradient';

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

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
  const [errorMessage, setErrorMessage] = useState('');

  const handleValidateCode = async () => {
    console.log('=== Validating Authorization Code ===');
    setErrorMessage('');
    
    if (!authCode.trim()) {
      const errorMsg = 'Please enter an authorization code';
      console.log('Validation error:', errorMsg);
      setErrorMessage(errorMsg);
      Alert.alert('Error', errorMsg);
      return;
    }

    setIsLoading(true);
    try {
      const codeToValidate = authCode.trim().toUpperCase();
      console.log('Code entered:', codeToValidate);
      
      const result = await validateAuthorizationCode(codeToValidate);
      console.log('Validation result:', JSON.stringify(result, null, 2));

      if (!result || !result.valid) {
        const errorMsg = result?.error || 'The authorization code is invalid or expired';
        console.log('Code validation failed:', errorMsg);
        setErrorMessage(errorMsg);
        Alert.alert('Invalid Code', errorMsg);
        return;
      }

      console.log('Code validated successfully! Role:', result.role);
      setValidatedCode(result);
      setStep('details');
      setErrorMessage('');
      Alert.alert(
        'Code Validated ✓',
        `You will be registered as: ${result.role?.replace('-', ' ').toUpperCase()}`
      );
    } catch (error) {
      console.error('Error validating code:', error);
      const errorMsg = `Failed to validate authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setErrorMessage(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    console.log('=== Starting Registration Process ===');
    console.log('Email:', email);
    console.log('Full name:', fullName);
    console.log('Role:', validatedCode?.role);
    setErrorMessage('');

    // Validation
    if (!email || !password || !confirmPassword || !fullName) {
      const errorMsg = 'Please fill in all required fields';
      console.log('Validation failed:', errorMsg);
      setErrorMessage(errorMsg);
      Alert.alert('Error', errorMsg);
      return;
    }

    if (password !== confirmPassword) {
      const errorMsg = 'Passwords do not match';
      console.log('Validation failed:', errorMsg);
      setErrorMessage(errorMsg);
      Alert.alert('Error', errorMsg);
      return;
    }

    if (password.length < 6) {
      const errorMsg = 'Password must be at least 6 characters';
      console.log('Validation failed:', errorMsg);
      setErrorMessage(errorMsg);
      Alert.alert('Error', errorMsg);
      return;
    }

    console.log('Validation passed, proceeding with registration...');
    setIsLoading(true);
    
    try {
      // Re-validate the authorization code
      console.log('Step 1: Re-validating authorization code...');
      const revalidation = await validateAuthorizationCode(authCode.trim().toUpperCase());
      console.log('Revalidation result:', JSON.stringify(revalidation, null, 2));
      
      if (!revalidation || !revalidation.valid) {
        const errorMsg = revalidation?.error || 'Authorization code is no longer valid';
        console.log('Revalidation failed:', errorMsg);
        setErrorMessage(errorMsg);
        Alert.alert('Error', `${errorMsg}. Please start over.`);
        setStep('code');
        setIsLoading(false);
        return;
      }

      // Determine registration_complete based on role
      // Non-parent roles (super-admin, camp-admin, staff) are complete after account creation
      // Parent role requires additional parent registration flow
      const isParent = revalidation.role === 'parent';
      const registrationComplete = !isParent;
      
      console.log('Registration settings:', {
        role: revalidation.role,
        isParent,
        registrationComplete
      });

      // Create user account with Supabase Auth
      console.log('Step 2: Creating Supabase auth user...');
      console.log('Signup data:', {
        email: email.toLowerCase().trim(),
        metadata: {
          full_name: fullName,
          phone: phone || null,
          role: revalidation.role,
        }
      });

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed',
          data: {
            full_name: fullName,
            phone: phone || null,
            role: revalidation.role,
          }
        }
      });

      console.log('Auth response:', { 
        hasUser: !!authData?.user, 
        userId: authData?.user?.id,
        hasSession: !!authData?.session,
        userEmail: authData?.user?.email,
        error: authError ? JSON.stringify(authError, null, 2) : null
      });

      if (authError) {
        console.error('Supabase auth error:', authError);
        let errorMessage = authError.message;
        
        // Provide more helpful error messages
        if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        } else if (errorMessage.includes('invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (errorMessage.includes('password')) {
          errorMessage = 'Password does not meet requirements. Please use at least 6 characters.';
        }
        
        console.log('Formatted error message:', errorMessage);
        setErrorMessage(errorMessage);
        Alert.alert('Registration Failed', errorMessage);
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        const errorMsg = 'Failed to create user account. No user returned from Supabase.';
        console.error(errorMsg);
        setErrorMessage(errorMsg);
        Alert.alert('Error', `${errorMsg} Please try again.`);
        setIsLoading(false);
        return;
      }

      console.log('User created successfully! User ID:', authData.user.id);

      // Wait for trigger to create profile
      console.log('Step 3: Waiting for profile creation...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify profile was created
      console.log('Step 4: Verifying profile creation...');
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      console.log('Profile verification:', {
        hasProfile: !!profile,
        profileId: profile?.id,
        profileRole: profile?.role,
        profileRegistrationComplete: profile?.registration_complete,
        error: profileError ? JSON.stringify(profileError, null, 2) : null
      });

      if (profileError || !profile) {
        console.error('Profile not found after trigger:', profileError);
        const errorMsg = 'Your account was created but there was an issue setting up your profile.';
        setErrorMessage(errorMsg);
        Alert.alert(
          'Profile Creation Issue',
          `${errorMsg} Please contact support.`
        );
        setIsLoading(false);
        return;
      }

      console.log('Profile verified:', JSON.stringify(profile, null, 2));

      // Update profile with correct role and registration status
      console.log('Step 5: Updating profile with role and details...');
      console.log('Setting registration_complete to:', registrationComplete);
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          role: revalidation.role,
          registration_complete: registrationComplete,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        // Don't fail registration for this, but log it
        console.warn('Profile update failed, but continuing with registration');
      } else {
        console.log('Profile updated successfully with registration_complete:', registrationComplete);
      }

      // Verify the update
      const { data: updatedProfile } = await supabase
        .from('user_profiles')
        .select('registration_complete, role')
        .eq('id', authData.user.id)
        .single();
      
      console.log('Profile after update:', updatedProfile);

      // Handle parent-specific linking
      if (isParent) {
        console.log('Step 6: Handling parent linking...');
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
        console.log('Step 7: Incrementing code usage...');
        try {
          await incrementCodeUsage(revalidation.code_id);
          console.log('Code usage incremented successfully!');
        } catch (codeError) {
          console.error('Error incrementing code usage:', codeError);
          // Don't fail registration if this fails
        }
      }

      console.log('=== Registration Completed Successfully! ===');
      setErrorMessage('');

      // Show success message
      const roleDisplay = revalidation.role.replace('-', ' ').toUpperCase();
      const successMessage = isParent 
        ? 'Please check your email to verify your account. After verification, you can sign in and complete your parent registration.'
        : 'Please check your email to verify your account before signing in. The verification link will expire in 24 hours.';
      
      Alert.alert(
        'Registration Successful! ✓',
        successMessage,
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
      const errorMsg = `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setErrorMessage(errorMsg);
      Alert.alert(
        'Registration Error', 
        `${errorMsg}\n\nPlease try again or contact support.`
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
                setErrorMessage('');
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
            <Image
              source={resolveImageSource(require('@/assets/images/ab23ec0a-a7bd-406b-b915-7c9d5b3dffb6.png'))}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            {step === 'code' ? 'Enter your authorization code' : 'Complete your profile'}
          </Text>
        </View>

        {/* Error Message Display */}
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="error"
              size={20}
              color={colors.error}
            />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

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
                onChangeText={(text) => {
                  setAuthCode(text);
                  setErrorMessage('');
                }}
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
              <Text style={styles.demoItem}>• CAMP_ADMIN_2024 - Camp Admin</Text>
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
                onChangeText={(text) => {
                  setFullName(text);
                  setErrorMessage('');
                }}
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
                onChangeText={(text) => {
                  setEmail(text);
                  setErrorMessage('');
                }}
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
                onChangeText={(text) => {
                  setPhone(text);
                  setErrorMessage('');
                }}
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
                onChangeText={(text) => {
                  setPassword(text);
                  setErrorMessage('');
                }}
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
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrorMessage('');
                }}
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
    zIndex: 10,
  },
  logoContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '15',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    fontWeight: '500',
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
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
    marginTop: 20,
  },
  demoCard: {
    backgroundColor: colors.info + '15',
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
