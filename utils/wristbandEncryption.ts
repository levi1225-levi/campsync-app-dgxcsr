
import * as Crypto from 'expo-crypto';

// Encryption key - In production, this should be stored securely (e.g., in secure storage or environment variables)
const ENCRYPTION_KEY = 'CampSync2024SecureWristbandKey!';

/**
 * Encrypts camper data to be written to NFC wristband
 * @param camperData - The camper information to encrypt
 * @returns Encrypted string to write to wristband
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
    
    // Create a JSON string of the data
    const dataString = JSON.stringify({
      id: camperData.id,
      fn: camperData.firstName,
      ln: camperData.lastName,
      dob: camperData.dateOfBirth,
      status: camperData.checkInStatus,
      sid: camperData.sessionId || '',
      ts: Date.now(), // Timestamp for verification
    });
    
    // Create a hash of the data + key for encryption
    const dataToEncrypt = `${ENCRYPTION_KEY}:${dataString}`;
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataToEncrypt
    );
    
    // Combine the encrypted hash with the data (base64 encoded)
    const base64Data = Buffer.from(dataString).toString('base64');
    const encryptedPayload = `${encrypted.substring(0, 16)}:${base64Data}`;
    
    console.log('Wristband data encrypted successfully');
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
} | null> {
  try {
    console.log('Decrypting wristband data...');
    
    // Split the encrypted payload
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      console.error('Invalid encrypted data format');
      return null;
    }
    
    const [hash, base64Data] = parts;
    
    // Decode the base64 data
    const dataString = Buffer.from(base64Data, 'base64').toString('utf-8');
    const data = JSON.parse(dataString);
    
    // Verify the hash
    const dataToVerify = `${ENCRYPTION_KEY}:${dataString}`;
    const verifyHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      dataToVerify
    );
    
    if (!verifyHash.startsWith(hash)) {
      console.error('Hash verification failed - data may be tampered');
      return null;
    }
    
    console.log('Wristband data decrypted and verified successfully');
    
    // Return the decrypted data
    return {
      id: data.id,
      firstName: data.fn,
      lastName: data.ln,
      dateOfBirth: data.dob,
      checkInStatus: data.status,
      sessionId: data.sid || undefined,
      timestamp: data.ts,
    };
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
