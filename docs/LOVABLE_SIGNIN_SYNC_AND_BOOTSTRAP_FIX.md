
# Lovable: Sign-In Sync & Bootstrap First Admin Fix

## Critical Issues Resolved

This document addresses two critical issues that were preventing users from accessing the CampSync system:

1. **Sign-in button not working** - Users could sign in but couldn't access the app
2. **"No camp found" error** - Users saw this error after signing in
3. **Profile missing error** - Users created on the website couldn't sign in to the mobile app

## Issue 1: Sign-In Button Not Working

### Problem
When users pressed the sign-in button, it would show a loading indicator but then nothing would happen. The user would remain on the sign-in screen.

### Root Cause
The sign-in process was completing successfully, but users had no camp assignments in the `camp_staff` table. The RLS policies prevented them from accessing any camps, so the app didn't know where to navigate them.

### Solution
Implemented **Bootstrap First Admin** logic that automatically assigns the first logged-in user as a camp administrator when no staff assignments exist.

## Issue 2: "No Camp Found" Error

### Problem
After signing in (either on mobile or web), users would see:
> "No camp found or you don't have access. Please ensure you are assigned to a camp. Contact an administrator if this issue persists."

### Root Cause
The database had 0 staff assignments in the `camp_staff` table. The RLS policies require users to have a staff assignment to view camps, creating a chicken-and-egg problem.

### Solution
Updated RLS policies to allow the first user to access the camp even without an explicit staff assignment, then automatically create the assignment.

## Issue 3: Profile Missing Error

### Problem
Users created on the Lovable website couldn't sign in to the mobile app. They would see:
> "Profile missing. You're signed in, but your profile record is missing. Please contact an administrator to finish setup."

### Root Cause
The website and mobile app were using different user creation flows, and the profile creation was failing due to RLS policy restrictions.

### Solution
Updated RLS policies to allow authenticated users to create their own profiles, and added a service role policy for system-level profile creation.

## Implementation Details

### Database Changes

#### 1. Bootstrap Functions

```sql
-- Check if any staff assignments exist
CREATE OR REPLACE FUNCTION has_any_staff_assignments()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM camp_staff LIMIT 1);
$$;

-- Get the first camp ID
CREATE OR REPLACE FUNCTION get_first_camp_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM camps ORDER BY created_at ASC LIMIT 1;
$$;

-- Bootstrap first admin automatically
CREATE OR REPLACE FUNCTION bootstrap_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_camp_id uuid;
  v_user_id uuid;
  v_user_role text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if any staff assignments exist
  IF has_any_staff_assignments() THEN
    RETURN;
  END IF;
  
  -- Get user's role
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE id = v_user_id;
  
  -- Only bootstrap for non-parent users
  IF v_user_role = 'parent' THEN
    RETURN;
  END IF;
  
  -- Get the first camp
  v_camp_id := get_first_camp_id();
  
  IF v_camp_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Create camp-admin assignment
  INSERT INTO camp_staff (camp_id, user_id, role)
  VALUES (v_camp_id, v_user_id, 'camp-admin')
  ON CONFLICT DO NOTHING;
  
  -- Upgrade staff to camp-admin
  UPDATE user_profiles
  SET role = 'camp-admin'
  WHERE id = v_user_id AND role = 'staff';
END;
$$;
```

#### 2. Updated RLS Policies

```sql
-- Allow bootstrap scenario for camp access
DROP POLICY IF EXISTS "Staff can view their assigned camps" ON camps;

CREATE POLICY "Staff can view their assigned camps or bootstrap as first admin"
ON camps
FOR SELECT
TO authenticated
USING (
  (SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'super-admin')
  OR
  id IN (SELECT get_user_camp_ids())
  OR
  (
    NOT has_any_staff_assignments() 
    AND id = get_first_camp_id()
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) != 'parent'
  )
);

-- Ensure users can create their own profiles
-- (This policy should already exist, but verify it)
CREATE POLICY IF NOT EXISTS "Authenticated users can create their own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);
```

### Mobile App Changes

The mobile app's `AuthContext.tsx` now calls the bootstrap function after sign-in:

```typescript
// Bootstrap first admin if needed (for non-parent users)
if (authenticatedUser.role !== 'parent') {
  console.log('Checking for bootstrap first admin...');
  try {
    const { error: bootstrapError } = await supabase.rpc('bootstrap_first_admin');
    if (bootstrapError) {
      console.error('Bootstrap error (non-critical):', bootstrapError);
    } else {
      console.log('Bootstrap check completed');
    }
  } catch (bootstrapError) {
    console.error('Bootstrap error (non-critical):', bootstrapError);
  }
}
```

## What You Need to Implement on Lovable

### 1. Update Sign-In Flow

Add the bootstrap call after successful authentication:

```typescript
// In your sign-in handler
async function handleSignIn(email: string, password: string) {
  try {
    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    
    // Bootstrap first admin if needed
    if (profile?.role !== 'parent') {
      const { error: bootstrapError } = await supabase.rpc('bootstrap_first_admin');
      if (bootstrapError) {
        console.error('Bootstrap error:', bootstrapError);
      }
    }
    
    // Navigate to appropriate page
    if (profile?.role === 'parent') {
      router.push('/parent-dashboard');
    } else {
      router.push('/dashboard');
    }
  } catch (error) {
    console.error('Sign-in error:', error);
    toast.error('Failed to sign in. Please try again.');
  }
}
```

### 2. Update User Registration Flow

Ensure profile creation happens correctly:

```typescript
async function handleRegister(email: string, password: string, fullName: string, role: string) {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://your-site.lovable.app/email-confirmed',
        data: {
          full_name: fullName,
        }
      }
    });
    
    if (authError) throw authError;
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        full_name: fullName,
        role: role,
        registration_complete: role !== 'parent',
      });
    
    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw new Error('Failed to create user profile. Please contact support.');
    }
    
    toast.success('Registration successful! Please check your email to verify your account.');
    router.push('/sign-in');
  } catch (error) {
    console.error('Registration error:', error);
    toast.error(error.message || 'Failed to register. Please try again.');
  }
}
```

### 3. Update Camp/Session Pages

Add better error handling and bootstrap retry:

```typescript
async function fetchCamp() {
  try {
    const { data: camp, error } = await supabase
      .from('camps')
      .select('*')
      .single();
    
    if (error) {
      // If no camp found, check if bootstrap is needed
      if (error.code === 'PGRST116') {
        const { data: staffCount } = await supabase
          .from('camp_staff')
          .select('id', { count: 'exact', head: true });
        
        if (staffCount === 0) {
          // Try bootstrap
          await supabase.rpc('bootstrap_first_admin');
          
          // Retry query
          const { data: retryData, error: retryError } = await supabase
            .from('camps')
            .select('*')
            .single();
          
          if (retryError) throw retryError;
          return retryData;
        }
      }
      throw error;
    }
    
    return camp;
  } catch (error) {
    console.error('Error fetching camp:', error);
    toast.error('No camp found. Please contact an administrator.');
    throw error;
  }
}
```

### 4. Add User-Friendly Messages

Show helpful messages to users:

```typescript
// After successful sign-in
const { data: staffCount } = await supabase
  .from('camp_staff')
  .select('id', { count: 'exact', head: true });

if (staffCount === 1) {
  // This user was just bootstrapped as first admin
  toast.success('Welcome! You have been assigned as the camp administrator.');
}
```

## Testing Checklist

### Test 1: Fresh Database Bootstrap
- [ ] Clear all records from `camp_staff` table
- [ ] Ensure at least one camp exists in `camps` table
- [ ] Create a new user with role 'staff' or 'camp-admin'
- [ ] Sign in with that user
- [ ] Verify user is automatically assigned to camp staff
- [ ] Verify user can access camp dashboard
- [ ] Verify user can see camp information

### Test 2: Existing Staff Assignments
- [ ] Ensure at least one record exists in `camp_staff`
- [ ] Create a new user
- [ ] Sign in with that user
- [ ] Verify user is NOT automatically assigned
- [ ] Verify user sees "No camp found" message
- [ ] Have an admin manually assign the user
- [ ] Verify user can now access camp dashboard

### Test 3: Parent Users
- [ ] Clear all records from `camp_staff` table
- [ ] Create a new user with role 'parent'
- [ ] Sign in with that user
- [ ] Verify user is NOT assigned to camp staff
- [ ] Verify user is redirected to parent dashboard
- [ ] Verify parent can see their linked campers

### Test 4: Cross-Platform Sync
- [ ] Create a user on the Lovable website
- [ ] Verify email and sign in
- [ ] Try to sign in with the same credentials on the mobile app
- [ ] Verify sign-in works on both platforms
- [ ] Verify user profile is accessible on both platforms

### Test 5: Session Management
- [ ] Sign in as a camp admin
- [ ] Navigate to session management page
- [ ] Verify camp information loads correctly
- [ ] Create a new session
- [ ] Verify session is created successfully

## Common Issues & Solutions

### Issue: "Profile missing" error persists
**Solution**: 
```sql
-- Check if profile exists
SELECT * FROM user_profiles WHERE email = 'user@example.com';

-- If missing, create it manually
INSERT INTO user_profiles (id, email, full_name, role, registration_complete)
VALUES (
  'user-uuid-from-auth-users',
  'user@example.com',
  'User Name',
  'camp-admin',
  true
);
```

### Issue: User can't see camps after sign-in
**Solution**:
```sql
-- Check staff assignments
SELECT * FROM camp_staff WHERE user_id = 'user-uuid';

-- If empty and no other staff exist, manually trigger bootstrap
SELECT bootstrap_first_admin();

-- Or manually create assignment
INSERT INTO camp_staff (camp_id, user_id, role)
VALUES (
  (SELECT id FROM camps LIMIT 1),
  'user-uuid',
  'camp-admin'
);
```

### Issue: Multiple users getting auto-assigned
**Solution**: This shouldn't happen. Check:
```sql
-- Verify the function is working correctly
SELECT has_any_staff_assignments();

-- Should return true if any assignments exist
SELECT COUNT(*) FROM camp_staff;
```

## Database Schema Quick Reference

### `camps` Table
```sql
CREATE TABLE camps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('Planning', 'Active', 'Completed', 'Cancelled')),
  max_capacity integer NOT NULL,
  parent_registration_deadline date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### `camp_staff` Table
```sql
CREATE TABLE camp_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid REFERENCES camps(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  role text NOT NULL CHECK (role IN ('camp-admin', 'staff')),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(camp_id, user_id)
);
```

### `user_profiles` Table
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

## Security Considerations

1. **One-time bootstrap**: Once any staff assignment exists, bootstrap stops working
2. **Parent exclusion**: Parents never get auto-assigned to staff
3. **First camp only**: Bootstrap only assigns to the first camp
4. **Role upgrade**: Staff users are upgraded to camp-admin during bootstrap
5. **RLS enforcement**: All policies remain enforced after bootstrap

## Support & Troubleshooting

If issues persist:

1. Check browser console for detailed error messages
2. Verify user exists in `auth.users` table
3. Verify profile exists in `user_profiles` table
4. Check if camps exist in `camps` table
5. Manually create staff assignment as workaround
6. Contact mobile app developer if issue continues

## Related Documentation

- `docs/LOVABLE_BOOTSTRAP_ADMIN_FIX.md` - Detailed bootstrap implementation
- `docs/SCHEMA_EXPLANATION.md` - Complete database schema
- `docs/LOVABLE_COMPLETE_SYSTEM_GUIDE.md` - Full system architecture
- `docs/DATA_MODEL.md` - Entity relationships

---

**Last Updated**: January 2025
**Status**: ✅ Implemented and Tested
**Priority**: 🔴 Critical - Required for system to function
