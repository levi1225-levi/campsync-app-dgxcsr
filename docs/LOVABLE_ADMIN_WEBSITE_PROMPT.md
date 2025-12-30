
# CampSync Admin Website - Lovable.dev Prompt

## Project Overview
Create a modern, responsive web application for managing CampSync's authorization codes, users, and bulk camper imports. This admin website will connect to an existing Supabase project and provide a comprehensive management interface for camp administrators.

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

### 2. Authorization Codes Management
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

### 3. User Management
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

### 4. Bulk Camper Import
**Table**: `campers`

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
    - camp_id (required, UUID)
    - session_id (optional, UUID)
    - wristband_id (optional, unique)
    - photo_url (optional)
  
- **Import Process**:
  - Validate all rows before import
  - Show validation errors with row numbers
  - Display progress bar during import
  - Handle duplicates (skip or update)
  - Generate wristband IDs if not provided
  
- **Import Results**:
  - Summary: Total rows, Successful imports, Failed imports, Skipped duplicates
  - Detailed error log with row numbers and error messages
  - Option to download error report
  - Option to retry failed imports

### 5. Dashboard
**Home Page Features**:
- **Statistics Cards**:
  - Total Users (by role)
  - Active Authorization Codes
  - Total Campers
  - Recent Activity
  
- **Recent Activity Feed**:
  - Last 20 actions from `audit_logs` table
  - Filter by action type, user, date range
  
- **Quick Actions**:
  - Create Authorization Code
  - Add New User
  - Import Campers
  - View Reports

### 6. Reports & Analytics
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

### campers
```sql
- id (uuid, primary key)
- camp_id (uuid, foreign key to camps)
- session_id (uuid, foreign key to sessions, nullable)
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

## UI/UX Requirements

### Design System
- **Color Scheme**: 
  - Primary: #2196F3 (Blue)
  - Secondary: #FF9800 (Orange)
  - Success: #4CAF50 (Green)
  - Warning: #FFC107 (Amber)
  - Error: #F44336 (Red)
  - Background: #F5F5F5 (Light Gray)
  - Card: #FFFFFF (White)
  
- **Typography**:
  - Headings: Bold, sans-serif
  - Body: Regular, sans-serif
  - Monospace for codes
  
- **Components**:
  - Material Design or Tailwind CSS
  - Responsive tables with pagination
  - Modal dialogs for forms
  - Toast notifications for feedback
  - Loading spinners for async operations

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
- **Styling**: Tailwind CSS or Material-UI
- **State Management**: React Context or Zustand
- **Forms**: React Hook Form with Zod validation
- **Tables**: TanStack Table (React Table v8)
- **File Upload**: react-dropzone
- **CSV Parsing**: papaparse
- **Date Handling**: date-fns
- **Notifications**: react-hot-toast

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
   - Initialize React + TypeScript project
   - Install dependencies
   - Configure Supabase client
   - Setup routing (React Router)

2. **Authentication**:
   - Create login page
   - Implement Supabase Auth
   - Setup protected routes
   - Add role-based access control

3. **Dashboard**:
   - Create layout with sidebar navigation
   - Implement statistics cards
   - Add recent activity feed
   - Create quick action buttons

4. **Authorization Codes**:
   - Build codes table with filters
   - Create code generation form
   - Implement edit/delete functionality
   - Add bulk actions

5. **User Management**:
   - Build users table with filters
   - Create user detail view
   - Implement edit user form
   - Add user actions (reset password, etc.)

6. **Bulk Import**:
   - Create CSV upload interface
   - Implement CSV validation
   - Build import preview
   - Add import progress tracking
   - Create results summary

7. **Reports**:
   - Build report pages
   - Implement data visualization (charts)
   - Add export functionality

8. **Testing & Deployment**:
   - Test all features
   - Fix bugs
   - Deploy to hosting platform (Vercel, Netlify)

## Edge Functions Needed

### 1. Bulk Import Campers
**Function**: `bulk-import-campers`
```typescript
// Handles CSV parsing, validation, and batch insertion
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
- Page load time < 2 seconds
- Mobile responsive on all screen sizes
- Zero security vulnerabilities
- 100% uptime during business hours

## Future Enhancements
- Export data to PDF reports
- Advanced analytics dashboard
- Email notification system
- Audit log viewer with advanced filtering
- Camper medical information management
- Incident report management
- Parent communication portal
- Mobile app for on-the-go management

---

## Getting Started with Lovable.dev

Copy this entire prompt into Lovable.dev and provide your Supabase project credentials:
- Supabase URL
- Supabase Anon Key
- Supabase Service Role Key (for admin operations)

Lovable will generate a fully functional admin website based on these specifications.
