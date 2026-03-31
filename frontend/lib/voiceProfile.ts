import { CID } from "multiformats/cid";
import { uploadEncryptedEEG } from "./storacha";
import { 
  encryptWithVoice, 
  decryptWithVoice, 
  hashVoiceprint 
} from "./voiceBiometric";

/**
 * UserProfile represents the decrypted personal identity.
 */
export interface SessionRef {
  cid: string;
  label: string;
  date: number;
  cognitiveState: string;
}

export interface UserProfile {
  name: string;
  email: string;
  walletAddress: string;
  cognitoId: string;
  personalityType: string;
  voiceprintHash: string; 
  faceDescriptorHash?: string;
  profileBackground?: string; // Pixelated face NFT (Base64/IPFS)
  secretPhrase: string; // Used for additional Voice Confirmation
  createdAt: number;
  lastLogin: number;
  eegSessions: SessionRef[];
  cognitiveProfile: {
    dominantState: string;
    totalSessions: number;
    avgConfidence: number;
  };
}

/**
 * Saves profile to Storacha (Filecoin) and records CID on NEAR.
 * Note: Actual NEAR contract logic for identities is mocked in lib/near.ts for now.
 */
export async function saveProfile(profile: UserProfile, privateKey: string): Promise<string> {
  try {
    const encrypted = await encryptWithVoice(profile, privateKey);
    // Use Storacha for storage
    // Assuming storacha.ts has uploadEncryptedEEG, we reuse its logic or wrap it
    const cid = await uploadEncryptedEEG(encrypted, profile.voiceprintHash, `profile-${profile.name}`);
    
    // Near contract call: store_identity
    // (Actual NEAR SDK calls would be here)
    const stored = JSON.parse(localStorage.getItem("mock_near_identities") || "{}");
    stored[profile.voiceprintHash] = cid;
    localStorage.setItem("mock_near_identities", JSON.stringify(stored));

    return cid;
  } catch (error) {
    console.error("Profile save failed:", error);
    throw new Error("Failed to save voice-encrypted profile.");
  }
}

/**
 * Loads and decrypts profile from Storacha (Filecoin) via NEAR CID.
 */
export async function loadProfile(voiceprintHash: string, privateKey: string): Promise<UserProfile> {
  try {
    // NEAR contract call: get_identity_cid
    const stored = JSON.parse(localStorage.getItem("mock_near_identities") || "{}");
    const cid = stored[voiceprintHash];

    if (!cid) throw new Error("No identity found for this voiceprint.");

    // Fetch from Filecoin Gateway
    const response = await fetch(`https://w3s.link/ipfs/${cid}`);
    const data = await response.json();
    
    // Decrypt profile
    const profile = await decryptWithVoice(data.ciphertext, privateKey);
    return profile;
  } catch (error) {
    console.error("Profile load failed:", error);
    throw new Error("Voice match failed or profile is corrupted.");
  }
}

/**
 * Updates an existing user profile and records on-chain.
 */
export async function updateProfile(
  existing: UserProfile, 
  updates: Partial<UserProfile>, 
  privateKey: string
): Promise<string> {
  const updatedProfile = { 
    ...existing, 
    ...updates, 
    lastLogin: Date.now() 
  };
  return await saveProfile(updatedProfile, privateKey);
}
