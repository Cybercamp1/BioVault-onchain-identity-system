/**
 * NeuralVault Voice Biometric Identity System
 * Core logic for voiceprint extraction and deterministic key derivation.
 * Uses Web Audio API and Web Crypto API only.
 */

/**
 * Records voice for a set duration and returns averaged frequency data.
 */
export async function recordVoice(durationMs: number = 3000): Promise<Float32Array> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount; // 1024
    const frames: Float32Array[] = [];
    const interval = 100; // ms
    const totalFrames = durationMs / interval;

    return new Promise((resolve) => {
      let frameCount = 0;
      const timer = setInterval(() => {
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatFrequencyData(dataArray);
        frames.push(dataArray);
        frameCount++;

        if (frameCount >= totalFrames) {
          clearInterval(timer);
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();

          // Average all captured frames
          const averaged = new Float32Array(bufferLength);
          for (let i = 0; i < bufferLength; i++) {
            let sum = 0;
            for (let j = 0; j < frames.length; j++) {
              sum += frames[j][i];
            }
            averaged[i] = sum / frames.length;
          }
          resolve(averaged);
        }
      }, interval);
    });
  } catch (error) {
    console.error("Voice recording failed:", error);
    throw new Error("Microphone access denied or recording failed.");
  }
}

/**
 * Extracts a 32-value normalized voiceprint from frequency data.
 */
export function extractVoiceprint(frequencyData: Float32Array): number[] {
  // Convert dB to linear scale
  const linearData = Array.from(frequencyData).map(db => Math.pow(10, db / 20));

  // Find top 32 strongest frequency peaks
  const indexedData = linearData.map((val, idx) => ({ val, idx }));
  indexedData.sort((a, b) => b.val - a.val);
  
  const top32 = indexedData.slice(0, 32);
  
  // Sort peaks by frequency index for consistency
  top32.sort((a, b) => a.idx - b.idx);

  // Normalize (min-max normalization)
  const values = top32.map(p => p.val);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values.map(v => parseFloat(((v - min) / range).toFixed(4)));
}

/**
 * Multi-Factor Key Derivation:
 * FINAL_KEY = SHA-256(voiceFingerprint + brainwaveHash + challengeResponse + walletAddress)
 */
export async function deriveMultiFactorKey(
  voiceprint: number[], 
  brainwaveHash: string, 
  challenge: string, 
  salt: string
): Promise<string> {
  const voiceprintStr = voiceprint.join(',');
  const voiceBuffer = new TextEncoder().encode(voiceprintStr);
  const voiceRawHash = await crypto.subtle.digest('SHA-256', voiceBuffer);
  const voiceHash = Array.from(new Uint8Array(voiceRawHash)).slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join(''); // 128-bits

  const challengeClean = challenge.replace(/\s+/g, ''); // Challenge response part
  
  const input = `${voiceHash}|${brainwaveHash}|${challengeClean}|${salt.toLowerCase()}`;
  const finalMsgBuffer = new TextEncoder().encode(input);
  const finalHashBuffer = await crypto.subtle.digest('SHA-256', finalMsgBuffer);

  const finalHashArray = Array.from(new Uint8Array(finalHashBuffer));
  return finalHashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // 256-bit FINAL_KEY
}

/**
 * Derives a deterministic 256-bit private key from voiceprint and salt.
 * (Deprecated for multi-factor derivation, but kept for legacy profiles)
 */
export async function derivePrivateKey(voiceprint: number[], salt: string): Promise<string> {
  const input = voiceprint.join(',') + '|' + salt.toLowerCase();
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  
  // Convert to hex
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypts data using AES-256-GCM with a voice-derived key.
 */
export async function encryptWithVoice(data: object, privateKeyHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBuffer = Uint8Array.from(privateKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    enc.encode(JSON.stringify(data))
  );

  // Return base64(IV + ciphertext)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return btoa(String.fromCharCode(...Array.from(combined)));
}

/**
 * Decrypts data using AES-256-GCM with a voice-derived key.
 */
export async function decryptWithVoice(encryptedBase64: string, privateKeyHex: string): Promise<any> {
  const dec = new TextDecoder();
  const keyBuffer = Uint8Array.from(privateKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  return JSON.parse(dec.decode(decryptedBuffer));
}

/**
 * Computes cosine similarity between two voiceprint arrays.
 */
export function compareVoiceprints(vp1: number[], vp2: number[]): number {
  if (vp1.length !== vp2.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vp1.length; i++) {
    dotProduct += vp1[i] * vp2[i];
    normA += vp1[i] * vp1[i];
    normB += vp2[i] * vp2[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * SHA-256 of the voiceprint to be used as a public identifier/hash on NEAR.
 */
export async function hashVoiceprint(voiceprint: number[]): Promise<string> {
  const input = voiceprint.join(',');
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
