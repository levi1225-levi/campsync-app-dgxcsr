
# CampSync - Comprehensive System Documentation for Lovable.dev

## Project Overview

CampSync is a secure, offline-capable digital platform designed to manage and streamline operations for a single summer camp. It centralizes staff workflows, camper management, NFC wristband usage, and parent engagement into one cohesive system.

## Supabase Project Details

- **Project ID**: `thdnerywgfynarduqube`
- **Database**: PostgreSQL with Row Level Security (RLS) enabled on all tables
- **Authentication**: Supabase Auth with email/password
- **Storage**: Supabase Storage (for future use with camper photos)

## Database Schema

### Core Tables

#### 1. `user_profiles`
Stores all user account information across all roles.

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('super-admin', 'camp-admin', 'staff', 'parent')),
  registration_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- Users can view/update their own profile
- Super admins can view/update all profiles
- Users can insert their own profile during registration (auth.uid() = id)

#### 2. `authorization_codes`
Manages registration codes that control who can create accounts and with what role.

```sql
CREATE TABLE authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super-admin', 'camp-admin', 'staff', 'parent')),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  linked_camper_ids UUID[] DEFAULT ARRAY[]::uuid[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Features**:
- `linked_camper_ids`: For parent codes, links to specific camper(s)
- `max_uses`: Limits how many times a code can be used
- `used_count`: Tracks usage (incremented atomically via function)

**RLS Policies**:
- Super admins and camp admins can view/create/update codes
- Public can validate codes (for registration)

#### 3. `camps`
Stores camp information (single camp system, but designed for potential multi-camp expansion).

```sql
CREATE TABLE camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Planning', 'Active', 'Completed', 'Cancelled')),
  max_capacity INTEGER NOT NULL,
  parent_registration_deadline DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- Super admins can insert/update/view all camps
- Camp admins and staff can view their assigned camps
- Camp admins can update their assigned camps

#### 4. `sessions`
Manages camp sessions (different groups of campers attending at different times).

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  max_capacity INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- Super admins can insert/update/view all sessions
- Camp admins can insert/update sessions in their camps
- Camp staff can view sessions in their camps

#### 5. `camp_staff`
Links users to camps with their role.

```sql
CREATE TABLE camp_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('camp-admin', 'staff')),
  assigned_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- Super admins can view/insert all assignments
- Camp admins can view/insert staff in their camps
- Staff can view their own assignments

#### 6. `campers`
Stores all camper information.

```sql
CREATE TABLE campers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id),
  session_id UUID REFERENCES sessions(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  registration_status TEXT NOT NULL CHECK (registration_status IN ('pending', 'incomplete', 'complete', 'cancelled')),
  wristband_id TEXT UNIQUE,
  wristband_assigned BOOLEAN DEFAULT false,
  photo_url TEXT,
  check_in_status TEXT DEFAULT 'not-arrived' CHECK (check_in_status IN ('checked-in', 'checked-out', 'not-arrived')),
  last_check_in TIMESTAMPTZ,
  last_check_out TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Fields**:
- `session_id`: Links camper to specific session(s)
- `wristband_id`: NFC wristband identifier
- `check_in_status`: Current check-in state
- `registration_status`: Tracks registration completion

**RLS Policies**:
- Super admins can insert/update/view all campers
- Camp admins can insert/update campers in their camps
- Camp staff can view campers and update check-in status in their camps
- Parents can view their own children

#### 7. `camper_medical_info`
Stores sensitive medical information for campers.

```sql
CREATE TABLE camper_medical_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_id UUID UNIQUE NOT NULL REFERENCES campers(id),
  allergies TEXT[],
  medications TEXT[],
  medical_conditions TEXT[],
  special_care_instructions TEXT,
  dietary_restrictions TEXT[],
  doctor_name TEXT,
  doctor_phone TEXT,
  insurance_provider TEXT,
  insurance_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- Super admins can view all medical info
- Camp staff can view medical info for campers in their camps
- Camp admins can insert/update medical info for campers in their camps
- Parents can view/insert/update medical info for their children

#### 8. `emergency_contacts`
Stores emergency contact information for campers.

```sql
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_id UUID NOT NULL REFERENCES campers(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT NOT NULL,
  priority_order INTEGER NOT NULL CHECK (priority_order IN (1, 2)),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- Super admins can view all emergency contacts
- Camp staff can view emergency contacts for campers in their camps
- Camp admins can insert/update emergency contacts for campers in their camps
- Parents can view/insert/update/delete emergency contacts for their children

#### 9. `parent_guardians`
Stores parent/guardian specific information.

```sql
CREATE TABLE parent_guardians (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  home_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- Users can insert/view/update their own parent profile
- Camp admins can view parents of campers in their camps
- Super admins can view all parent profiles

#### 10. `parent_camper_links`
Links parents to their children (campers).

```sql
CREATE TABLE parent_camper_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parent_guardians(id),
  camper_id UUID NOT NULL REFERENCES campers(id),
  relationship TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- System can insert links (during registration)
- Parents can view their own links
- Camp admins can view/insert links for campers in their camps
- Super admins can view all links

#### 11. `parent_invitations`
Manages parent invitation codes for registration.

```sql
CREATE TABLE parent_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_id UUID NOT NULL REFERENCES campers(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- System can insert/update invitations
- Camp admins can view/insert invitations for campers in their camps
- Super admins can view all invitations

#### 12. `audit_logs`
Tracks all important system actions for security and compliance.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- System can insert audit logs
- Super admins can view all audit logs
- Camp admins can view audit logs for their camps

### Database Functions

#### 1. `validate_authorization_code(code TEXT)`
Validates an authorization code and returns its details.

```sql
CREATE OR REPLACE FUNCTION validate_authorization_code(code_input TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  code_id UUID,
  role TEXT,
  linked_camper_ids UUID[],
  error TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN ac.id IS NULL THEN false
      WHEN NOT ac.is_active THEN false
      WHEN ac.expires_at IS NOT NULL AND ac.expires_at < now() THEN false
      WHEN ac.max_uses IS NOT NULL AND ac.used_count >= ac.max_uses THEN false
      ELSE true
    END as valid,
    ac.id as code_id,
    ac.role,
    ac.linked_camper_ids,
    CASE 
      WHEN ac.id IS NULL THEN 'Code not found'
      WHEN NOT ac.is_active THEN 'Code is inactive'
      WHEN ac.expires_at IS NOT NULL AND ac.expires_at < now() THEN 'Code has expired'
      WHEN ac.max_uses IS NOT NULL AND ac.used_count >= ac.max_uses THEN 'Code has reached maximum uses'
      ELSE NULL
    END as error
  FROM authorization_codes ac
  WHERE ac.code = code_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. `increment_code_usage(code_id UUID)`
Atomically increments the usage count of an authorization code.

```sql
CREATE OR REPLACE FUNCTION increment_code_usage(code_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE authorization_codes
  SET used_count = used_count + 1
  WHERE id = code_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 3. `get_user_camp_ids()`
Returns camp IDs that the current user has access to.

```sql
CREATE OR REPLACE FUNCTION get_user_camp_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT camp_id
  FROM camp_staff
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 4. `get_admin_camp_ids()`
Returns camp IDs where the current user is a camp admin.

```sql
CREATE OR REPLACE FUNCTION get_admin_camp_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT camp_id
  FROM camp_staff
  WHERE user_id = auth.uid() AND role = 'camp-admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## User Roles & Permissions

### 1. Super Admin
- **Full system access**
- Can manage all users, camps, sessions, campers
- Can create authorization codes
- Can view all audit logs
- Can access user management interface

### 2. Camp Admin
- Can manage their assigned camp(s)
- Can create/manage campers in their camps
- Can create authorization codes
- Can manage staff assignments
- Can view/manage sessions in their camps
- Can view medical info and emergency contacts

### 3. Staff
- Can view campers in their assigned camps
- Can update check-in/check-out status
- Can view medical info and emergency contacts
- Can scan NFC wristbands

### 4. Parent
- Can view their own children's information
- Can update medical info and emergency contacts
- Can complete registration forms
- Limited to parent dashboard view

## Authentication Flow

### Registration Process

1. User enters authorization code
2. System validates code using `validate_authorization_code()` function
3. If valid, user proceeds to enter personal details
4. System creates auth user via Supabase Auth
5. System creates user profile with role from authorization code
6. For parents: System creates parent_guardian record and links to campers
7. System increments code usage via `increment_code_usage()` function
8. User receives email verification link
9. User must verify email before signing in

### Sign-In Process

1. User enters email and password
2. Supabase Auth validates credentials
3. System checks if email is verified
4. System fetches user profile from `user_profiles`
5. System redirects based on role:
   - Parents → Parent Dashboard (or registration if incomplete)
   - Staff/Admins → Home Dashboard

## Session Management

### Current Implementation
- **Active Sessions**: Managed by camp admins
- **Session Assignment**: Campers are assigned to specific sessions via `session_id`
- **Session Filtering**: App should filter campers by active session
- **Bulk Import**: CSV import should include session assignment

### Session Fields
- `name`: Session name (e.g., "Week 1", "Session A")
- `start_date`: Session start date
- `end_date`: Session end date
- `max_capacity`: Maximum campers for this session
- `camp_id`: Parent camp reference

## NFC Wristband System

### Implementation
- Each camper has a unique `wristband_id`
- Staff can scan wristbands using NFC scanner
- Scanning updates `check_in_status`, `last_check_in`, `last_check_out`
- Wristband IDs are stored as text (can be any format)
- `wristband_assigned` boolean tracks if wristband is active

### Check-In States
- `not-arrived`: Camper hasn't checked in yet
- `checked-in`: Camper is currently at camp
- `checked-out`: Camper has left for the day

## Bulk Import System

### CSV Format for Campers
```csv
first_name,last_name,date_of_birth,session_name,parent_email,parent_name,parent_phone,allergies,medications,dietary_restrictions
John,Doe,2010-05-15,Week 1,parent@example.com,Jane Doe,555-1234,Peanuts,None,Vegetarian
```

### Import Process
1. Parse CSV file
2. Validate all required fields
3. Look up or create session by name
4. Create camper records
5. Create medical info records
6. Create parent invitation codes
7. Send invitation emails to parents

## API Endpoints (Lovable Website)

### Recommended Edge Functions

#### 1. `bulk-import-campers`
- **Method**: POST
- **Auth**: Requires super-admin or camp-admin role
- **Body**: CSV file data
- **Returns**: Import summary (success count, errors)

#### 2. `generate-authorization-code`
- **Method**: POST
- **Auth**: Requires super-admin or camp-admin role
- **Body**: `{ role, max_uses, expires_at, linked_camper_ids }`
- **Returns**: Generated code

#### 3. `send-parent-invitation`
- **Method**: POST
- **Auth**: Requires super-admin or camp-admin role
- **Body**: `{ camper_id, parent_email, parent_name, relationship }`
- **Returns**: Invitation token

#### 4. `get-camp-stats`
- **Method**: GET
- **Auth**: Requires authentication
- **Returns**: Camp statistics (total campers, checked in, sessions, etc.)

## Common Queries

### Get all campers for a camp
```sql
SELECT c.*, s.name as session_name
FROM campers c
LEFT JOIN sessions s ON c.session_id = s.id
WHERE c.camp_id = $1
ORDER BY c.last_name, c.first_name;
```

### Get campers with medical info
```sql
SELECT c.*, m.*
FROM campers c
LEFT JOIN camper_medical_info m ON c.id = m.camper_id
WHERE c.camp_id = $1;
```

### Get parent's children
```sql
SELECT c.*, s.name as session_name
FROM campers c
LEFT JOIN sessions s ON c.session_id = s.id
INNER JOIN parent_camper_links pcl ON c.id = pcl.camper_id
WHERE pcl.parent_id = auth.uid();
```

### Get checked-in campers
```sql
SELECT c.*, s.name as session_name
FROM campers c
LEFT JOIN sessions s ON c.session_id = s.id
WHERE c.camp_id = $1 
  AND c.check_in_status = 'checked-in'
  AND c.last_check_in::date = CURRENT_DATE;
```

## Important Notes

1. **RLS is Critical**: All tables have RLS enabled. Never disable it.
2. **Atomic Operations**: Use database functions for operations like incrementing counters.
3. **Email Verification**: Required before users can sign in.
4. **Session Management**: Always filter by active session when displaying campers.
5. **Parent Linking**: Can be done via authorization code OR email matching.
6. **Audit Logging**: Important actions should be logged to `audit_logs`.
7. **Offline Support**: Mobile app caches data for offline use.

## Testing Credentials

### Authorization Codes
- `SUPER_ADMIN_2024` - Super Admin role
- `DEMO_PARENT_2024` - Parent role

### Test Accounts
Create test accounts using the authorization codes above.

## Future Enhancements

1. **Photo Upload**: Implement camper photo storage using Supabase Storage
2. **Real-time Updates**: Use Supabase Realtime for live check-in updates
3. **Push Notifications**: Notify parents of check-in/check-out events
4. **Reports**: Generate attendance reports, medical summaries, etc.
5. **Multi-Camp Support**: Expand to support multiple camps per organization

## Support & Maintenance

- **Database Migrations**: Use Supabase migrations for schema changes
- **Backup**: Supabase handles automatic backups
- **Monitoring**: Check Supabase dashboard for errors and performance
- **Security**: Regularly review RLS policies and audit logs

---

**Last Updated**: 2024
**Version**: 1.0.0
