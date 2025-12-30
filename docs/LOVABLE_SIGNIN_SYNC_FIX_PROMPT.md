
# Lovable Admin Website - Sign-In & Account Sync Fix

## Critical Issue Summary

The CampSync mobile app and Lovable admin website are experiencing authentication synchronization issues. Users who create accounts on the mobile app cannot sign in to the Lovable admin website, and vice versa. Additionally, some users receive "Account setup incomplete" errors even after email verification.

## Root Cause Analysis

### Issue 1: Missing User Profiles
- Users successfully authenticate with Supabase Auth (`auth.users` table)
- Email verification completes successfully
- **BUT** the `user_profiles` table entry is not created during registration
- This causes sign-in to fail with "Account setup incomplete" error

### Issue 2: RLS Policy Conflicts
The original RLS policies on `user_profiles` were too restrictive:
- INSERT policy required `auth.uid() = id` but wasn't properly handling the registration flow
- During registration, the profile insert happens in the authenticated context but may fail due to timing issues

### Issue 3: Cross-Platform Account Sync
- Accounts created on mobile app don't sync to Lovable admin website
- Accounts created on Lovable don't sync to mobile app
- Both use the same Supabase project but profile creation may fail silently

## Database Schema Reference

### Key Tables

#### `auth.users` (Supabase Auth - Managed)
- `id` (uuid, primary key)
- `email` (text)
- `email_confirmed_at` (timestamp)
- `created_at` (timestamp)

#### `user_profiles` (Custom - Public Schema)
```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('super-admin', 'camp-admin', 'staff', 'parent')),
  registration_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### `authorization_codes`
- Used for registration validation
- Contains `role` field that determines user's role
- Has `linked_camper_ids` for parent accounts

## Fixed RLS Policies

The mobile app has been updated with corrected RLS policies:

```sql
-- Allow authenticated users to create their own profile
CREATE POLICY "Authenticated users can create their own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

-- Allow service role to insert profiles (for admin operations)
CREATE POLICY "Service role can insert profiles"
ON user_profiles
FOR INSERT
TO service_role
WITH CHECK (true);

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id);

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING ((SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super-admin');

-- Super admins can update all profiles
CREATE POLICY "Super admins can update all profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING ((SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super-admin');

-- Super admins can insert profiles
CREATE POLICY "Super admins can insert profiles"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super-admin');
```

## Required Fixes for Lovable Admin Website

### 1. Update Registration Flow

**Current Issue:** Profile creation may fail silently during registration.

**Fix Required:**
```typescript
// In your registration handler
async function handleRegistration(email: string, password: string, fullName: string, role: string) {
  try {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        emailRedirectTo: 'https://your-lovable-site.com/email-confirmed',
        data: {
          full_name: fullName,
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    console.log('Auth user created:', authData.user.id);

    // Step 2: Create user profile (with retry logic)
    let profileCreated = false;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Profile creation attempt ${attempt}/3...`);
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: email.toLowerCase().trim(),
          full_name: fullName,
          role: role,
          registration_complete: role !== 'parent',
        });

      if (!profileError) {
        profileCreated = true;
        console.log('Profile created successfully');
        break;
      }

      lastError = profileError;
      console.error(`Attempt ${attempt} failed:`, profileError);
      
      // Wait before retry
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!profileCreated) {
      console.error('Failed to create profile after retries:', lastError);
      throw new Error('Profile creation failed. Please contact support.');
    }

    // Step 3: Show success message
    alert('Registration successful! Please check your email to verify your account.');
    
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}
```

### 2. Update Sign-In Flow

**Current Issue:** Sign-in doesn't check for missing profiles.

**Fix Required:**
```typescript
async function handleSignIn(email: string, password: string) {
  try {
    // Step 1: Authenticate
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Authentication failed');

    console.log('User authenticated:', data.user.id);

    // Step 2: Fetch profile with retry
    let profile = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Profile fetch attempt ${attempt}/3...`);
      
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!profileError && profileData) {
        profile = profileData;
        break;
      }

      lastError = profileError;
      
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!profile) {
      console.error('No profile found:', lastError);
      throw new Error('Your account exists but the profile is missing. Please contact support.');
    }

    console.log('Sign in successful:', profile);
    
    // Redirect based on role
    if (profile.role === 'parent') {
      window.location.href = '/parent-dashboard';
    } else {
      window.location.href = '/dashboard';
    }
    
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}
```

### 3. Add Profile Recovery Tool (Admin Only)

Create an admin tool to fix accounts with missing profiles:

```typescript
// Admin tool to create missing profiles
async function fixMissingProfile(userId: string, email: string, fullName: string, role: string) {
  try {
    // Check if user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authUser) {
      throw new Error('User not found in auth system');
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      console.log('Profile already exists');
      return existingProfile;
    }

    // Create missing profile
    const { data: newProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: email.toLowerCase().trim(),
        full_name: fullName,
        role: role,
        registration_complete: role !== 'parent',
      })
      .select()
      .single();

    if (profileError) throw profileError;

    console.log('Profile created successfully:', newProfile);
    return newProfile;
    
  } catch (error) {
    console.error('Error fixing profile:', error);
    throw error;
  }
}
```

### 4. Update Session Management Page

**Current Issue:** "No camp found" error when creating sessions.

**Fix Required:**
```typescript
// Ensure camp exists before creating sessions
async function createSession(sessionData: any) {
  try {
    // Step 1: Get the camp (there should only be one)
    const { data: camps, error: campError } = await supabase
      .from('camps')
      .select('*')
      .limit(1);

    if (campError) throw campError;
    
    if (!camps || camps.length === 0) {
      throw new Error('No camp found. Please create a camp first in the admin settings.');
    }

    const camp = camps[0];
    console.log('Using camp:', camp.id, camp.name);

    // Step 2: Create session with camp_id
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        camp_id: camp.id,
        name: sessionData.name,
        start_date: sessionData.start_date,
        end_date: sessionData.end_date,
        max_capacity: sessionData.max_capacity,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    console.log('Session created:', session);
    return session;
    
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}
```

## Testing Checklist

After implementing these fixes, test the following scenarios:

### Registration Tests
- [ ] Register new user on mobile app → Verify profile created in database
- [ ] Register new user on Lovable → Verify profile created in database
- [ ] Verify email confirmation works for both platforms
- [ ] Check that authorization codes work correctly

### Sign-In Tests
- [ ] Sign in on mobile with account created on mobile
- [ ] Sign in on mobile with account created on Lovable
- [ ] Sign in on Lovable with account created on mobile
- [ ] Sign in on Lovable with account created on Lovable
- [ ] Verify proper error messages for missing profiles

### Session Management Tests
- [ ] Create session on Lovable → Verify it appears on mobile
- [ ] Verify camp exists before creating sessions
- [ ] Check that session dates and capacity are correct

### Profile Recovery Tests
- [ ] Use admin tool to fix accounts with missing profiles
- [ ] Verify fixed accounts can sign in successfully

## Database Queries for Debugging

### Check for users without profiles
```sql
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at,
  CASE WHEN p.id IS NULL THEN 'MISSING PROFILE' ELSE 'HAS PROFILE' END as profile_status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.email_confirmed_at IS NOT NULL
ORDER BY u.created_at DESC;
```

### Check RLS policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

### Manually create missing profile (as admin)
```sql
INSERT INTO user_profiles (id, email, full_name, role, registration_complete)
VALUES (
  'user-uuid-here',
  'user@example.com',
  'User Full Name',
  'staff', -- or 'parent', 'camp-admin', 'super-admin'
  true
);
```

## Support Contact Information

If users continue to experience issues after these fixes:

1. Collect the following information:
   - User's email address
   - Platform used (mobile app or Lovable website)
   - Error message received
   - Whether email was verified

2. Check database for:
   - User exists in `auth.users`
   - Email is confirmed (`email_confirmed_at` is set)
   - Profile exists in `user_profiles`

3. If profile is missing, use the admin tool or manual SQL to create it

## Implementation Priority

1. **HIGH PRIORITY** - Fix RLS policies (already done on mobile)
2. **HIGH PRIORITY** - Update registration flow with retry logic
3. **HIGH PRIORITY** - Update sign-in flow with profile validation
4. **MEDIUM PRIORITY** - Add profile recovery admin tool
5. **MEDIUM PRIORITY** - Fix session creation "No camp found" error
6. **LOW PRIORITY** - Add monitoring/alerts for failed profile creations

## Notes

- The mobile app has been updated with these fixes
- Lovable admin website needs to implement the same fixes
- Both platforms share the same Supabase database
- RLS policies have been corrected to allow proper profile creation
- All new registrations should now work correctly on mobile
- Existing users with missing profiles may need manual intervention

## Contact

For questions about this implementation, contact the CampSync development team.
