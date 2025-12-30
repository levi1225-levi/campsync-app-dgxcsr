
# CampSync Complete System Guide for Lovable Admin Website

## System Overview

CampSync is a summer camp management system with two interfaces:
1. **Mobile App** (React Native + Expo) - For staff and parents
2. **Lovable Admin Website** - For camp administrators

Both share the same Supabase backend database.

## Supabase Project Details

- **Project ID**: `thdnerywgfynarduqube`
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with email/password
- **Storage**: Supabase Storage (for photos, documents)

## Complete Database Schema

### Authentication Tables

#### `auth.users` (Supabase Managed)
```sql
id uuid PRIMARY KEY
email text UNIQUE
encrypted_password text
email_confirmed_at timestamptz
created_at timestamptz
updated_at timestamptz
raw_app_meta_data jsonb
raw_user_meta_data jsonb
```

### Core Tables

#### `user_profiles`
User profiles for all system users (staff, admins, parents).

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

**RLS Enabled**: Yes
**Key Points**:
- `id` must match `auth.users.id`
- `role` determines access level
- `registration_complete` is false for parents until they complete setup

#### `camps`
The main camp entity (typically only one camp per system).

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

**Important**: There should always be at least one camp. Check for camp existence before creating sessions.

#### `sessions`
Camp sessions (different weeks/periods within the camp).

```sql
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES camps(id),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  max_capacity integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key Points**:
- Must have a valid `camp_id`
- Campers are assigned to specific sessions
- Used for filtering and organizing campers by time period

#### `campers`
Individual camper records.

```sql
CREATE TABLE campers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES camps(id),
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

**Key Points**:
- `session_id` determines which session(s) the camper attends
- `wristband_id` is for NFC wristband scanning (mobile app feature)
- `check_in_status` tracks daily attendance

#### `parent_guardians`
Parent/guardian accounts.

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

**Key Points**:
- `id` must match `auth.users.id` and `user_profiles.id`
- Created when a parent completes registration

#### `parent_camper_links`
Links parents to their campers.

```sql
CREATE TABLE parent_camper_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES parent_guardians(id),
  camper_id uuid NOT NULL REFERENCES campers(id),
  relationship text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Key Points**:
- One parent can have multiple campers
- One camper can have multiple parents/guardians
- `relationship` describes the connection (e.g., "Mother", "Father", "Guardian")

#### `authorization_codes`
Codes used for user registration.

```sql
CREATE TABLE authorization_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('super-admin', 'camp-admin', 'staff', 'parent')),
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  max_uses integer,
  used_count integer DEFAULT 0,
  linked_camper_ids uuid[] DEFAULT ARRAY[]::uuid[],
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key Points**:
- Required for all new user registrations
- `role` determines what role the user gets
- `linked_camper_ids` is used for parent codes to auto-link to specific campers
- `used_count` increments each time code is used
- Code is invalid if `used_count >= max_uses` or `expires_at < now()` or `is_active = false`

#### `camper_medical_info`
Medical information for campers.

```sql
CREATE TABLE camper_medical_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_id uuid UNIQUE NOT NULL REFERENCES campers(id),
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

#### `emergency_contacts`
Emergency contacts for campers.

```sql
CREATE TABLE emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_id uuid NOT NULL REFERENCES campers(id),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  relationship text NOT NULL,
  priority_order integer NOT NULL CHECK (priority_order IN (1, 2)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key Points**:
- Each camper should have 2 emergency contacts
- `priority_order` determines who to call first (1 = primary, 2 = secondary)

#### `camp_staff`
Links staff members to camps.

```sql
CREATE TABLE camp_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES camps(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('camp-admin', 'staff')),
  assigned_at timestamptz DEFAULT now()
);
```

#### `audit_logs`
System audit trail.

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
```

## User Roles & Permissions

### Role Hierarchy

1. **super-admin**
   - Full system access
   - Can manage all users, camps, sessions, campers
   - Can create authorization codes
   - Can view audit logs
   - Typically only 1-2 users

2. **camp-admin**
   - Can manage camp operations
   - Can create/edit campers, sessions
   - Can manage staff assignments
   - Cannot manage other admins

3. **staff**
   - Can view campers
   - Can check in/out campers (mobile app)
   - Can view medical info (when needed)
   - Cannot edit camp settings

4. **parent**
   - Can only view their own linked campers
   - Can update medical info and emergency contacts
   - Can view session information
   - Limited to parent portal

## Authentication Flow

### Registration Flow

```typescript
// 1. Validate authorization code
const { data: codeData } = await supabase
  .from('authorization_codes')
  .select('*')
  .eq('code', authCode.toUpperCase())
  .eq('is_active', true)
  .single();

// Check if code is valid
if (!codeData) throw new Error('Invalid code');
if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
  throw new Error('Code expired');
}
if (codeData.max_uses && codeData.used_count >= codeData.max_uses) {
  throw new Error('Code has reached maximum uses');
}

// 2. Create auth user
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: email.toLowerCase().trim(),
  password,
  options: {
    emailRedirectTo: 'https://your-site.com/email-confirmed',
    data: {
      full_name: fullName,
    }
  }
});

if (authError) throw authError;

// 3. Create user profile (WITH RETRY LOGIC)
let profileCreated = false;
for (let attempt = 1; attempt <= 3; attempt++) {
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      full_name: fullName,
      role: codeData.role,
      registration_complete: codeData.role !== 'parent',
    });

  if (!profileError) {
    profileCreated = true;
    break;
  }
  
  if (attempt < 3) await new Promise(r => setTimeout(r, 500));
}

if (!profileCreated) throw new Error('Profile creation failed');

// 4. If parent, create parent_guardian record and link to campers
if (codeData.role === 'parent') {
  await supabase.from('parent_guardians').insert({
    id: authData.user.id,
    email: email.toLowerCase().trim(),
    full_name: fullName,
    phone: phone || null,
  });

  // Link to campers from authorization code
  if (codeData.linked_camper_ids && codeData.linked_camper_ids.length > 0) {
    const links = codeData.linked_camper_ids.map(camperId => ({
      parent_id: authData.user.id,
      camper_id: camperId,
      relationship: 'Parent/Guardian',
    }));
    
    await supabase.from('parent_camper_links').insert(links);
  }
}

// 5. Increment code usage
await supabase
  .from('authorization_codes')
  .update({ used_count: codeData.used_count + 1 })
  .eq('id', codeData.id);
```

### Sign-In Flow

```typescript
// 1. Authenticate
const { data, error } = await supabase.auth.signInWithPassword({
  email: email.toLowerCase().trim(),
  password,
});

if (error) throw error;

// 2. Fetch profile (WITH RETRY LOGIC)
let profile = null;
for (let attempt = 1; attempt <= 3; attempt++) {
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (!profileError && profileData) {
    profile = profileData;
    break;
  }
  
  if (attempt < 3) await new Promise(r => setTimeout(r, 500));
}

if (!profile) {
  throw new Error('No user profile found. Please contact support.');
}

// 3. Redirect based on role
if (profile.role === 'parent') {
  if (!profile.registration_complete) {
    // Redirect to complete parent registration
    window.location.href = '/parent-registration';
  } else {
    window.location.href = '/parent-dashboard';
  }
} else {
  window.location.href = '/dashboard';
}
```

## Common Queries

### Get all campers for a session
```sql
SELECT 
  c.*,
  s.name as session_name,
  s.start_date,
  s.end_date
FROM campers c
JOIN sessions s ON c.session_id = s.id
WHERE s.id = 'session-uuid'
ORDER BY c.last_name, c.first_name;
```

### Get campers with their parents
```sql
SELECT 
  c.id,
  c.first_name,
  c.last_name,
  c.date_of_birth,
  json_agg(
    json_build_object(
      'name', pg.full_name,
      'email', pg.email,
      'phone', pg.phone,
      'relationship', pcl.relationship
    )
  ) as parents
FROM campers c
LEFT JOIN parent_camper_links pcl ON c.id = pcl.camper_id
LEFT JOIN parent_guardians pg ON pcl.parent_id = pg.id
GROUP BY c.id, c.first_name, c.last_name, c.date_of_birth;
```

### Get campers for a specific parent
```sql
SELECT 
  c.*,
  pcl.relationship
FROM campers c
JOIN parent_camper_links pcl ON c.id = pcl.camper_id
WHERE pcl.parent_id = 'parent-uuid'
ORDER BY c.last_name, c.first_name;
```

### Check for users without profiles
```sql
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE u.email_confirmed_at IS NOT NULL
  AND p.id IS NULL;
```

## Session Management

### Creating Sessions

**IMPORTANT**: Always check that a camp exists before creating sessions.

```typescript
// Get the camp (should only be one)
const { data: camps, error: campError } = await supabase
  .from('camps')
  .select('*')
  .limit(1);

if (!camps || camps.length === 0) {
  throw new Error('No camp found. Please create a camp first.');
}

const camp = camps[0];

// Create session
const { data: session, error: sessionError } = await supabase
  .from('sessions')
  .insert({
    camp_id: camp.id,
    name: sessionName,
    start_date: startDate,
    end_date: endDate,
    max_capacity: maxCapacity,
  })
  .select()
  .single();
```

### Bulk Importing Campers

When importing campers from CSV:

```typescript
// CSV should have columns:
// first_name, last_name, date_of_birth, session_name, parent_email, parent_name, etc.

for (const row of csvData) {
  // 1. Find or create session
  let session = await findSessionByName(row.session_name);
  if (!session) {
    session = await createSession(row.session_name, ...);
  }

  // 2. Create camper
  const camper = await supabase.from('campers').insert({
    camp_id: camp.id,
    session_id: session.id,
    first_name: row.first_name,
    last_name: row.last_name,
    date_of_birth: row.date_of_birth,
    registration_status: 'incomplete',
  }).select().single();

  // 3. Create medical info (if provided)
  if (row.allergies || row.medications) {
    await supabase.from('camper_medical_info').insert({
      camper_id: camper.id,
      allergies: row.allergies?.split(',') || [],
      medications: row.medications?.split(',') || [],
      // ... other medical fields
    });
  }

  // 4. Create emergency contacts
  await supabase.from('emergency_contacts').insert([
    {
      camper_id: camper.id,
      full_name: row.emergency_contact_1_name,
      phone: row.emergency_contact_1_phone,
      relationship: row.emergency_contact_1_relationship,
      priority_order: 1,
    },
    {
      camper_id: camper.id,
      full_name: row.emergency_contact_2_name,
      phone: row.emergency_contact_2_phone,
      relationship: row.emergency_contact_2_relationship,
      priority_order: 2,
    },
  ]);

  // 5. Create authorization code for parent
  const authCode = generateAuthCode(); // e.g., "PARENT-XXXX-XXXX"
  await supabase.from('authorization_codes').insert({
    code: authCode,
    role: 'parent',
    is_active: true,
    max_uses: 1,
    linked_camper_ids: [camper.id],
    created_by: currentUser.id,
  });

  // 6. Send invitation email to parent
  await sendParentInvitation(row.parent_email, authCode, camper);
}
```

## Troubleshooting

### "No camp found" Error
**Cause**: Trying to create a session without a camp existing.
**Fix**: Create a camp first, or check for camp existence before creating sessions.

### "Account setup incomplete" Error
**Cause**: User exists in `auth.users` but not in `user_profiles`.
**Fix**: Manually create the profile or use the recovery tool (see USER_ACCOUNT_RECOVERY_GUIDE.md).

### Sign-in works on one platform but not the other
**Cause**: Profile might be missing or RLS policies blocking access.
**Fix**: Check that profile exists and RLS policies are correct.

### Parent can't see their campers
**Cause**: Missing entries in `parent_camper_links` table.
**Fix**: Create the links manually or regenerate parent authorization code with correct `linked_camper_ids`.

## Best Practices

1. **Always use retry logic** for profile creation (network issues can cause failures)
2. **Always check for camp existence** before creating sessions
3. **Always validate authorization codes** before allowing registration
4. **Always use lowercase, trimmed emails** for consistency
5. **Always check RLS policies** when adding new tables
6. **Always log important operations** for debugging
7. **Always provide clear error messages** to users

## Security Notes

- RLS is enabled on all tables
- Users can only see their own data (except admins)
- Parents can only see their linked campers
- Authorization codes are required for all registrations
- Email verification is required before sign-in
- Passwords are hashed by Supabase Auth

## Support

For issues or questions:
1. Check Supabase logs for errors
2. Verify database schema matches this guide
3. Check RLS policies are correct
4. Review the troubleshooting section
5. Contact CampSync development team

## Version History

- **2024-12-30**: Initial comprehensive guide created
- **2024-12-30**: Fixed RLS policies for user_profiles
- **2024-12-30**: Added retry logic for profile creation
- **2024-12-30**: Fixed session creation "No camp found" error
