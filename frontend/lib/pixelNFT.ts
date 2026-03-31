import { descriptorToBinary } from './faceBiometric';
import * as faceapi from 'face-api.js';

export interface PixelNFTData {
  imageDataURL: string;
  binaryHash: string;
  personality: string;
}

const PERSONALITIES = [
  "Sentinel of the Deep Grid",
  "Cyber-Oracle of Neo-Tokyo",
  "Quantum Guardian",
  "Synthetic Soul Prime",
  "Luminescent Data-Lord",
  "Neural-Vault Overseer",
  "Binary Ghost Architect",
  "Silicon Vanguard"
];

export async function generateBinaryPixelNFT(
  descriptor: Float32Array,
  binaryHash: string,
  landmarks?: faceapi.FaceLandmarks68
): Promise<PixelNFTData> {
  const binary = descriptorToBinary(descriptor);
  
  const canvas = document.createElement('canvas');
  canvas.width = 500;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error("Canvas context failed");

  // --- Background: Matrix-Dark ---
  ctx.fillStyle = '#010409'; // Deep Space Black
  ctx.fillRect(0, 0, 500, 500);

  // Digital Rain Background (Subtle)
  ctx.font = '7px "Courier New", monospace';
  for(let i=0; i < 50; i++) {
    for(let j=0; j < 50; j++) {
       if (Math.random() > 0.95) {
          ctx.fillStyle = 'rgba(0, 242, 255, 0.03)';
          ctx.fillText(Math.round(Math.random()).toString(), i*10, j*10);
       }
    }
  }

  // --- Draw Face Silhouette if Landmarks exist ---
  if (landmarks) {
    const positions = landmarks.positions;
    // Map points to canvas (assuming input landmarks are for a 640x480 video, we scale)
    const scaleX = 500 / 640;
    const scaleY = 500 / 480;
    
    const mapPoint = (p: {x: number, y: number}) => ({
      x: p.x * scaleX,
      y: p.y * scaleY
    });

    // --- 1. Define detailed Silhouette Path (Head, Neck, Shoulders) ---
    ctx.beginPath();
    const jaw = landmarks.getJawOutline().map(mapPoint);
    const leftBrow = landmarks.getLeftEyeBrow().map(mapPoint);
    const rightBrow = landmarks.getRightEyeBrow().map(mapPoint);
    const nose = landmarks.getNose().map(mapPoint);
    const mouth = landmarks.getMouth().map(mapPoint);

    // Rounded Forehead
    const fMidX = (leftBrow[0].x + rightBrow[4].x) / 2;
    const fMidY = Math.min(leftBrow[0].y, rightBrow[4].y) - 80;
    
    ctx.moveTo(jaw[0].x, jaw[0].y);
    // Draw top of head (more rounded)
    ctx.bezierCurveTo(leftBrow[0].x - 20, leftBrow[0].y - 60, fMidX - 70, fMidY, fMidX, fMidY);
    ctx.bezierCurveTo(fMidX + 70, fMidY, rightBrow[4].x + 20, rightBrow[4].y - 60, jaw[16].x, jaw[16].y);
    
    // Smooth Neck transition
    const neckDepth = 40;
    const shoulderSpan = 140;
    const shoulderDepth = 150;
    
    // Right Shoulder
    ctx.lineTo(jaw[16].x, jaw[16].y + neckDepth); 
    ctx.bezierCurveTo(jaw[16].x + 40, jaw[16].y + neckDepth + 20, jaw[16].x + shoulderSpan, jaw[16].y + neckDepth, jaw[16].x + shoulderSpan, jaw[16].y + shoulderDepth);
    
    // Bottom edge
    ctx.lineTo(jaw[0].x - shoulderSpan, jaw[16].y + shoulderDepth);
    
    // Left Shoulder
    ctx.bezierCurveTo(jaw[0].x - shoulderSpan, jaw[0].y + neckDepth, jaw[0].x - 40, jaw[0].y + neckDepth + 20, jaw[0].x, jaw[0].y + neckDepth);
    ctx.lineTo(jaw[0].x, jaw[0].y);
    ctx.closePath();

    // --- 2. Create the Binary Structure ---
    ctx.save();
    ctx.clip(); // Restrict everything to the silhouette

    const cols = 45;
    const cw = 500 / cols;
    
    // Layer 1: Background Dim Binary (Deeper Blue)
    for (let i = 0; i < cols; i++) {
      const x = i * cw + 1;
      for (let y = 0; y < 500; y += 10) {
        const h = (i * 17 + Math.floor(y / 10)) % binary.length;
        ctx.font = '7px monospace';
        ctx.fillStyle = 'rgba(0, 163, 255, 0.15)';
        ctx.fillText(binary[h], x, y);
      }
    }

    // Layer 2: Main Identity Structure (Vibrant Cyan)
    for (let i = 0; i < cols; i++) {
        const x = i * cw + 2;
        const speed = (Date.now() / 1000) * 10; // For deterministic animation frame
        for (let y = 0; y < 500; y += 12) {
          const bitIndex = (i * 43 + Math.floor(y / 12)) % binary.length;
          const bit = binary[bitIndex];
          
          if (bit === '1') {
            ctx.font = 'bold 11px monospace';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f2ff';
            ctx.fillStyle = '#00f2ff';
            ctx.fillText('1', x, y);
            ctx.shadowBlur = 0;
          } else if (Math.random() > 0.6) {
            ctx.font = '9px monospace';
            ctx.fillStyle = 'rgba(0, 242, 255, 0.4)';
            ctx.fillText('0', x, y);
          }
        }
    }

    // --- 3. Feature Highlights (Eyes/Neural Hub) ---
    const leftEye = landmarks.getLeftEye().map(mapPoint);
    const rightEye = landmarks.getRightEye().map(mapPoint);
    
    const drawNeuralEye = (eyePts: {x: number, y: number}[]) => {
        const midX = eyePts.reduce((sum, p) => sum + p.x, 0) / 6;
        const midY = eyePts.reduce((sum, p) => sum + p.y, 0) / 6;
        const grad = ctx.createRadialGradient(midX, midY, 0, midX, midY, 15);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(0.3, 'rgba(0, 242, 255, 0.6)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(midX, midY, 15, 0, Math.PI * 2); ctx.fill();
        
        // Horizontal "Scan" line in eye
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(midX - 15, midY); ctx.lineTo(midX + 15, midY); ctx.stroke();
    };

    drawNeuralEye(leftEye);
    drawNeuralEye(rightEye);

    ctx.restore();

    // --- 4. Glowing Perimeter ---
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#00f2ff';
    ctx.beginPath();
    // Re-draw the same path for stroke
    ctx.moveTo(jaw[0].x, jaw[0].y);
    ctx.bezierCurveTo(leftBrow[0].x - 20, leftBrow[0].y - 60, fMidX - 70, fMidY, fMidX, fMidY);
    ctx.bezierCurveTo(fMidX + 70, fMidY, rightBrow[4].x + 20, rightBrow[4].y - 60, jaw[16].x, jaw[16].y);
    ctx.lineTo(jaw[16].x, jaw[16].y + neckDepth); 
    ctx.bezierCurveTo(jaw[16].x + 40, jaw[16].y + neckDepth + 20, jaw[16].x + shoulderSpan, jaw[16].y + neckDepth, jaw[16].x + shoulderSpan, jaw[16].y + shoulderDepth);
    ctx.lineTo(jaw[0].x - shoulderSpan, jaw[16].y + shoulderDepth);
    ctx.bezierCurveTo(jaw[0].x - shoulderSpan, jaw[0].y + neckDepth, jaw[0].x - 40, jaw[0].y + neckDepth + 20, jaw[0].x, jaw[0].y + neckDepth);
    ctx.lineTo(jaw[0].x, jaw[0].y);
    ctx.stroke();
  } else {
    // Fallback: Matrix Box
    ctx.strokeStyle = '#00f2ff';
    ctx.strokeRect(120, 120, 260, 260);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00f2ff';
    ctx.fillText("ALIGN_BIOMETRIC_SENSOR", 250, 250);
  }

  // --- HUD Overlays ---
  ctx.fillStyle = '#00f2ff';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.shadowBlur = 0;
  
  ctx.fillText(`ID: ${binaryHash.slice(0, 12).toUpperCase()}`, 30, 40);
  ctx.fillText(`STATUS: SECURE_ARTIFACT`, 30, 55);
  ctx.fillText(`VER: 2.0.1`, 30, 70);

  // Bottom text
  ctx.textAlign = 'right';
  ctx.fillText("NEURAL-VAULT_IDENTITY_LAYER", 470, 450);
  ctx.font = '10px monospace';
  ctx.fillText("DERIVED_FROM_BIOMETRIC_STRUCTURE", 470, 465);

  // Corner Accents
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 1;
  const cornerSize = 25;
  // TL
  ctx.beginPath(); ctx.moveTo(20, 20+cornerSize); ctx.lineTo(20, 20); ctx.lineTo(20+cornerSize, 20); ctx.stroke();
  // BR
  ctx.beginPath(); ctx.moveTo(480, 480-cornerSize); ctx.lineTo(480, 480); ctx.lineTo(480-cornerSize, 480); ctx.stroke();

  // Scanline overlay
  ctx.fillStyle = 'rgba(0, 242, 255, 0.05)';
  for (let y = 0; y < 500; y += 4) {
    ctx.fillRect(0, y, 500, 1);
  }

  const randomPersonality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
  
  return {
    imageDataURL: canvas.toDataURL('image/png'),
    binaryHash: binary,
    personality: randomPersonality
  };
}


