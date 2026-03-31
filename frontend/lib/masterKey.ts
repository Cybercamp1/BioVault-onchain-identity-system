/**
 * NeuralVault Master Key Derivation System
 * This derives the final AES-256-GCM encryption key from multiple biometric hashes.
 * It also defines the security tiers required for different transaction amounts.
 */

/**
 * Derives a 32-byte (256-bit) Master Key from biometric hashes.
 * @param faceHash The SHA-256 hash of the 128-point face descriptor.
 * @param voiceHash The hash of the user's voice profile.
 * @param brainHash The hash of the user's base EEG brainwave signature.
 * @param wallet The user's NEAR or Ethereum wallet address.
 * @returns 64-character Hex string representing the Master Key.
 */
export async function deriveMasterKey(
  faceHash: string,
  voiceHash: string,
  brainHash: string,
  wallet: string
): Promise<string> {
    const combined = faceHash + voiceHash + brainHash + wallet.toLowerCase();
    
    // Hash the combined biometric data
    const msgUint8 = new TextEncoder().encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const masterKeyHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return masterKeyHex;
}

/**
 * Security tiers for wallet transactions.
 */
export enum TransactionTier {
  SMALL = "SMALL",   // < $50
  MEDIUM = "MEDIUM", // $50 - $500
  LARGE = "LARGE"    // > $500
}

/**
 * Required authentication factors based on transaction value.
 */
export function getRequiredFactors(amountInUsd: number): {
    face: boolean;
    voice: boolean;
    brain: boolean;
    stressCheck: boolean;
} {
    if (amountInUsd < 50) {
        return { face: false, voice: true, brain: false, stressCheck: false };
    } else if (amountInUsd <= 500) {
        return { face: true, voice: true, brain: false, stressCheck: false };
    } else {
        return { face: true, voice: true, brain: true, stressCheck: true };
    }
}

/**
 * Converts the Master Key hex string into a CryptoKey for AES-GCM operations.
 */
export async function importMasterKey(masterKeyHex: string): Promise<CryptoKey> {
    const rawKey = new Uint8Array(masterKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    return await crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
}
