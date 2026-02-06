
# CampSync - Complete Platform Documentation

## Executive Summary

CampSync is a secure, offline-capable digital platform designed to manage and streamline operations for a single summer camp. It centralizes staff workflows, camper management, incident reporting, NFC wristband usage, and parent engagement into one cohesive system built for real-world camp environments.

**Core Philosophy:** Speed, safety, and reliability in settings where staff are mobile, connectivity may be unreliable, and accurate camper information is critical.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Core Features](#core-features)
4. [Application Flow](#application-flow)
5. [Database Schema](#database-schema)
6. [Security Architecture](#security-architecture)
7. [NFC Wristband System](#nfc-wristband-system)
8. [Offline Capabilities](#offline-capabilities)
9. [Technical Stack](#technical-stack)
10. [API Endpoints](#api-endpoints)
11. [UI/UX Patterns](#uiux-patterns)
12. [Implementation Guidelines](#implementation-guidelines)

---

## Platform Overview

### Goals

- **Replace paper-based processes** - Eliminate spreadsheets, paper lists, and disconnected tools
- **Fast camper identification** - Instant access to camper data via NFC wristbands
- **Emergency data accessibility** - Medical and emergency information always available to authorized staff
- **Offline reliability** - Core operations work without internet connectivity
- **Privacy & security** - Strict role-based access control and data protection
- **Minimal training** - Intuitive workflows reduce staff onboarding time

### Intended Users

1. **Camp Leadership & Administrators** - Full system access, user management, reporting
2. **On-site Counselors & Staff** - Camper check-in/out, incident logging, medical access
3. **Parents & Guardians** - View their children's information, update medical forms

---

## User Roles & Permissions

### Role Hierarchy

```
Super Admin (System Owner)
    ├── Camp Admin (Camp Director/Manager)
    │   ├── Staff (Counselors, Medical Staff)
    │   └── Parent (Guardians)
```

### Permission Matrix

| Feature | Super Admin | Camp Admin | Staff | Parent |
|---------|-------------|------------|-------|--------|
| User Management | ✅ Full | ✅ Camp Users | ❌ | ❌ |
| Camper CRUD | ✅ | ✅ | ✅ View/Edit | ✅ Own Children Only |
| Check-In/Out | ✅ | ✅ | ✅ | ❌ |
| NFC Operations | ✅ | ✅ | ✅ | ❌ |
| Medical Info Access | ✅ | ✅ | ✅ | ✅ Own Children Only |
| Incident Logging | ✅ | ✅ | ✅ | ❌ View Only |
| Authorization Codes | ✅ | ✅ Manage | ❌ | ❌ |
| Wristband Settings | ✅ | ✅ | ❌ | ❌ |
| Bulk Import | ✅ | ✅ | ❌ | ❌ |

### Authorization Code System

**Purpose:** Secure registration without exposing camp data publicly

**Code Types:**
- `SUPER_ADMIN_2024` - System owner access
- `CAMP_ADMIN_2024` - Camp director/manager access
- `DEMO_PARENT_2024` - Parent/guardian access (links to specific campers)

**Flow:**
1. Admin generates authorization code with role and usage limits
2. User enters code during registration
3. System validates code and assigns role
4. For parents: System links user to their children via email matching
5. Code usage is tracked and can be disabled

---

## Core Features

### 1. Centralized Camp Operations

**What:** Single source of truth for all camp data

**Components:**
- Camper profiles (demographics, medical, emergency contacts)
- Staff profiles (roles, permissions, contact info)
- Session management (dates, capacity, assignments)
- Incident tracking (logs, follow-ups, accountability)
- Parent information (linked to campers)

**Benefits:**
- No data duplication
- Real-time updates across all devices
- Audit trail for all changes
- Simplified reporting

### 2. NFC Wristband Integration

**What:** Each camper wears an NFC wristband for identification

**Capabilities:**
- **Check-in/Check-out** - Tap wristband to log arrival/departure
- **Medical Access** - Instant access to allergies, medications, conditions
- **Incident Logging** - Link incidents to specific campers
- **Identity Verification** - Confirm camper identity before actions

**Security:**
- Wristbands store encrypted data only
- Personal information never stored on chip
- Password-protected write operations
- Data hash verification for integrity

**Recommended Hardware:**
- **Chip Type:** NTAG215 or NTAG216
- **Reason:** Password protection support, 504-888 byte capacity
- **Form Factor:** Silicone wristbands (waterproof, durable)

### 3. Role-Based Access Control (RBAC)

**What:** Every user has a defined role determining data access and actions

**Implementation:**
- Database-level Row Level Security (RLS) policies
- Frontend route protection via `<ProtectedRoute>` component
- API endpoint authentication via Supabase Auth
- Granular permissions per feature

**Example RLS Policy:**
```sql
-- Parents can only view their own children
CREATE POLICY "Parents view own campers"
ON campers FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM parent_camper_links
    WHERE camper_id = campers.id
  )
);
```

### 4. Offline-First Reliability

**What:** Core operations work without internet, sync when connected

**Offline Capabilities:**
- NFC scanning and data reading
- Check-in/check-out logging (queued for sync)
- Incident creation (queued for sync)
- Camper profile viewing (cached data)

**Sync Strategy:**
- Automatic background sync when connectivity restored
- Conflict resolution (last-write-wins with timestamp)
- Visual indicators for sync status
- Manual sync trigger available

**Implementation:**
- Local storage via `@react-native-async-storage/async-storage`
- Supabase real-time subscriptions for live updates
- Optimistic UI updates with rollback on failure

### 5. Parent Engagement Portal

**What:** Secure parent access to manage their children's information

**Features:**
- View camper profiles (read-only demographics)
- Update medical information (allergies, medications, conditions)
- Manage emergency contacts (add, edit, prioritize)
- View incident reports (read-only)
- Update parent profile (contact info)

**Security:**
- Parents linked to campers via email matching during registration
- Cannot view other campers' data
- Cannot perform check-in/out operations
- All changes logged with audit trail

### 6. Incident Tracking & Accountability

**What:** Structured logging of incidents with follow-up tracking

**Incident Types:**
- Medical (injury, illness, medication administration)
- Behavioral (discipline, conflict resolution)
- Safety (near-miss, hazard identification)
- General (lost item, parent communication)

**Data Captured:**
- Timestamp (automatic)
- Camper(s) involved (via NFC or manual selection)
- Incident type and severity
- Description (free text)
- Staff member reporting (automatic from auth)
- Follow-up actions required
- Resolution status

**Workflow:**
1. Staff identifies incident
2. Scans camper wristband or selects from list
3. Fills incident form
4. System logs with timestamp and reporter
5. Admin reviews and assigns follow-up
6. Staff completes follow-up actions
7. Incident marked resolved

### 7. Embedded AI Assistant (Future Feature)

**What:** Natural language query interface for authorized staff

**Capabilities:**
- "Show me all campers with peanut allergies"
- "Who is checked in right now?"
- "List incidents from today"
- "Find campers in Cabin 5"

**Security:**
- Read-only access (no data modification)
- Role-based query restrictions
- Audit log of all queries
- No PII in query logs

**Implementation:**
- OpenAI GPT-5.2 for natural language processing
- Structured query generation from natural language
- Response formatting for mobile display

---

## Application Flow

### User Journey: Staff Member

```
1. Launch App
   ↓
2. Sign In (Email/Password or OAuth)
   ↓
3. Session Validation (Auto-refresh if needed)
   ↓
4. Home Dashboard
   ├── Quick Stats (checked in, total campers, incidents)
   ├── Recent Activity Feed
   └── Quick Actions (Check-In, NFC Scan, Add Camper)
   ↓
5. Primary Workflows:
   
   A. Check-In Flow
      ├── Tap "Check-In" tab
      ├── Scan NFC wristband OR search camper list
      ├── View camper summary (photo, name, age, status)
      ├── Confirm check-in
      ├── System updates status + timestamp
      └── Success confirmation
   
   B. NFC Scanner Flow
      ├── Tap "NFC Scanner" tab
      ├── Hold phone near wristband
      ├── System decrypts wristband data
      ├── Display camper profile (demographics, medical, emergency)
      ├── Quick actions: Check-In/Out, Log Incident, Edit Profile
      └── Return to scanner
   
   C. Camper Management Flow
      ├── Tap "Campers" tab
      ├── View list (search, filter by status)
      ├── Tap camper → Full profile
      ├── View/Edit demographics, medical, emergency contacts
      ├── Save changes (validates + syncs)
      └── Return to list
   
   D. Incident Logging Flow
      ├── From NFC scan or camper profile
      ├── Tap "Log Incident"
      ├── Select incident type + severity
      ├── Enter description
      ├── System auto-fills: timestamp, reporter, camper
      ├── Submit
      └── Confirmation + return
```

### User Journey: Parent

```
1. Launch App
   ↓
2. Sign In (Email/Password or OAuth)
   ↓
3. Parent Dashboard
   ├── My Children (cards with photos, names, ages)
   ├── Check-In Status (visual indicator)
   └── Recent Incidents (if any)
   ↓
4. Primary Workflows:
   
   A. View Child Profile
      ├── Tap child card
      ├── View demographics (read-only)
      ├── View check-in history
      └── View incidents (read-only)
   
   B. Update Medical Info
      ├── From child profile → "Edit Medical"
      ├── Update allergies, medications, conditions
      ├── Update doctor info, insurance
      ├── Save changes
      └── Confirmation
   
   C. Manage Emergency Contacts
      ├── From child profile → "Emergency Contacts"
      ├── Add new contact (name, phone, relationship, priority)
      ├── Edit existing contact
      ├── Reorder priority
      ├── Save changes
      └── Confirmation
```

### User Journey: Admin

```
1. Launch App
   ↓
2. Sign In (Email/Password or OAuth)
   ↓
3. Admin Dashboard (All staff features + admin tools)
   ↓
4. Admin-Specific Workflows:
   
   A. User Management
      ├── Tap "User Management" from profile menu
      ├── View all users (filter by role)
      ├── Actions per user:
      │   ├── Change role
      │   ├── Toggle registration status
      │   ├── Send password reset
      │   └── Delete user
      └── Confirmation + audit log
   
   B. Authorization Code Management
      ├── Tap "Manage Codes" from profile menu
      ├── View existing codes (status, usage, limits)
      ├── Create new code:
      │   ├── Select role
      │   ├── Set usage limit
      │   ├── Set expiration (optional)
      │   └── Generate code
      ├── Disable/Enable codes
      └── View usage history
   
   C. Wristband Settings
      ├── Tap "Wristband Settings" from profile menu
      ├── View current lock code
      ├── Change lock code (requires confirmation)
      ├── Reset to default
      └── Share code with staff (copy/share)
   
   D. Bulk Import Campers
      ├── Tap "Bulk Import" from campers screen
      ├── Select CSV file
      ├── System validates format
      ├── Preview import (shows errors if any)
      ├── Confirm import
      ├── System creates campers + links parents
      └── Summary report (success/failures)
```

---

## Database Schema

### Core Tables

#### `profiles` (User Accounts)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'camp_admin', 'staff', 'parent')),
  registration_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `campers` (Camper Profiles)
```sql
CREATE TABLE campers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES camps(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  registration_status TEXT DEFAULT 'pending',
  wristband_id TEXT UNIQUE,
  check_in_status TEXT DEFAULT 'checked_out',
  last_check_in TIMESTAMPTZ,
  last_check_out TIMESTAMPTZ,
  session_id UUID REFERENCES sessions(id),
  swim_level TEXT,
  cabin_assignment TEXT,
  photo_url TEXT,
  medical_info JSONB,
  wristband_data_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`medical_info` JSONB Structure:**
```json
{
  "allergies": ["Peanuts", "Bee stings"],
  "medications": ["EpiPen", "Albuterol inhaler"],
  "dietary_restrictions": ["Gluten-free", "Vegetarian"],
  "medical_conditions": ["Asthma", "Type 1 Diabetes"],
  "special_care_instructions": "Check blood sugar before meals",
  "doctor_name": "Dr. Jane Smith",
  "doctor_phone": "555-0123",
  "insurance_provider": "Blue Cross",
  "insurance_number": "ABC123456",
  "notes": "Carries insulin pump"
}
```

#### `emergency_contacts` (Camper Emergency Contacts)
```sql
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT NOT NULL,
  priority_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `parent_camper_links` (Parent-Child Relationships)
```sql
CREATE TABLE parent_camper_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, camper_id)
);
```

#### `authorization_codes` (Registration Codes)
```sql
CREATE TABLE authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `incidents` (Incident Reports)
```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_id UUID NOT NULL REFERENCES campers(id),
  reported_by UUID NOT NULL REFERENCES profiles(id),
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `check_in_logs` (Check-In/Out History)
```sql
CREATE TABLE check_in_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camper_id UUID NOT NULL REFERENCES campers(id),
  action TEXT NOT NULL CHECK (action IN ('check_in', 'check_out')),
  performed_by UUID NOT NULL REFERENCES profiles(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  wristband_id TEXT,
  notes TEXT
);
```

### RLS Policies (Row Level Security)

**Principle:** Users can only access data appropriate for their role

**Example Policies:**

```sql
-- Super Admins see everything
CREATE POLICY "Super admins full access"
ON campers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Staff see all campers in their camp
CREATE POLICY "Staff view camp campers"
ON campers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('staff', 'camp_admin')
  )
);

-- Parents see only their children
CREATE POLICY "Parents view own campers"
ON campers FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM parent_camper_links
    WHERE camper_id = campers.id
  )
);

-- Parents can update medical info for their children
CREATE POLICY "Parents update own camper medical"
ON campers FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM parent_camper_links
    WHERE camper_id = campers.id
  )
)
WITH CHECK (
  -- Only allow updating medical_info column
  (medical_info IS DISTINCT FROM OLD.medical_info)
  AND (first_name = OLD.first_name)
  AND (last_name = OLD.last_name)
  -- ... other columns unchanged
);
```

### RPC Functions (Bypass RLS for Complex Operations)

**Purpose:** Some operations require elevated privileges or complex logic that RLS can't handle

**Example: Check-In Bypass RLS**
```sql
CREATE OR REPLACE FUNCTION check_in_camper_bypass_rls(
  p_camper_id UUID,
  p_wristband_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Disable RLS for this function
  SET LOCAL row_security = off;
  
  -- Update camper status
  UPDATE campers
  SET 
    check_in_status = 'checked_in',
    last_check_in = NOW(),
    wristband_id = p_wristband_id
  WHERE id = p_camper_id;
  
  -- Log the check-in
  INSERT INTO check_in_logs (camper_id, action, performed_by, wristband_id)
  VALUES (p_camper_id, 'check_in', auth.uid(), p_wristband_id);
END;
$$;
```

**Why SECURITY DEFINER?**
- Function runs with creator's privileges (bypasses RLS)
- Allows staff to check in campers without direct UPDATE permission
- Centralizes business logic (e.g., logging, validation)
- Prevents SQL injection via parameterized inputs

---

## Security Architecture

### Authentication

**Provider:** Supabase Auth

**Methods:**
- Email/Password (primary)
- Google OAuth (optional)
- Apple OAuth (optional, iOS)

**Session Management:**
- JWT tokens stored in `expo-secure-store` (mobile) or `AsyncStorage` (web)
- Auto-refresh 5 minutes before expiry
- Periodic validity checks every 5 minutes
- Manual refresh available
- Session expiry: 1 hour (configurable)

**Implementation:**
```typescript
// contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) loadProfile(session.user.id);
        else setProfile(null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Auto-refresh logic
  useEffect(() => {
    if (!session) return;
    
    const timeUntilExpiry = sessionManager.getTimeUntilExpiry(session);
    if (timeUntilExpiry < 5 * 60 * 1000) {
      sessionManager.refreshSession();
    }
    
    const interval = setInterval(() => {
      sessionManager.checkSessionValidity();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [session]);
  
  return (
    <AuthContext.Provider value={{ session, profile, ... }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Authorization

**Mechanism:** Role-Based Access Control (RBAC)

**Enforcement Layers:**
1. **Database (RLS)** - Postgres Row Level Security policies
2. **API (RPC)** - Supabase RPC functions with `SECURITY DEFINER`
3. **Frontend (Routes)** - `<ProtectedRoute>` component checks role
4. **UI (Conditional)** - Hide/disable features based on role

**Protected Route Example:**
```typescript
// components/ProtectedRoute.tsx
export const ProtectedRoute = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const { session, profile, loading } = useAuth();
  
  if (loading) return <ActivityIndicator />;
  
  if (!session) {
    return <Redirect href="/sign-in" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return <Redirect href="/unauthorized" />;
  }
  
  return <>{children}</>;
};

// Usage
<ProtectedRoute allowedRoles={['super_admin', 'camp_admin']}>
  <UserManagementScreen />
</ProtectedRoute>
```

### Data Encryption

**At Rest:**
- Database: Supabase encrypts all data at rest (AES-256)
- Local storage: Sensitive tokens in `expo-secure-store` (hardware-backed on iOS/Android)

**In Transit:**
- All API calls over HTTPS/TLS 1.3
- WebSocket connections (Realtime) over WSS

**NFC Wristband Data:**
- Encrypted using AES-256-CBC
- Encryption key: Camp-specific, stored in Supabase (not on device)
- Lock code: Password-protects write operations on chip
- Data hash: Verifies integrity, detects tampering

**Encryption Implementation:**
```typescript
// utils/wristbandEncryption.ts
import * as Crypto from 'expo-crypto';

export async function encryptWristbandData(
  data: WristbandCamperData
): Promise<string> {
  const key = await getWristbandEncryptionKey();
  const iv = Crypto.getRandomBytes(16);
  
  const encrypted = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify(data) + key
  );
  
  return `${iv.toString('hex')}:${encrypted}`;
}

export async function decryptWristbandData(
  encryptedData: string
): Promise<WristbandCamperData> {
  const [ivHex, ciphertext] = encryptedData.split(':');
  const key = await getWristbandEncryptionKey();
  
  // Decrypt and parse
  // ... (implementation details)
  
  return parsedData;
}
```

### Audit Logging

**What:** Track all sensitive operations for accountability

**Logged Events:**
- User registration/login/logout
- Role changes
- Camper creation/updates/deletion
- Check-in/check-out operations
- Incident creation/updates
- Authorization code usage
- Wristband lock code changes

**Implementation:**
- Database triggers on sensitive tables
- Application-level logging in RPC functions
- Stored in `audit_logs` table with:
  - Timestamp
  - User ID
  - Action type
  - Table/record affected
  - Old/new values (for updates)
  - IP address (if available)

**Example Trigger:**
```sql
CREATE OR REPLACE FUNCTION log_camper_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    TG_OP,
    'campers',
    NEW.id,
    row_to_json(OLD),
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER camper_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON campers
FOR EACH ROW EXECUTE FUNCTION log_camper_changes();
```

### Privacy Compliance

**COPPA (Children's Online Privacy Protection Act):**
- No direct data collection from children under 13
- All data entered by parents or authorized staff
- Parental consent implied via registration process
- Data minimization: Only collect necessary information

**GDPR (General Data Protection Regulation):**
- Right to access: Parents can view all data about their children
- Right to rectification: Parents can update medical/emergency info
- Right to erasure: Admins can delete camper records (with cascade)
- Data portability: Export functionality (future feature)
- Consent management: Authorization codes serve as consent mechanism

**HIPAA Considerations (Medical Data):**
- Medical information stored in encrypted JSONB field
- Access restricted to authorized staff and parents
- Audit trail for all medical data access
- No PHI transmitted via insecure channels

---

## NFC Wristband System

### Hardware Specifications

**Recommended Chip:** NTAG215 or NTAG216

**Specifications:**
- **Memory:** 504 bytes (NTAG215) or 888 bytes (NTAG216)
- **Protocol:** ISO 14443A (NFC Type 2)
- **Frequency:** 13.56 MHz
- **Read Range:** 1-10 cm (depending on antenna)
- **Password Protection:** 32-bit password for write operations
- **UID:** 7-byte unique identifier (read-only)

**Why NTAG215/216?**
- Password protection prevents unauthorized writes
- Sufficient memory for encrypted camper data
- Widely available and affordable
- Compatible with all NFC-enabled smartphones
- Durable (waterproof wristband form factor)

**Form Factor:**
- Silicone wristbands (adjustable, comfortable)
- Waterproof (IP68 rating)
- Tamper-evident (breaks if removed)
- Color-coded by age group or session (optional)

### Data Structure on Chip

**NDEF (NFC Data Exchange Format) Record:**

```
[NDEF Message]
  ├── Record Type: Text
  ├── Payload: Encrypted JSON string
  └── Size: ~200-400 bytes (depending on data)

[Encrypted Payload Structure]
{
  "camperId": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "2010-05-15",
  "wristbandId": "WB-12345",
  "medicalAlerts": ["Peanut allergy", "Asthma"],
  "emergencyContact": "Jane Doe - 555-0123",
  "dataHash": "sha256-hash-for-integrity",
  "encryptedAt": "2024-01-15T10:30:00Z"
}
```

**Security Measures:**
1. **Encryption:** AES-256-CBC with camp-specific key
2. **Data Hash:** SHA-256 hash to detect tampering
3. **Password Protection:** 32-bit lock code prevents unauthorized writes
4. **Timestamp:** Detect stale data (wristband not updated)
5. **No PII Storage:** Only essential data, encrypted

### NFC Operations

#### 1. Write Wristband (Initial Setup)

**Flow:**
1. Admin/Staff creates camper profile in app
2. Tap "Assign Wristband" → Scan NFC chip
3. App generates encrypted payload with camper data
4. App writes NDEF record to chip (requires lock code)
5. App sets password protection on chip
6. App stores `wristband_id` and `data_hash` in database
7. Success confirmation

**Code Example:**
```typescript
async function writeWristband(camper: Camper) {
  try {
    // Request NFC
    await NfcManager.requestTechnology(NfcTech.Ndef);
    
    // Generate encrypted payload
    const payload = await encryptWristbandData({
      camperId: camper.id,
      firstName: camper.first_name,
      lastName: camper.last_name,
      dateOfBirth: camper.date_of_birth,
      medicalAlerts: extractMedicalAlerts(camper.medical_info),
      emergencyContact: getPrimaryEmergencyContact(camper.id),
      dataHash: generateDataHash(camper),
      encryptedAt: new Date().toISOString(),
    });
    
    // Create NDEF message
    const bytes = Ndef.encodeMessage([
      Ndef.textRecord(payload),
    ]);
    
    // Write to chip
    await NfcManager.ndefHandler.writeNdefMessage(bytes);
    
    // Set password protection
    const lockCode = await getWristbandLockCode();
    await NfcManager.setPassword(lockCode);
    
    // Update database
    await supabase.rpc('assign_wristband', {
      p_camper_id: camper.id,
      p_wristband_id: generateWristbandId(),
      p_data_hash: generateDataHash(camper),
    });
    
    Alert.alert('Success', 'Wristband assigned successfully');
  } catch (error) {
    console.error('Write wristband error:', error);
    Alert.alert('Error', 'Failed to write wristband');
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}
```

#### 2. Read Wristband (Check-In, Medical Access)

**Flow:**
1. Staff taps "Scan Wristband"
2. User holds phone near wristband
3. App reads NDEF record from chip
4. App decrypts payload
5. App verifies data hash (integrity check)
6. App displays camper information
7. Staff performs action (check-in, view medical, etc.)

**Code Example:**
```typescript
async function readWristband() {
  try {
    // Request NFC
    await NfcManager.requestTechnology(NfcTech.Ndef);
    
    // Read NDEF message
    const tag = await NfcManager.getTag();
    const ndefMessage = tag.ndefMessage;
    
    if (!ndefMessage || ndefMessage.length === 0) {
      throw new Error('No NDEF data on wristband');
    }
    
    // Parse payload
    const record = ndefMessage[0];
    const encryptedPayload = Ndef.text.decodePayload(record.payload);
    
    // Decrypt
    const data = await decryptWristbandData(encryptedPayload);
    
    // Verify integrity
    const camper = await fetchCamperById(data.camperId);
    const currentHash = generateDataHash(camper);
    
    if (data.dataHash !== currentHash) {
      Alert.alert(
        'Outdated Data',
        'Wristband data is outdated. Please update wristband.',
        [
          { text: 'Update Now', onPress: () => writeWristband(camper) },
          { text: 'Continue Anyway', style: 'cancel' },
        ]
      );
    }
    
    // Display camper info
    setScannedCamper(camper);
    
  } catch (error) {
    console.error('Read wristband error:', error);
    Alert.alert('Error', 'Failed to read wristband');
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}
```

#### 3. Update Wristband (Data Changed)

**Trigger:** When camper data changes (medical info, emergency contact, etc.)

**Flow:**
1. System detects data change (via database trigger or manual check)
2. System marks wristband as "outdated" (data hash mismatch)
3. Staff sees "Wristband Updates" tab with list of outdated wristbands
4. Staff taps camper → "Update Wristband"
5. Staff scans wristband
6. App writes new encrypted payload (requires lock code)
7. App updates `data_hash` in database
8. Success confirmation

**Outdated Detection:**
```typescript
// Runs periodically or on-demand
async function checkOutdatedWristbands() {
  const { data: campers } = await supabase
    .from('campers')
    .select('*')
    .not('wristband_id', 'is', null);
  
  const outdated = [];
  
  for (const camper of campers) {
    const currentHash = generateDataHash(camper);
    if (camper.wristband_data_hash !== currentHash) {
      outdated.push(camper);
    }
  }
  
  return outdated;
}
```

### Lock Code Management

**Purpose:** Prevent unauthorized writes to wristbands

**Default Lock Code:** `CAMP2024` (changeable by admin)

**Management:**
- Admins can view/change lock code via "Wristband Settings"
- Lock code stored in Supabase (encrypted)
- Lock code cached locally for offline writes
- Lock code shared with staff via secure channel (copy/share)

**Security:**
- Lock code required for all write operations
- Lock code never displayed in plain text (masked)
- Lock code rotation recommended quarterly
- Lock code reset available (requires admin confirmation)

---

## Offline Capabilities

### Offline-First Architecture

**Philosophy:** Core operations must work without internet

**Offline-Capable Features:**
- NFC scanning (read wristband data)
- Camper profile viewing (cached data)
- Check-in/check-out (queued for sync)
- Incident logging (queued for sync)
- Search campers (cached list)

**Requires Connectivity:**
- User authentication (initial login)
- Camper creation/deletion
- User management
- Authorization code management
- Real-time updates from other devices

### Data Caching Strategy

**What to Cache:**
- All camper profiles (demographics, medical, emergency contacts)
- User profile (role, permissions)
- Session data (JWT token, expiry)
- Wristband encryption key and lock code
- Recent check-in/out logs

**Cache Storage:**
- `@react-native-async-storage/async-storage` for large data (camper list)
- `expo-secure-store` for sensitive data (tokens, encryption keys)
- In-memory state for active session data

**Cache Invalidation:**
- Time-based: Refresh every 1 hour (configurable)
- Event-based: Refresh on app foreground
- Manual: Pull-to-refresh on list screens
- Real-time: Supabase subscriptions update cache when online

**Implementation:**
```typescript
// Cache campers list
async function cacheCampers(campers: Camper[]) {
  await AsyncStorage.setItem(
    'cached_campers',
    JSON.stringify({
      data: campers,
      cachedAt: new Date().toISOString(),
    })
  );
}

// Load from cache
async function loadCachedCampers(): Promise<Camper[]> {
  const cached = await AsyncStorage.getItem('cached_campers');
  if (!cached) return [];
  
  const { data, cachedAt } = JSON.parse(cached);
  const age = Date.now() - new Date(cachedAt).getTime();
  
  // Cache valid for 1 hour
  if (age > 60 * 60 * 1000) {
    console.log('Cache expired, fetching fresh data');
    return [];
  }
  
  return data;
}
```

### Sync Queue

**Purpose:** Queue operations performed offline for later sync

**Queued Operations:**
- Check-in/check-out
- Incident creation
- Camper profile updates (if allowed offline)

**Queue Structure:**
```typescript
interface QueuedOperation {
  id: string;
  type: 'check_in' | 'check_out' | 'incident' | 'update_camper';
  payload: any;
  timestamp: string;
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}
```

**Sync Logic:**
```typescript
async function syncQueue() {
  const queue = await loadSyncQueue();
  
  for (const operation of queue) {
    if (operation.status === 'synced') continue;
    
    try {
      operation.status = 'syncing';
      await saveSyncQueue(queue);
      
      switch (operation.type) {
        case 'check_in':
          await supabase.rpc('check_in_camper_bypass_rls', operation.payload);
          break;
        case 'check_out':
          await supabase.rpc('check_out_camper_bypass_rls', operation.payload);
          break;
        case 'incident':
          await supabase.from('incidents').insert(operation.payload);
          break;
        // ... other operations
      }
      
      operation.status = 'synced';
      await saveSyncQueue(queue);
      
    } catch (error) {
      console.error('Sync failed for operation:', operation.id, error);
      operation.status = 'failed';
      operation.retries += 1;
      
      if (operation.retries >= 3) {
        // Alert user of permanent failure
        Alert.alert(
          'Sync Failed',
          `Failed to sync ${operation.type} after 3 attempts. Please check connectivity.`
        );
      }
      
      await saveSyncQueue(queue);
    }
  }
}

// Trigger sync when connectivity restored
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    console.log('Connectivity restored, syncing queue');
    syncQueue();
  }
});
```

### Conflict Resolution

**Strategy:** Last-Write-Wins (LWW) with timestamp

**Scenario:** User A and User B both update camper profile offline

**Resolution:**
1. Both updates queued locally
2. User A comes online first → sync succeeds
3. User B comes online later → sync detects conflict
4. System compares `updated_at` timestamps
5. Later timestamp wins (User B's changes overwrite User A's)
6. User A sees notification: "Camper profile updated by another user"

**Alternative (Future):** Operational Transformation (OT) for field-level merging

---

## Technical Stack

### Frontend

**Framework:** React Native 0.81.4 + Expo 54

**Key Libraries:**
- `expo-router` - File-based navigation
- `react-native-nfc-manager` - NFC operations
- `@supabase/supabase-js` - Database client
- `expo-secure-store` - Secure token storage
- `@react-native-async-storage/async-storage` - Local data cache
- `expo-linear-gradient` - UI gradients
- `expo-blur` - Glassmorphism effects
- `@react-native-community/datetimepicker` - Date selection
- `react-native-safe-area-context` - Safe area handling

**UI Patterns:**
- Glassmorphism (frosted glass cards)
- Linear gradients (blue theme)
- Bottom tab navigation (FloatingTabBar)
- Stack navigation for detail screens
- Pull-to-refresh on lists
- Skeleton loaders for async data
- Custom modals (cross-platform confirmations)

### Backend

**Platform:** Supabase (PostgreSQL + Auth + Realtime + Storage)

**Database:** PostgreSQL 15 with Row Level Security (RLS)

**Authentication:** Supabase Auth (JWT-based)

**Real-time:** Supabase Realtime (WebSocket subscriptions)

**Storage:** Supabase Storage (for camper photos, documents)

**Edge Functions:** Deno-based serverless functions (future AI features)

### Infrastructure

**Hosting:** Supabase Cloud (managed PostgreSQL + Auth + Storage)

**CDN:** Supabase CDN for static assets

**Monitoring:** Supabase Dashboard (logs, metrics, alerts)

**Backups:** Automated daily backups (Supabase)

### Development Tools

**Version Control:** Git

**Package Manager:** npm

**Build Tool:** Expo EAS Build

**Testing:** Manual QA (automated testing future)

**Deployment:** Expo OTA Updates (over-the-air)

---

## API Endpoints

### Authentication

**POST /auth/signup**
- Body: `{ email, password, full_name, phone, authorization_code }`
- Returns: `{ user, session }`
- Validates authorization code, creates user, assigns role

**POST /auth/signin**
- Body: `{ email, password }`
- Returns: `{ user, session }`

**POST /auth/signout**
- Headers: `Authorization: Bearer <token>`
- Returns: `{ success: true }`

**POST /auth/refresh**
- Body: `{ refresh_token }`
- Returns: `{ session }`

### Campers

**GET /rest/v1/campers**
- Headers: `Authorization: Bearer <token>`
- Query: `?select=*&order=last_name.asc`
- Returns: `Camper[]`
- RLS: Filters by role (staff see all, parents see own)

**GET /rest/v1/campers?id=eq.<uuid>**
- Headers: `Authorization: Bearer <token>`
- Returns: `Camper` (single)

**POST /rest/v1/campers**
- Headers: `Authorization: Bearer <token>`
- Body: `{ first_name, last_name, date_of_birth, ... }`
- Returns: `Camper` (created)
- RLS: Only staff/admin can create

**PATCH /rest/v1/campers?id=eq.<uuid>**
- Headers: `Authorization: Bearer <token>`
- Body: `{ field: new_value, ... }`
- Returns: `Camper` (updated)
- RLS: Staff can update all fields, parents can update medical_info only

**DELETE /rest/v1/campers?id=eq.<uuid>**
- Headers: `Authorization: Bearer <token>`
- Returns: `{ success: true }`
- RLS: Only admin can delete

### RPC Functions (Bypass RLS)

**POST /rest/v1/rpc/check_in_camper_bypass_rls**
- Headers: `Authorization: Bearer <token>`
- Body: `{ p_camper_id: uuid, p_wristband_id: string }`
- Returns: `void`
- Updates camper status, logs check-in

**POST /rest/v1/rpc/check_out_camper_bypass_rls**
- Headers: `Authorization: Bearer <token>`
- Body: `{ p_camper_id: uuid }`
- Returns: `void`
- Updates camper status, logs check-out

**POST /rest/v1/rpc/update_camper_bypass_rls**
- Headers: `Authorization: Bearer <token>`
- Body: `{ p_camper_id: uuid, p_first_name: string, ... }`
- Returns: `void`
- Updates camper with validation

**POST /rest/v1/rpc/assign_wristband**
- Headers: `Authorization: Bearer <token>`
- Body: `{ p_camper_id: uuid, p_wristband_id: string, p_data_hash: string }`
- Returns: `void`
- Assigns wristband to camper

### Emergency Contacts

**GET /rest/v1/emergency_contacts?camper_id=eq.<uuid>**
- Headers: `Authorization: Bearer <token>`
- Returns: `EmergencyContact[]`
- RLS: Filtered by camper access

**POST /rest/v1/emergency_contacts**
- Headers: `Authorization: Bearer <token>`
- Body: `{ camper_id, full_name, phone, relationship, priority_order }`
- Returns: `EmergencyContact` (created)

**PATCH /rest/v1/emergency_contacts?id=eq.<uuid>**
- Headers: `Authorization: Bearer <token>`
- Body: `{ field: new_value, ... }`
- Returns: `EmergencyContact` (updated)

**DELETE /rest/v1/emergency_contacts?id=eq.<uuid>**
- Headers: `Authorization: Bearer <token>`
- Returns: `{ success: true }`

### Incidents

**GET /rest/v1/incidents?camper_id=eq.<uuid>**
- Headers: `Authorization: Bearer <token>`
- Returns: `Incident[]`
- RLS: Staff see all, parents see own campers' incidents

**POST /rest/v1/incidents**
- Headers: `Authorization: Bearer <token>`
- Body: `{ camper_id, incident_type, severity, description, occurred_at }`
- Returns: `Incident` (created)
- Auto-fills `reported_by` from auth token

**PATCH /rest/v1/incidents?id=eq.<uuid>**
- Headers: `Authorization: Bearer <token>`
- Body: `{ follow_up_notes, resolved, ... }`
- Returns: `Incident` (updated)
- RLS: Only staff/admin can update

### User Management (Admin Only)

**GET /rest/v1/profiles**
- Headers: `Authorization: Bearer <token>`
- Returns: `UserProfile[]`
- RLS: Only admin can view all users

**PATCH /rest/v1/profiles?id=eq.<uuid>**
- Headers: `Authorization: Bearer <token>`
- Body: `{ role, registration_complete, ... }`
- Returns: `UserProfile` (updated)
- RLS: Only admin can update roles

**DELETE /rest/v1/profiles?id=eq.<uuid>**
- Headers: `Authorization: Bearer <token>`
- Returns: `{ success: true }`
- RLS: Only admin can delete users

### Authorization Codes (Admin Only)

**GET /rest/v1/authorization_codes**
- Headers: `Authorization: Bearer <token>`
- Returns: `AuthorizationCode[]`
- RLS: Only admin can view codes

**POST /rest/v1/authorization_codes**
- Headers: `Authorization: Bearer <token>`
- Body: `{ code, role, usage_limit, expires_at }`
- Returns: `AuthorizationCode` (created)
- RLS: Only admin can create codes

**PATCH /rest/v1/authorization_codes?id=eq.<uuid>**
- Headers: `Authorization: Bearer <token>`
- Body: `{ is_active, usage_limit, ... }`
- Returns: `AuthorizationCode` (updated)
- RLS: Only admin can update codes

---

## UI/UX Patterns

### Design System

**Color Palette:**
```typescript
export const colors = {
  // Primary (Blue theme)
  primary: '#1E3A8A',      // Deep blue
  primaryLight: '#3B82F6', // Bright blue
  primaryDark: '#1E40AF',  // Navy blue
  
  // Status colors
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber
  error: '#EF4444',        // Red
  info: '#3B82F6',         // Blue
  
  // Neutrals
  background: '#F3F4F6',   // Light gray (light mode)
  backgroundDark: '#1F2937', // Dark gray (dark mode)
  surface: '#FFFFFF',      // White (light mode)
  surfaceDark: '#374151',  // Charcoal (dark mode)
  text: '#111827',         // Near black (light mode)
  textDark: '#F9FAFB',     // Near white (dark mode)
  textSecondary: '#6B7280', // Gray
  border: '#E5E7EB',       // Light gray
  
  // Check-in status
  checkedIn: '#10B981',    // Green
  checkedOut: '#6B7280',   // Gray
  
  // Glassmorphism
  glassBackground: 'rgba(255, 255, 255, 0.1)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',
};
```

**Typography:**
- **Headings:** System font (SF Pro on iOS, Roboto on Android), bold
- **Body:** System font, regular
- **Monospace:** Space Mono (for codes, IDs)

**Spacing:**
- Base unit: 4px
- Common values: 8px, 12px, 16px, 24px, 32px

**Border Radius:**
- Small: 8px (buttons, inputs)
- Medium: 12px (cards)
- Large: 20px (modals, sheets)

### Component Library

**GlassCard** - Frosted glass effect card
```typescript
<GlassCard style={{ padding: 16 }}>
  <Text>Content</Text>
</GlassCard>
```

**IconSymbol** - Cross-platform icon
```typescript
<IconSymbol 
  ios_icon_name="phone.fill" 
  android_material_icon_name="phone" 
  size={24} 
  color={colors.text} 
/>
```

**ProtectedRoute** - Role-based route guard
```typescript
<ProtectedRoute allowedRoles={['staff', 'admin']}>
  <Screen />
</ProtectedRoute>
```

**ConfirmModal** - Cross-platform confirmation dialog
```typescript
<ConfirmModal
  visible={showModal}
  title="Delete Camper?"
  message="This action cannot be undone."
  onConfirm={handleDelete}
  onCancel={() => setShowModal(false)}
  confirmText="Delete"
  confirmColor={colors.error}
/>
```

**FloatingTabBar** - Custom bottom tab bar
```typescript
<FloatingTabBar
  state={state}
  descriptors={descriptors}
  navigation={navigation}
/>
```

### Navigation Structure

```
app/
├── _layout.tsx (Root layout with AuthProvider)
├── index.tsx (Redirect to sign-in or home)
├── sign-in.tsx (Login screen)
├── register.tsx (Registration screen)
├── forgot-password.tsx (Password reset)
├── (tabs)/ (Main app with FloatingTabBar)
│   ├── _layout.tsx (Tab navigator)
│   ├── (home)/
│   │   ├── _layout.tsx (Stack for home)
│   │   └── index.tsx (Dashboard)
│   ├── campers.tsx (Camper list)
│   ├── check-in.tsx (Check-in/out screen)
│   ├── nfc-scanner.tsx (NFC scanner)
│   ├── wristband-updates.tsx (Outdated wristbands)
│   └── profile.tsx (User profile)
├── camper-profile.tsx (Full camper details)
├── edit-camper.tsx (Edit camper form)
├── create-camper.tsx (New camper form)
├── user-management.tsx (Admin: Manage users)
├── manage-authorization-codes.tsx (Admin: Manage codes)
├── wristband-settings.tsx (Admin: Lock code)
├── bulk-import-campers.tsx (Admin: CSV import)
├── parent-dashboard.tsx (Parent: My children)
└── +not-found.tsx (404 page)
```

### Screen Layouts

**Dashboard (Home):**
- Header with camp logo and user greeting
- Quick stats cards (checked in, total campers, incidents)
- Recent activity feed (check-ins, incidents)
- Quick action buttons (Check-In, NFC Scan, Add Camper)

**Camper List:**
- Search bar (filter by name)
- Filter chips (status: all, checked in, checked out)
- List of camper cards:
  - Photo (if available)
  - Name
  - Age
  - Check-in status badge
  - Tap to view full profile
- Floating action button (Add Camper)

**Camper Profile:**
- Header with back button and edit button
- Photo (large, centered)
- Demographics section (name, age, DOB, cabin, swim level)
- Medical section (allergies, medications, conditions)
- Emergency contacts section (list with priority)
- Check-in history section (recent logs)
- Incidents section (list with severity badges)
- Action buttons (Check-In/Out, Log Incident, Edit Profile)

**Check-In Screen:**
- NFC scan button (large, centered)
- OR divider
- Search bar (manual camper selection)
- List of campers (filtered by search)
- Tap camper → Confirm check-in/out modal
- Success animation on completion

**NFC Scanner:**
- Animated NFC icon (pulsing)
- Instructions ("Hold phone near wristband")
- Scanned camper card (appears after scan)
- Quick actions (Check-In/Out, View Profile, Log Incident)
- Scan again button

**Profile (User):**
- User info (name, email, role badge)
- Settings sections:
  - Account (edit profile, change password)
  - Admin Tools (if admin: user management, codes, wristband settings)
  - About (app version, privacy policy, terms)
- Sign out button (bottom)

### Animations

**Check-In Success:**
- Green checkmark animation (scale + fade in)
- Haptic feedback (success vibration)
- Confetti particles (optional)

**NFC Scan:**
- Pulsing ring animation around NFC icon
- Fade in camper card after successful scan
- Slide up animation for action buttons

**List Loading:**
- Skeleton loaders (shimmer effect)
- Fade in when data loads

**Pull-to-Refresh:**
- Standard iOS/Android pull-to-refresh indicator
- Haptic feedback on release

---

## Implementation Guidelines

### Getting Started

1. **Set up Supabase Project:**
   - Create new project at supabase.com
   - Note project URL and anon key
   - Enable Email auth provider
   - (Optional) Enable Google/Apple OAuth

2. **Run Database Migrations:**
   - Execute SQL scripts in order:
     - `create_tables.sql` (profiles, campers, emergency_contacts, etc.)
     - `create_rls_policies.sql` (Row Level Security)
     - `create_rpc_functions.sql` (check_in_camper_bypass_rls, etc.)
     - `create_triggers.sql` (audit logging)
   - Verify tables and policies in Supabase Dashboard

3. **Configure Expo Project:**
   - Install dependencies: `npm install`
   - Create `.env` file:
     ```
     EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```
   - Update `app.json` with app name, icon, splash screen

4. **Initialize Supabase Client:**
   - Create `app/integrations/supabase/client.ts`
   - Configure auth storage (SecureStore + AsyncStorage)
   - Enable auto-refresh tokens

5. **Set up Authentication:**
   - Create `contexts/AuthContext.tsx`
   - Implement session management
   - Add `<ProtectedRoute>` component

6. **Build Core Screens:**
   - Sign-in / Register
   - Home Dashboard
   - Camper List
   - Camper Profile
   - Check-In
   - NFC Scanner

7. **Implement NFC:**
   - Install `react-native-nfc-manager`
   - Create `utils/wristbandEncryption.ts`
   - Implement read/write functions
   - Test with NTAG215 chips

8. **Add Admin Features:**
   - User Management
   - Authorization Code Management
   - Wristband Settings
   - Bulk Import

9. **Test Offline Mode:**
   - Disable network in simulator
   - Verify NFC scanning works
   - Verify check-in queues
   - Re-enable network and verify sync

10. **Deploy:**
    - Build with Expo EAS: `eas build --platform all`
    - Submit to App Store / Google Play
    - Enable OTA updates for quick fixes

### Best Practices

**Security:**
- Never expose Supabase service role key in frontend
- Always use RLS policies for data access
- Validate all user inputs (frontend + backend)
- Use SECURITY DEFINER functions sparingly (only when necessary)
- Rotate wristband lock code quarterly
- Enable 2FA for admin accounts (future)

**Performance:**
- Cache camper list locally (refresh every hour)
- Use pagination for large lists (100+ campers)
- Optimize images (compress, resize before upload)
- Lazy load camper photos (load on scroll)
- Debounce search inputs (300ms delay)

**UX:**
- Show loading states for all async operations
- Provide clear error messages (user-friendly)
- Use optimistic UI updates (instant feedback)
- Add haptic feedback for important actions
- Support pull-to-refresh on all lists
- Implement skeleton loaders (avoid blank screens)

**Code Quality:**
- Use TypeScript for type safety
- Follow Atomic JSX rules (one variable per `<Text>`)
- Keep components under 500 lines (split if larger)
- Use custom hooks for reusable logic
- Add console.log for debugging (remove in production)
- Write descriptive commit messages

**Testing:**
- Test on both iOS and Android
- Test offline mode thoroughly
- Test with real NFC chips (not just simulator)
- Test with different roles (admin, staff, parent)
- Test edge cases (empty lists, network errors, etc.)

### Common Pitfalls

**NFC:**
- ❌ Forgetting to call `NfcManager.cancelTechnologyRequest()` in finally block
- ❌ Not handling "NFC not supported" on device
- ❌ Writing to chip without password protection
- ✅ Always wrap NFC operations in try-catch-finally

**Authentication:**
- ❌ Using `useAuth()` in same component as `<AuthProvider>`
- ❌ Not handling session expiry gracefully
- ❌ Storing sensitive data in AsyncStorage (use SecureStore)
- ✅ Implement auto-refresh and session monitoring

**RLS:**
- ❌ Forgetting to enable RLS on new tables
- ❌ Overly permissive policies (security risk)
- ❌ Not testing policies with different roles
- ✅ Test RLS policies in Supabase SQL editor before deploying

**Offline:**
- ❌ Not caching essential data (app breaks offline)
- ❌ Not implementing sync queue (data loss)
- ❌ Not showing sync status to user (confusion)
- ✅ Cache aggressively, sync transparently

**UI:**
- ❌ Using `Alert.alert` for confirmations on web (callbacks don't work)
- ❌ Putting chat/camera screens in (tabs) folder (FloatingTabBar blocks inputs)
- ❌ Not handling safe area insets (notch overlap)
- ✅ Use custom modals, Stack navigation for full-screen features, SafeAreaView

---

## Appendix

### Glossary

- **RLS:** Row Level Security - PostgreSQL feature for row-level access control
- **RPC:** Remote Procedure Call - Supabase function invocation
- **NDEF:** NFC Data Exchange Format - Standard for NFC data structure
- **NTAG:** NFC Tag Type - Specific NFC chip series by NXP
- **JWT:** JSON Web Token - Authentication token format
- **RBAC:** Role-Based Access Control - Permission system based on user roles
- **OTA:** Over-The-Air - App updates without app store submission

### Resources

**Supabase:**
- Documentation: https://supabase.com/docs
- RLS Guide: https://supabase.com/docs/guides/auth/row-level-security
- RPC Functions: https://supabase.com/docs/guides/database/functions

**Expo:**
- Documentation: https://docs.expo.dev
- Expo Router: https://docs.expo.dev/router/introduction
- NFC Manager: https://github.com/revtel/react-native-nfc-manager

**NFC:**
- NTAG215 Datasheet: https://www.nxp.com/docs/en/data-sheet/NTAG213_215_216.pdf
- NFC Forum: https://nfc-forum.org

### Support

For questions or issues during implementation:
1. Check this documentation first
2. Review Supabase logs (Dashboard → Logs)
3. Check frontend logs (Expo DevTools)
4. Review database schema (Supabase → Database → Tables)
5. Test RLS policies (Supabase → SQL Editor)

---

## Conclusion

CampSync is a comprehensive camp management platform designed for real-world use in challenging environments. By prioritizing offline capabilities, security, and ease of use, it replaces fragmented paper-based processes with a unified digital solution.

This documentation provides a complete blueprint for rebuilding CampSync on any platform. Follow the implementation guidelines, adhere to security best practices, and test thoroughly to ensure a reliable, secure, and user-friendly experience for camp staff and parents.

**Key Takeaways:**
- **Offline-first:** Core operations work without internet
- **Security-first:** Role-based access, encryption, audit logging
- **User-first:** Intuitive workflows, minimal training required
- **NFC-powered:** Fast camper identification and data access
- **Scalable:** Designed to grow with camp needs

Good luck building CampSync! 🏕️
