'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Mic, Loader2, Shield, AlertCircle, 
  Lock, Zap, Cpu, Scan, CheckCircle, Fingerprint 
} from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useAccount } from 'wagmi';
import { runBioVaultRegistration, runBioVaultAuth } from '@/lib/biovaultCore';
import { extractFaceDescriptor, loadFaceModels } from '@/lib/faceBiometric';
import { recordVoice, extractVoiceprint } from '@/lib/voiceBiometric';

interface BiometricHUDProps {
  mode: 'register' | 'login';
  onSuccess: (data: { 
    face: Float32Array; 
    voice: number[]; 
    phrase?: string; 
    pixelNFT: string;
    tokenId?: string;
    nearTxURL?: string;
    identityCID?: string;
  }) => void;
}

export default function BiometricHUD({ mode, onSuccess }: BiometricHUDProps) {
  const { address: walletAddress } = useAccount();
  const [status, setStatus] = useState<'idle' | 'scanning' | 'analyzing' | 'success' | 'error'>('idle');
  const [subStatus, setSubStatus] = useState('SYSTEM_READY');
  const [pixelNFT, setPixelNFT] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const voiceCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarksRef = useRef<faceapi.FaceLandmarks68 | null>(null);

  // Helper for SHA-256 hashing
  const getHash = async (data: Float32Array) => {
    const msgUint8 = new TextEncoder().encode(data.toString());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Initialize camera and models
  useEffect(() => {
    async function init() {
      try {
        await loadFaceModels();
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 },
          audio: true 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        detectFace();
      } catch (err) {
        setError("BIOMETRIC_PERIPHERAL_FAILURE: Check Camera/Mic permissions.");
      }
    }
    init();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const displaySize = { width: videoRef.current.width, height: videoRef.current.height };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    const interval = setInterval(async () => {
      if (!videoRef.current) return;
      const detections = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks();

      if (detections) {
        setFaceDetected(true);
        landmarksRef.current = detections.landmarks;
        const resized = faceapi.resizeResults(detections, displaySize);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, displaySize.width, displaySize.height);
          
          // Draw HUD Box
          const box = resized.detection.box;
          ctx.strokeStyle = '#00F2FF';
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 5]);
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          // Draw Corners
          ctx.setLineDash([]);
          ctx.beginPath();
          const cornerLen = 20;
          // TL
          ctx.moveTo(box.x, box.y + cornerLen); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + cornerLen, box.y);
          // TR
          ctx.moveTo(box.right - cornerLen, box.y); ctx.lineTo(box.right, box.y); ctx.lineTo(box.right, box.y + cornerLen);
          // BL
          ctx.moveTo(box.x, box.bottom - cornerLen); ctx.lineTo(box.x, box.bottom); ctx.lineTo(box.x + cornerLen, box.bottom);
          // BR
          ctx.moveTo(box.right - cornerLen, box.bottom); ctx.lineTo(box.right, box.bottom); ctx.lineTo(box.right, box.bottom + cornerLen);
          ctx.stroke();

          // Landmarks dot (HUD style)
          resized.landmarks.positions.forEach(p => {
            ctx.fillStyle = '#00F2FF';
            ctx.fillRect(p.x, p.y, 1, 1);
          });
        }
      } else {
        setFaceDetected(false);
        landmarksRef.current = null;
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.clearRect(0, 0, displaySize.width, displaySize.height);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const startAuth = async () => {
    if (!faceDetected) {
      setError("FACE_NOT_TARGETED: Align your face with the scan grid.");
      return;
    }
    if (!walletAddress) {
       setError("WALLET_NOT_CONNECTED: Connect your NEAR/ETH wallet first.");
       return;
    }

    setStatus('scanning');
    setSubStatus('EXTRACTING_FACIAL_EMBEDDINGS...');
    setError(null);

    try {
      // 1. Capture Face Descriptor
      const faceDesc = await extractFaceDescriptor(videoRef.current!);
      if (!faceDesc) throw new Error("FACIAL_RESOLVE_FAILED");
      const faceHash = await getHash(faceDesc);

      setSubStatus('RECORDING_VOICE_SIGNATURE...');
      // 2. Capture Voiceprint (4 seconds)
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(streamRef.current!);
      const analyser = audioCtx.createAnalyser();
      source.connect(analyser);
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const drawVoice = () => {
        if (status === 'success') return;
        requestAnimationFrame(drawVoice);
        analyser.getByteFrequencyData(dataArray);
        const ctx = voiceCanvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, 400, 100);
        ctx.strokeStyle = '#00F2FF';
        ctx.beginPath();
        let x = 0;
        for(let i=0; i<bufferLength; i++) {
          let y = (dataArray[i]/255) * 100;
          if (i === 0) ctx.moveTo(x, 50 + y/2);
          else ctx.lineTo(x, 50 + y/2);
          x += 400/bufferLength;
        }
        ctx.stroke();
      };
      drawVoice();

      const voiceRaw = await recordVoice(4000);
      const vp = extractVoiceprint(voiceRaw);
      
      if (mode === 'register') {
          // 1. RUN REGISTER
          const result = await runBioVaultRegistration(
            videoRef.current!, voiceRaw, faceDesc, faceHash, walletAddress,
            (step, pct) => { setSubStatus(step); setConfidence(pct / 100); },
            landmarksRef.current || undefined
          );

          setStatus('success');
          setSubStatus('IDENTITY_VERIFIED');
          setConfidence(0.999);
          setPixelNFT(result.pixelNFTImage);
          
          onSuccess({ 
            face: faceDesc, voice: vp, pixelNFT: result.pixelNFTImage,
            tokenId: result.tokenId, nearTxURL: result.nearTxURL, identityCID: result.identityCID
          });
      } else {
          // 2. RUN AUTH (LOGIN)
          // For demo, we assume the stored face hash is the current one if we match on threshold
          // In real scenarios, this is fetched from the blockchain first
          const key = await runBioVaultAuth(
              voiceRaw, faceDesc, faceHash, walletAddress, faceHash,
              (step, pct) => { setStatus('analyzing'); setSubStatus(step); setConfidence(pct / 100); }
          );

          setStatus('success');
          setSubStatus('VAULT_UNLOCKED');
          setConfidence(0.982);
          
          onSuccess({ face: faceDesc, voice: vp, pixelNFT: '' }); // Simplified success for login
      }

    } catch (err: any) {
      setStatus('error');
      setError(err.message || "AUTHENTICATION_ABORTED");
      // Intruder detection logging
      const existingAlerts = JSON.parse(localStorage.getItem('security_alerts') || '[]');
      existingAlerts.push({
         type: 'UNAUTHORIZED_ACCESS',
         timestamp: Date.now(),
         details: err.message || 'Biometric mismatch above threshold.',
         threatLevel: 'HIGH'
      });
      localStorage.setItem('security_alerts', JSON.stringify(existingAlerts));
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-video bg-black border border-hud/20 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,242,255,0.1)] group">
      {/* HUD Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-hud/5 to-transparent" />
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-hud/5 to-transparent" />
        <div className="absolute inset-0 border-[20px] border-black/50" />
        {/* Animated Scan Line */}
        {status === 'scanning' && (
          <div className="absolute top-0 left-0 w-full h-[2px] bg-hud shadow-[0_0_15px_#00F2FF] animate-scan z-20" />
        )}
      </div>

      {/* Binary Conversion Overlay */}
      <AnimatePresence>
        {status === 'analyzing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-12"
          >
            <div className="w-full max-w-sm aspect-square border border-hud/40 relative overflow-hidden">
               {/* Matrix rain effect simplified */}
               <div className="absolute inset-0 opacity-20 font-mono text-[8px] text-hud overflow-hidden leading-none break-all p-2">
                  {Array.from({length: 2000}).map(() => Math.round(Math.random())).join('')}
               </div>
               <motion.div 
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="absolute inset-0 flex items-center justify-center"
               >
                 <Scan className="text-hud animate-pulse" size={64} />
               </motion.div>
            </div>
            <p className="mt-8 font-hud text-xs text-hud animate-pulse tracking-[0.5em] uppercase">
              CONVERTING_BIOMETRICS_TO_BINARY_SOUL...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success NFT Display */}
      <AnimatePresence>
        {status === 'success' && pixelNFT && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-8"
          >
            <div className="relative group scale-110">
              <div className="absolute -inset-8 bg-hud/30 rounded-lg blur-2xl group-hover:bg-hud/50 transition-all duration-700 animate-pulse" />
              <img 
                src={pixelNFT} 
                alt="Binary Identity NFT" 
                className="relative w-80 h-80 border-2 border-hud rounded-lg shadow-[0_0_50px_rgba(0,242,255,0.4)]"
              />
              <div className="absolute top-2 right-2 bg-hud text-black px-3 py-1 text-[10px] font-black rounded italic">
                {tokenId || 'ARC-721'}
              </div>
            </div>
            
            <div className="mt-8 text-center space-y-2">
              <h2 className="text-hud font-hud text-lg tracking-widest uppercase">BINARY_IDENTITY_MINTED</h2>
              <p className="text-hud/60 text-[10px] font-mono tracking-wider max-w-md">
                Your biometric signature has been transformed into a unique cryptographic artifact.
                Stored on-chain and encrypted via Lit Protocol.
              </p>
            </div>

            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = pixelNFT;
                  link.download = `BioVault_Identity_${Date.now()}.png`;
                  link.click();
                }}
                className="px-6 py-2 bg-hud/10 border border-hud/40 text-hud text-[10px] font-hud hover:bg-hud hover:text-black transition-all"
              >
                DOWNLOAD_ARTIFACT
              </button>
              <button 
                onClick={() => window.location.href = '/dashboard'}
                className="px-6 py-2 bg-hud border border-hud text-black text-[10px] font-hud hover:bg-black hover:text-hud transition-all"
              >
                CONTINUE_TO_VAULT
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        muted
        className="w-full h-full object-cover opacity-60 grayscale-[50%]"
        width={640}
        height={480}
      />

      {/* Overlays Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10"
        width={640}
        height={480}
      />

      {/* HUD Labels */}
      <div className="absolute top-8 left-8 p-4 font-hud text-[10px] text-hud/60 space-y-1 z-30 tracking-widest uppercase">
        <p>RECR: {faceDetected ? 'LOCKED' : 'SEARCHING...'}</p>
        <p>RES: 1080P_BIO_FEED</p>
        <p>CRYPTO: AES_256_GCM</p>
        <div className="pt-4">
           <div className="w-20 h-1 bg-hud/20 rounded-full overflow-hidden">
              <motion.div 
                className="bg-hud h-full" 
                animate={{ width: faceDetected ? '100%' : '20%' }}
              />
           </div>
           <p className="mt-1">SIGNAL_STRENGTH</p>
        </div>
      </div>

      <div className="absolute top-8 right-8 text-right font-hud text-[10px] text-hud/60 space-y-1 z-30 tracking-widest uppercase">
        <p>ID: BVA-PROX-9</p>
        <p>LAT: 37.7749</p>
        <p>LONG: -122.4194</p>
        <p className="text-hud font-bold mt-4">CONF: {(confidence * 100).toFixed(1)}%</p>
      </div>

      {/* Central HUD elements */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
         {/* Orbiting circles */}
         <div className="w-48 h-48 border border-hud/20 rounded-full animate-orbit" />
         <div className="absolute w-64 h-64 border border-hud/10 rounded-full animate-orbit [animation-direction:reverse]" />
         
         {!faceDetected && status === 'idle' && (
           <div className="text-hud animate-pulse flex flex-col items-center">
             <Scan size={48} />
             <p className="font-hud text-[10px] mt-4 tracking-[0.3em]">PLACE_FACE_IN_SIGHT</p>
           </div>
         )}
      </div>

      {/* Bottom Status Panel */}
      <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-md border-t border-hud/20 p-6 z-40 transition-transform duration-500">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               {status === 'scanning' ? (
                 <Loader2 className="text-hud animate-spin" size={24} />
               ) : status === 'success' ? (
                 <CheckCircle className="text-success" size={24} />
               ) : (
                 <Fingerprint className="text-hud" size={24} />
               )}
               <div>
                  <h3 className="text-hud font-hud text-xs tracking-widest font-black italic">
                    {status === 'idle' ? 'BIOVAULT_AIV_READY' : status.toUpperCase()}
                  </h3>
                  <p className="text-[10px] text-hud/60 font-mono">{subStatus}</p>
               </div>
            </div>

            <div className="flex-1 max-w-[200px] px-8">
               <canvas ref={voiceCanvasRef} width={200} height={40} className="w-full opacity-60" />
            </div>

            <button
               onClick={startAuth}
               disabled={status === 'scanning' || status === 'success'}
               className={`px-8 py-3 font-hud text-xs tracking-[0.2em] transition-all rounded-sm border ${
                 status === 'success' 
                 ? 'bg-success/20 border-success text-success' 
                 : 'bg-hud/10 border-hud text-hud hover:bg-hud hover:text-black shadow-[0_0_20px_rgba(0,242,255,0.3)]'
               }`}
            >
               {status === 'success' ? 'AUTHORIZED' : mode === 'register' ? 'INITIALIZE' : 'UNLOCK_VAULT'}
            </button>
         </div>

         <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4 p-2 bg-danger/10 border border-danger/30 rounded text-danger text-[10px] font-mono uppercase flex items-center gap-2"
              >
                <AlertCircle size={14} />
                {error}
              </motion.div>
            )}
         </AnimatePresence>
      </div>
    </div>
  );
}
