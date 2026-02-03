
# CampSync Session Management

## Overview

CampSync implements comprehensive session management using Supabase Authentication with automatic token refresh, session persistence, and proactive session monitoring.

## Key Features

### 1. **Automatic Token Refresh**
- Supabase client automatically refreshes access tokens before expiration
- Configured with `autoRefreshToken: true` in the client setup
- Prevents user interruption due to expired sessions

### 2. **Secure Session Persistence**
- Sessions are stored using `AsyncStorage` for cross-platform compatibility
- User profile data is cached in `expo-secure-store` for additional security
- Sessions persist across app restarts

### 3. **Session Monitoring**
- Real-time session status tracking with expiration countdown
- Periodic session validity checks (every 5 minutes)
- App state monitoring - validates session when app returns to foreground
- Visual session monitor component for user awareness

### 4. **Proactive Session Management**
- Automatic refresh when session has less than 5 minutes remaining
- Graceful sign-out when session cannot be refreshed
- Manual refresh capability for users

### 5. **Auth State Synchronization**
- Listens to Supabase auth state changes (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`)
- Automatically updates user profile when auth state changes
- Ensures UI stays in sync with authentication status

## Architecture

### Core Components

#### 1. **Supabase Client** (`app/integrations/supabase/client.ts`)
```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

**Session Manager Utilities:**
- `getSession()` - Retrieve current session
- `refreshSession()` - Manually refresh session
- `isSessionValid()` - Check if session is valid and not expired
- `getTimeUntilExpiry()` - Get remaining time in seconds
- `clearSession()` - Sign out and clear session

#### 2. **AuthContext** (`contexts/AuthContext.tsx`)

**State Management:**
- `user` - Current authenticated user
- `isAuthenticated` - Boolean authentication status
- `isLoading` - Initial auth state loading
- `sessionExpiresAt` - Unix timestamp of session expiration

**Methods:**
- `signIn(email, password)` - Authenticate user
- `signOut()` - Sign out and clear session
- `refreshSession()` - Manually refresh session
- `updateUser(user)` - Update user profile
- `hasPermission(roles)` - Check role-based permissions

**Automatic Behaviors:**
- Listens to `onAuthStateChange` events
- Monitors app state (foreground/background)
- Periodic session checks every 5 minutes
- Proactive refresh when expiring soon

#### 3. **SessionMonitor Component** (`components/SessionMonitor.tsx`)

Visual component that displays:
- Session status indicator
- Time remaining until expiration
- Warning when session is expiring soon (< 5 minutes)
- Manual refresh button when needed

Usage:
```tsx
<SessionMonitor showDetails={true} />
```

#### 4. **useSessionManagement Hook** (`hooks/useSessionManagement.ts`)

Custom hook for session management in components:

```typescript
const {
  sessionStatus,      // { isValid, expiresAt, timeRemaining, isExpiringSoon }
  checkSessionStatus, // Function to check current status
  refreshSession,     // Function to refresh session
  handleSessionExpiry // Function to handle expiry
} = useSessionManagement();
```

## Session Lifecycle

### 1. **Sign In**
```
User enters credentials
  ↓
Supabase authenticates
  ↓
Auth state change: SIGNED_IN
  ↓
Load user profile from database
  ↓
Save session to AsyncStorage & SecureStore
  ↓
Update AuthContext state
  ↓
Redirect based on role
```

### 2. **Session Active**
```
Every 5 minutes:
  Check session validity
    ↓
  If < 5 min remaining → Refresh proactively
    ↓
  If expired → Sign out
    ↓
  If valid → Continue

On app foreground:
  Check session validity
    ↓
  If invalid → Sign out
    ↓
  If valid → Continue
```

### 3. **Token Refresh**
```
Supabase auto-refresh (before expiration)
  ↓
Auth state change: TOKEN_REFRESHED
  ↓
Update sessionExpiresAt
  ↓
Save updated session
```

### 4. **Sign Out**
```
User clicks sign out
  ↓
Call supabase.auth.signOut()
  ↓
Clear AsyncStorage session
  ↓
Clear SecureStore data
  ↓
Auth state change: SIGNED_OUT
  ↓
Clear AuthContext state
  ↓
Redirect to sign-in
```

## Security Considerations

### 1. **Token Storage**
- Access tokens stored in AsyncStorage (Supabase requirement)
- User profile data stored in SecureStore (encrypted on device)
- Tokens never exposed to logs or error messages

### 2. **Session Validation**
- Server-side validation on every API request
- Client-side validation before making requests
- Automatic sign-out on validation failure

### 3. **Token Refresh**
- Automatic refresh prevents token exposure
- Refresh tokens are securely stored
- Failed refresh triggers immediate sign-out

### 4. **Cross-Platform Security**
- AsyncStorage on mobile (encrypted by OS)
- SecureStore uses Keychain (iOS) and Keystore (Android)
- Web uses secure browser storage

## Configuration

### Session Timeout
Default Supabase session timeout: **1 hour**

To modify (requires Supabase dashboard configuration):
1. Go to Authentication → Settings
2. Adjust "JWT expiry limit"
3. Adjust "Refresh token rotation"

### Monitoring Intervals
```typescript
// Periodic check interval (AuthContext)
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Proactive refresh threshold
const REFRESH_THRESHOLD = 300; // 5 minutes (in seconds)
```

## Usage Examples

### Display Session Status
```tsx
import { SessionMonitor } from '@/components/SessionMonitor';

function ProfileScreen() {
  return (
    <View>
      <SessionMonitor showDetails={true} />
      {/* Rest of profile UI */}
    </View>
  );
}
```

### Manual Session Refresh
```tsx
import { useAuth } from '@/contexts/AuthContext';

function SettingsScreen() {
  const { refreshSession } = useAuth();

  const handleRefresh = async () => {
    try {
      await refreshSession();
      Alert.alert('Success', 'Session refreshed');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh session');
    }
  };

  return (
    <TouchableOpacity onPress={handleRefresh}>
      <Text>Refresh Session</Text>
    </TouchableOpacity>
  );
}
```

### Check Session Status
```tsx
import { useSessionManagement } from '@/hooks/useSessionManagement';

function DashboardScreen() {
  const { sessionStatus } = useSessionManagement();

  return (
    <View>
      {sessionStatus.isExpiringSoon && (
        <Text>Your session is expiring soon!</Text>
      )}
      <Text>Time remaining: {sessionStatus.timeRemaining}s</Text>
    </View>
  );
}
```

## Troubleshooting

### Session Not Persisting
**Problem:** User is signed out after closing the app

**Solution:**
1. Verify AsyncStorage is properly configured
2. Check Supabase client has `persistSession: true`
3. Ensure no errors in session save/load functions

### Frequent Sign-Outs
**Problem:** User is signed out unexpectedly

**Solution:**
1. Check session expiry settings in Supabase dashboard
2. Verify automatic refresh is working (check logs)
3. Ensure network connectivity for refresh requests

### Session Monitor Not Updating
**Problem:** Session countdown not displaying correctly

**Solution:**
1. Verify `sessionExpiresAt` is being set in AuthContext
2. Check that SessionMonitor is receiving `showDetails={true}`
3. Ensure component is inside AuthProvider

## Best Practices

1. **Always use AuthContext** - Don't access Supabase auth directly
2. **Handle session expiry gracefully** - Show user-friendly messages
3. **Monitor session status** - Display warnings before expiry
4. **Test offline scenarios** - Ensure app handles network issues
5. **Log session events** - Use console.log for debugging (already implemented)

## Future Enhancements

- [ ] Biometric authentication for session resumption
- [ ] Multi-device session management
- [ ] Session activity logging
- [ ] Configurable session timeout per role
- [ ] Push notifications for session expiry warnings
- [ ] Session analytics and monitoring dashboard

## Related Files

- `app/integrations/supabase/client.ts` - Supabase client configuration
- `contexts/AuthContext.tsx` - Authentication context and session management
- `components/SessionMonitor.tsx` - Visual session status component
- `hooks/useSessionManagement.ts` - Session management hook
- `app/(tabs)/profile.tsx` - Profile screen with session monitor
- `types/user.ts` - User and session type definitions

## Support

For issues or questions about session management:
1. Check console logs for session-related messages
2. Verify Supabase dashboard authentication settings
3. Review this documentation
4. Contact the development team
