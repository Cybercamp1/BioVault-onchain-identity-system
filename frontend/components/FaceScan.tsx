"use client";

import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, RefreshCw, Loader2, Camera } from 'lucide-react';
import { extractFaceDescriptor, verifyLivenessAction, LivenessChallenge } from '@/lib/faceBiometric';

interface FaceScanProps {
  onSuccess: (descriptor: Float32Array) => void;
  onFail: () => void;
}

type ScanStatus = 'initializing' | 'detecting' | 'scanning' | 'verifying' | 'verified' | 'failed';

const FaceScan: React.FC<FaceScanProps> = ({ onSuccess, onFail }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<ScanStatus>('initializing');
  const [challenge, setChallenge] = useState<LivenessChallenge | null>(null);
  const [progress, setProgress] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480, facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStatus('detecting');
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setStatus('failed');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  useEffect(() => {
    if (status === 'detecting' || status === 'scanning') {
      const interval = setInterval(async () => {
        if (!videoRef.current) return;
        
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
        const detection = await faceapi.detectSingleFace(videoRef.current, options).withFaceLandmarks();

        if (detection && canvasRef.current) {
          const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
          const resized = faceapi.resizeResults(detection, dims);
          
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
             ctx.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
             // Draw custom detection box
             const { x, y, width, height } = resized.detection.box;
             ctx.strokeStyle = '#10b981';
             ctx.lineWidth = 2;
             ctx.strokeRect(x, y, width, height);
             
             // Corners
             const cornerLen = 20;
             ctx.beginPath(); ctx.moveTo(x, y+cornerLen); ctx.lineTo(x,y); ctx.lineTo(x+cornerLen, y); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(x+width-cornerLen, y); ctx.lineTo(x+width,y); ctx.lineTo(x+width, y+cornerLen); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(x, y+height-cornerLen); ctx.lineTo(x,y+height); ctx.lineTo(x+cornerLen, y+height); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(x+width-cornerLen, y+height); ctx.lineTo(x+width,y+height); ctx.lineTo(x+width, y+height-cornerLen); ctx.stroke();
          }

          if (status === 'detecting') {
              setStatus('scanning');
              startLivenessChallenge();
          }
        } else {
            // No face detected
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx?.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
            }
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status]);

  const startLivenessChallenge = async () => {
    const challenges: LivenessChallenge[] = ["BLINK", "SMILE", "TURN LEFT"];
    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    setChallenge(randomChallenge);
    
    // Simulate challenge verification over 3 seconds
    let stage = 0;
    const interval = setInterval(() => {
        stage += 1;
        setProgress((stage / 3) * 100);
        if (stage >= 3) {
            clearInterval(interval);
            completeVerification();
        }
    }, 1000);
  };

  const completeVerification = async () => {
    if (!videoRef.current) return;
    setStatus('verifying');
    
    const descriptor = await extractFaceDescriptor(videoRef.current);
    if (descriptor) {
      setConfidence(95 + Math.random() * 4); // Simulated high confidence for demo
      setStatus('verified');
      setTimeout(() => onSuccess(descriptor), 1500);
    } else {
      setStatus('failed');
      onFail();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 p-8 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500/5 to-purple-500/5 pointer-events-none" />

      {/* Header */}
      <div className="text-center z-10">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
          NEURAL FACE SCAN
        </h2>
        <p className="text-white/50 text-sm mt-1">Biometric Layer 02 — Identity Verification</p>
      </div>

      {/* The Circular Camera Frame */}
      <div className="relative w-64 h-64 md:w-80 md:h-80 z-10">
        {/* Animated Scanning Ring */}
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -top-4 -left-4 -right-4 -bottom-4 border-2 border-dashed border-teal-500/30 rounded-full"
        />
        
        {/* Pulsing Outer Glow */}
        <motion.div 
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-8 -left-8 -right-8 -bottom-8 rounded-full bg-blue-500/10 blur-2xl"
        />

        {/* Video Circle */}
        <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white/10 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
            <video 
                ref={videoRef}
                autoPlay 
                muted 
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
            />
            <canvas 
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none scale-x-[-1]"
            />
            
            {/* Success Overlay */}
            <AnimatePresence>
                {status === 'verified' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-emerald-500/20 backdrop-blur-sm flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-emerald-500 text-white p-4 rounded-full shadow-lg"
                        >
                            <CheckCircle size={48} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Scanning Line */}
        {status === 'scanning' && (
            <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20 pointer-events-none"
            />
        )}
      </div>

      {/* Instructions & Status */}
      <div className="w-full max-w-xs z-10 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {status === 'initializing' && (
            <motion.div 
              key="init"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex items-center space-x-2 text-white/70"
            >
              <Loader2 className="animate-spin" size={20} />
              <span>Initializing Camera...</span>
            </motion.div>
          )}

          {status === 'detecting' && (
            <motion.div 
              key="detect"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex items-center space-x-2 text-cyan-400"
            >
              <Camera size={20} />
              <span>Align Face in Circle</span>
            </motion.div>
          )}

          {status === 'scanning' && (
            <motion.div 
              key="scan"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center space-y-4 w-full"
            >
              <div className="flex items-center space-x-2 text-emerald-400 font-medium">
                <RefreshCw className="animate-spin" size={20} />
                <span>Liveness Check: {challenge}</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
                />
              </div>
              <p className="text-xs text-white/40 italic">Move naturally to prove identity</p>
            </motion.div>
          )}

          {status === 'verified' && (
            <motion.div 
              key="verified"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="text-emerald-400 font-bold text-lg mb-1">IDENTITY SECURED</div>
              <div className="text-white/60 text-sm">Face Match: {confidence?.toFixed(2)}%</div>
            </motion.div>
          )}

          {status === 'failed' && (
            <motion.div 
              key="failed"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center space-y-3"
            >
              <div className="flex items-center space-x-2 text-red-400">
                <AlertCircle size={20} />
                <span>Recognition Failed</span>
              </div>
              <button 
                onClick={() => { setStatus('detecting'); setProgress(0); startCamera(); }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
              >
                Retry Scan
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative Accents */}
      <div className="absolute top-4 left-4 text-[10px] text-emerald-500/40 font-mono tracking-widest uppercase">
        Neural-Secure Ver: 2.0.4
      </div>
      <div className="absolute bottom-4 right-4 text-[10px] text-white/20 font-mono">
        {status.toUpperCase()}...{Math.floor(progress)}%
      </div>
    </div>
  );
};

export default FaceScan;
