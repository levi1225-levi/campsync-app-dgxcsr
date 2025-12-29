
# Quick Start: Authorization Code System

## For New Users

### I'm a Parent

1. **Check your email** for an invitation from your camp
2. The email contains your unique authorization code
3. Click the registration link or navigate to the CampSync app
4. Tap **"Register with Code"**
5. Enter your authorization code
6. Complete your profile information
7. Verify your email address
8. Sign in and access your child's information

**Demo Code for Testing:**
```
DEMO_PARENT_2024
```

### I'm a Staff Member

1. **Contact your camp administrator** to receive an authorization code
2. Once you have your code, navigate to the CampSync app
3. Tap **"Register with Code"**
4. Enter your authorization code
5. Complete your profile information
6. Verify your email address
7. Sign in and access the staff dashboard

### I'm a Camp Administrator

1. **Contact the super administrator** to receive an authorization code
2. Once you have your code, navigate to the CampSync app
3. Tap **"Register with Code"**
4. Enter your authorization code
5. Complete your profile information
6. Verify your email address
7. Sign in and access the admin dashboard

**Demo Code for Testing:**
```
SUPER_ADMIN_2024
```

## For Administrators

### Creating Authorization Codes

1. Sign in as super-admin or camp-admin
2. Navigate to **Home → Authorization Codes**
3. Tap the **+** button
4. Select the role (Staff or Camp Admin)
5. Optionally set:
   - Max uses (leave empty for unlimited)
   - Expiry days (leave empty for no expiry)
6. Tap **"Generate Code"**
7. Share the code with the intended user

### Generating Parent Invitations

**Option 1: Automatic (Recommended)**
- When you create or import campers, parent invitation codes are automatically generated
- Invitations are sent to the parent email addresses provided

**Option 2: Manual**
1. Use the `generate-parent-invitation` Edge Function
2. Provide camper IDs and parent information
3. System generates a code linked to those campers
4. Code expires in 30 days and is single-use

### Managing Codes

**View All Codes:**
- Navigate to **Home → Authorization Codes**
- See all codes with their status, usage, and expiration

**Deactivate a Code:**
- Tap the **X** icon next to the code
- Confirm deactivation
- Code can no longer be used for registration

**Check Usage:**
- View the "Uses" column to see how many times a code has been used
- Compare against max uses (if set)

## Common Scenarios

### Scenario 1: Onboarding New Staff

1. Create a staff authorization code
2. Set max uses to 1 (single-use)
3. Set expiry to 7 days
4. Share the code with the new staff member
5. They register using the code
6. Code is automatically deactivated after use

### Scenario 2: Inviting Parents

1. Import campers with parent information
2. System generates parent invitation codes
3. Codes are linked to specific campers
4. Parents receive email invitations
5. Parents register using their codes
6. System automatically links parents to their children

### Scenario 3: Bulk Staff Onboarding

1. Create a staff authorization code
2. Set max uses to the number of staff (e.g., 10)
3. Set expiry to 30 days
4. Share the same code with all staff members
5. Each staff member registers using the code
6. Code tracks usage count

### Scenario 4: Emergency Access

1. Super admin can use the hardcoded code: `SUPER_ADMIN_2024`
2. This code never expires and has unlimited uses
3. Use for emergency access or initial setup

## Troubleshooting

### "Code does not exist"
- Double-check the code for typos
- Codes are case-sensitive
- Contact your administrator for a new code

### "Code is not active"
- The code has been deactivated by an administrator
- Contact your administrator for a new code

### "Code has expired"
- The code has passed its expiration date
- Contact your administrator for a new code

### "Code has reached maximum uses"
- The code has been used the maximum number of times
- Contact your administrator for a new code

### "Email already registered"
- You already have an account
- Use the "Sign In" option instead
- If you forgot your password, use the password reset feature

### Parent not linked to campers
- Check that emergency contact emails match your registration email
- Contact your administrator to manually link your account
- Verify that campers have been properly imported

## Best Practices

### For Administrators

- **Use single-use codes** for individual invitations
- **Set expiration dates** to limit the window of vulnerability
- **Regularly review codes** and deactivate unused ones
- **Track code usage** to monitor registration progress
- **Use descriptive naming** when generating codes (internal notes)

### For Users

- **Keep your code secure** - don't share it with others
- **Register promptly** - codes may expire
- **Verify your email** - required for account activation
- **Contact support** if you have issues with your code

## Security Notes

- Authorization codes control all access to CampSync
- No open registration is allowed
- Roles are assigned by codes and cannot be changed
- All code usage is tracked and auditable
- Codes can be deactivated at any time
- Parent-camper links are automatic and secure

## Support

Need help? Contact:
- **Email:** support@campsync.com
- **In-App:** Navigate to Profile → Help & Support
- **Administrator:** Contact your camp administrator

---

**Remember:** Every account in CampSync is created through an authorization code. This ensures security, proper role assignment, and accurate parent-camper linking.
