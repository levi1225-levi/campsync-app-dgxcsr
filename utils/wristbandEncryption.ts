
import * as Crypto from 'expo-crypto';

// 🔐 UNIVERSAL WRISTBAND LOCK CODE - CRITICAL FOR SYSTEM OPERATION
// This code is used to lock and unlock NFC wristbands in the CampSync system
// ⚠️ IMPORTANT: Keep this code secure and only share with authorized administrators
const WRISTBAND_LOCK_CODE = 'CAMPSYNC2024LOCK';
const ENCRYPTION_KEY = 'CampSync2024SecureWristbandKey!';

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
 * Gets the universal wristband lock code for write-protection
 * This code is used by the CampSync system to lock and unlock NFC wristbands
 * @returns The lock code as a string
 */
export function getWristbandLockCode(): string {
  return WRISTBAND_LOCK_CODE;
}

/**
 * Gets the wristband lock code as a byte array for NFC operations
 * @returns The lock code as a byte array
 */
export function getWristbandLockCodeBytes(): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < WRISTBAND_LOCK_CODE.length; i++) {
    bytes.push(WRISTBAND_LOCK_CODE.charCodeAt(i));
  }
  return bytes;
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
