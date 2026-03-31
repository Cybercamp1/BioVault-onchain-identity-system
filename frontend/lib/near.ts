import * as nearAPI from 'near-api-js';
import { SessionRecord } from './types';

export const initNear = async () => {
  const { keyStores, connect, WalletConnection } = nearAPI;
  const myKeyStore = new keyStores.BrowserLocalStorageKeyStore();
  
  const connectionConfig = {
    networkId: process.env.NEXT_PUBLIC_NEAR_NETWORK || 'testnet',
    keyStore: myKeyStore,
    nodeUrl: `https://rpc.${process.env.NEXT_PUBLIC_NEAR_NETWORK || 'testnet'}.near.org`,
    walletUrl: `https://testnet.mynearwallet.com/`,
    helperUrl: `https://helper.${process.env.NEXT_PUBLIC_NEAR_NETWORK || 'testnet'}.near.org`,
    explorerUrl: `https://testnet.nearblocks.io`,
    headers: {}
  };

  const nearConnection = await connect(connectionConfig);
  const walletConnection = new WalletConnection(nearConnection, 'neuralvault');
  
  return { near: nearConnection, wallet: walletConnection };
};

// We mock the contract calls here to ensure the demo is robust
// even if the user hasn't deployed the NEAR contract yet

export async function storeSession(cid: string, litHash: string, label: string, cognitiveState: string) {
    console.log(`NEAR Call: store_session(${cid}, ${litHash}, ${label}, ${cognitiveState})`);
    await new Promise(r => setTimeout(r, 1000));
    
    // Store in local storage to simulate contract state for demo
    const existing = JSON.parse(localStorage.getItem('mock_near_sessions') || '[]');
    existing.push({
        cid,
        lit_hash: litHash,
        label,
        timestamp: Date.now(),
        cognitive_state: cognitiveState
    });
    localStorage.setItem('mock_near_sessions', JSON.stringify(existing));

    return `TX_MOCK_${Math.random().toString(36).substring(7)}`;
}

export async function grantAccess(researcherAddress: string) {
    console.log(`NEAR Call: grant_access(${researcherAddress})`);
    await new Promise(r => setTimeout(r, 800));
    
    const existing = JSON.parse(localStorage.getItem('mock_near_grants') || '[]');
    if (!existing.includes(researcherAddress)) existing.push(researcherAddress);
    localStorage.setItem('mock_near_grants', JSON.stringify(existing));

    return `TX_MOCK_${Math.random().toString(36).substring(7)}`;
}

export async function revokeAccess(researcherAddress: string) {
    console.log(`NEAR Call: revoke_access(${researcherAddress})`);
    await new Promise(r => setTimeout(r, 800));
    
    let existing = JSON.parse(localStorage.getItem('mock_near_grants') || '[]');
    existing = existing.filter((a: string) => a !== researcherAddress);
    localStorage.setItem('mock_near_grants', JSON.stringify(existing));

    return `TX_MOCK_${Math.random().toString(36).substring(7)}`;
}

export async function getSessions(ownerAddress: string): Promise<SessionRecord[]> {
    console.log(`NEAR View: get_sessions(${ownerAddress})`);
    const existing = JSON.parse(localStorage.getItem('mock_near_sessions') || '[]');
    return existing;
}

export async function getMyGrants(): Promise<string[]> {
    console.log(`NEAR View: get_my_grants()`);
    return JSON.parse(localStorage.getItem('mock_near_grants') || '[]');
}

export async function hasAccess(owner: string, researcher: string): Promise<boolean> {
    console.log(`NEAR View: has_access(${owner}, ${researcher})`);
    if (owner === researcher) return true;
    const existing = JSON.parse(localStorage.getItem('mock_near_grants') || '[]');
    return existing.includes(researcher);
}

/**
 * NEAR Mock: Store Identity Mapping (voiceprint_hash -> CID)
 */
export async function storeIdentity(voiceprintHash: string, cid: string) {
    console.log(`NEAR Call: store_identity(${voiceprintHash}, ${cid})`);
    await new Promise(r => setTimeout(r, 1000));
    const stored = JSON.parse(localStorage.getItem('mock_near_identities') || '{}');
    if (stored[voiceprintHash]) throw new Error("Identity already exists for this voiceprint");
    stored[voiceprintHash] = cid;
    localStorage.setItem('mock_near_identities', JSON.stringify(stored));
    return `TX_ID_${Math.random().toString(36).substring(7)}`;
}

/**
 * NEAR Mock: Get Identity CID by voiceprint hash
 */
export async function getIdentityCID(voiceprintHash: string): Promise<string | null> {
    console.log(`NEAR View: get_identity_cid(${voiceprintHash})`);
    const stored = JSON.parse(localStorage.getItem('mock_near_identities') || '{}');
    return stored[voiceprintHash] || null;
}
/**
 * NEAR Mock: Mint Biometric Identity NFT (Non-transferable)
 */
export async function mintBioVaultNFT(biometricHash: string, cognitoId: string, personality: string, pixelNFT?: string) {
  console.log(`NEAR Call: mint_biovault_nft(${biometricHash}, ${cognitoId}, ${personality})`);
  await new Promise(r => setTimeout(r, 2000));
  
  const nftId = `BVA_${biometricHash.slice(0, 8)}`;
  const nft = {
    tokenId: nftId,
    owner: 'current_user',
    metadata: {
      cognitoId,
      personality,
      pixelNFT, // Store the captured pixelated face in NFT metadata
      verificationStatus: 'VERIFIED',
      mintedAt: Date.now(),
      biometricHash: biometricHash.slice(0, 16) // Obfuscated
    }
  };
  
  const existing = JSON.parse(localStorage.getItem('mock_near_nfts') || '[]');
  existing.push(nft);
  localStorage.setItem('mock_near_nfts', JSON.stringify(existing));
  
  return { 
    id: nftId,
    txHash: `TX_BVA_NFT_${Math.random().toString(36).substring(7)}`
  };
}

/**
 * NEAR Mock: Store Vault File Metadata
 */
export async function storeFileMetadata(
    cid: string, 
    fileName: string, 
    size: number, 
    securityLevel: string, 
    timelock: number | null, 
    ownerFaceHash: string
) {
    console.log(`NEAR Call: store_file_metadata(${cid}, ${fileName}, ${size}, ${securityLevel}, ${timelock}, ${ownerFaceHash})`);
    await new Promise(r => setTimeout(r, 1200));
    
    const existing = JSON.parse(localStorage.getItem('mock_near_files') || '[]');
    existing.push({
        cid,
        fileName,
        size,
        securityLevel,
        timelock,
        ownerFaceHash,
        timestamp: Date.now()
    });
    localStorage.setItem('mock_near_files', JSON.stringify(existing));

    return `TX_FILE_${Math.random().toString(36).substring(7)}`;
}

/**
 * NEAR Mock: Get Stored Vault Files
 */
export async function getStoredFiles(): Promise<any[]> {
    console.log(`NEAR View: get_stored_files()`);
    return JSON.parse(localStorage.getItem('mock_near_files') || '[]');
}
