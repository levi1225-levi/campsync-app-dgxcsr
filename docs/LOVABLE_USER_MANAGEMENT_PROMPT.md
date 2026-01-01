
# Lovable.dev Prompt: User Management Admin Tool for CampSync Website

## Overview
This prompt will guide you to implement a comprehensive user management admin tool for the CampSync website that matches the functionality already implemented in the mobile app.

## Context
CampSync is a secure, offline-capable digital platform designed to manage and streamline operations for a single summer camp. The mobile app now has a fully functional user management system for super admins. We need to replicate this functionality on the website.

## Current State
- The mobile app has a working user management screen accessible only to super admins
- Users can be managed with roles: super-admin, camp-admin, staff, parent
- The mobile app can:
  - View all registered users
  - Search and filter users
  - Edit user roles
  - Send password reset links
  - Toggle registration completion status
  - Delete users

## Required Implementation

### 1. User Management Page

Create a new page `/admin/user-management` that is only accessible to users with the `super-admin` role.

#### Page Structure:
- **Header Section:**
  - Title: "User Management"
  - Subtitle showing total user count
  - Refresh button to reload user list
  - Back button to return to previous page

- **Search Bar:**
  - Real-time search functionality
  - Filter by name, email, or role
  - Clear search button

- **User List:**
  - Display all users in cards/rows
  - Show user avatar (icon based on role)
  - Display: Full name, email, role badge
  - Expandable details on click

#### User Card Details (Expanded):
- Email address
- Phone number (if available)
- Join date
- Registration status (complete/incomplete)
- Action buttons:
  - Change Role
  - Send Password Reset Link
  - Toggle Registration Status
  - Delete User

### 2. Functionality Requirements

#### A. View All Users
```typescript
// Fetch all users from user_profiles table
const { data: users, error } = await supabase
  .from('user_profiles')
  .select('*')
  .order('created_at', { ascending: false });
```

#### B. Search and Filter
- Implement client-side filtering
- Search across: full_name, email, role
- Case-insensitive search
- Real-time results

#### C. Change User Role
```typescript
// Update user role
const { error } = await supabase
  .from('user_profiles')
  .update({ role: newRole })
  .eq('id', userId);
```

**Role Options:**
- super-admin (Super Admin)
- camp-admin (Camp Admin)
- staff (Staff)
- parent (Parent)

**Implementation:**
- Show modal/dialog with role selection
- Display current role
- Confirm before changing
- Show success/error message

#### D. Send Password Reset Link
```typescript
// Send password reset email
const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
  redirectTo: 'https://your-website-url.com/reset-password',
});
```

**Implementation:**
- Confirm before sending
- Show success message: "Password reset link sent to [email]"
- Handle errors gracefully

#### E. Toggle Registration Status
```typescript
// Toggle registration_complete status
const { error } = await supabase
  .from('user_profiles')
  .update({ registration_complete: !currentStatus })
  .eq('id', userId);
```

**Implementation:**
- Show current status with icon
- Click to toggle
- Confirm before changing
- Update UI immediately

#### F. Delete User
```typescript
// Delete user profile (cascades to related records)
const { error } = await supabase
  .from('user_profiles')
  .delete()
  .eq('id', userId);
```

**Implementation:**
- Show warning dialog
- Require confirmation
- Display: "Are you sure you want to delete [name] ([email])? This action cannot be undone."
- Show success message after deletion

### 3. UI/UX Design Guidelines

#### Color Coding by Role:
- **Super Admin:** Red (#EF4444)
- **Camp Admin:** Blue (#3B82F6)
- **Staff:** Purple (#8B5CF6)
- **Parent:** Green (#10B981)

#### Visual Elements:
- Use role-colored badges for user roles
- Use icons for actions (edit, key, trash, etc.)
- Show loading states during operations
- Display empty state when no users found
- Use cards or table layout for user list

#### Responsive Design:
- Mobile: Stack user cards vertically
- Tablet: 2-column grid
- Desktop: Table or 3-column grid

### 4. Access Control

**Route Protection:**
```typescript
// Only allow super-admin access
if (user?.role !== 'super-admin') {
  redirect('/dashboard');
}
```

**Add Navigation Link:**
- Add "User Management" link to admin navigation menu
- Only visible to super-admin users
- Icon: Users/Group icon

### 5. Error Handling

Implement proper error handling for:
- Failed user fetch
- Failed role update
- Failed password reset email
- Failed user deletion
- Network errors

**Error Messages:**
- "Failed to load users. Please try again."
- "Failed to update user role. Please try again."
- "Failed to send password reset email. Please try again."
- "Failed to delete user. Please try again."

### 6. Success Messages

Show success toasts/alerts for:
- "Role changed to [new role]"
- "Password reset link sent to [email]"
- "Registration marked as [complete/incomplete]"
- "User deleted successfully"

### 7. Database Schema Reference

**user_profiles table:**
```sql
- id (uuid, primary key)
- email (text)
- full_name (text)
- phone (text, nullable)
- role (text: 'super-admin' | 'camp-admin' | 'staff' | 'parent')
- registration_complete (boolean, default: false)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### 8. Testing Checklist

- [ ] Super admin can access user management page
- [ ] Non-super admin users are redirected
- [ ] All users are displayed correctly
- [ ] Search functionality works
- [ ] Role change updates database and UI
- [ ] Password reset email is sent
- [ ] Registration status toggles correctly
- [ ] User deletion works with confirmation
- [ ] Error messages display properly
- [ ] Success messages display properly
- [ ] Loading states work correctly
- [ ] Responsive design works on all devices

### 9. Additional Features (Optional)

Consider adding:
- Bulk actions (select multiple users)
- Export user list to CSV
- User activity logs
- Filter by role dropdown
- Sort by name, email, or join date
- Pagination for large user lists
- User statistics dashboard

### 10. Integration with Existing System

**Ensure compatibility with:**
- Existing authentication system
- Current user profile structure
- Role-based access control (RBAC)
- Supabase RLS policies

**Navigation:**
- Add link in admin sidebar/menu
- Add link in profile dropdown (for super admins)
- Breadcrumb navigation

## Implementation Steps

1. **Create the user management page component**
   - Set up route protection
   - Create page layout

2. **Implement user fetching**
   - Query user_profiles table
   - Handle loading and error states

3. **Build user list UI**
   - Create user card/row component
   - Add role badges and icons
   - Implement expandable details

4. **Add search functionality**
   - Create search input
   - Implement filtering logic

5. **Implement role change**
   - Create role selection modal
   - Add update logic
   - Show confirmation

6. **Implement password reset**
   - Add reset button
   - Integrate with Supabase auth
   - Show success message

7. **Implement registration toggle**
   - Add toggle button
   - Update database
   - Refresh UI

8. **Implement user deletion**
   - Add delete button
   - Show confirmation dialog
   - Remove from list on success

9. **Add navigation link**
   - Update admin menu
   - Add route to navigation

10. **Test thoroughly**
    - Test all CRUD operations
    - Test error handling
    - Test on different devices

## Code Example Structure

```typescript
// app/admin/user-management/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'super-admin' | 'camp-admin' | 'staff' | 'parent';
  registration_complete: boolean;
  created_at: string;
}

export default function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Protect route
  if (user?.role !== 'super-admin') {
    redirect('/dashboard');
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    // Implementation
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    // Implementation
  };

  const handleSendPasswordReset = async (email: string) => {
    // Implementation
  };

  const handleToggleRegistration = async (userId: string, currentStatus: boolean) => {
    // Implementation
  };

  const handleDeleteUser = async (userId: string) => {
    // Implementation
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-gray-600">{users.length} users</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/* User List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            onChangeRole={handleChangeRole}
            onSendPasswordReset={handleSendPasswordReset}
            onToggleRegistration={handleToggleRegistration}
            onDelete={handleDeleteUser}
          />
        ))}
      </div>
    </div>
  );
}
```

## Final Notes

- Ensure all operations are logged for audit purposes
- Test with different user roles to ensure proper access control
- Consider rate limiting for password reset emails
- Add loading indicators for all async operations
- Implement optimistic UI updates where appropriate
- Follow existing design system and component library

## Questions to Consider

1. Should there be a limit on how many times a password reset can be sent?
2. Should deleted users be soft-deleted or hard-deleted?
3. Should there be a confirmation email when a user's role is changed?
4. Should there be an activity log showing who made changes?
5. Should super admins be able to impersonate other users for debugging?

## Success Criteria

✅ Super admins can view all registered users
✅ Super admins can search and filter users
✅ Super admins can change user roles
✅ Super admins can send password reset links
✅ Super admins can toggle registration status
✅ Super admins can delete users
✅ All operations have proper error handling
✅ All operations show success/error messages
✅ UI is responsive and matches design system
✅ Access control is properly implemented
