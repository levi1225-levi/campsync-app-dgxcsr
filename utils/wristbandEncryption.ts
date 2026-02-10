
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/app/integrations/supabase/client';

// 🔐 DEFAULT WRISTBAND LOCK CODE - Can be customized by administrators
// This is the fallback code if no custom code is set
const DEFAULT_LOCK_CODE = 'CAMPSYNC2024LOCK';
const ENCRYPTION_KEY = 'CampSync2024SecureWristbandKey!';

// Cache for the lock code to avoid repeated database/secure store calls
let cachedLockCode: string | null = null;

/**
 * Comprehensive camper data for offline wristband storage
 * Now includes parent/guardian and emergency contact information
 */
export interface WristbandCamperData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  allergies: string[];
  medications: string[];
  swimLevel: string | null;
  cabin: string | null;
  checkInStatus: string;
  sessionId?: string;
  // Parent/Guardian Information
  parentGuardianName: string | null;
  parentGuardianPhone: string | null;
  parentGuardianEmail: string | null;
  // Emergency Contact Information (Primary)
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
}

/**
 * Gets the current wristband lock code (custom or default)
 * This code is used to lock and unlock NFC wristbands
 * 
 * ⚠️ IMPORTANT: This is NOT a permanent lock
 * - Use this code to LOCK wristbands after writing data (makes them read-only)
 * - Use this SAME code to UNLOCK wristbands before erasing (allows modifications)
 * - Wristbands are NOT permanently locked - they can always be unlocked with this code
 * 
 * @returns The current lock code as a string
 */
export async function getWristbandLockCode(): Promise<string> {
  try {
    // Return cached code if available
    if (cachedLockCode) {
      console.log('🔐 Using cached wristband lock code');
      return cachedLockCode;
    }

    console.log('🔐 Fetching wristband lock code from database...');
    
    // Try to get custom lock code from database
    const { data, error } = await supabase
      .from('camp_settings')
      .select('wristband_lock_code')
      .single();
    
    if (error) {
      console.log('No custom lock code found in database, using default');
      cachedLockCode = DEFAULT_LOCK_CODE;
      return DEFAULT_LOCK_CODE;
    }
    
    if (data?.wristband_lock_code) {
      console.log('✅ Custom lock code loaded from database');
      cachedLockCode = data.wristband_lock_code;
      return data.wristband_lock_code;
    }
    
    console.log('No custom lock code set, using default');
    cachedLockCode = DEFAULT_LOCK_CODE;
    return DEFAULT_LOCK_CODE;
  } catch (error) {
    console.error('Error fetching lock code:', error);
    console.log('Falling back to default lock code');
    return DEFAULT_LOCK_CODE;
  }
}

/**
 * Sets a custom wristband lock code (admin only)
 * This will be used for all future wristband operations
 * 
 * @param newCode - The new lock code (must be 8-32 characters)
 * @returns Success status
 */
export async function setWristbandLockCode(newCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 Setting new wristband lock code...');
    
    // Validate code
    if (!newCode || newCode.length < 8) {
      return { success: false, error: 'Lock code must be at least 8 characters long' };
    }
    
    if (newCode.length > 32) {
      return { success: false, error: 'Lock code must be 32 characters or less' };
    }
    
    // Only allow alphanumeric characters and basic symbols
    const validCodeRegex = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{}|;:,.<>?]+$/;
    if (!validCodeRegex.test(newCode)) {
      return { success: false, error: 'Lock code can only contain letters, numbers, and basic symbols' };
    }
    
    // Update in database
    const { error } = await supabase
      .from('camp_settings')
      .upsert({
        id: 1, // Single row for camp settings
        wristband_lock_code: newCode,
        updated_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('Error saving lock code to database:', error);
      return { success: false, error: 'Failed to save lock code to database' };
    }
    
    // Clear cache so next call fetches the new code
    cachedLockCode = null;
    
    console.log('✅ Wristband lock code updated successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Error setting lock code:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Resets the wristband lock code to the default
 * @returns Success status
 */
export async function resetWristbandLockCode(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 Resetting wristband lock code to default...');
    
    const { error } = await supabase
      .from('camp_settings')
      .upsert({
        id: 1,
        wristband_lock_code: DEFAULT_LOCK_CODE,
        updated_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('Error resetting lock code:', error);
      return { success: false, error: 'Failed to reset lock code' };
    }
    
    // Clear cache
    cachedLockCode = null;
    
    console.log('✅ Lock code reset to default');
    return { success: true };
  } catch (error: any) {
    console.error('Error resetting lock code:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Gets the wristband lock code as a byte array for NFC operations
 * @returns The lock code as a byte array
 */
export async function getWristbandLockCodeBytes(): Promise<number[]> {
  const lockCode = await getWristbandLockCode();
  const bytes: number[] = [];
  for (let i = 0; i < lockCode.length; i++) {
    bytes.push(lockCode.charCodeAt(i));
  }
  console.log('🔐 Lock code converted to bytes:', bytes.length, 'bytes');
  return bytes;
}

/**
 * Clears the cached lock code (useful after changing the code)
 */
export function clearLockCodeCache(): void {
  cachedLockCode = null;
  console.log('🔐 Lock code cache cleared');
}

/**
 * Simple XOR encryption for data obfuscation
 * This is NOT military-grade encryption, but provides basic data protection
 * Combined with password-protected NFC tags, it provides good security for camp use
 */
function xorEncrypt(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}

/**
 * Base64 encode with URL-safe characters - FIXED for React Native
 */
function base64Encode(str: string): string {
  try {
    // Convert string to byte array
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    
    // Convert byte array to base64 string manually
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    
    for (let i = 0; i < bytes.length; i += 3) {
      const byte1 = bytes[i];
      const byte2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
      const byte3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
      
      const encoded1 = byte1 >> 2;
      const encoded2 = ((byte1 & 3) << 4) | (byte2 >> 4);
      const encoded3 = ((byte2 & 15) << 2) | (byte3 >> 6);
      const encoded4 = byte3 & 63;
      
      result += base64Chars[encoded1];
      result += base64Chars[encoded2];
      result += i + 1 < bytes.length ? base64Chars[encoded3] : '=';
      result += i + 2 < bytes.length ? base64Chars[encoded4] : '=';
    }
    
    // Make URL-safe
    return result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('❌ Base64 encode error:', error);
    throw new Error('Failed to encode data');
  }
}

/**
 * Base64 decode from URL-safe characters - FIXED for React Native
 */
function base64Decode(str: string): string {
  try {
    // Convert from URL-safe base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode base64 manually
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const bytes: number[] = [];
    
    for (let i = 0; i < base64.length; i += 4) {
      const encoded1 = base64Chars.indexOf(base64[i]);
      const encoded2 = base64Chars.indexOf(base64[i + 1]);
      const encoded3 = base64Chars.indexOf(base64[i + 2]);
      const encoded4 = base64Chars.indexOf(base64[i + 3]);
      
      const byte1 = (encoded1 << 2) | (encoded2 >> 4);
      const byte2 = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      const byte3 = ((encoded3 & 3) << 6) | encoded4;
      
      bytes.push(byte1);
      if (encoded3 !== -1 && base64[i + 2] !== '=') bytes.push(byte2);
      if (encoded4 !== -1 && base64[i + 3] !== '=') bytes.push(byte3);
    }
    
    // Convert byte array back to string
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      result += String.fromCharCode(bytes[i]);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Base64 decode error:', error);
    throw new Error('Failed to decode data');
  }
}

/**
 * Encrypts comprehensive camper data to be written to NFC wristband
 * 🔐 ALL DATA IS NOW ENCRYPTED INCLUDING THE NAME
 * OPTIMIZED FOR 540 BYTE NFC CHIPS - includes essential offline data
 * NOW INCLUDES: Parent/Guardian and Emergency Contact Information
 * @param camperData - The comprehensive camper information to encrypt
 * @returns Encrypted string to write to wristband
 */
export async function encryptWristbandData(camperData: WristbandCamperData): Promise<string> {
  try {
    console.log('🔐 ENCRYPTION START - Encrypting ALL wristband data (including name) for camper:', camperData.id);
    console.log('📊 Input data:', JSON.stringify(camperData, null, 2));
    
    // Create compact data structure with essential offline information
    // 🔐 ALL FIELDS WILL BE ENCRYPTED
    const compactData = {
      id: camperData.id,
      fn: camperData.firstName,
      ln: camperData.lastName,
      dob: camperData.dateOfBirth,
      // Medical info - critical for offline access
      al: camperData.allergies.length > 0 ? camperData.allergies.join('|') : '',
      md: camperData.medications.length > 0 ? camperData.medications.join('|') : '',
      // Activity info
      sw: camperData.swimLevel || '',
      cb: camperData.cabin || '',
      // Status
      st: camperData.checkInStatus,
      // Parent/Guardian Contact Info
      pgn: camperData.parentGuardianName || '',
      pgp: camperData.parentGuardianPhone || '',
      pge: camperData.parentGuardianEmail || '',
      // Emergency Contact Info (Primary)
      ecn: camperData.emergencyContactName || '',
      ecp: camperData.emergencyContactPhone || '',
      ecr: camperData.emergencyContactRelationship || '',
      // Timestamp for verification
      ts: Date.now(),
    };
    
    // Create a compact JSON string
    const dataString = JSON.stringify(compactData);
    console.log('📦 Compact data string created (size):', dataString.length, 'bytes');
    console.log('📦 Compact data (BEFORE ENCRYPTION):', dataString);
    
    // 🔐 STEP 1: XOR encrypt the entire data string (including name)
    console.log('🔐 Step 1: XOR encrypting ALL data including name...');
    const encryptedData = xorEncrypt(dataString, ENCRYPTION_KEY);
    console.log('✅ Data XOR encrypted');
    
    // 🔐 STEP 2: Base64 encode the encrypted data for safe NFC storage
    console.log('🔐 Step 2: Base64 encoding encrypted data...');
    const base64Encrypted = base64Encode(encryptedData);
    console.log('✅ Data base64 encoded, size:', base64Encrypted.length, 'bytes');
    
    // 🔐 STEP 3: Create a hash for verification using the encryption key
    console.log('🔐 Step 3: Creating SHA256 hash for verification...');
    const dataToHash = `${ENCRYPTION_KEY}:${dataString}`;
    const fullHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataToHash
    );
    
    console.log('✅ Full hash generated:', fullHash);
    
    // Use first 8 characters of hash to save space
    const shortHash = fullHash.substring(0, 8);
    console.log('✅ Short hash (first 8 chars):', shortHash);
    
    // 🔐 STEP 4: Combine hash with encrypted data
    const encryptedPayload = `${shortHash}:${base64Encrypted}`;
    
    console.log('✅ ENCRYPTION COMPLETE - Final encrypted payload size:', encryptedPayload.length, 'bytes');
    console.log('📦 Encrypted payload preview (UNREADABLE):', encryptedPayload.substring(0, 100) + '...');
    
    if (encryptedPayload.length > 500) {
      console.warn('⚠️ WARNING: Encrypted payload is large. May not fit on some NFC chips.');
    }
    
    console.log('✅ Wristband data FULLY ENCRYPTED successfully with offline capabilities');
    console.log('🔐 ALL DATA ENCRYPTED: Name, DOB, Allergies, Medications, Swim Level, Cabin, Parent/Guardian, Emergency Contact');
    console.log('🔒 Data is now unreadable without the encryption key');
    
    return encryptedPayload;
  } catch (error) {
    console.error('❌ ENCRYPTION ERROR:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    throw new Error('Failed to encrypt wristband data');
  }
}

/**
 * Decrypts comprehensive camper data read from NFC wristband
 * 🔓 DECRYPTS ALL DATA INCLUDING THE NAME
 * NOW INCLUDES: Parent/Guardian and Emergency Contact Information
 * @param encryptedData - The encrypted string read from wristband
 * @returns Decrypted comprehensive camper information
 */
export async function decryptWristbandData(encryptedData: string): Promise<WristbandCamperData & {
  timestamp: number;
  isLocked: boolean;
} | null> {
  try {
    console.log('🔓 DECRYPTION START - Decrypting comprehensive wristband data...');
    console.log('📦 Encrypted data length:', encryptedData.length, 'bytes');
    console.log('📦 Encrypted data preview (UNREADABLE):', encryptedData.substring(0, 100) + '...');
    
    // Split the encrypted payload
    const parts = encryptedData.split(':');
    if (parts.length < 2) {
      console.error('❌ Invalid encrypted data format - expected "hash:data"');
      return null;
    }
    
    const shortHash = parts[0];
    const base64Encrypted = parts.slice(1).join(':');
    
    console.log('🔍 Extracted short hash:', shortHash);
    console.log('🔍 Extracted base64 encrypted data length:', base64Encrypted.length, 'bytes');
    
    // 🔓 STEP 1: Base64 decode the encrypted data
    console.log('🔓 Step 1: Base64 decoding encrypted data...');
    let encryptedBinary: string;
    try {
      encryptedBinary = base64Decode(base64Encrypted);
      console.log('✅ Data base64 decoded');
    } catch (decodeError) {
      console.error('❌ Failed to base64 decode data:', decodeError);
      return null;
    }
    
    // 🔓 STEP 2: XOR decrypt the data
    console.log('🔓 Step 2: XOR decrypting data...');
    const dataString = xorEncrypt(encryptedBinary, ENCRYPTION_KEY);
    console.log('✅ Data XOR decrypted');
    console.log('📦 Decrypted data string length:', dataString.length, 'bytes');
    
    // Parse the decrypted data
    let data;
    try {
      data = JSON.parse(dataString);
      console.log('✅ Data parsed successfully:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse decrypted wristband data:', parseError);
      console.error('❌ Decrypted string:', dataString.substring(0, 200));
      return null;
    }
    
    // 🔐 STEP 3: Verify the hash
    console.log('🔐 Step 3: Verifying hash...');
    const dataToVerify = `${ENCRYPTION_KEY}:${dataString}`;
    const verifyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataToVerify
    );
    
    console.log('🔍 Verification hash:', verifyHash);
    console.log('🔍 Expected hash prefix:', shortHash);
    
    if (!verifyHash.startsWith(shortHash)) {
      console.error('❌ Hash verification failed - data may be tampered');
      return null;
    }
    
    console.log('✅ Hash verification successful - data integrity confirmed');
    console.log('✅ Wristband data decrypted and verified successfully');
    console.log('👤 Camper:', data.fn, data.ln);
    
    // Reconstruct full data structure with parent/guardian and emergency contact info
    const fullData: WristbandCamperData & { timestamp: number; isLocked: boolean } = {
      id: data.id,
      firstName: data.fn,
      lastName: data.ln,
      dateOfBirth: data.dob,
      allergies: data.al ? data.al.split('|') : [],
      medications: data.md ? data.md.split('|') : [],
      swimLevel: data.sw || null,
      cabin: data.cb || null,
      checkInStatus: data.st,
      sessionId: undefined,
      // Parent/Guardian Contact Info
      parentGuardianName: data.pgn || null,
      parentGuardianPhone: data.pgp || null,
      parentGuardianEmail: data.pge || null,
      // Emergency Contact Info
      emergencyContactName: data.ecn || null,
      emergencyContactPhone: data.ecp || null,
      emergencyContactRelationship: data.ecr || null,
      timestamp: data.ts,
      isLocked: true,
    };
    
    console.log('✅ DECRYPTION COMPLETE - Full data reconstructed');
    console.log('📊 Offline data available: Allergies:', fullData.allergies.length, 'Medications:', fullData.medications.length);
    console.log('👨‍👩‍👧 Parent/Guardian:', fullData.parentGuardianName || 'Not set');
    console.log('🚨 Emergency Contact:', fullData.emergencyContactName || 'Not set');
    
    return fullData;
  } catch (error) {
    console.error('❌ DECRYPTION ERROR:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    return null;
  }
}

/**
 * Simple encryption for camper ID only (backward compatibility)
 * @param camperId - The camper ID to encrypt
 * @returns Encrypted camper ID
 */
export async function encryptCamperId(camperId: string): Promise<string> {
  try {
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${ENCRYPTION_KEY}:${camperId}`
    );
    return `${encrypted.substring(0, 8)}:${camperId}`;
  } catch (error) {
    console.error('Error encrypting camper ID:', error);
    throw new Error('Failed to encrypt camper ID');
  }
}

/**
 * Simple decryption for camper ID only (backward compatibility)
 * @param encryptedId - The encrypted camper ID
 * @returns Decrypted camper ID or null if invalid
 */
export async function decryptCamperId(encryptedId: string): Promise<string | null> {
  try {
    const parts = encryptedId.split(':');
    if (parts.length !== 2) {
      // Not encrypted, return as-is for backward compatibility
      return encryptedId;
    }
    
    const [hash, camperId] = parts;
    
    // Verify the hash
    const verifyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${ENCRYPTION_KEY}:${camperId}`
    );
    
    if (!verifyHash.startsWith(hash)) {
      console.error('Hash verification failed for camper ID');
      return null;
    }
    
    return camperId;
  } catch (error) {
    console.error('Error decrypting camper ID:', error);
    return null;
  }
}
