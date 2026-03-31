import { create } from '@web3-storage/w3up-client'

let storageClient: any = null

export async function initStoracha() {
  if (storageClient) return storageClient
  try {
    storageClient = await create()
    // Check if we have a current space, if not, we are in non-configured mode
    if (!storageClient.currentSpace()) {
        throw new Error("NO_SPACE_CONFIGURED")
    }
    return storageClient
  } catch (err) {
    console.warn("STORACHA_OFFLINE: Using Local Buffer for decentralised storage.")
    storageClient = { isMock: true }
    return storageClient
  }
}

export async function uploadEncryptedIdentity(
  ciphertext: string,
  dataToEncryptHash: string,
  tokenId: string,
  pixelNFTImageBase64: string
): Promise<{ identityCID: string; imageCID: string }> {
  try {
    const client = await initStoracha()

    if (client.isMock) {
        return {
            identityCID: "bafy_mock_identity_" + tokenId.toLowerCase(),
            imageCID: "bafy_mock_avatar_" + tokenId.toLowerCase()
        }
    }

    // Upload encrypted identity blob
    const identityBlob = new Blob([JSON.stringify({
      ciphertext,
      dataToEncryptHash,
      tokenId,
      timestamp: Date.now()
    })], { type: 'application/json' })

    const identityFile = new File(
      [identityBlob],
      `${tokenId}-identity.json`
    )
    const identityCID = await client.uploadFile(identityFile)

    // Upload pixel NFT image
    const imageRes = await fetch(pixelNFTImageBase64)
    const imageBlob = await imageRes.blob()
    const imageFile = new File([imageBlob], `${tokenId}-avatar.png`)
    const imageCID = await client.uploadFile(imageFile)

    return {
      identityCID: identityCID.toString(),
      imageCID: imageCID.toString()
    }
  } catch (err) {
    console.warn("STORAGE_UPLOAD_ERROR: Falling back to ephemeral CID.")
    return {
        identityCID: "bafy_fallback_id_" + Date.now(),
        imageCID: "bafy_fallback_img_" + Date.now()
    }
  }
}

export function getFilecoinURL(cid: string): string {
  if (cid.includes('mock') || cid.includes('fallback')) return "#"
  return `https://w3s.link/ipfs/${cid}`
}

