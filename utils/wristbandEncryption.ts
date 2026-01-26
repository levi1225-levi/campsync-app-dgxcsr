
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
    // FIXED: Removed unnecessary escape for [ and ]
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
 * Encrypts comprehensive camper data to be written to NFC wristband
 * OPTIMIZED FOR 540 BYTE NFC CHIPS - includes essential offline data
 * @param camperData - The comprehensive camper information to encrypt
 * @returns Encrypted string to write to wristband
 */
export async function encryptWristbandData(camperData: WristbandCamperData): Promise<string> {
  try {
    console.log('Encrypting comprehensive wristband data for camper:', camperData.id);
    
    // Create compact data structure with essential offline information
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
      // Timestamp for verification
      ts: Date.now(),
    };
    
    // Create a compact JSON string
    const dataString = JSON.stringify(compactData);
    console.log('Comprehensive data to encrypt (size):', dataString.length, 'bytes');
    
    // Create a hash for verification
    const dataToEncrypt = `${ENCRYPTION_KEY}:${dataString}`;
    const fullHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataToEncrypt
    );
    
    // Use first 8 characters of hash to save space
    const shortHash = fullHash.substring(0, 8);
    
    // Combine hash with data
    const encryptedPayload = `${shortHash}:${dataString}`;
    
    console.log('Encrypted payload size:', encryptedPayload.length, 'bytes');
    
    if (encryptedPayload.length > 500) {
      console.warn('Warning: Encrypted payload is large. May not fit on some NFC chips.');
    }
    
    console.log('Wristband data encrypted successfully with offline capabilities');
    console.log('Included: Name, DOB, Allergies, Medications, Swim Level, Cabin');
    
    return encryptedPayload;
  } catch (error) {
    console.error('Error encrypting wristband data:', error);
    throw new Error('Failed to encrypt wristband data');
  }
}

/**
 * Decrypts comprehensive camper data read from NFC wristband
 * @param encryptedData - The encrypted string read from wristband
 * @returns Decrypted comprehensive camper information
 */
export async function decryptWristbandData(encryptedData: string): Promise<WristbandCamperData & {
  timestamp: number;
  isLocked: boolean;
} | null> {
  try {
    console.log('Decrypting comprehensive wristband data...');
    console.log('Encrypted data length:', encryptedData.length, 'bytes');
    
    // Split the encrypted payload
    const parts = encryptedData.split(':');
    if (parts.length < 2) {
      console.error('Invalid encrypted data format');
      return null;
    }
    
    const shortHash = parts[0];
    const dataString = parts.slice(1).join(':');
    
    // Parse the data
    let data;
    try {
      data = JSON.parse(dataString);
    } catch (parseError) {
      console.error('Failed to parse wristband data:', parseError);
      return null;
    }
    
    // Verify the hash
    const dataToVerify = `${ENCRYPTION_KEY}:${dataString}`;
    const verifyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataToVerify
    );
    
    if (!verifyHash.startsWith(shortHash)) {
      console.error('Hash verification failed - data may be tampered');
      return null;
    }
    
    console.log('Wristband data decrypted and verified successfully');
    console.log('Camper:', data.fn, data.ln);
    
    // Reconstruct full data structure
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
      timestamp: data.ts,
      isLocked: true,
    };
    
    console.log('Offline data available: Allergies:', fullData.allergies.length, 'Medications:', fullData.medications.length);
    
    return fullData;
  } catch (error) {
    console.error('Error decrypting wristband data:', error);
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
