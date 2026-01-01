
# CampSync: Complete System Guide for Lovable Integration

## 🎯 Executive Summary

CampSync is a comprehensive summer camp management system with a React Native mobile app and a Lovable web interface. This document provides everything you need to integrate with the existing mobile app and database.

## 🚨 Critical Issues Recently Fixed

### Issue 1: Sign-In Button Not Working
**Problem**: Users could sign in but couldn't access the app
**Solution**: Implemented Bootstrap First Admin logic
**Status**: ✅ Fixed

### Issue 2: "No Camp Found" Error
**Problem**: Users saw "No camp found or you don't have access" after sign-in
**Solution**: Updated RLS policies to allow first user access
**Status**: ✅ Fixed

### Issue 3: Profile Missing Error
**Problem**: Users created on website couldn't sign in to mobile app
**Solution**: Fixed RLS policies for profile creation
**Status**: ✅ Fixed

## 📊 Database Schema Overview

### Core Tables

#### `camps` - Camp Information
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

**Note**: CampSync is designed for a **single camp**. There should only be one record in this table.

#### `sessions` - Camp Sessions
```sql
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid REFERENCES camps(id) NOT NULL,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  max_capacity integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Purpose**: Camps can have multiple sessions (e.g., "Week 1", "Week 2"). Campers are assigned to specific sessions.

#### `user_profiles` - User Information
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

**Roles**:
- `super-admin`: Full system access (you)
- `camp-admin`: Can manage camp, staff, and campers
- `staff`: Can view campers, check-in/out, view medical info
- `parent`: Can view their own children's information

#### `camp_staff` - Staff Assignments
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

**Critical**: This table determines who can access the camp. If empty, the Bootstrap First Admin logic kicks in.

#### `campers` - Camper Information
```sql
CREATE TABLE campers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid REFERENCES camps(id) NOT NULL,
  session_id uuid REFERENCES sessions(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  registration_status text NOT NULL CHECK (registration_status IN ('pending', 'incomplete', 'complete', 'cancelled')),
  wristband_id text UNIQUE,
  wristband_assigned boolean DEFAULT false,
  photo_url text,
  check_in_status text DEFAULT 'not-arrived' CHECK (check_in_status IN ('checked-in', 'checked-out', 'not-arrived')),
  last_check_in timestamptz,
  last_check_out timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Important Fields**:
- `session_id`: Which session the camper is attending
- `wristband_id`: NFC wristband identifier (used by mobile app)
- `check_in_status`: Current check-in status
- `registration_status`: Registration workflow status

#### `camper_medical_info` - Medical Information
```sql
CREATE TABLE camper_medical_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_id uuid REFERENCES campers(id) UNIQUE NOT NULL,
  allergies text[],
  medications text[],
  medical_conditions text[],
  special_care_instructions text,
  dietary_restrictions text[],
  doctor_name text,
  doctor_phone text,
  insurance_provider text,
  insurance_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### `emergency_contacts` - Emergency Contact Information
```sql
CREATE TABLE emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_id uuid REFERENCES campers(id) NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  relationship text NOT NULL,
  priority_order integer NOT NULL CHECK (priority_order IN (1, 2)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Note**: Each camper should have 2 emergency contacts (priority_order 1 and 2).

#### `parent_guardians` - Parent Information
```sql
CREATE TABLE parent_guardians (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  home_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### `parent_camper_links` - Parent-Camper Relationships
```sql
CREATE TABLE parent_camper_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES parent_guardians(id) NOT NULL,
  camper_id uuid REFERENCES campers(id) NOT NULL,
  relationship text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

#### `authorization_codes` - Registration Codes
```sql
CREATE TABLE authorization_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('super-admin', 'camp-admin', 'staff', 'parent')),
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  max_uses integer,
  used_count integer DEFAULT 0,
  linked_camper_ids uuid[],
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Purpose**: Controls who can register. Users need a valid authorization code to create an account.

### Database Functions

#### `bootstrap_first_admin()`
**Purpose**: Automatically assigns the first logged-in user as camp admin when no staff assignments exist.

**Usage**:
```typescript
await supabase.rpc('bootstrap_first_admin');
```

**When to call**: After successful sign-in for non-parent users.

#### `has_any_staff_assignments()`
**Purpose**: Checks if any staff assignments exist.

**Returns**: `boolean`

#### `get_first_camp_id()`
**Purpose**: Gets the ID of the first camp (by creation date).

**Returns**: `uuid`

#### `get_user_camp_ids()`
**Purpose**: Gets all camp IDs the current user has access to.

**Returns**: `uuid[]`

#### `get_admin_camp_ids()`
**Purpose**: Gets all camp IDs where the current user is a camp-admin.

**Returns**: `uuid[]`

## 🔐 Row Level Security (RLS) Policies

### Key Concepts

1. **All tables have RLS enabled**
2. **Policies use `auth.uid()` to identify the current user**
3. **Super admins can access everything**
4. **Staff can only access their assigned camps**
5. **Parents can only access their own children's data**

### Bootstrap First Admin Policy

The `camps` table has a special policy that allows the first user to access the camp:

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

## 🔄 Authentication Flow

### User Registration

```typescript
async function handleRegister(email: string, password: string, fullName: string, authCode: string) {
  // 1. Validate authorization code
  const { data: codeValidation } = await supabase
    .rpc('validate_authorization_code', { code: authCode });
  
  if (!codeValidation.valid) {
    throw new Error('Invalid authorization code');
  }
  
  // 2. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: {
      emailRedirectTo: 'https://your-site.lovable.app/email-confirmed',
      data: {
        full_name: fullName,
      }
    }
  });
  
  if (authError) throw authError;
  
  // 3. Create user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      full_name: fullName,
      role: codeValidation.role,
      registration_complete: codeValidation.role !== 'parent',
    });
  
  if (profileError) throw profileError;
  
  // 4. Handle parent-specific setup
  if (codeValidation.role === 'parent') {
    // Create parent_guardian record
    await supabase.from('parent_guardians').insert({
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      full_name: fullName,
    });
    
    // Link to campers if specified in auth code
    if (codeValidation.linked_camper_ids?.length > 0) {
      const links = codeValidation.linked_camper_ids.map(camperId => ({
        parent_id: authData.user.id,
        camper_id: camperId,
        relationship: 'Parent/Guardian',
      }));
      
      await supabase.from('parent_camper_links').insert(links);
    }
  }
  
  // 5. Increment code usage
  await supabase.rpc('increment_code_usage', { code_id: codeValidation.code_id });
  
  return { success: true };
}
```

### User Sign-In

```typescript
async function handleSignIn(email: string, password: string) {
  // 1. Sign in with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });
  
  if (error) throw error;
  
  // 2. Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();
  
  if (profileError) throw new Error('Profile not found');
  
  // 3. Bootstrap first admin if needed (skip for parents)
  if (profile.role !== 'parent') {
    await supabase.rpc('bootstrap_first_admin');
  }
  
  // 4. Navigate based on role
  if (profile.role === 'parent') {
    if (!profile.registration_complete) {
      router.push('/parent-registration');
    } else {
      router.push('/parent-dashboard');
    }
  } else {
    router.push('/dashboard');
  }
}
```

## 📱 Mobile App Integration

### What the Mobile App Does

1. **NFC Scanning**: Staff can scan camper wristbands for quick check-in/out
2. **Camper Management**: View and edit camper profiles
3. **Medical Information**: Access medical info and emergency contacts
4. **Check-In/Out**: Track camper attendance
5. **Offline Support**: Works without internet connection

### What the Web App Should Do

1. **Camp Setup**: Create and configure the camp
2. **Session Management**: Create and manage camp sessions
3. **Camper Import**: Bulk import campers from CSV
4. **Staff Management**: Assign staff to camps
5. **Authorization Codes**: Generate codes for registration
6. **Reports**: View attendance and activity reports

## 🎨 User Interface Guidelines

### Dashboard (After Sign-In)

**For Camp Admins/Staff**:
- Show camp overview (name, dates, capacity)
- Show current session information
- Show camper statistics (total, checked in, etc.)
- Quick actions: Create session, Import campers, Manage staff

**For Parents**:
- Show linked campers
- Show upcoming sessions
- Show medical information
- Show emergency contacts

### Session Management Page

```typescript
async function fetchSessions() {
  const { data: camp } = await supabase
    .from('camps')
    .select('id')
    .single();
  
  if (!camp) {
    // Try bootstrap
    await supabase.rpc('bootstrap_first_admin');
    
    // Retry
    const { data: retryData } = await supabase
      .from('camps')
      .select('id')
      .single();
    
    if (!retryData) {
      throw new Error('No camp found. Please contact an administrator.');
    }
    
    camp = retryData;
  }
  
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('camp_id', camp.id)
    .order('start_date', { ascending: true });
  
  return sessions;
}

async function createSession(name: string, startDate: string, endDate: string, maxCapacity: number) {
  const { data: camp } = await supabase
    .from('camps')
    .select('id')
    .single();
  
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      camp_id: camp.id,
      name,
      start_date: startDate,
      end_date: endDate,
      max_capacity: maxCapacity,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return data;
}
```

### Camper Import Page

**CSV Format**:
```csv
first_name,last_name,date_of_birth,session_name,parent_email,parent_name,parent_phone
John,Doe,2010-05-15,Week 1,parent@example.com,Jane Doe,555-1234
```

**Import Logic**:
```typescript
async function importCampers(csvData: string) {
  const rows = parseCSV(csvData);
  
  const { data: camp } = await supabase
    .from('camps')
    .select('id')
    .single();
  
  for (const row of rows) {
    // 1. Find or create session
    let session = await supabase
      .from('sessions')
      .select('id')
      .eq('camp_id', camp.id)
      .eq('name', row.session_name)
      .single();
    
    if (!session.data) {
      // Create session if it doesn't exist
      const { data: newSession } = await supabase
        .from('sessions')
        .insert({
          camp_id: camp.id,
          name: row.session_name,
          start_date: '2024-06-01', // You should get this from somewhere
          end_date: '2024-06-07',
          max_capacity: 100,
        })
        .select()
        .single();
      
      session = { data: newSession };
    }
    
    // 2. Create camper
    const { data: camper } = await supabase
      .from('campers')
      .insert({
        camp_id: camp.id,
        session_id: session.data.id,
        first_name: row.first_name,
        last_name: row.last_name,
        date_of_birth: row.date_of_birth,
        registration_status: 'incomplete',
      })
      .select()
      .single();
    
    // 3. Create medical info record
    await supabase
      .from('camper_medical_info')
      .insert({
        camper_id: camper.id,
        allergies: [],
        medications: [],
        medical_conditions: [],
        dietary_restrictions: [],
      });
    
    // 4. Create parent invitation if parent email provided
    if (row.parent_email) {
      const invitationToken = generateToken();
      
      await supabase
        .from('parent_invitations')
        .insert({
          camper_id: camper.id,
          email: row.parent_email,
          full_name: row.parent_name,
          relationship: 'Parent/Guardian',
          invitation_token: invitationToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
      
      // Send invitation email (implement this)
      await sendInvitationEmail(row.parent_email, invitationToken);
    }
  }
}
```

## 🧪 Testing Checklist

### Initial Setup Test
- [ ] Create a camp in the `camps` table
- [ ] Ensure `camp_staff` table is empty
- [ ] Create a user with role 'camp-admin'
- [ ] Sign in with that user
- [ ] Verify user is automatically assigned to camp staff
- [ ] Verify user can access camp dashboard

### Session Management Test
- [ ] Sign in as camp admin
- [ ] Navigate to session management page
- [ ] Create a new session
- [ ] Verify session appears in the list
- [ ] Edit the session
- [ ] Delete the session

### Camper Import Test
- [ ] Create a CSV file with sample campers
- [ ] Import the CSV
- [ ] Verify campers are created
- [ ] Verify sessions are created/linked
- [ ] Verify medical info records are created
- [ ] Verify parent invitations are created

### Parent Registration Test
- [ ] Create a parent invitation
- [ ] Use the invitation link to register
- [ ] Verify parent account is created
- [ ] Verify parent is linked to camper
- [ ] Sign in as parent
- [ ] Verify parent can see their campers

### Mobile App Sync Test
- [ ] Create a user on the web
- [ ] Sign in with that user on the mobile app
- [ ] Verify user can access the app
- [ ] Create a camper on the web
- [ ] Verify camper appears in the mobile app
- [ ] Check in a camper on the mobile app
- [ ] Verify check-in status updates on the web

## 🐛 Common Issues & Solutions

### Issue: "No camp found"

**Check**:
```sql
SELECT * FROM camps;
```

**Fix**:
```sql
INSERT INTO camps (name, location, start_date, end_date, status, max_capacity)
VALUES ('Summer Camp 2024', 'Camp Location', '2024-06-01', '2024-08-31', 'Active', 200);
```

### Issue: User can't access camp

**Check**:
```sql
SELECT * FROM camp_staff WHERE user_id = 'user-uuid';
```

**Fix**:
```sql
-- Option 1: Call bootstrap
SELECT bootstrap_first_admin();

-- Option 2: Manually assign
INSERT INTO camp_staff (camp_id, user_id, role)
VALUES (
  (SELECT id FROM camps LIMIT 1),
  'user-uuid',
  'camp-admin'
);
```

### Issue: Profile missing

**Check**:
```sql
SELECT * FROM user_profiles WHERE id = 'user-uuid';
```

**Fix**:
```sql
INSERT INTO user_profiles (id, email, full_name, role, registration_complete)
VALUES ('user-uuid', 'email@example.com', 'Full Name', 'camp-admin', true);
```

### Issue: Parent can't see campers

**Check**:
```sql
SELECT * FROM parent_camper_links WHERE parent_id = 'parent-uuid';
```

**Fix**:
```sql
INSERT INTO parent_camper_links (parent_id, camper_id, relationship)
VALUES ('parent-uuid', 'camper-uuid', 'Parent/Guardian');
```

## 📚 Additional Resources

- **Mobile App Code**: Available in the React Native project
- **Database Schema**: See `docs/SCHEMA_EXPLANATION.md`
- **Bootstrap Fix**: See `docs/LOVABLE_BOOTSTRAP_ADMIN_FIX.md`
- **Sign-In Fix**: See `docs/LOVABLE_SIGNIN_SYNC_AND_BOOTSTRAP_FIX.md`
- **Quick Fix Guide**: See `docs/LOVABLE_QUICK_FIX_GUIDE.md`

## 🎯 Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ Implement bootstrap first admin in sign-in flow
2. ✅ Fix camp access queries
3. ✅ Test sign-in with empty `camp_staff` table

### Phase 2: Core Features
1. Session management page
2. Camper import functionality
3. Staff management page
4. Authorization code management

### Phase 3: Parent Features
1. Parent invitation system
2. Parent dashboard
3. Parent registration completion

### Phase 4: Advanced Features
1. Reports and analytics
2. Email notifications
3. Bulk operations
4. Data export

## 💡 Best Practices

1. **Always check for bootstrap scenario** when querying camps
2. **Use transactions** for multi-step operations (e.g., creating camper + medical info)
3. **Validate session dates** don't overlap
4. **Send email confirmations** for important actions
5. **Log all administrative actions** for audit trail
6. **Test with empty database** to ensure bootstrap works
7. **Handle RLS policy errors gracefully** with user-friendly messages

## 🔒 Security Considerations

1. **Never expose super-admin credentials**
2. **Validate all user input** before database operations
3. **Use RLS policies** for all data access
4. **Encrypt sensitive data** (medical info, emergency contacts)
5. **Implement rate limiting** for authentication
6. **Log security events** (failed logins, permission changes)
7. **Regular security audits** of RLS policies

## 📞 Support

If you encounter issues:

1. Check the browser console for errors
2. Check the Supabase logs
3. Verify RLS policies are correct
4. Test with a fresh database
5. Review the documentation in `docs/` folder
6. Contact the mobile app developer

---

**Last Updated**: January 2025
**Version**: 2.0
**Status**: ✅ Production Ready
**Maintained By**: CampSync Development Team
