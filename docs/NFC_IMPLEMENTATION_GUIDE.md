
# NFC Implementation Guide for CampSync

## Overview
CampSync now has full NFC capabilities for both iOS and Android devices. Staff can scan camper wristbands to quickly check them in/out and access their information.

## What's Been Implemented

### 1. NFC Library Integration
- **Package**: `react-native-nfc-manager` (v3.17.2)
- **Platforms**: iOS and Android
- **Features**: Read NFC tags, NDEF message parsing, tag ID extraction

### 2. Platform Permissions

#### iOS
- Added `NFCReaderUsageDescription` to `app.json`
- Permission message: "CampSync needs access to NFC to scan camper wristbands for check-in, check-out, and quick access to camper information."

#### Android
- Added `android.permission.NFC` to `app.json`
- Automatic NFC detection when app is in foreground

### 3. NFC Scanner Features

#### Device Compatibility Check
- Automatically detects if device supports NFC
- Shows warning banner if NFC is not supported
- Checks if NFC is enabled in device settings
- Provides button to open NFC settings (Android)

#### Scanning Process
1. User taps "Start Scan" button
2. App requests NFC technology access
3. User holds device near NFC wristband
4. App reads tag data (NDEF message or tag ID)
5. App looks up camper in database using wristband ID
6. Displays camper information and action buttons

#### Camper Information Display
- Name, age, cabin assignment
- Current check-in status (checked-in, checked-out, not-arrived)
- Medical alerts (allergies, medications)
- Action buttons (Check In, Check Out, Log Incident)

#### Database Integration
- Queries `campers` table using `wristband_id`
- Updates check-in/check-out status in real-time
- Records timestamps for check-in/check-out events
- Falls back to mock data for testing

### 4. Error Handling
- NFC not supported on device
- NFC disabled in settings
- Invalid or unreadable tags
- Camper not found in database
- Database connection errors
- User cancels scan

### 5. User Experience
- Clear visual feedback during scanning
- Animated scanner circle
- Status banners for NFC availability
- Toast notifications for success/error
- Detailed instructions for first-time users

## How to Use NFC Scanner

### For Staff
1. Navigate to "NFC Scanner" tab in the app
2. Ensure NFC is enabled on your device
3. Tap "Start Scan" button
4. Hold your device near the camper's wristband (within 1-2 inches)
5. Wait for the scan to complete (usually 1-2 seconds)
6. Review camper information
7. Take action (Check In, Check Out, or Log Incident)

### For Administrators
1. Assign unique wristband IDs to each camper in the database
2. Program NFC wristbands with camper IDs using an NFC writer
3. Distribute wristbands to campers during registration
4. Train staff on how to use the NFC scanner

## NFC Wristband Setup

### Wristband Requirements
- NFC-enabled wristbands (ISO 14443A compatible)
- NTAG213, NTAG215, or NTAG216 chips recommended
- Waterproof and durable for camp environment

### Programming Wristbands
1. Use an NFC writer app (e.g., NFC Tools, TagWriter)
2. Write camper's wristband ID as NDEF text record
3. Lock the tag to prevent tampering (optional)
4. Test the wristband with the CampSync app

### Wristband ID Format
- Use UUID format for uniqueness: `550e8400-e29b-41d4-a716-446655440000`
- Or use sequential IDs: `CAMP2024-001`, `CAMP2024-002`, etc.
- Store the same ID in the `campers.wristband_id` database field

## Database Schema

### campers table
```sql
- wristband_id (text, unique, nullable)
  - Stores the unique identifier for the NFC wristband
  - Must match the ID programmed on the physical wristband
  
- wristband_assigned (boolean, default: false)
  - Indicates if a wristband has been assigned to this camper
  
- check_in_status (text: checked-in, checked-out, not-arrived)
  - Current check-in status of the camper
  
- last_check_in (timestamptz, nullable)
  - Timestamp of the most recent check-in
  
- last_check_out (timestamptz, nullable)
  - Timestamp of the most recent check-out
```

## Testing NFC

### iOS Testing
1. Use iPhone 7 or later (iPhone 7, 8, X, 11, 12, 13, 14, 15, 16)
2. Ensure iOS 13 or later
3. NFC works in foreground only (app must be open)
4. Hold device near tag with top edge (where NFC antenna is located)

### Android Testing
1. Use Android device with NFC support
2. Ensure Android 5.0 (Lollipop) or later
3. Enable NFC in device settings
4. Hold device near tag with back of phone (where NFC antenna is located)

### Test Wristbands
- Use NFC test tags or cards for initial testing
- Program test tags with sample wristband IDs
- Create test campers in database with matching wristband IDs

## Troubleshooting

### "NFC not supported on this device"
- Device does not have NFC hardware
- Use a different device with NFC support

### "NFC is disabled - Enable in settings"
- NFC is turned off in device settings
- Tap the warning banner to open settings (Android)
- Go to Settings > Connected devices > Connection preferences > NFC (Android)
- NFC is always enabled on iOS (no toggle)

### "Could not read wristband ID"
- Tag is not programmed correctly
- Tag is damaged or corrupted
- Hold device closer to tag
- Try scanning again

### "No camper found with this wristband ID"
- Wristband ID is not in the database
- Check that `campers.wristband_id` matches the tag ID
- Verify the camper exists in the database

### Scan is slow or unreliable
- Hold device steady near tag for 2-3 seconds
- Remove phone case if it's thick or metallic
- Ensure tag is not near metal objects
- Check that tag is not damaged

## Security Considerations

### Data Privacy
- Wristband only stores the camper ID (no personal information)
- Personal data is retrieved from secure database
- NFC communication is short-range (1-2 inches)

### Access Control
- Only authorized staff can access NFC scanner
- Role-based permissions enforced (super-admin, camp-admin, staff)
- All check-in/check-out events are logged in audit trail

### Tag Security
- Consider locking NFC tags after programming
- Use password-protected tags for sensitive environments
- Monitor for unauthorized tag modifications

## Future Enhancements

### Planned Features
- Offline NFC scanning with local cache
- Batch check-in/check-out for groups
- NFC-triggered incident reporting
- Parent notification on check-in/check-out
- NFC attendance tracking
- Integration with medical alerts system

### Advanced NFC Features
- Write data to NFC tags (update wristband info)
- Multi-tag scanning (scan multiple wristbands at once)
- NFC-based access control (unlock doors, equipment)
- NFC payment integration (camp store purchases)

## Support

### Documentation
- React Native NFC Manager: https://github.com/revtel/react-native-nfc-manager
- NFC Forum: https://nfc-forum.org/
- iOS Core NFC: https://developer.apple.com/documentation/corenfc

### Common Issues
- Check device compatibility list
- Verify NFC is enabled
- Test with known-good NFC tags
- Review app permissions in device settings

### Contact
For technical support or questions about NFC implementation, contact the development team.
