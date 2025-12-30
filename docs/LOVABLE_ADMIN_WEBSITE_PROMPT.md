
# CampSync Admin Website - Lovable.dev Prompt

## Project Overview
Create a modern, responsive web application for managing CampSync's authorization codes, users, session dates, and bulk camper imports. This admin website will connect to an existing Supabase project and provide a comprehensive management interface for camp administrators.

**Important**: This is a single-camp management system. The camp has multiple sessions throughout the summer where different groups of campers attend at different times. The app automatically updates and changes based on the current session and the campers enrolled in it.

## Supabase Connection
- **Project URL**: Use the existing Supabase project
- **Authentication**: Implement secure login using Supabase Auth
- **Database**: Connect to existing tables (see schema below)

## Core Features

### 1. Authentication & Authorization
- Secure login page with email/password authentication
- Role-based access control (Super Admin, Camp Admin)
- Session management with automatic logout on inactivity
- Password reset functionality

### 2. Session Management (NEW - CRITICAL FEATURE)
**Table**: `sessions`

**Purpose**: The camp runs multiple sessions throughout the summer. Each session has specific start and end dates, and campers are enrolled in one or more sessions. The mobile app automatically filters and displays campers based on the current active session.

**Features**:
- **View All Sessions**: Display a calendar view and list view of all sessions
  - Columns: Session Name, Start Date, End Date, Max Capacity, Current Enrollment, Status (Upcoming/Active/Completed)
  - Filter by: Status, Date Range
  - Sort by: Start Date, Name, Enrollment
  - Visual indicator for currently active session(s)
  
- **Create New Session**: Modal/form to create a new camp session
  - Fields:
    - Session Name (e.g., "Week 1 - Junior Camp", "Session A", "August Session")
    - Start Date (required)
    - End Date (required)
    - Max Capacity (optional)
    - Camp ID (auto-filled with the single camp ID)
  - Validation:
    - End date must be after start date
    - Check for overlapping sessions (warn but allow)
    - Prevent dates in the past
  
- **Edit Session**: Update session details
  - Modify dates, name, capacity
  - View list of enrolled campers
  - Warning if campers are already enrolled when changing dates
  
- **Delete Session**: Soft delete with confirmation
  - Warning if campers are enrolled in this session
  - Option to reassign campers to another session
  
- **Session Dashboard**:
  - Current active session(s) highlighted
  - Quick stats: Total sessions, Active sessions, Upcoming sessions
  - Enrollment progress bars for each session
  - Timeline view of all sessions

**Integration with Camper Import**:
- During bulk camper import, the CSV must include a `session_id` column
- Campers can be enrolled in multiple sessions (future enhancement)
- The mobile app filters campers by current session automatically

### 3. Authorization Codes Management
**Table**: `authorization_codes`

**Features**:
- **View All Codes**: Display a searchable, sortable table of all authorization codes
  - Columns: Code, Role, Status (Active/Inactive), Expiration Date, Max Uses, Used Count, Created Date
  - Filter by: Role, Status, Expiration
  - Search by: Code
  
- **Create New Code**: Modal/form to generate new authorization codes
  - Fields:
    - Role (dropdown: super-admin, camp-admin, staff, parent)
    - Expiration Date (optional)
    - Max Uses (optional, default: unlimited)
    - Linked Camper IDs (for parent codes, multi-select)
  - Auto-generate unique code or allow custom code entry
  - Validation to prevent duplicate codes
  
- **Edit Code**: Update code properties
  - Change expiration date
  - Modify max uses
  - Toggle active/inactive status
  - Update linked camper IDs
  
- **Delete Code**: Soft delete with confirmation dialog
  
- **Bulk Actions**:
  - Generate multiple codes at once
  - Export codes to CSV
  - Deactivate expired codes in bulk

### 4. User Management
**Table**: `user_profiles`

**Features**:
- **View All Users**: Display a searchable, sortable table
  - Columns: Name, Email, Role, Registration Status, Created Date, Last Login
  - Filter by: Role, Registration Status
  - Search by: Name, Email
  
- **User Details**: Click to view full user profile
  - Display all user information
  - Show associated authorization code used
  - View user activity log (from `audit_logs` table)
  
- **Edit User**: Update user information
  - Change role (with confirmation)
  - Update name, email, phone
  - Toggle registration complete status
  
- **Delete User**: Soft delete with confirmation
  - Option to anonymize data instead of deletion
  
- **User Actions**:
  - Send password reset email
  - Resend verification email
  - Manually verify email

### 5. Bulk Camper Import
**Table**: `campers`

**CRITICAL**: This is the PRIMARY way to add campers to the system. The mobile app only has a "Create Camper" button for individual additions. Bulk import is exclusively on this admin website.

**Features**:
- **CSV Upload Interface**:
  - Drag-and-drop file upload
  - File validation (check format, size)
  - Preview first 10 rows before import
  
- **CSV Template**:
  - Provide downloadable CSV template with required columns:
    - first_name (required)
    - last_name (required)
    - date_of_birth (required, format: YYYY-MM-DD)
    - camp_id (required, UUID - provide the camp ID in the template)
    - **session_id (required, UUID - dropdown to select session when downloading template)**
    - wristband_id (optional, unique)
    - photo_url (optional)
    - parent1_name (optional)
    - parent1_email (optional)
    - parent1_phone (optional)
    - parent1_relationship (optional)
    - parent2_name (optional)
    - parent2_email (optional)
    - parent2_phone (optional)
    - parent2_relationship (optional)
    - allergies (optional, comma-separated)
    - medications (optional, comma-separated)
    - medical_conditions (optional, comma-separated)
    - dietary_restrictions (optional, comma-separated)
    - emergency_contact1_name (optional)
    - emergency_contact1_phone (optional)
    - emergency_contact1_relationship (optional)
    - emergency_contact2_name (optional)
    - emergency_contact2_phone (optional)
    - emergency_contact2_relationship (optional)
  
- **Import Process**:
  - **Session Selection**: Before import, select which session these campers are enrolling in
  - Validate all rows before import
  - Show validation errors with row numbers
  - Display progress bar during import
  - Handle duplicates (skip or update)
  - Generate wristband IDs if not provided
  - Automatically create medical info records
  - Automatically create emergency contact records
  - Automatically create parent guardian records and link to campers
  
- **Import Results**:
  - Summary: Total rows, Successful imports, Failed imports, Skipped duplicates
  - Detailed error log with row numbers and error messages
  - Option to download error report
  - Option to retry failed imports

### 6. Camper Management
**Table**: `campers`

**Features**:
- **View All Campers**: Display a searchable, sortable table
  - Columns: Name, Age, Session, Wristband ID, Registration Status, Check-in Status
  - Filter by: Session, Registration Status, Check-in Status
  - Search by: Name, Wristband ID
  - **Session Filter**: Dropdown to filter by specific session or view all
  
- **Camper Details**: Click to view full camper profile
  - Basic info: Name, DOB, Photo
  - Session enrollment
  - Medical information
  - Emergency contacts
  - Parent/guardian information
  - Check-in/check-out history
  
- **Edit Camper**: Update camper information
  - Change session enrollment
  - Update medical info
  - Modify emergency contacts
  - Assign/change wristband ID
  
- **Bulk Actions**:
  - Export campers to CSV (filtered by session)
  - Assign wristbands in bulk
  - Move campers between sessions

### 7. Dashboard
**Home Page Features**:
- **Current Session Highlight**:
  - Large card showing currently active session(s)
  - Quick stats for active session: Enrolled campers, Checked-in today, Capacity
  
- **Statistics Cards**:
  - Total Users (by role)
  - Active Authorization Codes
  - Total Campers (all sessions)
  - Campers in Current Session
  - Upcoming Sessions
  
- **Recent Activity Feed**:
  - Last 20 actions from `audit_logs` table
  - Filter by action type, user, date range
  
- **Quick Actions**:
  - Create Session
  - Create Authorization Code
  - Add New User
  - Import Campers
  - View Reports

### 8. Reports & Analytics
- **Session Reports**:
  - Enrollment by session
  - Session capacity utilization
  - Session timeline
  
- **Authorization Code Usage Report**:
  - Codes used vs. unused
  - Usage by role
  - Expiration trends
  
- **User Registration Report**:
  - Registration completion rate
  - Users by role
  - Registration timeline
  
- **Camper Import History**:
  - Import success rate
  - Import timeline
  - Error trends

## Database Schema Reference

### camps
```sql
- id (uuid, primary key)
- name (text)
- description (text, nullable)
- location (text)
- start_date (date)
- end_date (date)
- status (text: Planning, Active, Completed, Cancelled)
- max_capacity (integer)
- parent_registration_deadline (date, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Note**: This is a single-camp system. There should only be ONE camp record. All sessions and campers belong to this camp.

### sessions (CRITICAL TABLE)
```sql
- id (uuid, primary key)
- camp_id (uuid, foreign key to camps)
- name (text) - e.g., "Week 1", "Session A", "Junior Camp - July"
- start_date (date)
- end_date (date)
- max_capacity (integer, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Purpose**: Defines time periods when different groups of campers attend. The mobile app uses this to filter which campers to display based on the current date.

**Relationships**:
- One camp has many sessions
- One session has many campers
- Campers can be enrolled in one session (future: multiple sessions)

### campers
```sql
- id (uuid, primary key)
- camp_id (uuid, foreign key to camps)
- session_id (uuid, foreign key to sessions, nullable but should be set during import)
- first_name (text)
- last_name (text)
- date_of_birth (date)
- registration_status (text: pending, incomplete, complete, cancelled)
- wristband_id (text, unique, nullable)
- wristband_assigned (boolean, default: false)
- photo_url (text, nullable)
- check_in_status (text: checked-in, checked-out, not-arrived)
- last_check_in (timestamptz, nullable)
- last_check_out (timestamptz, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Key Points**:
- `session_id` links camper to a specific session
- Mobile app filters campers by current session
- Wristband ID is used for NFC scanning in the mobile app

### camper_medical_info
```sql
- id (uuid, primary key)
- camper_id (uuid, foreign key to campers, unique)
- allergies (text[], nullable)
- medications (text[], nullable)
- medical_conditions (text[], nullable)
- special_care_instructions (text, nullable)
- dietary_restrictions (text[], nullable)
- doctor_name (text, nullable)
- doctor_phone (text, nullable)
- insurance_provider (text, nullable)
- insurance_number (text, nullable)
- notes (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Key Points**:
- One-to-one relationship with campers
- Arrays are stored as PostgreSQL arrays
- Can be created during bulk import

### emergency_contacts
```sql
- id (uuid, primary key)
- camper_id (uuid, foreign key to campers)
- full_name (text)
- phone (text)
- email (text, nullable)
- relationship (text)
- priority_order (integer, check: 1 or 2)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Key Points**:
- Each camper should have at least one emergency contact
- Priority order determines which contact to call first
- Can be created during bulk import

### parent_guardians
```sql
- id (uuid, primary key, foreign key to auth.users)
- email (text, unique)
- full_name (text)
- phone (text, nullable)
- home_address (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Key Points**:
- Links to auth.users table (Supabase Auth)
- Can have multiple campers
- Created during bulk import if parent email is provided

### parent_camper_links
```sql
- id (uuid, primary key)
- parent_id (uuid, foreign key to parent_guardians)
- camper_id (uuid, foreign key to campers)
- relationship (text)
- created_at (timestamptz)
```

**Key Points**:
- Many-to-many relationship between parents and campers
- One parent can have multiple campers
- One camper can have multiple parents

### authorization_codes
```sql
- id (uuid, primary key)
- code (text, unique)
- role (text: super-admin, camp-admin, staff, parent)
- is_active (boolean)
- expires_at (timestamptz, nullable)
- max_uses (integer, nullable)
- used_count (integer, default: 0)
- linked_camper_ids (uuid[], nullable)
- created_by (uuid, foreign key to auth.users)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Key Points**:
- Used for user registration in the mobile app
- Parent codes can be linked to specific campers
- Codes can expire or have usage limits

### user_profiles
```sql
- id (uuid, primary key, foreign key to auth.users)
- email (text)
- full_name (text)
- phone (text, nullable)
- role (text: super-admin, camp-admin, staff, parent)
- registration_complete (boolean, default: false)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Key Points**:
- Created when user registers with authorization code
- Links to Supabase Auth users
- Role determines permissions in mobile app

### audit_logs
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to auth.users, nullable)
- action (text)
- table_name (text)
- record_id (uuid, nullable)
- old_data (jsonb, nullable)
- new_data (jsonb, nullable)
- ip_address (text, nullable)
- user_agent (text, nullable)
- created_at (timestamptz)
```

**Key Points**:
- Tracks all changes in the system
- Used for accountability and debugging
- Can be viewed in user details

## UI/UX Requirements

### Design System
- **Color Scheme**: 
  - Primary: #6366F1 (Indigo) - matches mobile app
  - Secondary: #8B5CF6 (Purple)
  - Accent: #EC4899 (Pink)
  - Success: #10B981 (Green)
  - Warning: #F59E0B (Amber)
  - Error: #EF4444 (Red)
  - Info: #3B82F6 (Blue)
  - Background: #F9FAFB (Light Gray)
  - Card: #FFFFFF (White)
  
- **Typography**:
  - Headings: Bold, sans-serif
  - Body: Regular, sans-serif
  - Monospace for codes and IDs
  
- **Components**:
  - Shadcn UI or Material Design
  - Responsive tables with pagination
  - Modal dialogs for forms
  - Toast notifications for feedback
  - Loading spinners for async operations
  - Calendar component for session management

### Responsive Design
- Desktop-first approach
- Tablet-friendly (768px+)
- Mobile-friendly navigation (hamburger menu)
- Collapsible sidebar on mobile

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support
- Focus indicators on interactive elements

## Technical Requirements

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: React Context or Zustand
- **Forms**: React Hook Form with Zod validation
- **Tables**: TanStack Table (React Table v8)
- **File Upload**: react-dropzone
- **CSV Parsing**: papaparse
- **Date Handling**: date-fns
- **Notifications**: react-hot-toast or sonner
- **Calendar**: react-big-calendar or fullcalendar

### Backend Integration
- **Supabase Client**: @supabase/supabase-js
- **Real-time Updates**: Supabase Realtime for live data updates
- **Row Level Security**: Respect existing RLS policies
- **Edge Functions**: Use for complex operations (bulk import, code generation)

### Security
- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Check user role before rendering admin features
- **Input Validation**: Client-side and server-side validation
- **SQL Injection Prevention**: Use Supabase parameterized queries
- **XSS Prevention**: Sanitize user inputs
- **CSRF Protection**: Use Supabase built-in protection

### Performance
- **Pagination**: Implement server-side pagination for large datasets
- **Lazy Loading**: Load data on demand
- **Caching**: Cache frequently accessed data
- **Debouncing**: Debounce search inputs
- **Optimistic Updates**: Update UI before server confirmation

## Implementation Steps

1. **Setup Project**:
   - Initialize React + TypeScript project with Vite
   - Install dependencies (Shadcn UI, TanStack Table, etc.)
   - Configure Supabase client
   - Setup routing (React Router or TanStack Router)

2. **Authentication**:
   - Create login page
   - Implement Supabase Auth
   - Setup protected routes
   - Add role-based access control

3. **Dashboard**:
   - Create layout with sidebar navigation
   - Implement current session highlight
   - Add statistics cards
   - Create recent activity feed
   - Add quick action buttons

4. **Session Management** (PRIORITY):
   - Build sessions calendar view
   - Create session list table
   - Implement create/edit session forms
   - Add session deletion with camper reassignment
   - Build session dashboard with enrollment stats

5. **Authorization Codes**:
   - Build codes table with filters
   - Create code generation form
   - Implement edit/delete functionality
   - Add bulk actions

6. **User Management**:
   - Build users table with filters
   - Create user detail view
   - Implement edit user form
   - Add user actions (reset password, etc.)

7. **Bulk Import** (PRIORITY):
   - Create CSV upload interface with session selection
   - Implement CSV validation
   - Build import preview
   - Add import progress tracking
   - Create results summary
   - Handle medical info and emergency contacts creation

8. **Camper Management**:
   - Build campers table with session filter
   - Create camper detail view
   - Implement edit camper form
   - Add bulk actions

9. **Reports**:
   - Build report pages
   - Implement data visualization (charts)
   - Add export functionality

10. **Testing & Deployment**:
    - Test all features
    - Fix bugs
    - Deploy to Vercel or Netlify

## Edge Functions Needed

### 1. Bulk Import Campers
**Function**: `bulk-import-campers`
```typescript
// Handles CSV parsing, validation, and batch insertion
// Creates campers, medical info, emergency contacts, and parent links
// Returns: { success: number, failed: number, errors: Array }
```

### 2. Generate Authorization Codes
**Function**: `generate-auth-codes`
```typescript
// Generates multiple unique authorization codes
// Returns: Array of generated codes
```

### 3. Send User Invitation
**Function**: `send-user-invitation`
```typescript
// Sends email invitation to new users
// Returns: { success: boolean, message: string }
```

## Success Metrics
- All CRUD operations work correctly
- CSV import handles 1000+ rows efficiently
- Session management is intuitive and visual
- Page load time < 2 seconds
- Mobile responsive on all screen sizes
- Zero security vulnerabilities
- 100% uptime during business hours

## Future Enhancements
- Multi-session enrollment for campers
- Export data to PDF reports
- Advanced analytics dashboard
- Email notification system
- Audit log viewer with advanced filtering
- Incident report management
- Parent communication portal
- Mobile app for on-the-go management
- Automated session activation based on dates

---

## Getting Started with Lovable.dev

Copy this entire prompt into Lovable.dev and provide your Supabase project credentials:
- **Supabase URL**: [Your project URL]
- **Supabase Anon Key**: [Your anon key]
- **Supabase Service Role Key**: [Your service role key] (for admin operations)

**Important Notes for Lovable**:
1. This is a **single-camp system** - there should only be one camp record
2. **Sessions are critical** - the mobile app filters campers by current session
3. **Bulk import is the primary way** to add campers - make it robust and user-friendly
4. The mobile app has limited functionality - this admin website is the main management tool
5. All tables have RLS policies - use service role key for admin operations
6. The color scheme should match the mobile app for brand consistency

Lovable will generate a fully functional admin website based on these specifications.
