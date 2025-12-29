
# CampSync Data Model Documentation

## Overview

CampSync is built around a clear, structured data model that reflects how real camps operate. The system organizes information at three core levels: **Camp**, **Camper**, and **Parent/Guardian**, with relationships designed for accuracy, security, and ease of use.

## Database Schema

### Core Entities

#### 1. Camps Table
Represents a single operating camp and acts as the top-level container for all related data.

**Fields:**
- `id` (UUID, Primary Key)
- `name` (Text, Required)
- `description` (Text, Optional)
- `location` (Text, Required)
- `start_date` (Date, Required)
- `end_date` (Date, Required)
- `status` (Enum: 'Planning', 'Active', 'Completed', 'Cancelled')
- `max_capacity` (Integer, Required)
- `parent_registration_deadline` (Date, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Relationships:**
- Has many Sessions
- Has many Campers
- Has many Camp Staff assignments

#### 2. Sessions Table
Represents time-based groupings within a camp (e.g., Week 1, Week 2).

**Fields:**
- `id` (UUID, Primary Key)
- `camp_id` (UUID, Foreign Key → camps)
- `name` (Text, Required)
- `start_date` (Date, Required)
- `end_date` (Date, Required)
- `max_capacity` (Integer, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### 3. Campers Table
Represents a child attending the camp - the core operational unit.

**Fields:**
- `id` (UUID, Primary Key)
- `camp_id` (UUID, Foreign Key → camps)
- `session_id` (UUID, Foreign Key → sessions, Optional)
- `first_name` (Text, Required)
- `last_name` (Text, Required)
- `date_of_birth` (Date, Required)
- `registration_status` (Enum: 'pending', 'incomplete', 'complete', 'cancelled')
- `wristband_id` (Text, Unique, Optional)
- `wristband_assigned` (Boolean, Default: false)
- `photo_url` (Text, Optional)
- `check_in_status` (Enum: 'checked-in', 'checked-out', 'not-arrived')
- `last_check_in` (Timestamp, Optional)
- `last_check_out` (Timestamp, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Relationships:**
- Belongs to one Camp
- Belongs to one Session (optional)
- Has one Medical Info record
- Has up to 2 Emergency Contacts
- Has many Parent/Guardian links

#### 4. Camper Medical Info Table
Stores medical and safety information for campers.

**Fields:**
- `id` (UUID, Primary Key)
- `camper_id` (UUID, Foreign Key → campers, Unique)
- `allergies` (Text Array)
- `medications` (Text Array)
- `medical_conditions` (Text Array)
- `special_care_instructions` (Text, Optional)
- `dietary_restrictions` (Text Array)
- `doctor_name` (Text, Optional)
- `doctor_phone` (Text, Optional)
- `insurance_provider` (Text, Optional)
- `insurance_number` (Text, Optional)
- `notes` (Text, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Important:** Medical information is NEVER stored on NFC wristbands. It is always retrieved dynamically from the database.

#### 5. Emergency Contacts Table
Stores emergency contact information for campers (up to 2 per camper).

**Fields:**
- `id` (UUID, Primary Key)
- `camper_id` (UUID, Foreign Key → campers)
- `full_name` (Text, Required)
- `phone` (Text, Required)
- `relationship` (Text, Required)
- `priority_order` (Integer: 1 or 2, Required)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Constraints:**
- Unique constraint on (camper_id, priority_order)
- Only 2 emergency contacts per camper

#### 6. Parent Guardians Table
Stores parent/guardian information.

**Fields:**
- `id` (UUID, Primary Key, Foreign Key → auth.users)
- `email` (Text, Unique, Required)
- `full_name` (Text, Required)
- `phone` (Text, Optional)
- `home_address` (Text, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Relationships:**
- Links to multiple Campers through parent_camper_links

#### 7. Parent Camper Links Table
Junction table linking parents to their children.

**Fields:**
- `id` (UUID, Primary Key)
- `parent_id` (UUID, Foreign Key → parent_guardians)
- `camper_id` (UUID, Foreign Key → campers)
- `relationship` (Text, Required - e.g., "Mother", "Father", "Guardian")
- `created_at` (Timestamp)

**Constraints:**
- Unique constraint on (parent_id, camper_id)

#### 8. Parent Invitations Table
Tracks invitation status for parents.

**Fields:**
- `id` (UUID, Primary Key)
- `camper_id` (UUID, Foreign Key → campers)
- `email` (Text, Required)
- `full_name` (Text, Required)
- `relationship` (Text, Required)
- `invitation_token` (Text, Unique, Required)
- `status` (Enum: 'pending', 'accepted', 'expired')
- `sent_at` (Timestamp)
- `accepted_at` (Timestamp, Optional)
- `expires_at` (Timestamp, Required)
- `created_at` (Timestamp)

### Supporting Tables

#### 9. User Profiles Table
Extends Supabase auth.users with additional profile information.

**Fields:**
- `id` (UUID, Primary Key, Foreign Key → auth.users)
- `email` (Text, Required)
- `full_name` (Text, Required)
- `phone` (Text, Optional)
- `role` (Enum: 'super-admin', 'camp-admin', 'staff', 'parent')
- `registration_complete` (Boolean, Default: false)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### 10. Camp Staff Table
Junction table linking staff to camps with roles.

**Fields:**
- `id` (UUID, Primary Key)
- `camp_id` (UUID, Foreign Key → camps)
- `user_id` (UUID, Foreign Key → auth.users)
- `role` (Enum: 'camp-admin', 'staff')
- `assigned_at` (Timestamp)

**Constraints:**
- Unique constraint on (camp_id, user_id)

#### 11. Audit Logs Table
Tracks all changes for accountability.

**Fields:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → auth.users, Optional)
- `action` (Text, Required)
- `table_name` (Text, Required)
- `record_id` (UUID, Optional)
- `old_data` (JSONB, Optional)
- `new_data` (JSONB, Optional)
- `ip_address` (Text, Optional)
- `user_agent` (Text, Optional)
- `created_at` (Timestamp)

## Row Level Security (RLS) Policies

All tables implement comprehensive RLS policies to ensure data isolation and security:

### Access Patterns

**Super Admins:**
- Full access to all data across all camps
- Can create, read, update, and delete any record

**Camp Admins:**
- Full access to data within their assigned camp(s)
- Can manage campers, sessions, staff, and incidents
- Can view parent information for campers in their camps

**Staff:**
- Read access to campers in their assigned camp(s)
- Can update check-in/check-out status
- Can view medical and emergency contact information
- Cannot edit camp configuration or camper profiles

**Parents:**
- Access restricted to their own child(ren) only
- Can view and update their child's medical information
- Can view and update emergency contacts
- Can complete registration forms
- Cannot view other campers or camp-wide data

### Key RLS Patterns

1. **Camp Isolation:**
   ```sql
   camp_id in (
     select camp_id 
     from camp_staff 
     where user_id = auth.uid()
   )
   ```

2. **Parent-Child Restriction:**
   ```sql
   camper_id in (
     select camper_id 
     from parent_camper_links 
     where parent_id = auth.uid()
   )
   ```

3. **Role-Based Access:**
   ```sql
   (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'super-admin'
   ```

## Parent Invitation & Linking Flow

### Process Overview

1. **Camper Creation:**
   - Camp Admin creates a camper record
   - Provides parent email(s) and information

2. **Invitation Generation:**
   - System generates unique invitation token
   - Creates record in parent_invitations table
   - Sends email with secure link

3. **Parent Authentication:**
   - Parent clicks invitation link
   - Authenticates via Google or email
   - System validates invitation token

4. **Account Linking:**
   - Creates parent_guardians record
   - Creates parent_camper_links record
   - Updates invitation status to 'accepted'

5. **Access Granted:**
   - Parent can now access their child's information
   - Can complete registration forms
   - Can update medical and emergency contact info

### Edge Functions

#### send-parent-invitation
Handles sending invitation emails to parents.

**Endpoint:** `/functions/v1/send-parent-invitation`

**Input:**
```json
{
  "camperId": "uuid",
  "email": "parent@example.com",
  "fullName": "John Doe",
  "relationship": "Father"
}
```

**Output:**
```json
{
  "success": true,
  "invitation": { ... },
  "message": "Invitation sent successfully"
}
```

#### bulk-import-campers
Handles bulk import of campers from CSV files.

**Endpoint:** `/functions/v1/bulk-import-campers`

**Input:**
```json
{
  "campers": [
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "dateOfBirth": "2015-06-15",
      "campId": "uuid",
      "parent1Email": "parent@example.com",
      ...
    }
  ]
}
```

**Output:**
```json
{
  "success": true,
  "summary": {
    "total": 100,
    "success": 98,
    "errors": 2
  },
  "results": [ ... ]
}
```

## Bulk Camper Import

### CSV Format

The bulk import accepts CSV files with the following columns:

**Required Fields:**
- firstName
- lastName
- dateOfBirth (YYYY-MM-DD)
- campId

**Optional Fields:**
- sessionId
- parent1Name, parent1Email, parent1Phone, parent1Relationship
- parent2Name, parent2Email, parent2Phone, parent2Relationship
- allergies (comma-separated)
- medications (comma-separated)
- medicalConditions (comma-separated)
- dietaryRestrictions (comma-separated)
- emergencyContact1Name, emergencyContact1Phone, emergencyContact1Relationship
- emergencyContact2Name, emergencyContact2Phone, emergencyContact2Relationship

### Import Process

1. **Validation:**
   - Checks required fields
   - Validates data formats
   - Verifies camp and session IDs exist

2. **Camper Creation:**
   - Creates camper records
   - Sets initial registration status to 'pending'

3. **Medical Info:**
   - Creates medical info records if data provided
   - Parses comma-separated lists

4. **Emergency Contacts:**
   - Creates up to 2 emergency contacts per camper

5. **Parent Invitations:**
   - Generates invitation tokens
   - Creates invitation records
   - Queues emails for sending

6. **Audit Logging:**
   - Records import summary
   - Tracks success/error counts

## Data Integrity & Permissions

### Enforcement Mechanisms

1. **Database Constraints:**
   - Foreign key relationships
   - Unique constraints
   - Check constraints on enums

2. **RLS Policies:**
   - Enforced at database level
   - Cannot be bypassed by application code
   - Automatic filtering of queries

3. **Audit Logging:**
   - All changes tracked
   - User attribution
   - Timestamp recording

4. **Real-time Updates:**
   - Supabase Realtime for instant propagation
   - Optimistic UI updates
   - Conflict resolution

### Data Isolation

- **Camp Level:** Data from one camp is fully isolated from others
- **Parent Level:** Parents can only access their own child(ren)
- **Staff Level:** Staff can only access campers in their assigned camps

## API Services

### Database Service (`services/database.service.ts`)

Provides typed methods for all database operations:

- `campService`: Camp CRUD operations
- `sessionService`: Session management
- `camperService`: Camper operations, medical info, emergency contacts
- `parentService`: Parent operations, invitations, linking
- `auditService`: Audit log operations

### React Hooks

Custom hooks for data fetching and mutations:

- `useCamps()`: Fetch and manage camps
- `useCampers(campId)`: Fetch campers for a camp
- `useCamper(id)`: Fetch detailed camper information
- `useParent(id)`: Fetch parent and children information
- `useSendParentInvitation()`: Send parent invitations
- `useBulkImportCampers()`: Bulk import campers

## TypeScript Types

All database entities have corresponding TypeScript types:

- `types/camp.ts`: Camp, CampStaff, CampWithDetails
- `types/session.ts`: Session, SessionWithDetails
- `types/camper.ts`: Camper, CamperMedicalInfo, EmergencyContact, CamperWithDetails
- `types/parent.ts`: ParentGuardian, ParentCamperLink, ParentInvitation
- `types/audit.ts`: AuditLog, AuditLogWithUser

## Security Considerations

1. **Authentication Required:**
   - All API calls require valid JWT token
   - Edge Functions verify JWT

2. **Role-Based Access:**
   - Stored in auth.jwt() app_metadata
   - Checked in RLS policies

3. **Data Encryption:**
   - All data encrypted at rest (Supabase default)
   - TLS for data in transit

4. **Invitation Security:**
   - Unique tokens (UUID v4)
   - Expiration dates
   - One-time use

5. **Medical Data Protection:**
   - Never stored on NFC wristbands
   - Always retrieved dynamically
   - Access logged in audit trail

## Performance Optimizations

1. **Indexes:**
   - All foreign keys indexed
   - Frequently queried fields indexed
   - Composite indexes where appropriate

2. **RLS Optimization:**
   - Use `(select auth.uid())` pattern
   - Minimize joins in policies
   - Specify roles with `TO` clause

3. **Query Optimization:**
   - Use `.select()` to fetch only needed fields
   - Batch operations where possible
   - Implement pagination for large lists

## Future Enhancements

1. **Email Service Integration:**
   - SendGrid, Resend, or AWS SES
   - Email templates
   - Batch sending for bulk imports

2. **File Storage:**
   - Supabase Storage for photos
   - Document uploads
   - CSV file storage

3. **Real-time Notifications:**
   - Push notifications for parents
   - Staff alerts
   - Incident notifications

4. **Advanced Reporting:**
   - Camp statistics
   - Attendance reports
   - Medical summary reports

5. **Multi-language Support:**
   - Internationalization
   - Localized emails
   - Date/time formatting
