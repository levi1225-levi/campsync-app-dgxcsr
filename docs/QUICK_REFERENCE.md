
# CampSync Authentication - Quick Reference

## ✅ Current Status

- **Sign-In**: WORKING ✅
- **Registration**: WORKING ✅
- **Profile Creation**: AUTOMATIC ✅
- **Admin Assignment**: AUTOMATIC ✅

## 🔑 Test Credentials

### Working Account (Verified)
- **Email**: `levishai.silverberg@gmail.com`
- **Role**: camp-admin
- **Status**: ✅ Can sign in
- **Access**: Full camp access

### Unverified Accounts
These accounts exist but need email verification:
- `uurmomismymom@gmail.com` (staff)
- `michellesilverberg@yahoo.ca` (staff)
- `jasonsilverberg@yahoo.com` (staff)

## 📝 Authorization Codes

Use these codes for testing registration:

- `SUPER_ADMIN_2024` - Super Admin role
- `DEMO_PARENT_2024` - Parent role

## 🔧 Database Functions

### Auto-Assign First Admin
```typescript
await supabase.rpc('auto_assign_first_admin');
```
- Assigns first non-parent user as camp admin
- Only runs if no staff assignments exist
- Safe to call multiple times

### Check Staff Assignments
```sql
SELECT COUNT(*) FROM camp_staff;
```

### Check User Profiles
```sql
SELECT 
  u.email,
  up.role,
  up.registration_complete,
  u.email_confirmed_at IS NOT NULL as email_verified
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id;
```

## 🐛 Common Issues

### "Email not confirmed"
**Solution**: User needs to verify email. Check spam folder.

### "Invalid login credentials"
**Solution**: Check password is correct. Email must be verified.

### "No user profile found"
**Solution**: Should be impossible now (trigger creates profiles automatically). Contact support if this happens.

### "No camp found or you don't have access"
**Solution**: User needs staff assignment. First user gets auto-assigned. Others need manual assignment or authorization code.

## 📊 Database State

```
Users: 4
Profiles: 4 (100%)
Staff Assignments: 1
Camps: 1
```

## 🚀 Quick Commands

### Verify Trigger Exists
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Verify Function Exists
```sql
SELECT proname FROM pg_proc WHERE proname = 'auto_assign_first_admin';
```

### Check All Users Have Profiles
```sql
SELECT 
  COUNT(*) as users,
  COUNT(up.id) as profiles
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id;
```

### Manually Assign Staff
```sql
INSERT INTO camp_staff (camp_id, user_id, role)
VALUES (
  (SELECT id FROM camps LIMIT 1),
  (SELECT id FROM user_profiles WHERE email = 'user@example.com'),
  'staff'
);
```

## 📚 Documentation

- **Full Fix Summary**: `AUTHENTICATION_FIX_SUMMARY.md`
- **Sign-In Resolution**: `SIGN_IN_FIX_COMPLETE.md`
- **Bootstrap Alternatives**: `BOOTSTRAP_ALTERNATIVES.md`
- **Lovable Sync Guide**: `LOVABLE_AUTH_FIX_SYNC.md`

## ⚡ Quick Test

1. Open CampSync app
2. Go to Sign In
3. Enter: `levishai.silverberg@gmail.com`
4. Enter password
5. Click "Sign In"
6. **Expected**: Should work! ✅

## 🎯 Key Improvements

1. **Database Trigger**: Auto-creates profiles
2. **Auto-Assign**: First user becomes admin
3. **Retry Logic**: 5 attempts with 1s delays
4. **Better Errors**: Clear, actionable messages
5. **Fixed Users**: All existing users now have profiles

## 📞 Support

If issues persist:
1. Check Supabase Auth logs
2. Verify email is confirmed
3. Check profile exists
4. Check staff assignment
5. Contact support with user email

---

**Last Updated**: 2026-01-01  
**Migration**: `fix_user_profile_creation_and_bootstrap`  
**Status**: ✅ Production Ready
