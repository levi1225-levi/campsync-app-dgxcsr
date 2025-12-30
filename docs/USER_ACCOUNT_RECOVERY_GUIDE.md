
# CampSync User Account Recovery Guide

## If You're Seeing "Account Setup Incomplete" Error

This error means your account was created in Supabase Auth and your email was verified, but the user profile wasn't created properly. This has been fixed in the latest version, but existing affected accounts need manual recovery.

## For Users

### What Happened?
1. You registered for CampSync
2. You verified your email successfully
3. When you try to sign in, you get "Account setup incomplete" error
4. This is because your user profile wasn't created during registration (due to a bug that's now fixed)

### What To Do
Contact your camp administrator or CampSync support with:
- Your email address
- The platform you registered on (mobile app or website)
- Screenshot of the error message

Your account can be recovered by creating the missing profile in the database.

## For Administrators

### How to Fix Affected Accounts

#### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to Supabase Dashboard
2. Go to Table Editor → `user_profiles`
3. Click "Insert" → "Insert row"
4. Fill in the following fields:
   - `id`: Copy the user's ID from `auth.users` table
   - `email`: User's email address
   - `full_name`: User's full name
   - `role`: Choose appropriate role (super-admin, camp-admin, staff, or parent)
   - `registration_complete`: Set to `true` (unless it's a parent who hasn't completed setup)
5. Click "Save"

#### Option 2: Using SQL Query

Run this query in Supabase SQL Editor:

```sql
-- First, find the user's ID from auth.users
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'user@example.com';

-- Then create the profile (replace values as needed)
INSERT INTO user_profiles (id, email, full_name, role, registration_complete)
VALUES (
  'user-uuid-from-above-query',
  'user@example.com',
  'User Full Name',
  'staff', -- Change to: super-admin, camp-admin, staff, or parent
  true -- Set to false if parent hasn't completed registration
);
```

#### Option 3: Bulk Fix for Multiple Users

If you have multiple users affected, use this query to find them all:

```sql
-- Find all users without profiles
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.email_confirmed_at IS NOT NULL
  AND p.id IS NULL
ORDER BY u.created_at DESC;
```

Then create profiles for each one using the INSERT query above.

### Verification

After creating the profile, verify it worked:

```sql
SELECT * FROM user_profiles WHERE email = 'user@example.com';
```

The user should now be able to sign in successfully.

## Prevention

This issue has been fixed in the latest version of CampSync. The fixes include:

1. **Improved RLS Policies**: Profiles can now be created properly during registration
2. **Retry Logic**: Registration attempts profile creation up to 3 times
3. **Better Error Messages**: Users get clear instructions if profile creation fails
4. **Profile Validation**: Sign-in checks for missing profiles and provides helpful error messages

### For New Registrations

All new user registrations should work correctly. If a user reports this error after the fix:

1. Check if their profile exists in `user_profiles` table
2. If missing, use the recovery steps above
3. Report the issue to development team (this shouldn't happen anymore)

## Common Questions

### Q: Why did this happen?
A: The original RLS (Row Level Security) policies on the `user_profiles` table were too restrictive and prevented profile creation during registration in some cases.

### Q: Will this happen again?
A: No, the RLS policies have been fixed and retry logic has been added to prevent this issue.

### Q: Can users fix this themselves?
A: No, this requires database access. Users need to contact an administrator.

### Q: What if the user's email isn't verified?
A: They need to verify their email first. Check `auth.users` table for `email_confirmed_at` - if it's NULL, they haven't verified yet.

### Q: What role should I assign?
A: 
- `super-admin`: Full system access (usually just you)
- `camp-admin`: Camp management access
- `staff`: Basic staff access (check-in, view campers, etc.)
- `parent`: Parent portal access (view their own campers only)

### Q: What about parent accounts?
A: Parents need additional setup:
- Set `registration_complete` to `false` initially
- They need to complete parent registration form
- They need to be linked to their campers in `parent_camper_links` table

## Support

If you need help recovering accounts or have questions:

1. Check the Supabase logs for errors
2. Verify the user exists in `auth.users` with confirmed email
3. Check if profile exists in `user_profiles`
4. Use the recovery steps above
5. Contact CampSync development team if issues persist

## Technical Details

### Database Schema

```sql
-- auth.users (Supabase managed)
id uuid PRIMARY KEY
email text
email_confirmed_at timestamptz
created_at timestamptz

-- user_profiles (custom table)
id uuid PRIMARY KEY REFERENCES auth.users(id)
email text NOT NULL
full_name text NOT NULL
phone text
role text NOT NULL CHECK (role IN ('super-admin', 'camp-admin', 'staff', 'parent'))
registration_complete boolean DEFAULT false
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

### RLS Policies (Fixed)

```sql
-- Allow authenticated users to create their own profile
CREATE POLICY "Authenticated users can create their own profile"
ON user_profiles FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON user_profiles FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON user_profiles FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = id);

-- Super admin policies
CREATE POLICY "Super admins can view all profiles"
ON user_profiles FOR SELECT TO authenticated
USING ((SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super-admin');

CREATE POLICY "Super admins can update all profiles"
ON user_profiles FOR UPDATE TO authenticated
USING ((SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super-admin');

CREATE POLICY "Super admins can insert profiles"
ON user_profiles FOR INSERT TO authenticated
WITH CHECK ((SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super-admin');
```

## Changelog

- **2024-12-30**: Fixed RLS policies and added retry logic
- **2024-12-30**: Created recovery guide for affected users
- **2024-12-30**: Updated error messages to be more helpful
