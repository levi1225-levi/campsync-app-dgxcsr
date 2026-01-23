
# CampSync Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture & Design Principles](#architecture--design-principles)
3. [Security & Encryption](#security--encryption)
4. [NFC Wristband System](#nfc-wristband-system)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Core Features](#core-features)
7. [Data Models](#data-models)
8. [Offline Functionality](#offline-functionality)
9. [Parent Portal](#parent-portal)
10. [Incident Management](#incident-management)
11. [AI Assistant](#ai-assistant)
12. [Authentication & Authorization](#authentication--authorization)
13. [Data Synchronization](#data-synchronization)
14. [Privacy & Compliance](#privacy--compliance)

---

## System Overview

CampSync is a comprehensive digital platform designed to manage all operational aspects of a summer camp. The system replaces paper-based processes with a secure, offline-capable mobile application that enables staff to efficiently manage campers, track attendance, handle medical information, and communicate with parents.

### Core Design Goals
- **Offline-First**: All critical operations function without internet connectivity
- **Security-First**: Multi-layer encryption and role-based access control
- **Speed**: Sub-second response times for common operations
- **Reliability**: 99.9% uptime for critical features
- **Privacy**: COPPA and FERPA compliant data handling
- **Usability**: Minimal training required for staff adoption

### System Components
1. **Mobile Application** (iOS/Android)
2. **Backend API** (RESTful services)
3. **Database** (Relational database with RLS)
4. **Object Storage** (For documents and photos)
5. **Real-time Sync Engine**
6. **NFC Hardware Integration**

---

## Architecture & Design Principles

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Mobile Application                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   UI Layer   │  │  State Mgmt  │  │  Local Cache │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ NFC Manager  │  │ Sync Engine  │  │ Crypto Layer │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTPS
┌─────────────────────────────────────────────────────────┐
│                     Backend Services                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  API Gateway │  │  Auth Service│  │  AI Service  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Database   │  │    Storage   │  │  Queue/Jobs  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

#### 1. Offline-First Architecture
- **Local-First Data**: All data is stored locally first, then synced
- **Optimistic Updates**: UI updates immediately, sync happens in background
- **Conflict Resolution**: Last-write-wins with timestamp-based merging
- **Queue-Based Sync**: Failed operations are queued and retried automatically

#### 2. Security Layers
- **Transport Security**: TLS 1.3 for all network communication
- **Data-at-Rest Encryption**: AES-256 encryption for local storage
- **Data-in-Transit Encryption**: End-to-end encryption for sensitive data
- **Access Control**: Row-level security policies in database
- **Audit Logging**: All data access and modifications are logged

#### 3. Performance Optimization
- **Lazy Loading**: Data loaded on-demand to minimize memory usage
- **Pagination**: Large datasets split into manageable chunks
- **Caching Strategy**: Multi-tier caching (memory → local storage → network)
- **Background Processing**: Heavy operations run in background threads
- **Optimized Queries**: Database queries optimized with proper indexing

#### 4. Scalability
- **Horizontal Scaling**: Backend services can scale independently
- **Database Sharding**: Data partitioned by camp for large deployments
- **CDN Integration**: Static assets served from edge locations
- **Load Balancing**: Traffic distributed across multiple servers

---

## Security & Encryption

### Encryption Architecture

#### 1. Wristband Data Encryption

**Encryption Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: Unique 16-byte random salt per encryption
- **IV (Initialization Vector)**: 12-byte random IV per encryption
- **Authentication Tag**: 16-byte tag for data integrity verification

**Encryption Process**:
```
1. Generate random salt (16 bytes)
2. Derive encryption key from master key + salt using PBKDF2
3. Generate random IV (12 bytes)
4. Encrypt camper data using AES-256-GCM
5. Combine: salt + IV + encrypted data + auth tag
6. Encode as Base64 for NFC storage
```

**Data Encrypted on Wristband**:
- Camper ID (UUID)
- First Name
- Last Name
- Date of Birth
- Session ID
- Wristband Assignment Timestamp

**Data NOT Stored on Wristband**:
- Medical information
- Emergency contacts
- Parent information
- Incident history
- Photos or documents

#### 2. Database Encryption

**At-Rest Encryption**:
- Full database encryption using AES-256
- Transparent Data Encryption (TDE) enabled
- Encrypted backups with separate encryption keys
- Key rotation every 90 days

**Column-Level Encryption** (for sensitive fields):
- Medical information
- Emergency contact phone numbers
- Parent email addresses
- Authorization codes

#### 3. Network Security

**TLS Configuration**:
- TLS 1.3 required for all connections
- Perfect Forward Secrecy (PFS) enabled
- Certificate pinning in mobile app
- HSTS (HTTP Strict Transport Security) enforced

**API Security**:
- JWT tokens for authentication (15-minute expiration)
- Refresh tokens (7-day expiration)
- Rate limiting (100 requests/minute per user)
- IP-based throttling for suspicious activity

### Wristband Lock System

**Universal Lock Code**: `CAMPSYNC2024LOCK`
- Used to write-protect NFC wristbands after programming
- Prevents unauthorized modification of wristband data
- Same code used for unlocking during reprogramming
- Stored securely in app configuration

**Lock Process**:
1. Write encrypted camper data to NFC tag
2. Lock NFC tag with universal lock code
3. Verify lock was successful
4. Log wristband programming event

**Unlock Process**:
1. Authenticate lock code with NFC tag
2. Erase or overwrite existing data
3. Write new encrypted data
4. Re-lock with same universal code

---

## NFC Wristband System

### NFC Technology

**Tag Type**: NTAG215 or NTAG216
- **Memory**: 504-888 bytes usable
- **Frequency**: 13.56 MHz (ISO 14443A)
- **Read Range**: 1-4 cm
- **Write Cycles**: 100,000+ writes
- **Data Retention**: 10+ years

### Wristband Data Structure

**NDEF (NFC Data Exchange Format) Record**:
```
┌─────────────────────────────────────────┐
│ NDEF Message Header                     │
├─────────────────────────────────────────┤
│ Record Type: Text (T)                   │
├─────────────────────────────────────────┤
│ Payload:                                │
│   - Salt (16 bytes)                     │
│   - IV (12 bytes)                       │
│   - Encrypted Data (variable)           │
│   - Auth Tag (16 bytes)                 │
├─────────────────────────────────────────┤
│ Lock Bytes (write protection)           │
└─────────────────────────────────────────┘
```

**Encrypted Payload Contents** (after decryption):
```json
{
  "id": "uuid-v4",
  "firstName": "string",
  "lastName": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "sessionId": "uuid-v4",
  "assignedAt": "ISO-8601 timestamp"
}
```

### NFC Operations

#### 1. Wristband Programming
**Process Flow**:
1. Staff selects camper from database
2. System retrieves camper data
3. Data is encrypted using AES-256-GCM
4. Staff taps phone to wristband
5. Encrypted data written to NFC tag
6. Tag is locked with universal code
7. Write operation verified
8. Database updated with wristband ID
9. Success confirmation displayed

**Error Handling**:
- **Tag Not Found**: Prompt to retry scan
- **Tag Full**: Alert that data is too large
- **Write Failed**: Retry up to 3 times
- **Lock Failed**: Alert staff to manually verify
- **Timeout**: Cancel operation after 10 seconds

#### 2. Wristband Scanning (Check-In/Out)
**Process Flow**:
1. Staff initiates scan mode
2. Staff taps phone to wristband
3. Encrypted data read from NFC tag
4. Data decrypted using master key
5. Camper ID extracted from decrypted data
6. Full camper profile fetched from database
7. Check-in/out status updated
8. Timestamp recorded
9. Confirmation displayed with camper photo

**Offline Behavior**:
- Scan still works (decryption is local)
- Database update queued for later sync
- Local cache updated immediately
- Visual confirmation shown to staff

#### 3. Wristband Verification
**Process Flow**:
1. Scan wristband to read data
2. Decrypt and extract camper ID
3. Query database for camper record
4. Compare wristband data with database
5. Flag discrepancies (name mismatch, expired session, etc.)
6. Display verification status

**Verification Checks**:
- Camper still registered for current session
- Wristband not reported lost/stolen
- Data integrity (auth tag verification)
- Encryption not tampered with

#### 4. Wristband Deactivation
**Process Flow**:
1. Staff selects camper or scans wristband
2. System marks wristband as inactive in database
3. Wristband ID removed from camper record
4. Optional: Erase data from physical wristband
5. Wristband returned to inventory pool

---

## User Roles & Permissions

### Role Hierarchy

```
Camp Director (Highest Privileges)
    ↓
Camp Administrator
    ↓
Medical Staff
    ↓
Counselor/Staff
    ↓
Parent/Guardian (Limited Access)
```

### Detailed Role Permissions

#### 1. Camp Director
**Full System Access**:
- ✅ View all camper data (including medical)
- ✅ Edit all camper information
- ✅ Create/edit/delete staff accounts
- ✅ Manage authorization codes
- ✅ View all incidents
- ✅ Access AI assistant (full query capabilities)
- ✅ Export all data
- ✅ Configure system settings
- ✅ View audit logs
- ✅ Manage sessions and camps

#### 2. Camp Administrator
**Administrative Access**:
- ✅ View all camper data (including medical)
- ✅ Edit camper information
- ✅ Create staff accounts (counselor level only)
- ✅ Manage authorization codes
- ✅ View all incidents
- ✅ Access AI assistant (read-only queries)
- ✅ Export camper data
- ❌ Delete staff accounts
- ❌ View audit logs
- ❌ Configure system settings

#### 3. Medical Staff
**Medical-Focused Access**:
- ✅ View all camper medical information
- ✅ Edit medical information
- ✅ View/create medical incidents
- ✅ Check-in/check-out campers
- ✅ Scan NFC wristbands
- ✅ Access AI assistant (medical queries only)
- ❌ Edit non-medical camper data
- ❌ Manage staff accounts
- ❌ View authorization codes
- ❌ Export data

#### 4. Counselor/Staff
**Operational Access**:
- ✅ View basic camper information (name, age, cabin)
- ✅ Check-in/check-out campers
- ✅ Scan NFC wristbands
- ✅ View/create non-medical incidents
- ✅ View emergency contact information
- ❌ View medical information (unless emergency)
- ❌ Edit camper data
- ❌ Manage staff accounts
- ❌ Access AI assistant
- ❌ Export data

**Emergency Override**:
- In emergency situations, counselors can temporarily access medical information
- Override is logged and requires justification
- Medical staff and directors are notified of override

#### 5. Parent/Guardian
**Limited Portal Access**:
- ✅ View own children's information
- ✅ Edit medical information (before session starts)
- ✅ Update emergency contacts
- ✅ View check-in/out history
- ✅ View non-sensitive incidents
- ✅ Upload medical documents
- ❌ View other campers
- ❌ Access staff features
- ❌ Check-in/out campers
- ❌ View sensitive incidents

### Permission Enforcement

**Database Level** (Row-Level Security):
```sql
-- Example: Campers table RLS policy
CREATE POLICY "Staff can view all campers"
  ON campers FOR SELECT
  TO authenticated
  USING (
    auth.role() IN ('director', 'administrator', 'medical_staff', 'counselor')
  );

CREATE POLICY "Parents can view own children"
  ON campers FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'parent' AND
    id IN (SELECT camper_id FROM parent_camper_links WHERE parent_id = auth.uid())
  );
```

**Application Level**:
- Role checked on every API request
- UI elements hidden based on role
- Navigation restricted by role
- Actions validated against role permissions

**Audit Trail**:
- All data access logged with user ID, role, timestamp
- Sensitive data access flagged for review
- Failed permission checks logged as security events

---

## Core Features

### 1. Camper Management

#### Camper Registration
**Data Collected**:
- **Personal Information**:
  - First name, last name, middle name
  - Date of birth
  - Gender
  - Home address
  - Photo (optional)
  
- **Medical Information**:
  - Allergies (food, environmental, medication)
  - Current medications (name, dosage, frequency)
  - Medical conditions (asthma, diabetes, etc.)
  - Dietary restrictions
  - Special care instructions
  - Immunization records
  - Insurance information
  
- **Emergency Contacts** (minimum 2):
  - Full name
  - Relationship to camper
  - Phone number (primary and alternate)
  - Email address
  - Priority order
  
- **Session Information**:
  - Session assignment
  - Cabin/group assignment
  - Swim level
  - Special accommodations

**Registration Workflow**:
1. Parent receives authorization code via email
2. Parent creates account using code
3. Parent fills out camper information form
4. Parent uploads required documents (medical forms, waivers)
5. Staff reviews and approves registration
6. Camper status changes to "Registered"
7. Parent receives confirmation email

#### Camper Profile
**Profile Sections**:
- **Overview**: Photo, name, age, cabin, session
- **Medical**: Allergies, medications, conditions (role-restricted)
- **Emergency Contacts**: Prioritized contact list
- **Check-In History**: Timeline of check-ins/outs
- **Incidents**: List of incidents involving camper
- **Documents**: Uploaded forms and waivers
- **Wristband**: Current wristband ID and status

**Profile Actions**:
- Edit information (role-dependent)
- View full history
- Print emergency card
- Export profile data
- Deactivate camper
- Assign/reassign wristband

#### Bulk Import
**CSV Import Features**:
- Upload CSV file with camper data
- Column mapping interface
- Data validation and error reporting
- Preview before import
- Rollback capability
- Duplicate detection

**CSV Format**:
```csv
first_name,last_name,date_of_birth,session,cabin,allergies,medications
John,Doe,2010-05-15,Summer 2024,Cabin A,"Peanuts,Shellfish","EpiPen (as needed)"
```

### 2. Check-In/Check-Out System

#### Check-In Process
**Methods**:
1. **NFC Scan**: Tap wristband to phone
2. **Manual Search**: Search by name and select camper
3. **Barcode Scan**: Scan printed barcode (future feature)

**Check-In Flow**:
1. Staff initiates check-in mode
2. Camper identified (via NFC or search)
3. System displays camper profile
4. Staff verifies identity (photo comparison)
5. Staff confirms check-in
6. Database updated with timestamp and staff ID
7. Status changes to "Checked In"
8. Parent notification sent (optional)

**Check-In Validations**:
- Camper registered for current session
- Not already checked in
- No outstanding medical holds
- Emergency contacts verified
- Required documents submitted

#### Check-Out Process
**Check-Out Flow**:
1. Staff initiates check-out mode
2. Camper identified (via NFC or search)
3. System displays camper profile
4. Staff verifies authorized pickup person
5. Staff confirms check-out
6. Database updated with timestamp and staff ID
7. Status changes to "Checked Out"
8. Parent notification sent

**Check-Out Validations**:
- Camper currently checked in
- Pickup person authorized (matches emergency contacts)
- No outstanding medical issues
- All personal belongings returned
- Exit interview completed (optional)

#### Check-In/Out History
**History Tracking**:
- Timestamp of each check-in/out
- Staff member who performed action
- Location (if multiple check-in points)
- Notes or comments
- Duration of stay
- Anomalies flagged (e.g., checked out without check-in)

### 3. NFC Wristband Management

#### Wristband Assignment
**Assignment Process**:
1. Select camper from database
2. Scan blank wristband
3. System encrypts camper data
4. Data written to wristband
5. Wristband locked with universal code
6. Database updated with wristband ID
7. Assignment logged with timestamp

**Wristband Inventory**:
- Track total wristbands
- Available vs. assigned count
- Lost/damaged wristbands
- Wristband history (previous assignments)

#### Wristband Replacement
**Replacement Scenarios**:
- Lost wristband
- Damaged/non-functional wristband
- Data corruption
- Camper transfer to different session

**Replacement Process**:
1. Deactivate old wristband in database
2. Mark old wristband as lost/damaged
3. Assign new wristband to camper
4. Program new wristband with camper data
5. Log replacement event
6. Notify relevant staff

#### Wristband Security
**Security Features**:
- Write-protected after programming
- Encrypted data (cannot be read without key)
- Tamper detection (auth tag verification)
- Unique wristband ID per tag
- Deactivation capability

**Security Monitoring**:
- Failed scan attempts logged
- Unauthorized access attempts flagged
- Wristband cloning detection
- Anomalous scan patterns identified

### 4. Medical Information Access

#### Medical Data Storage
**Stored Information**:
- Allergies (severity, reaction type, treatment)
- Medications (name, dosage, schedule, prescribing doctor)
- Medical conditions (diagnosis, management plan)
- Dietary restrictions (reason, alternatives)
- Special care instructions (detailed procedures)
- Medical history (past incidents, surgeries)
- Immunization records (dates, types)
- Insurance information (provider, policy number)

**Data Organization**:
- Categorized by type (allergy, medication, condition)
- Severity indicators (mild, moderate, severe, life-threatening)
- Quick-access flags for critical information
- Searchable and filterable

#### Medical Access Control
**Access Levels**:
1. **Full Access** (Medical Staff, Directors):
   - View all medical information
   - Edit medical information
   - Add medical notes
   - View medical history
   
2. **Emergency Access** (Counselors):
   - View critical medical information during emergency
   - Access logged and reviewed
   - Requires justification
   
3. **No Access** (Default for Counselors):
   - Medical information hidden
   - "View Medical Info" button disabled
   - Emergency override available

**Emergency Override**:
```
┌─────────────────────────────────────────┐
│  EMERGENCY MEDICAL ACCESS               │
├─────────────────────────────────────────┤
│  This action will be logged and         │
│  reviewed by medical staff.             │
│                                         │
│  Reason for access:                     │
│  [Text input field]                     │
│                                         │
│  [Cancel]  [Access Medical Information] │
└─────────────────────────────────────────┘
```

#### Medical Alerts
**Alert Types**:
- **Critical Allergy**: Red banner on profile
- **Daily Medication**: Reminder notifications
- **Special Care Required**: Yellow banner with instructions
- **Medical Hold**: Prevents check-in until resolved

**Alert Display**:
- Prominent visual indicators (color-coded)
- Always visible on camper profile
- Shown during check-in/out process
- Included in NFC scan results

### 5. Session Management

#### Session Configuration
**Session Attributes**:
- Session name (e.g., "Summer 2024 - Week 1")
- Start date and end date
- Capacity (maximum campers)
- Age range (minimum and maximum age)
- Program type (day camp, overnight, specialty)
- Pricing information
- Registration deadline

**Session Status**:
- Draft: Being configured
- Open: Accepting registrations
- Full: Capacity reached
- In Progress: Currently running
- Completed: Session ended
- Archived: Historical record

#### Camper-Session Assignment
**Assignment Process**:
1. Camper registered for specific session
2. Session capacity checked
3. Age eligibility verified
4. Payment status confirmed
5. Camper added to session roster
6. Cabin/group assignment made
7. Parent confirmation sent

**Session Roster**:
- List of all campers in session
- Sortable by name, age, cabin
- Filterable by status (registered, checked-in, etc.)
- Exportable to CSV/PDF
- Printable roster for staff

### 6. Incident Reporting

#### Incident Types
**Categories**:
- **Medical**: Injury, illness, medication administration
- **Behavioral**: Discipline issue, conflict, rule violation
- **Safety**: Near-miss, hazard, equipment failure
- **Other**: General notes, observations

**Severity Levels**:
- **Minor**: No intervention required, informational only
- **Moderate**: Required staff intervention, parent notification
- **Serious**: Required medical attention, immediate parent contact
- **Critical**: Emergency services called, incident report filed

#### Incident Creation
**Incident Form Fields**:
- Camper(s) involved (multiple selection)
- Incident type and severity
- Date and time of incident
- Location (cabin, activity area, etc.)
- Detailed description
- Staff witness(es)
- Action taken
- Follow-up required (yes/no)
- Parent notification (yes/no)
- Attachments (photos, documents)

**Incident Workflow**:
1. Staff creates incident report
2. Incident saved with timestamp and staff ID
3. Supervisor notified (if serious/critical)
4. Parent notified (if required)
5. Follow-up tasks created (if needed)
6. Incident reviewed and closed

#### Incident Tracking
**Tracking Features**:
- List of all incidents (filterable by type, severity, date)
- Incident timeline for each camper
- Staff incident history
- Trend analysis (common incident types, locations)
- Unresolved incidents dashboard

**Incident Notifications**:
- Real-time alerts for serious/critical incidents
- Daily digest of incidents for supervisors
- Parent notifications via email/SMS
- Follow-up reminders for unresolved incidents

### 7. Staff Management

#### Staff Accounts
**Account Types**:
- Camp Director
- Camp Administrator
- Medical Staff
- Counselor/Staff

**Account Information**:
- Full name
- Email address (username)
- Phone number
- Role assignment
- Hire date
- Emergency contact
- Certifications (CPR, First Aid, etc.)
- Background check status

#### Staff Permissions
**Permission Management**:
- Role-based access control (RBAC)
- Granular permissions per feature
- Permission inheritance (director > admin > staff)
- Custom permission sets (future feature)

**Permission Audit**:
- Log of all permission changes
- Who made the change and when
- Reason for change (optional)
- Review and approval workflow

#### Staff Activity Tracking
**Tracked Activities**:
- Login/logout times
- Check-ins/outs performed
- Incidents created
- Data modifications
- Medical information access
- Failed login attempts

**Activity Reports**:
- Daily activity summary per staff member
- Anomalous activity flagged
- Performance metrics (check-ins per hour, etc.)
- Compliance reports (required actions completed)

---

## Data Models

### Database Schema

#### 1. Campers Table
```
campers
├── id (UUID, primary key)
├── first_name (TEXT, required)
├── last_name (TEXT, required)
├── middle_name (TEXT, optional)
├── date_of_birth (DATE, required)
├── gender (TEXT, optional)
├── address (TEXT, optional)
├── photo_url (TEXT, optional)
├── session_id (UUID, foreign key → sessions.id)
├── cabin_assignment (TEXT, optional)
├── swim_level (TEXT, optional)
├── registration_status (TEXT, default: 'pending')
│   └── Values: pending, registered, checked_in, checked_out, inactive
├── check_in_status (TEXT, default: 'not_checked_in')
│   └── Values: not_checked_in, checked_in, checked_out
├── last_check_in (TIMESTAMP, optional)
├── last_check_out (TIMESTAMP, optional)
├── wristband_id (TEXT, optional, unique)
├── camp_id (UUID, foreign key → camps.id)
├── created_at (TIMESTAMP, default: now())
├── updated_at (TIMESTAMP, default: now())
└── created_by (UUID, foreign key → users.id)
```

#### 2. Camper Medical Info Table
```
camper_medical_info
├── id (UUID, primary key)
├── camper_id (UUID, foreign key → campers.id, unique)
├── allergies (JSONB, array of objects)
│   └── [{ name, severity, reaction, treatment }]
├── medications (JSONB, array of objects)
│   └── [{ name, dosage, frequency, prescribing_doctor }]
├── medical_conditions (JSONB, array of objects)
│   └── [{ condition, diagnosis_date, management_plan }]
├── dietary_restrictions (JSONB, array of objects)
│   └── [{ restriction, reason, alternatives }]
├── special_care_instructions (TEXT, optional)
├── immunization_records (JSONB, array of objects)
│   └── [{ vaccine, date, provider }]
├── insurance_provider (TEXT, optional)
├── insurance_policy_number (TEXT, encrypted, optional)
├── created_at (TIMESTAMP, default: now())
├── updated_at (TIMESTAMP, default: now())
└── updated_by (UUID, foreign key → users.id)
```

#### 3. Emergency Contacts Table
```
emergency_contacts
├── id (UUID, primary key)
├── camper_id (UUID, foreign key → campers.id)
├── full_name (TEXT, required)
├── relationship (TEXT, required)
├── phone_primary (TEXT, encrypted, required)
├── phone_alternate (TEXT, encrypted, optional)
├── email (TEXT, encrypted, optional)
├── priority_order (INTEGER, required)
│   └── 1 = primary contact, 2 = secondary, etc.
├── authorized_pickup (BOOLEAN, default: true)
├── created_at (TIMESTAMP, default: now())
└── updated_at (TIMESTAMP, default: now())
```

#### 4. Sessions Table
```
sessions
├── id (UUID, primary key)
├── camp_id (UUID, foreign key → camps.id)
├── name (TEXT, required)
├── start_date (DATE, required)
├── end_date (DATE, required)
├── capacity (INTEGER, required)
├── current_enrollment (INTEGER, default: 0)
├── age_min (INTEGER, optional)
├── age_max (INTEGER, optional)
├── program_type (TEXT, optional)
├── status (TEXT, default: 'draft')
│   └── Values: draft, open, full, in_progress, completed, archived
├── created_at (TIMESTAMP, default: now())
└── updated_at (TIMESTAMP, default: now())
```

#### 5. Incidents Table
```
incidents
├── id (UUID, primary key)
├── camp_id (UUID, foreign key → camps.id)
├── incident_type (TEXT, required)
│   └── Values: medical, behavioral, safety, other
├── severity (TEXT, required)
│   └── Values: minor, moderate, serious, critical
├── incident_date (TIMESTAMP, required)
├── location (TEXT, optional)
├── description (TEXT, required)
├── action_taken (TEXT, optional)
├── follow_up_required (BOOLEAN, default: false)
├── follow_up_notes (TEXT, optional)
├── parent_notified (BOOLEAN, default: false)
├── status (TEXT, default: 'open')
│   └── Values: open, in_progress, resolved, closed
├── reported_by (UUID, foreign key → users.id)
├── created_at (TIMESTAMP, default: now())
└── updated_at (TIMESTAMP, default: now())
```

#### 6. Incident Campers (Junction Table)
```
incident_campers
├── id (UUID, primary key)
├── incident_id (UUID, foreign key → incidents.id)
├── camper_id (UUID, foreign key → campers.id)
└── created_at (TIMESTAMP, default: now())
```

#### 7. Users Table
```
users
├── id (UUID, primary key)
├── email (TEXT, unique, required)
├── full_name (TEXT, required)
├── phone (TEXT, encrypted, optional)
├── role (TEXT, required)
│   └── Values: director, administrator, medical_staff, counselor, parent
├── camp_id (UUID, foreign key → camps.id, optional)
├── registration_complete (BOOLEAN, default: false)
├── last_login (TIMESTAMP, optional)
├── created_at (TIMESTAMP, default: now())
└── updated_at (TIMESTAMP, default: now())
```

#### 8. Parent-Camper Links Table
```
parent_camper_links
├── id (UUID, primary key)
├── parent_id (UUID, foreign key → users.id)
├── camper_id (UUID, foreign key → campers.id)
├── relationship (TEXT, required)
│   └── Values: mother, father, guardian, other
├── created_at (TIMESTAMP, default: now())
└── UNIQUE(parent_id, camper_id)
```

#### 9. Authorization Codes Table
```
authorization_codes
├── id (UUID, primary key)
├── code (TEXT, unique, required)
├── camp_id (UUID, foreign key → camps.id)
├── role (TEXT, required)
├── max_uses (INTEGER, default: 1)
├── current_uses (INTEGER, default: 0)
├── expires_at (TIMESTAMP, optional)
├── is_active (BOOLEAN, default: true)
├── created_by (UUID, foreign key → users.id)
├── created_at (TIMESTAMP, default: now())
└── notes (TEXT, optional)
```

#### 10. Camps Table
```
camps
├── id (UUID, primary key)
├── name (TEXT, required)
├── address (TEXT, optional)
├── phone (TEXT, optional)
├── email (TEXT, optional)
├── website (TEXT, optional)
├── timezone (TEXT, default: 'America/New_York')
├── settings (JSONB, optional)
│   └── { check_in_time, check_out_time, notification_preferences }
├── created_at (TIMESTAMP, default: now())
└── updated_at (TIMESTAMP, default: now())
```

#### 11. Check-In History Table
```
check_in_history
├── id (UUID, primary key)
├── camper_id (UUID, foreign key → campers.id)
├── action (TEXT, required)
│   └── Values: check_in, check_out
├── timestamp (TIMESTAMP, required)
├── staff_id (UUID, foreign key → users.id)
├── location (TEXT, optional)
├── method (TEXT, optional)
│   └── Values: nfc_scan, manual_search, barcode
├── notes (TEXT, optional)
└── created_at (TIMESTAMP, default: now())
```

#### 12. Wristband History Table
```
wristband_history
├── id (UUID, primary key)
├── wristband_id (TEXT, required)
├── camper_id (UUID, foreign key → campers.id)
├── action (TEXT, required)
│   └── Values: assigned, deactivated, replaced, lost, damaged
├── timestamp (TIMESTAMP, required)
├── staff_id (UUID, foreign key → users.id)
├── notes (TEXT, optional)
└── created_at (TIMESTAMP, default: now())
```

#### 13. Audit Log Table
```
audit_log
├── id (UUID, primary key)
├── user_id (UUID, foreign key → users.id)
├── action (TEXT, required)
│   └── Values: create, read, update, delete, login, logout
├── table_name (TEXT, required)
├── record_id (UUID, optional)
├── old_values (JSONB, optional)
├── new_values (JSONB, optional)
├── ip_address (TEXT, optional)
├── user_agent (TEXT, optional)
├── timestamp (TIMESTAMP, default: now())
└── notes (TEXT, optional)
```

### Data Relationships

```
camps (1) ──────────── (many) sessions
  │                              │
  │                              │
  ├─────────────────────────────┤
  │                              │
  │                              │
(many)                        (many)
users                         campers
  │                              │
  │                              ├── (1) camper_medical_info
  │                              ├── (many) emergency_contacts
  │                              ├── (many) check_in_history
  │                              ├── (many) wristband_history
  │                              └── (many) incident_campers
  │                                           │
  │                                           │
  └────────────────────────────────────── (many) incidents
```

---

## Offline Functionality

### Offline Architecture

#### Local Data Storage
**Storage Layers**:
1. **Memory Cache**: In-memory storage for active session data
2. **Local Database**: Persistent storage using local database
3. **Secure Storage**: Encrypted storage for sensitive data (keys, tokens)

**Cached Data**:
- Current session campers (full profiles)
- User profile and permissions
- Recent check-in/out history
- Pending sync operations
- Encryption keys
- App configuration

#### Offline Operations

**Fully Functional Offline**:
- ✅ NFC wristband scanning (read and decrypt)
- ✅ Check-in/check-out campers
- ✅ View camper profiles
- ✅ View medical information (if previously cached)
- ✅ Create incident reports
- ✅ Search cached campers

**Limited Functionality Offline**:
- ⚠️ View non-cached camper profiles (only if previously loaded)
- ⚠️ Edit camper information (queued for sync)
- ⚠️ Create new campers (queued for sync)

**Not Available Offline**:
- ❌ AI assistant queries
- ❌ Real-time parent notifications
- ❌ Staff management
- ❌ Authorization code generation
- ❌ Data export

#### Sync Queue

**Queue Structure**:
```
sync_queue
├── id (UUID)
├── operation (TEXT)
│   └── Values: create, update, delete
├── table_name (TEXT)
├── record_id (UUID)
├── data (JSONB)
├── timestamp (TIMESTAMP)
├── retry_count (INTEGER)
├── status (TEXT)
│   └── Values: pending, in_progress, completed, failed
└── error_message (TEXT, optional)
```

**Sync Process**:
1. Operation performed locally (optimistic update)
2. Operation added to sync queue
3. UI updated immediately
4. Background sync attempts when online
5. Retry failed operations (exponential backoff)
6. Conflict resolution if needed
7. Queue item marked as completed

**Conflict Resolution**:
- **Last-Write-Wins**: Most recent timestamp wins
- **Manual Resolution**: User prompted for conflicts on critical data
- **Merge Strategy**: Non-conflicting fields merged automatically

#### Network Detection

**Connection Monitoring**:
- Continuous network status monitoring
- Automatic sync when connection restored
- Visual indicator of online/offline status
- Bandwidth detection (WiFi vs. cellular)

**Sync Strategies**:
- **WiFi**: Full sync (all pending operations)
- **Cellular**: Priority sync (check-ins, critical incidents)
- **Offline**: Queue all operations

---

## Parent Portal

### Parent Account Creation

**Registration Flow**:
1. Parent receives authorization code via email
2. Parent navigates to registration page
3. Parent enters authorization code
4. Code validated (checks expiration, usage limit)
5. Parent creates account (email, password, name, phone)
6. Account created with 'parent' role
7. Parent linked to camper(s) associated with code
8. Welcome email sent with next steps

**Authorization Code Format**:
- 12-character alphanumeric code
- Example: `CAMP2024ABCD`
- Case-insensitive
- Single-use or multi-use (configurable)
- Expiration date (optional)

### Parent Dashboard

**Dashboard Sections**:
1. **My Campers**: List of linked children
2. **Upcoming Sessions**: Sessions camper is registered for
3. **Recent Activity**: Check-in/out history
4. **Incidents**: Non-sensitive incidents involving camper
5. **Documents**: Uploaded forms and waivers
6. **Messages**: Communication from camp staff

**Camper Cards**:
```
┌─────────────────────────────────────────┐
│  [Photo]  John Doe                      │
│           Age 12 | Cabin A               │
│           Session: Summer 2024 - Week 1 │
│                                         │
│  Status: Checked In                     │
│  Last Check-In: Today at 9:15 AM        │
│                                         │
│  [View Profile] [Edit Info]             │
└─────────────────────────────────────────┘
```

### Parent Capabilities

#### View Camper Information
**Viewable Data**:
- Personal information (name, age, photo)
- Session and cabin assignment
- Check-in/out history
- Emergency contacts
- Medical information (own camper only)
- Non-sensitive incidents
- Uploaded documents

#### Edit Camper Information
**Editable Fields** (before session starts):
- Medical information (allergies, medications, conditions)
- Dietary restrictions
- Special care instructions
- Emergency contacts
- Insurance information

**Locked Fields** (cannot edit):
- Name, date of birth
- Session assignment
- Cabin assignment
- Check-in/out status
- Wristband ID

#### Upload Documents
**Document Types**:
- Medical forms (physical exam, immunization records)
- Liability waivers
- Photo release forms
- Medication authorization
- Special accommodations requests

**Upload Process**:
1. Parent selects document type
2. Parent uploads file (PDF, JPG, PNG)
3. File stored in object storage
4. Document linked to camper
5. Staff notified of new document
6. Staff reviews and approves

#### Notifications
**Notification Types**:
- Check-in/out confirmations
- Incident reports (non-sensitive)
- Session reminders
- Document requests
- Payment reminders
- General announcements

**Notification Channels**:
- Email (always enabled)
- SMS (optional, requires phone number)
- In-app notifications (when logged in)

### Parent-Staff Communication

**Messaging System**:
- Secure messaging between parents and staff
- Thread-based conversations
- Attachment support
- Read receipts
- Push notifications

**Message Types**:
- General inquiries
- Medical updates
- Pickup arrangements
- Incident follow-ups
- Feedback and suggestions

---

## Incident Management

### Incident Lifecycle

**States**:
1. **Open**: Incident just created, no action taken
2. **In Progress**: Staff actively addressing incident
3. **Resolved**: Incident addressed, awaiting closure
4. **Closed**: Incident fully resolved and documented

**State Transitions**:
```
Open → In Progress → Resolved → Closed
  ↓         ↓           ↓
  └─────────┴───────────┴──→ Reopened (if needed)
```

### Incident Details

**Required Fields**:
- Camper(s) involved
- Incident type (medical, behavioral, safety, other)
- Severity (minor, moderate, serious, critical)
- Date and time
- Description

**Optional Fields**:
- Location
- Staff witnesses
- Action taken
- Follow-up required
- Parent notification
- Attachments (photos, documents)

### Incident Notifications

**Automatic Notifications**:
- **Serious/Critical Incidents**: Immediate notification to:
  - Camp director
  - Medical staff (if medical incident)
  - Parent (if parent notification enabled)
  
- **Daily Digest**: Summary of all incidents sent to:
  - Camp director
  - Camp administrator
  
- **Follow-Up Reminders**: Notification when follow-up is due

**Notification Content**:
- Incident summary
- Camper name(s)
- Severity level
- Action taken
- Link to full incident report

### Incident Reporting

**Report Types**:
1. **Individual Incident Report**: Detailed report for single incident
2. **Camper Incident History**: All incidents for specific camper
3. **Session Incident Summary**: All incidents during session
4. **Trend Analysis**: Incident patterns over time

**Report Formats**:
- PDF (printable)
- CSV (data export)
- JSON (API export)

**Report Contents**:
- Incident details
- Camper information
- Staff involved
- Timeline of events
- Actions taken
- Outcomes
- Follow-up status

### Incident Analytics

**Metrics Tracked**:
- Total incidents per session
- Incidents by type
- Incidents by severity
- Incidents by location
- Incidents by time of day
- Average resolution time
- Repeat incidents (same camper)

**Visualizations**:
- Incident trend chart (over time)
- Incident type distribution (pie chart)
- Severity breakdown (bar chart)
- Location heatmap
- Time-of-day heatmap

---

## AI Assistant

### AI Capabilities

**Query Types**:
1. **Camper Lookup**: "Show me all campers with peanut allergies"
2. **Statistics**: "How many campers are checked in right now?"
3. **Incident Search**: "List all medical incidents from last week"
4. **Staff Information**: "Who checked in the most campers today?"
5. **Session Data**: "What's the enrollment for Summer 2024 Week 1?"

**Natural Language Processing**:
- Understands conversational queries
- Handles typos and variations
- Contextual understanding (follow-up questions)
- Multi-part queries

### AI Architecture

**Components**:
1. **Query Parser**: Converts natural language to structured query
2. **Permission Checker**: Validates user has access to requested data
3. **Data Retriever**: Fetches data from database
4. **Response Generator**: Formats data into natural language response
5. **Audit Logger**: Logs all AI queries and responses

**AI Model**:
- Large Language Model (LLM) for query understanding
- Fine-tuned on camp management domain
- Read-only access to database
- No data modification capabilities

### AI Security

**Access Control**:
- Only authorized roles can use AI assistant
- Queries filtered by user permissions
- Cannot access data outside user's scope
- Medical information restricted to medical staff

**Query Restrictions**:
- Read-only queries only
- No data modification
- No user management
- No system configuration
- No sensitive data export

**Audit Trail**:
- All queries logged with user ID
- Query text and response stored
- Timestamp and duration recorded
- Failed queries logged
- Suspicious queries flagged

### AI Response Format

**Response Structure**:
```
User Query: "How many campers have peanut allergies?"

AI Response:
"I found 8 campers with peanut allergies:
1. John Doe (Age 12, Cabin A)
2. Jane Smith (Age 10, Cabin B)
3. ...

All of these campers have EpiPens on file. Would you like more details about any specific camper?"
```

**Response Types**:
- **List**: Multiple results with summary
- **Single Result**: Detailed information about one item
- **Statistics**: Numerical data with context
- **Error**: Explanation of why query couldn't be answered

---

## Authentication & Authorization

### Authentication Methods

#### 1. Email/Password Authentication
**Registration**:
- Email address (unique)
- Password (minimum 8 characters, complexity requirements)
- Full name
- Phone number (optional)
- Authorization code (for parents and staff)

**Login**:
- Email and password
- JWT token issued (15-minute expiration)
- Refresh token issued (7-day expiration)
- Session created in database

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Password Reset**:
1. User requests password reset
2. Reset link sent to email (expires in 1 hour)
3. User clicks link and enters new password
4. Password updated in database
5. All existing sessions invalidated
6. Confirmation email sent

#### 2. Social Authentication (Future)
**Providers**:
- Google OAuth
- Apple Sign-In
- Microsoft Azure AD

**Flow**:
1. User clicks "Sign in with Google"
2. Redirected to Google login
3. User authorizes CampSync
4. Google returns authorization code
5. Backend exchanges code for user info
6. User account created/linked
7. JWT token issued

### Authorization System

#### Role-Based Access Control (RBAC)
**Role Assignment**:
- Assigned during account creation
- Can be changed by directors/administrators
- Role changes logged in audit trail
- Role determines permissions

**Permission Checks**:
- Every API request checks user role
- Database queries filtered by role (RLS)
- UI elements hidden based on role
- Actions validated against role permissions

#### Row-Level Security (RLS)
**Database Policies**:
```sql
-- Example: Only medical staff can view medical info
CREATE POLICY "Medical staff can view medical info"
  ON camper_medical_info FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('medical_staff', 'director', 'administrator')
    )
  );
```

**Policy Types**:
- SELECT: Who can read data
- INSERT: Who can create data
- UPDATE: Who can modify data
- DELETE: Who can delete data

### Session Management

**Session Lifecycle**:
1. User logs in
2. JWT token issued (short-lived)
3. Refresh token issued (long-lived)
4. Session stored in database
5. Token refreshed automatically before expiration
6. Session expires after 7 days of inactivity
7. User must log in again

**Session Security**:
- Tokens stored in secure storage (encrypted)
- Tokens never stored in local storage (web)
- Session invalidated on logout
- All sessions invalidated on password change
- Concurrent session limit (5 devices)

### Multi-Factor Authentication (Future)
**MFA Methods**:
- SMS code
- Authenticator app (TOTP)
- Email code
- Biometric (fingerprint, face ID)

**MFA Enforcement**:
- Optional for all users
- Required for directors and administrators
- Required for accessing sensitive data
- Bypass codes for emergency access

---

## Data Synchronization

### Sync Architecture

**Sync Components**:
1. **Sync Queue**: Local queue of pending operations
2. **Sync Engine**: Background process that syncs data
3. **Conflict Resolver**: Handles data conflicts
4. **Network Monitor**: Detects connectivity changes

### Sync Strategies

#### 1. Optimistic Updates
**Process**:
1. User performs action (e.g., check-in camper)
2. UI updates immediately (optimistic)
3. Operation added to sync queue
4. Background sync attempts to push to server
5. If successful, queue item removed
6. If failed, retry with exponential backoff

**Benefits**:
- Instant UI feedback
- Works offline
- Smooth user experience

**Drawbacks**:
- Potential for conflicts
- Requires conflict resolution
- May need to rollback on failure

#### 2. Pull-Based Sync
**Process**:
1. App periodically checks for server updates
2. Compares local data timestamps with server
3. Downloads newer data from server
4. Merges with local data
5. Updates UI if needed

**Sync Intervals**:
- Foreground: Every 30 seconds
- Background: Every 5 minutes
- On app launch: Immediate
- On network reconnect: Immediate

#### 3. Push-Based Sync
**Process**:
1. Local changes added to sync queue
2. Sync engine processes queue when online
3. Changes pushed to server
4. Server validates and applies changes
5. Server returns confirmation
6. Queue item marked as completed

**Retry Logic**:
- Retry immediately on failure
- Exponential backoff (1s, 2s, 4s, 8s, 16s, 32s)
- Maximum 10 retries
- After 10 failures, mark as failed and alert user

### Conflict Resolution

**Conflict Types**:
1. **Update Conflict**: Same record updated on device and server
2. **Delete Conflict**: Record deleted on device but updated on server
3. **Create Conflict**: Same record created on multiple devices

**Resolution Strategies**:

**1. Last-Write-Wins (LWW)**:
- Compare timestamps
- Most recent change wins
- Losing change discarded
- Used for non-critical data

**2. Manual Resolution**:
- User prompted to choose
- Show both versions side-by-side
- User selects which to keep
- Used for critical data (medical info)

**3. Merge Strategy**:
- Non-conflicting fields merged automatically
- Conflicting fields use LWW or manual resolution
- Used for complex records (camper profiles)

**Conflict Example**:
```
Device A: Update camper cabin to "Cabin A" at 10:00 AM
Device B: Update camper cabin to "Cabin B" at 10:05 AM

Resolution: Device B wins (later timestamp)
Result: Camper cabin set to "Cabin B"
```

### Sync Status Indicators

**Visual Indicators**:
- ✅ **Synced**: Green checkmark, all data up-to-date
- 🔄 **Syncing**: Blue spinner, sync in progress
- ⚠️ **Pending**: Yellow warning, changes waiting to sync
- ❌ **Failed**: Red X, sync failed, manual intervention needed
- 📡 **Offline**: Gray icon, no network connection

**Status Details**:
- Last sync time
- Pending operations count
- Failed operations count
- Network status (WiFi, cellular, offline)

---

## Privacy & Compliance

### Data Privacy

#### Personal Information Protection
**Data Minimization**:
- Only collect necessary data
- No unnecessary personal information
- Regular data audits to remove unused data
- Automatic data deletion after retention period

**Data Anonymization**:
- Analytics use anonymized data
- Exported data can be anonymized
- Incident reports can be de-identified
- Research data fully anonymized

#### Consent Management
**Consent Types**:
- Data collection consent
- Photo/video consent
- Medical information sharing
- Communication preferences
- Third-party data sharing

**Consent Tracking**:
- Consent recorded with timestamp
- Consent can be withdrawn anytime
- Consent changes logged
- Consent status visible to parents

### Compliance

#### COPPA (Children's Online Privacy Protection Act)
**Requirements**:
- Parental consent for children under 13
- No direct marketing to children
- No collection of unnecessary personal information
- Parental access to child's data
- Parental ability to delete child's data

**CampSync Compliance**:
- ✅ Parents create accounts, not children
- ✅ Parents provide all camper information
- ✅ No marketing to campers
- ✅ Parents can view/edit all camper data
- ✅ Parents can request data deletion

#### FERPA (Family Educational Rights and Privacy Act)
**Requirements** (if applicable):
- Protect student education records
- Parental access to records
- Consent required for disclosure
- Right to request amendments
- Annual notification of rights

**CampSync Compliance**:
- ✅ Medical and incident records protected
- ✅ Parents have full access to camper records
- ✅ Staff access restricted by role
- ✅ Parents can request corrections
- ✅ Privacy policy provided to all users

#### HIPAA (Health Insurance Portability and Accountability Act)
**Note**: Most camps are NOT covered entities under HIPAA, but CampSync follows HIPAA-like practices for medical data protection.

**Best Practices**:
- ✅ Medical information encrypted at rest and in transit
- ✅ Access to medical information restricted to authorized staff
- ✅ Audit trail of all medical information access
- ✅ Secure transmission of medical information
- ✅ Business associate agreements with vendors

### Data Retention

**Retention Periods**:
- **Active Campers**: Indefinite (while registered)
- **Inactive Campers**: 7 years after last session
- **Incidents**: 7 years after incident date
- **Audit Logs**: 3 years
- **User Accounts**: Indefinite (until deleted)
- **Wristband History**: 3 years

**Data Deletion**:
- Automatic deletion after retention period
- Manual deletion by directors
- Parent-requested deletion (within 30 days)
- Soft delete (marked as deleted, not physically removed)
- Hard delete (physically removed from database)

### Data Breach Response

**Breach Detection**:
- Automated monitoring for suspicious activity
- Anomaly detection (unusual data access patterns)
- Failed login attempt tracking
- Unauthorized access alerts

**Breach Response Plan**:
1. **Detection**: Identify and confirm breach
2. **Containment**: Isolate affected systems
3. **Assessment**: Determine scope and impact
4. **Notification**: Notify affected users within 72 hours
5. **Remediation**: Fix vulnerabilities
6. **Review**: Post-incident analysis and improvements

**Notification Requirements**:
- Email notification to affected users
- Details of breach (what data, when, how)
- Steps taken to address breach
- Recommendations for users (password change, etc.)
- Contact information for questions

---

## System Performance

### Performance Targets

**Response Times**:
- NFC scan to profile display: < 1 second
- Check-in/out operation: < 2 seconds
- Search results: < 500ms
- Page load: < 1 second
- API requests: < 200ms (average)

**Throughput**:
- 100+ concurrent users
- 1000+ check-ins per hour
- 10,000+ NFC scans per day
- 100+ API requests per second

**Reliability**:
- 99.9% uptime (< 9 hours downtime per year)
- < 0.1% error rate
- Zero data loss
- Automatic failover for critical services

### Performance Optimization

**Database Optimization**:
- Indexed columns for fast queries
- Query optimization (EXPLAIN ANALYZE)
- Connection pooling
- Read replicas for heavy read operations
- Caching frequently accessed data

**API Optimization**:
- Response compression (gzip)
- Pagination for large datasets
- Lazy loading of related data
- Batch operations for bulk updates
- CDN for static assets

**Mobile App Optimization**:
- Image compression and lazy loading
- Virtualized lists for long scrolling
- Debounced search inputs
- Background data prefetching
- Memory management (cleanup unused data)

---

## Monitoring & Logging

### Application Monitoring

**Metrics Tracked**:
- Request rate (requests per second)
- Response time (average, p50, p95, p99)
- Error rate (errors per second)
- Database query time
- Memory usage
- CPU usage
- Network bandwidth

**Alerting**:
- High error rate (> 1%)
- Slow response time (> 1 second)
- High memory usage (> 80%)
- Database connection pool exhausted
- Disk space low (< 10% free)

### Error Logging

**Error Levels**:
- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARN**: Warning messages (potential issues)
- **ERROR**: Error messages (operation failed)
- **FATAL**: Critical errors (system failure)

**Error Context**:
- User ID and role
- Request URL and method
- Request parameters
- Stack trace
- Timestamp
- Device information (mobile)
- Network status (mobile)

**Error Aggregation**:
- Group similar errors
- Track error frequency
- Identify error trends
- Prioritize critical errors

### Audit Logging

**Audited Actions**:
- User login/logout
- Data creation/modification/deletion
- Permission changes
- Medical information access
- Incident creation/updates
- Wristband programming
- Authorization code usage

**Audit Log Contents**:
- User ID and role
- Action performed
- Table and record affected
- Old and new values (for updates)
- Timestamp
- IP address
- User agent

**Audit Log Retention**:
- 3 years for all audit logs
- Exportable for compliance audits
- Searchable and filterable
- Tamper-proof (append-only)

---

## Disaster Recovery

### Backup Strategy

**Backup Types**:
1. **Full Backup**: Complete database backup (daily)
2. **Incremental Backup**: Changes since last backup (hourly)
3. **Transaction Log Backup**: Continuous (every 5 minutes)

**Backup Storage**:
- Primary: Cloud object storage (encrypted)
- Secondary: Offsite backup location
- Retention: 30 days of daily backups, 1 year of monthly backups

**Backup Testing**:
- Monthly restore test
- Verify data integrity
- Measure restore time
- Document restore process

### Recovery Procedures

**Recovery Time Objective (RTO)**: 4 hours
- Maximum acceptable downtime

**Recovery Point Objective (RPO)**: 5 minutes
- Maximum acceptable data loss

**Recovery Steps**:
1. Identify failure and scope
2. Activate disaster recovery plan
3. Restore from most recent backup
4. Apply transaction logs (if available)
5. Verify data integrity
6. Resume operations
7. Post-incident review

### High Availability

**Redundancy**:
- Multiple application servers (load balanced)
- Database replication (primary + replica)
- Automatic failover for database
- Geographic redundancy (multi-region)

**Failover Process**:
1. Health check detects failure
2. Traffic redirected to healthy servers
3. Failed server removed from pool
4. Alert sent to operations team
5. Failed server investigated and repaired
6. Server returned to pool after verification

---

## Future Enhancements

### Planned Features

1. **Advanced Analytics Dashboard**
   - Real-time camp statistics
   - Predictive analytics (enrollment forecasting)
   - Custom report builder
   - Data visualization tools

2. **Mobile App for Parents**
   - Dedicated parent mobile app
   - Push notifications
   - Real-time check-in/out alerts
   - Photo sharing from camp

3. **Integration with Third-Party Systems**
   - Payment processing (Stripe, PayPal)
   - Email marketing (Mailchimp)
   - SMS gateway (Twilio)
   - Calendar sync (Google Calendar, iCal)

4. **Enhanced AI Capabilities**
   - Predictive incident detection
   - Automated incident categorization
   - Natural language incident reporting
   - Chatbot for parent inquiries

5. **Multi-Camp Support**
   - Manage multiple camps from one account
   - Cross-camp reporting
   - Shared staff across camps
   - Centralized billing

6. **Advanced Wristband Features**
   - Contactless payment
   - Activity tracking (steps, location)
   - Geofencing alerts
   - Waterproof wristbands with extended range

7. **Video Integration**
   - Live video streaming from camp
   - Video incident documentation
   - Video messages from campers to parents
   - Virtual camp tours

8. **Gamification**
   - Achievement badges for campers
   - Leaderboards for activities
   - Points system for positive behavior
   - Digital rewards

---

## Technical Specifications Summary

### Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 (100,000 iterations)
- **Salt**: 16 bytes (random)
- **IV**: 12 bytes (random)
- **Auth Tag**: 16 bytes

### NFC
- **Tag Type**: NTAG215/216
- **Frequency**: 13.56 MHz (ISO 14443A)
- **Memory**: 504-888 bytes
- **Read Range**: 1-4 cm
- **Lock Code**: `CAMPSYNC2024LOCK`

### Authentication
- **JWT Expiration**: 15 minutes
- **Refresh Token Expiration**: 7 days
- **Password Requirements**: 8+ chars, uppercase, lowercase, number, special char
- **Session Limit**: 5 concurrent devices

### Performance
- **NFC Scan**: < 1 second
- **Check-In/Out**: < 2 seconds
- **API Response**: < 200ms average
- **Uptime**: 99.9%
- **Error Rate**: < 0.1%

### Data Retention
- **Active Campers**: Indefinite
- **Inactive Campers**: 7 years
- **Incidents**: 7 years
- **Audit Logs**: 3 years
- **Backups**: 30 days (daily), 1 year (monthly)

### Compliance
- ✅ COPPA compliant
- ✅ FERPA compliant (if applicable)
- ✅ HIPAA-like practices for medical data
- ✅ GDPR-ready (data export, deletion, consent)

---

## Glossary

**Authorization Code**: Unique code used to register new users (staff or parents)

**Camper**: Child attending camp, registered in the system

**Check-In**: Process of marking a camper as present at camp

**Check-Out**: Process of marking a camper as leaving camp

**Encryption**: Process of encoding data to prevent unauthorized access

**Incident**: Event involving a camper that requires documentation (medical, behavioral, safety)

**NFC (Near Field Communication)**: Short-range wireless technology used for wristband scanning

**NDEF (NFC Data Exchange Format)**: Standard format for storing data on NFC tags

**Offline-First**: Design approach where app functions without internet connection

**RLS (Row-Level Security)**: Database security feature that restricts data access based on user

**Session**: Time period during which camp operates (e.g., "Summer 2024 - Week 1")

**Sync**: Process of synchronizing local data with server data

**Wristband**: NFC-enabled wristband worn by campers for identification

**Wristband ID**: Unique identifier for each NFC wristband

---

## Document Version

**Version**: 1.0  
**Last Updated**: 2024  
**Author**: CampSync Development Team  
**Status**: Final

---

*This document is confidential and proprietary. Unauthorized distribution is prohibited.*
