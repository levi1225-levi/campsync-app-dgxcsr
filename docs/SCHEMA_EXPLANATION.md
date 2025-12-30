
# CampSync Database Schema Explanation

## Overview
CampSync is a single-camp management system designed to handle multiple sessions throughout the summer. Each session represents a time period when a specific group of campers attends the camp. The mobile app automatically filters and displays campers based on the current active session.

## Core Concepts

### 1. Single Camp System
- There is **ONE** camp in the system
- All sessions, campers, and staff belong to this camp
- The camp has overall start/end dates and capacity

### 2. Sessions
- A session is a time period (e.g., "Week 1", "Session A", "Junior Camp - July")
- Sessions have start and end dates
- Campers are enrolled in specific sessions
- The mobile app shows only campers from the current active session(s)
- Sessions can overlap (e.g., different age groups at the same time)

### 3. Campers
- Each camper is enrolled in one session (future: multiple sessions)
- Campers have medical information, emergency contacts, and parent/guardian links
- Campers are assigned NFC wristbands for check-in/check-out
- The mobile app filters campers by session automatically

## Database Tables

### camps
**Purpose**: Stores the single camp's information

**Key Fields**:
- `id`: Unique identifier (UUID)
- `name`: Camp name
- `location`: Physical location
- `start_date`: Overall camp start date
- `end_date`: Overall camp end date
- `status`: Planning, Active, Completed, Cancelled
- `max_capacity`: Maximum number of campers across all sessions

**Relationships**:
- One camp → Many sessions
- One camp → Many campers
- One camp → Many staff members

**Usage**:
- Created once during initial setup
- Updated rarely (only for camp-wide changes)
- Referenced by all sessions and campers

---

### sessions
**Purpose**: Defines time periods when different groups of campers attend

**Key Fields**:
- `id`: Unique identifier (UUID)
- `camp_id`: Links to the camp (foreign key)
- `name`: Session name (e.g., "Week 1", "Session A")
- `start_date`: When this session starts
- `end_date`: When this session ends
- `max_capacity`: Maximum campers for this session (optional)

**Relationships**:
- Many sessions → One camp
- One session → Many campers

**Usage**:
- Created by admins via the Lovable admin website
- Used by mobile app to filter which campers to display
- Mobile app shows campers where `session.start_date <= today <= session.end_date`

**Example Sessions**:
```
Session 1: "Junior Camp - Week 1" (July 1-7, 2024)
Session 2: "Senior Camp - Week 1" (July 1-7, 2024)  // Can overlap
Session 3: "Junior Camp - Week 2" (July 8-14, 2024)
Session 4: "All Camp - Week 3" (July 15-21, 2024)
```

---

### campers
**Purpose**: Stores individual camper information

**Key Fields**:
- `id`: Unique identifier (UUID)
- `camp_id`: Links to the camp (foreign key)
- `session_id`: Links to the session (foreign key) - **CRITICAL**
- `first_name`, `last_name`: Camper's name
- `date_of_birth`: Used to calculate age
- `registration_status`: pending, incomplete, complete, cancelled
- `wristband_id`: NFC wristband identifier (unique)
- `wristband_assigned`: Boolean flag
- `check_in_status`: checked-in, checked-out, not-arrived
- `last_check_in`, `last_check_out`: Timestamps

**Relationships**:
- Many campers → One camp
- Many campers → One session
- One camper → One medical info record
- One camper → Many emergency contacts
- One camper → Many parents (via parent_camper_links)

**Usage**:
- Created via bulk import on Lovable admin website
- Can be created individually via mobile app "Create Camper" button
- Filtered by session in mobile app
- Updated during check-in/check-out via NFC scanning

**Important Notes**:
- `session_id` should ALWAYS be set during import
- Mobile app only shows campers from current active session(s)
- Wristband ID is used for NFC scanning

---

### camper_medical_info
**Purpose**: Stores medical information for each camper

**Key Fields**:
- `id`: Unique identifier (UUID)
- `camper_id`: Links to camper (foreign key, unique - one-to-one)
- `allergies`: Array of allergy strings
- `medications`: Array of medication strings
- `medical_conditions`: Array of condition strings
- `dietary_restrictions`: Array of dietary restriction strings
- `special_care_instructions`: Free text
- `doctor_name`, `doctor_phone`: Primary care physician
- `insurance_provider`, `insurance_number`: Insurance info
- `notes`: Additional medical notes

**Relationships**:
- One medical info → One camper (one-to-one)

**Usage**:
- Created during bulk import if medical data is provided
- Can be created/updated via mobile app "Create Camper" form
- Displayed to authorized staff (super-admin, camp-admin, staff)
- Critical for emergency situations

**Data Format**:
- Arrays are stored as PostgreSQL arrays: `{Peanuts, Shellfish, Dairy}`
- Comma-separated in CSV import: "Peanuts, Shellfish, Dairy"

---

### emergency_contacts
**Purpose**: Stores emergency contact information for each camper

**Key Fields**:
- `id`: Unique identifier (UUID)
- `camper_id`: Links to camper (foreign key)
- `full_name`: Contact's full name
- `phone`: Contact's phone number
- `email`: Contact's email (optional)
- `relationship`: Relationship to camper (e.g., "Mother", "Father")
- `priority_order`: 1 or 2 (which contact to call first)

**Relationships**:
- Many emergency contacts → One camper

**Usage**:
- Created during bulk import
- Can be created/updated via mobile app "Create Camper" form
- Displayed to authorized staff
- Used in emergency situations

**Requirements**:
- Each camper should have at least one emergency contact
- Priority order determines call order (1 = first, 2 = second)

---

### parent_guardians
**Purpose**: Stores parent/guardian user accounts

**Key Fields**:
- `id`: Unique identifier (UUID, links to auth.users)
- `email`: Parent's email (unique)
- `full_name`: Parent's full name
- `phone`: Parent's phone number
- `home_address`: Home address

**Relationships**:
- One parent → Many campers (via parent_camper_links)
- One parent → One auth.users record

**Usage**:
- Created when parent registers with authorization code
- Can be created during bulk import if parent email is provided
- Used for parent portal access (future feature)
- Links to Supabase Auth for authentication

**Important Notes**:
- `id` is the same as the Supabase Auth user ID
- Parents can have multiple campers (siblings)
- Parents can view only their linked campers

---

### parent_camper_links
**Purpose**: Links parents to their campers (many-to-many relationship)

**Key Fields**:
- `id`: Unique identifier (UUID)
- `parent_id`: Links to parent_guardians (foreign key)
- `camper_id`: Links to campers (foreign key)
- `relationship`: Relationship type (e.g., "Mother", "Father", "Guardian")

**Relationships**:
- Many links → One parent
- Many links → One camper

**Usage**:
- Created during bulk import if parent info is provided
- Created when parent accepts invitation
- Used to determine which campers a parent can view
- Used for RLS policies

**Example**:
```
Parent: John Doe (john@example.com)
  → Camper: Jane Doe (relationship: "Father")
  → Camper: Jack Doe (relationship: "Father")

Parent: Mary Doe (mary@example.com)
  → Camper: Jane Doe (relationship: "Mother")
  → Camper: Jack Doe (relationship: "Mother")
```

---

### authorization_codes
**Purpose**: Controls user registration and access

**Key Fields**:
- `id`: Unique identifier (UUID)
- `code`: The actual code string (unique)
- `role`: super-admin, camp-admin, staff, parent
- `is_active`: Boolean flag
- `expires_at`: Expiration date (optional)
- `max_uses`: Maximum number of uses (optional)
- `used_count`: How many times it's been used
- `linked_camper_ids`: Array of camper IDs (for parent codes)
- `created_by`: Who created this code

**Relationships**:
- Many codes → One creator (user)

**Usage**:
- Created by admins via Lovable admin website
- Used during user registration in mobile app
- Determines user role and permissions
- For parent codes, links to specific campers

**Code Types**:
1. **Staff Codes**: Role = staff, no linked campers
2. **Admin Codes**: Role = camp-admin or super-admin, no linked campers
3. **Parent Codes**: Role = parent, linked_camper_ids = [camper1_id, camper2_id]

**Example Parent Code Flow**:
1. Admin creates parent code linked to Jane Doe and Jack Doe
2. Admin gives code to parent John Doe
3. John registers with code
4. System creates parent_guardians record for John
5. System creates parent_camper_links for Jane and Jack
6. John can now view Jane and Jack in parent portal

---

### user_profiles
**Purpose**: Stores user profile information

**Key Fields**:
- `id`: Unique identifier (UUID, links to auth.users)
- `email`: User's email
- `full_name`: User's full name
- `phone`: User's phone number
- `role`: super-admin, camp-admin, staff, parent
- `registration_complete`: Boolean flag

**Relationships**:
- One profile → One auth.users record

**Usage**:
- Created during user registration
- Used for role-based access control
- Updated during profile editing
- Linked to Supabase Auth

**Roles**:
- **super-admin**: Full system access, can manage everything
- **camp-admin**: Camp management, can manage campers and staff
- **staff**: Can view campers, check-in/check-out, view medical info
- **parent**: Can only view their linked campers

---

### audit_logs
**Purpose**: Tracks all system changes for accountability

**Key Fields**:
- `id`: Unique identifier (UUID)
- `user_id`: Who made the change (foreign key)
- `action`: What action was performed (e.g., "create", "update", "delete")
- `table_name`: Which table was affected
- `record_id`: Which record was affected
- `old_data`: Previous data (JSONB)
- `new_data`: New data (JSONB)
- `ip_address`: User's IP address
- `user_agent`: User's browser/device info

**Relationships**:
- Many logs → One user

**Usage**:
- Automatically created on data changes (via triggers)
- Viewed in admin website for debugging
- Used for compliance and accountability
- Cannot be deleted (append-only)

---

## Data Flow Examples

### Example 1: Bulk Import Campers
1. Admin logs into Lovable admin website
2. Admin creates a session: "Week 1 - Junior Camp" (July 1-7, 2024)
3. Admin downloads CSV template with session_id pre-filled
4. Admin fills CSV with camper data:
   ```csv
   first_name,last_name,date_of_birth,session_id,allergies,parent1_email
   Jane,Doe,2010-05-15,<session_id>,Peanuts,john@example.com
   Jack,Doe,2012-08-20,<session_id>,,john@example.com
   ```
5. Admin uploads CSV
6. System creates:
   - 2 camper records (Jane and Jack)
   - 2 medical info records (Jane has allergies)
   - 1 parent_guardians record (john@example.com)
   - 2 parent_camper_links (John → Jane, John → Jack)
7. System generates parent authorization code for John
8. Admin sends code to John
9. John registers in mobile app with code
10. John can now view Jane and Jack in parent portal

### Example 2: Mobile App Session Filtering
1. Today is July 3, 2024
2. Mobile app checks current date
3. Mobile app queries sessions where:
   - `start_date <= 2024-07-03`
   - `end_date >= 2024-07-03`
4. Finds "Week 1 - Junior Camp" (July 1-7)
5. Mobile app queries campers where:
   - `session_id = <week_1_session_id>`
6. Displays only campers enrolled in Week 1
7. Staff can check-in/check-out these campers via NFC

### Example 3: NFC Check-in
1. Staff opens NFC Scanner in mobile app
2. Staff scans camper's wristband
3. Mobile app reads wristband_id: "NFC-12345"
4. Mobile app queries campers where:
   - `wristband_id = "NFC-12345"`
   - `session_id = <current_session_id>`
5. Finds camper: Jane Doe
6. Mobile app updates camper:
   - `check_in_status = "checked-in"`
   - `last_check_in = now()`
7. Mobile app displays camper info and medical alerts
8. Audit log created for check-in action

---

## Row Level Security (RLS) Policies

All tables have RLS enabled to ensure data security:

### campers
- **Super Admin / Camp Admin**: Can view and edit all campers
- **Staff**: Can view all campers in their camp, cannot edit
- **Parents**: Can only view campers linked to them via parent_camper_links

### camper_medical_info
- **Super Admin / Camp Admin / Staff**: Can view all medical info
- **Parents**: Can view medical info for their linked campers

### sessions
- **Super Admin / Camp Admin**: Can view and edit all sessions
- **Staff**: Can view all sessions, cannot edit
- **Parents**: Can view sessions for their linked campers

### authorization_codes
- **Super Admin / Camp Admin**: Can view and manage all codes
- **Staff / Parents**: Cannot access

### user_profiles
- **Super Admin**: Can view and edit all profiles
- **Camp Admin**: Can view all profiles, edit staff/parent profiles
- **Staff / Parents**: Can only view/edit their own profile

---

## Best Practices

### For Admins
1. **Create sessions first** before importing campers
2. **Always set session_id** during camper import
3. **Generate parent codes** with linked_camper_ids for parent access
4. **Review audit logs** regularly for security
5. **Set session dates carefully** - mobile app relies on them

### For Developers
1. **Always filter by session** when querying campers in mobile app
2. **Respect RLS policies** - use appropriate user context
3. **Use transactions** for multi-table operations (e.g., bulk import)
4. **Log all data changes** to audit_logs
5. **Validate session dates** - end date must be after start date

### For Mobile App
1. **Cache session data** to reduce queries
2. **Filter campers by current session** automatically
3. **Show session name** in UI so staff know which session is active
4. **Handle session transitions** gracefully (e.g., between sessions)
5. **Sync data** when online after offline operations

---

## Future Enhancements

### Multi-Session Enrollment
- Allow campers to be enrolled in multiple sessions
- Add `camper_session_links` table (many-to-many)
- Update mobile app to handle multiple sessions per camper

### Session Templates
- Create reusable session templates (e.g., "Week 1 Junior Camp")
- Clone sessions from previous years
- Auto-generate sessions based on camp dates

### Automated Session Activation
- Automatically activate sessions based on current date
- Send notifications when session starts/ends
- Auto-archive completed sessions

### Parent Portal Enhancements
- Allow parents to update medical info
- Enable parent-to-staff messaging
- Show session schedule and activities
- Allow parents to upload photos

---

## Troubleshooting

### Issue: Mobile app shows no campers
**Cause**: No active session for current date
**Solution**: Check session dates in admin website, ensure session covers today

### Issue: Parent can't see their campers
**Cause**: Missing parent_camper_links
**Solution**: Check parent_camper_links table, ensure links exist

### Issue: Bulk import fails
**Cause**: Invalid session_id or missing required fields
**Solution**: Validate CSV data, ensure session_id exists in sessions table

### Issue: NFC scan doesn't find camper
**Cause**: Camper not in current session or wristband_id mismatch
**Solution**: Check camper's session_id and wristband_id

---

## Summary

The CampSync database is designed around the concept of **sessions** - time periods when specific groups of campers attend. The mobile app automatically filters campers by the current active session, ensuring staff only see relevant campers. The Lovable admin website provides comprehensive management tools for sessions, campers, and users, with bulk import being the primary method for adding campers to the system.

**Key Takeaways**:
1. One camp, many sessions
2. Campers belong to specific sessions
3. Mobile app filters by current session
4. Bulk import is the primary data entry method
5. RLS policies ensure data security
6. Audit logs track all changes
