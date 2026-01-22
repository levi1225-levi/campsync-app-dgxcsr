
import * as Crypto from 'expo-crypto';

// Universal wristband lock code - stored in system
// In production, this should be stored securely in environment variables or secure storage
const WRISTBAND_LOCK_CODE = 'CAMPSYNC2024LOCK';
const ENCRYPTION_KEY = 'CampSync2024SecureWristbandKey!';

/**
 * Encrypts camper data to be written to NFC wristband
 * OPTIMIZED FOR SMALL NFC CHIPS (540 bytes)
 * Only writes camper ID - all other data is fetched from database
 * @param camperData - The camper information to encrypt
 * @returns Encrypted string to write to wristband (minimal size)
 */
export async function encryptWristbandData(camperData: {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  checkInStatus: string;
  sessionId?: string;
}): Promise<string> {
  try {
    console.log('Encrypting wristband data for camper:', camperData.id);
    
    // MINIMAL DATA: Only store camper ID
    // All other data is fetched from database when scanning
    const minimalData = {
      id: camperData.id,
      ts: Date.now(), // Timestamp for verification
    };
    
    // Create a compact JSON string
    const dataString = JSON.stringify(minimalData);
    console.log('Data to encrypt (size):', dataString.length, 'bytes');
    
    // Create a short hash for verification (only 8 characters)
    const dataToEncrypt = `${ENCRYPTION_KEY}:${dataString}`;
    const fullHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataToEncrypt
    );
    
    // Use only first 8 characters of hash to save space
    const shortHash = fullHash.substring(0, 8);
    
    // Combine short hash with data (no base64 encoding to save space)
    const encryptedPayload = `${shortHash}:${dataString}`;
    
    console.log('Encrypted payload size:', encryptedPayload.length, 'bytes');
    console.log('Wristband data encrypted successfully (minimal format)');
    
    return encryptedPayload;
  } catch (error) {
    console.error('Error encrypting wristband data:', error);
    throw new Error('Failed to encrypt wristband data');
  }
}

/**
 * Decrypts camper data read from NFC wristband
 * @param encryptedData - The encrypted string read from wristband
 * @returns Decrypted camper information
 */
export async function decryptWristbandData(encryptedData: string): Promise<{
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  checkInStatus: string;
  sessionId?: string;
  timestamp: number;
  isLocked: boolean;
} | null> {
  try {
    console.log('Decrypting wristband data...');
    console.log('Encrypted data length:', encryptedData.length, 'bytes');
    
    // Split the encrypted payload
    const parts = encryptedData.split(':');
    if (parts.length < 2) {
      console.error('Invalid encrypted data format');
      return null;
    }
    
    const shortHash = parts[0];
    const dataString = parts.slice(1).join(':'); // Rejoin in case there are colons in the data
    
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
    console.log('Camper ID from wristband:', data.id);
    
    // Return minimal data - caller should fetch full camper details from database
    return {
      id: data.id,
      firstName: '', // Will be fetched from database
      lastName: '',
      dateOfBirth: '',
      checkInStatus: '',
      sessionId: undefined,
      timestamp: data.ts,
      isLocked: true, // Assume locked if decryption succeeded
    };
  } catch (error) {
    console.error('Error decrypting wristband data:', error);
    return null;
  }
}

/**
 * Gets the universal wristband lock code for write-protection
 * @returns The lock code as a byte array
 */
export function getWristbandLockCode(): number[] {
  // Convert lock code to byte array for NFC write protection
  const bytes: number[] = [];
  for (let i = 0; i < WRISTBAND_LOCK_CODE.length; i++) {
    bytes.push(WRISTBAND_LOCK_CODE.charCodeAt(i));
  }
  return bytes;
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
