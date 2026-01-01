
# Lovable: Bootstrap First Admin & Camp Access Fix

## Problem Summary

Users are experiencing two critical issues:

1. **Sign-in button appears to do nothing** - The sign-in process completes but users can't access the app because they have no camp assignments
2. **"No camp found or you don't have access" error** - After signing in, users see this error because there are 0 staff assignments in the database

## Root Cause

The CampSync database uses Row Level Security (RLS) policies that require users to have a `camp_staff` assignment to view camps. However, when the system is first set up, there are no staff assignments, creating a chicken-and-egg problem:

- Users can't see camps without a staff assignment
- Only camp admins can create staff assignments
- But no one can become a camp admin without an existing camp admin to assign them

## Solution Implemented: Bootstrap First Admin

We've implemented the **"Bootstrap First Admin"** pattern, which automatically assigns the first logged-in user as a camp administrator when no staff assignments exist.

### How It Works

1. **Detection**: When a user signs in, the system checks if any staff assignments exist in the `camp_staff` table
2. **Auto-Assignment**: If no assignments exist AND the user is not a parent, the system automatically:
   - Creates a `camp_staff` record assigning them to the first camp as `camp-admin`
   - Updates their role to `camp-admin` if they were previously `staff`
3. **Normal Operation**: Once at least one staff assignment exists, the system operates normally with standard RLS policies

### Database Changes

#### New Functions

```sql
-- Check if any staff assignments exist
CREATE FUNCTION has_any_staff_assignments() RETURNS boolean

-- Get the first camp ID for bootstrap
CREATE FUNCTION get_first_camp_id() RETURNS uuid

-- Bootstrap the first admin automatically
CREATE FUNCTION bootstrap_first_admin() RETURNS void
```

#### Updated RLS Policy

The camps table now has a policy that allows:
- Super admins to see all camps (unchanged)
- Staff to see their assigned camps (unchanged)
- **NEW**: If no staff assignments exist, non-parent users can see the first camp

```sql
CREATE POLICY "Staff can view their assigned camps or bootstrap as first admin"
ON camps FOR SELECT TO authenticated
USING (
  -- Super admins can see all camps
  (SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'super-admin')
  OR
  -- Staff can see their assigned camps
  id IN (SELECT get_user_camp_ids())
  OR
  -- Bootstrap: If no staff assignments exist, allow access to first camp
  (
    NOT has_any_staff_assignments() 
    AND id = get_first_camp_id()
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) != 'parent'
  )
);
```

### App Changes

The mobile app's `AuthContext.tsx` now calls `bootstrap_first_admin()` after successful sign-in for non-parent users:

```typescript
// Bootstrap first admin if needed (for non-parent users)
if (authenticatedUser.role !== 'parent') {
  const { error: bootstrapError } = await supabase.rpc('bootstrap_first_admin');
  if (bootstrapError) {
    console.error('Bootstrap error (non-critical):', bootstrapError);
  }
}
```

## What You Need to Implement on Lovable

### 1. Call Bootstrap Function After Sign-In

In your sign-in flow, after a user successfully authenticates, call the bootstrap function:

```typescript
// After successful sign-in
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  // Bootstrap first admin if needed (skip for parents)
  if (profile?.role !== 'parent') {
    await supabase.rpc('bootstrap_first_admin');
  }
}
```

### 2. Update Camp Access Queries

When querying camps, the RLS policies will now automatically handle the bootstrap scenario. No changes needed to your queries, but ensure you're handling the case where a user might not have explicit camp assignments yet.

### 3. Show Appropriate UI Messages

Consider showing a message to the first user who logs in:

```typescript
// Check if this is the first admin
const { data: staffCount } = await supabase
  .from('camp_staff')
  .select('id', { count: 'exact', head: true });

if (staffCount === 0 || staffCount === 1) {
  // Show welcome message for first admin
  toast.success('Welcome! You have been assigned as the camp administrator.');
}
```

### 4. Session Management Page

On your session management page, update the error handling to be more helpful:

```typescript
try {
  const { data: camp, error } = await supabase
    .from('camps')
    .select('*')
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - check if bootstrap is needed
      const { data: staffCount } = await supabase
        .from('camp_staff')
        .select('id', { count: 'exact', head: true });
        
      if (staffCount === 0) {
        // Trigger bootstrap
        await supabase.rpc('bootstrap_first_admin');
        // Retry query
        const { data: retryData } = await supabase
          .from('camps')
          .select('*')
          .single();
        return retryData;
      }
    }
    throw error;
  }
  
  return camp;
} catch (error) {
  console.error('Error fetching camp:', error);
  throw error;
}
```

## Testing the Fix

### Test Scenario 1: Fresh Database
1. Ensure `camp_staff` table is empty
2. Ensure at least one camp exists in `camps` table
3. Sign in with a non-parent user
4. User should automatically be assigned as camp-admin
5. User should see the camp dashboard without errors

### Test Scenario 2: Existing Staff
1. Ensure at least one record exists in `camp_staff`
2. Sign in with a new user
3. User should NOT be auto-assigned
4. User should see "No camp found" until manually assigned by an admin

### Test Scenario 3: Parent Users
1. Sign in with a parent user
2. Parent should NOT be auto-assigned to camp staff
3. Parent should see their parent dashboard

## Database Schema Reference

### Key Tables

#### `camps`
- `id` (uuid, primary key)
- `name` (text)
- `description` (text)
- `location` (text)
- `start_date` (date)
- `end_date` (date)
- `status` (text: 'Planning', 'Active', 'Completed', 'Cancelled')
- `max_capacity` (integer)

#### `camp_staff`
- `id` (uuid, primary key)
- `camp_id` (uuid, foreign key to camps)
- `user_id` (uuid, foreign key to auth.users)
- `role` (text: 'camp-admin', 'staff')
- `assigned_at` (timestamptz)

#### `user_profiles`
- `id` (uuid, primary key, foreign key to auth.users)
- `email` (text)
- `full_name` (text)
- `phone` (text, nullable)
- `role` (text: 'super-admin', 'camp-admin', 'staff', 'parent')
- `registration_complete` (boolean)

### Key Functions

```sql
-- Check if any staff assignments exist
SELECT has_any_staff_assignments();

-- Get first camp ID
SELECT get_first_camp_id();

-- Bootstrap first admin (call after sign-in)
SELECT bootstrap_first_admin();

-- Get camps user has access to
SELECT get_user_camp_ids();

-- Get camps user is admin of
SELECT get_admin_camp_ids();
```

## Common Issues & Solutions

### Issue: User still sees "No camp found"
**Solution**: 
1. Check if a camp exists: `SELECT * FROM camps;`
2. Check if bootstrap was called: Look for new record in `camp_staff`
3. Manually create assignment if needed:
```sql
INSERT INTO camp_staff (camp_id, user_id, role)
VALUES (
  (SELECT id FROM camps LIMIT 1),
  'user-uuid-here',
  'camp-admin'
);
```

### Issue: Multiple users getting auto-assigned
**Solution**: This shouldn't happen - the function checks if ANY staff assignments exist. If it does happen, check the `has_any_staff_assignments()` function.

### Issue: Parent users getting assigned to staff
**Solution**: The function explicitly checks for parent role and skips them. Verify the user's role in `user_profiles`.

## Security Considerations

1. **Bootstrap is one-time only**: Once any staff assignment exists, bootstrap stops working
2. **Parents are excluded**: Parent users never get auto-assigned to staff
3. **First camp only**: Bootstrap only assigns to the first camp (by creation date)
4. **Automatic role upgrade**: If a user was registered as 'staff', they're upgraded to 'camp-admin' during bootstrap

## Migration Path

If you already have users in the system but no staff assignments:

```sql
-- Option 1: Manually assign the first admin
INSERT INTO camp_staff (camp_id, user_id, role)
VALUES (
  (SELECT id FROM camps ORDER BY created_at ASC LIMIT 1),
  'your-user-id-here',
  'camp-admin'
);

-- Option 2: Let the next sign-in trigger bootstrap
-- Just have the user sign out and sign back in
```

## Related Documentation

- See `docs/SCHEMA_EXPLANATION.md` for complete database schema
- See `docs/LOVABLE_COMPLETE_SYSTEM_GUIDE.md` for full system architecture
- See `docs/DATA_MODEL.md` for entity relationships

## Support

If users continue to experience issues:

1. Check the browser console for errors
2. Verify the user's role in `user_profiles`
3. Check if camps exist in the database
4. Manually create a staff assignment as a workaround
5. Contact the mobile app developer if the issue persists

---

**Last Updated**: January 2025
**Status**: ✅ Implemented and Tested
