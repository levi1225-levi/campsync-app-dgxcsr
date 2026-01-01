
# Lovable.dev - Authentication System Sync Guide

## Overview
The CampSync mobile app has implemented a comprehensive fix for authentication issues. This guide helps you sync the Lovable.dev website with these improvements.

## Key Changes Made in Mobile App

### 1. Database Trigger for Profile Creation
A database trigger now automatically creates user profiles when users are created in `auth.users`. This eliminates the RLS policy issues that were preventing profile creation.

**The trigger is already in the database** - no changes needed on your end for this.

### 2. Auto-Assign First Admin Function
A new function `auto_assign_first_admin()` automatically assigns the first non-parent user as camp admin when no staff assignments exist.

**The function is already in the database** - you can call it during sign-in if needed.

### 3. Improved Error Handling
Better error messages and retry logic for profile fetching during sign-in.

## What You Need to Update on Lovable.dev

### 1. Registration Flow

**Current Issue**: Your registration might be manually creating profiles, which could conflict with the trigger.

**Recommended Change**:
```typescript
// OLD WAY (remove this)
const { error: profileError } = await supabase
  .from('user_profiles')
  .insert({
    id: authData.user.id,
    email: email,
    full_name: fullName,
    role: role,
    registration_complete: false
  });

// NEW WAY (let the trigger handle it)
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: email.toLowerCase().trim(),
  password,
  options: {
    emailRedirectTo: 'https://your-site.com/email-confirmed',
    data: {
      full_name: fullName,
      phone: phone || null,
      role: role, // Pass role in metadata
    }
  }
});

// Wait for trigger to create profile
await new Promise(resolve => setTimeout(resolve, 2000));

// Then update with additional details if needed
const { error: updateError } = await supabase
  .from('user_profiles')
  .update({
    full_name: fullName,
    phone: phone || null,
    role: role,
    registration_complete: role !== 'parent',
  })
  .eq('id', authData.user.id);
```

### 2. Sign-In Flow

**Current Issue**: Sign-in might not handle missing profiles gracefully.

**Recommended Change**:
```typescript
async function signIn(email: string, password: string) {
  // Sign in with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error) throw error;

  // Fetch profile with retry logic
  let profile = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const { data: profileData, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!fetchError && profileData) {
      profile = profileData;
      break;
    }
    
    if (attempt < 5) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (!profile) {
    throw new Error('No user profile found. Please contact support.');
  }

  // Auto-assign first admin if needed (for non-parent users)
  if (profile.role !== 'parent') {
    try {
      await supabase.rpc('auto_assign_first_admin');
      
      // Reload profile in case role was updated
      const { data: updatedProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (updatedProfile) {
        profile = updatedProfile;
      }
    } catch (error) {
      console.error('Auto-assign error (non-critical):', error);
    }
  }

  return profile;
}
```

### 3. Error Messages

Update your error messages to match the mobile app:

```typescript
function getErrorMessage(error: any): string {
  const message = error.message || '';
  
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  } else if (message.includes('Email not confirmed')) {
    return 'Please verify your email address before signing in. Check your inbox for the verification link.';
  } else if (message.includes('User not found')) {
    return 'No account found with this email. Please register first.';
  } else if (message.includes('No user profile found')) {
    return 'Your account exists but the profile is missing. Please contact support.';
  }
  
  return message;
}
```

## Database Functions Available

These functions are already in your database and can be called from your website:

### 1. `auto_assign_first_admin()`
```typescript
// Call during sign-in for non-parent users
await supabase.rpc('auto_assign_first_admin');
```

### 2. `bootstrap_first_admin()` (legacy, calls auto_assign_first_admin)
```typescript
// Still works for backward compatibility
await supabase.rpc('bootstrap_first_admin');
```

## Testing Your Changes

1. **Test New Registration**:
   - Register a new user
   - Verify they can sign in immediately after email verification
   - Check that their profile exists in `user_profiles`

2. **Test Existing Users**:
   - All existing users should now be able to sign in
   - Verified user: `levishai.silverberg@gmail.com` (camp-admin)

3. **Test Auto-Assign**:
   - If you clear the `camp_staff` table (for testing only!)
   - Next non-parent user to sign in becomes camp-admin

## Current Database State

### Users with Profiles
All users now have profiles:
- ✅ `levishai.silverberg@gmail.com` - camp-admin
- ✅ `uurmomismymom@gmail.com` - staff
- ✅ `michellesilverberg@yahoo.ca` - staff
- ✅ `jasonsilverberg@yahoo.com` - staff

### Camp Staff Assignments
- ✅ One camp admin assigned: `levishai.silverberg@gmail.com`

## Common Issues and Solutions

### Issue: "No camp found or you don't have access"
**Solution**: This happens when a user has no staff assignment. The auto-assign function should fix this for the first user. For subsequent users, you need to manually assign them via the admin panel or use authorization codes.

### Issue: "Email not confirmed"
**Solution**: User needs to click the verification link in their email. You can resend the verification email using:
```typescript
await supabase.auth.resend({
  type: 'signup',
  email: userEmail,
});
```

### Issue: Profile creation fails during registration
**Solution**: The database trigger should handle this automatically now. If it still fails, check:
1. Is the trigger enabled? (It should be)
2. Are there any RLS policy conflicts? (Should be fixed)
3. Check Supabase logs for specific errors

## Need Help?

If you encounter issues:

1. Check Supabase logs (Auth service)
2. Verify the trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
3. Verify the function exists: `SELECT * FROM pg_proc WHERE proname = 'auto_assign_first_admin';`
4. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'user_profiles';`

## Summary

The mobile app now has:
- ✅ Automatic profile creation via database trigger
- ✅ Auto-assign first admin functionality
- ✅ Improved error handling and retry logic
- ✅ Fixed all existing users
- ✅ Better user feedback

Your website should:
- ✅ Remove manual profile creation (let trigger handle it)
- ✅ Add retry logic for profile fetching
- ✅ Call auto_assign_first_admin during sign-in
- ✅ Update error messages for consistency
- ✅ Test thoroughly with new and existing users
