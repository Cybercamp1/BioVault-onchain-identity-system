import * as faceapi from 'face-api.js';

let isLoaded = false;

export async function loadFaceModels() {
  if (isLoaded) return;
  const MODEL_URL = '/models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  isLoaded = true;
}

export async function extractFaceDescriptor(videoElement: HTMLVideoElement): Promise<Float32Array | null> {
  await loadFaceModels();
  const detection = await faceapi.detectSingleFace(
    videoElement,
    new faceapi.TinyFaceDetectorOptions()
  ).withFaceLandmarks().withFaceDescriptor();

  return detection ? detection.descriptor : null;
}

export function compareDescriptors(d1: Float32Array, d2: Float32Array): number {
  const distance = faceapi.euclideanDistance(d1, d2);
  // Normalize distance to similarity: 0 (unlike) to 1 (perfect match)
  // Distance of 0.6 is typically the threshold for match in face-api.js
  const similarity = Math.max(0, 1 - distance); 
  return similarity;
}

export async function hashDescriptor(descriptor: Float32Array): Promise<string> {
  // Use a more robust way to hash the descriptor
  const buffer = new Float64Array(descriptor).buffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function descriptorToBinary(descriptor: Float32Array): string {
  // Quantize the descriptor to binary bits
  // descriptor values are typically between -1 and 1 or 0 and 1
  // We can use the sign or a threshold of 0 to get bits
  let binary = '';
  for (let i = 0; i < descriptor.length; i++) {
    binary += descriptor[i] > 0 ? '1' : '0';
  }
  // Fill to 256 bits if needed or just use the descriptor length (128)
  // For a 16x16 grid, we need 256 bits. Let's pad or repeat.
  while (binary.length < 256) {
    binary += binary;
  }
  return binary.substring(0, 256);
}
