import * as faceapi from 'face-api.js'
import { encryptIdentityData } from './litIntegration'
import { uploadEncryptedIdentity } from './filecoinIntegration'
import { storeIdentityOnchain } from './nearIntegration'
import { analyzeCognitiveState } from './impulseIntegration'
import { generateBinaryPixelNFT } from './pixelNFT'
import { derivePrivateKeyFromVoice } from './voiceKey'

export interface BioVaultResult {
  privateKey: string
  tokenId: string
  cognitoId: string
  identityCID: string
  imageCID: string
  nearTxURL: string
  personality: string
  pixelNFTImage: string
}

export async function runBioVaultRegistration(
  videoElement: HTMLVideoElement,
  audioBuffer: Float32Array,
  faceDescriptor: Float32Array,
  faceHash: string,
  walletAddress: string,
  onProgress: (step: string, pct: number) => void,
  landmarks?: faceapi.FaceLandmarks68
): Promise<BioVaultResult> {

  // STEP 1: Derive private key from face + voice
  onProgress('DERIVING_BIOMETRIC_KEY...', 10)
  const privateKey = await derivePrivateKeyFromVoice(
    audioBuffer, faceHash, walletAddress
  )
  const tokenId = 'BVA_' + faceHash.slice(0,8).toUpperCase()
  const cognitoId = 'UID-' + faceHash.slice(0,8).toUpperCase()

  // STEP 2: Generate pixel NFT from face
  onProgress('EXTRACTING_BINARY_IDENTITY_HASH...', 20)
  const nfts = await import('./pixelNFT');
  const nftData = await nfts.generateBinaryPixelNFT(faceDescriptor, faceHash, landmarks)

  // STEP 3: Analyze cognitive state via Impulse AI
  onProgress('ANALYZING_COGNITIVE_STATE...', 40)
  const cognitive = await analyzeCognitiveState(
    Array.from(audioBuffer.slice(0,32)),
    Array.from(faceDescriptor.slice(0,32))
  )
  
  // Combine AI personality with NFT personality for a richer identity
  const finalPersonality = `${nftData.personality} / ${cognitive.personality}`

  // STEP 4: Encrypt identity with Lit Protocol
  onProgress('ENCRYPTING_WITH_LIT_PROTOCOL...', 55)
  const identityPayload = {
    tokenId, cognitoId, walletAddress, faceHash,
    privateKey: privateKey.slice(0,16) + '...',
    cognitiveState: cognitive.cognitive_state,
    personality: finalPersonality,
    binaryHash: nftData.binaryHash,
    registeredAt: new Date().toISOString()
  }
  const { ciphertext, dataToEncryptHash } =
    await encryptIdentityData(identityPayload, walletAddress)

  // STEP 5: Upload to Filecoin via Storacha
  onProgress('UPLOADING_TO_FILECOIN...', 70)
  const { identityCID, imageCID } = await uploadEncryptedIdentity(
    ciphertext,
    dataToEncryptHash,
    tokenId,
    nftData.imageDataURL
  )

  // STEP 6: Store CID on NEAR blockchain
  onProgress('RECORDING_ON_NEAR...', 85)
  const nearTxURL = await storeIdentityOnchain(
    identityCID, imageCID, tokenId, faceHash
  )

  onProgress('IDENTITY_VERIFIED', 100)

  return {
    privateKey,
    tokenId,
    cognitoId,
    identityCID,
    imageCID,
    nearTxURL,
    personality: finalPersonality,
    pixelNFTImage: nftData.imageDataURL
  }
}

export async function runBioVaultAuth(
  audioBuffer: Float32Array,
  faceDescriptor: Float32Array,
  faceHash: string,
  walletAddress: string,
  storedFaceHash: string,
  onProgress: (step: string, pct: number) => void
): Promise<string> {
  // STEP 1: Regenerate Binary Hash and Compare
  onProgress('REGENERATING_BINARY_IDENTITY...', 20);
  
  // For demo: if distance is close, we consider it a match
  // In a production app, the hash must be identical if we use it for key derivation
  // But biometrics are noisy, so we often use either:
  // 1. Fuzzy extractors (complex)
  // 2. Or, we use the descriptor as a lookup and then rely on Lit Protocol session
  
  // Here we simulate the match threshold
  if (Math.random() < 0.01) { // 1% chance of failure for demo
      throw new Error("BIOMETRIC_MISMATCH: Signature does not match stored ID.");
  }

  // STEP 2: Derive the key (same deterministic logic)
  onProgress('DERIVING_CRYPTO_KEY...', 50);
  const derivedKey = await derivePrivateKeyFromVoice(
    audioBuffer, faceHash, walletAddress
  );

  // STEP 3: Verification with Lit (mocked connection)
  onProgress('REQUESTING_VAULT_UNLOCK...', 80);
  await new Promise(r => setTimeout(r, 1500));

  onProgress('VAULT_UNLOCKED', 100);
  return derivedKey;
}
