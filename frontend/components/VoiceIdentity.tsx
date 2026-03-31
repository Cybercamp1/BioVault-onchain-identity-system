'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, User, Mail, Shield, AlertCircle, RefreshCw, Lock, Zap, FileCode, Cpu } from 'lucide-react';
import { 
  recordVoice, 
  extractVoiceprint, 
  deriveMultiFactorKey, 
  hashVoiceprint,
  compareVoiceprints 
} from '@/lib/voiceBiometric';
import { UserProfile, saveProfile, loadProfile } from '@/lib/voiceProfile';
import { getIdentityCID } from '@/lib/near';
import { captureBrainwaveSnapshot, hashBrainwave } from '@/lib/liveBrainwave';
import { verifyLiveness } from '@/lib/livenessCheck';

interface VoiceIdentityProps {
  mode: 'register' | 'login';
  onSuccess?: (profile: UserProfile) => void;
  walletAddress?: string;
}

export default function VoiceIdentity({ mode, onSuccess, walletAddress }: VoiceIdentityProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDone, setRecordingDone] = useState(false);
  const [voiceprint, setVoiceprint] = useState<number[] | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [challenge, setChallenge] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [factorStatus, setFactorStatus] = useState<string[]>([]);
  const [step, setStep] = useState(0); 
  const [processingStatus, setProcessingStatus] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const requestRef = useRef<number>();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const startVisualizer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const draw = () => {
        requestRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * canvas.height;
          // Matrix Green Style
          ctx.fillStyle = `rgb(0, ${Math.min(255, barHeight * 2 + 100)}, 50)`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 2;
        }
      };
      draw();
      return stream;
    } catch (err) {
      setError("Biometric capture device (mic) offline.");
      return null;
    }
  }, []);

  const handleMicClick = async () => {
    setError(null);
    setIsRecording(true);
    setRecordingDone(false);
    
    const visualizerStream = await startVisualizer();
    if (!visualizerStream) {
      setIsRecording(false);
      return;
    }

    try {
      setProcessingStatus("Capturing Neuroacoustic Data...");
      const brainPromise = captureBrainwaveSnapshot(4000);
      const voicePromise = recordVoice(4000);
      
      // In register mode, use SpeechRecognition to capture what they said as the new password
      let capturedText = "";
      if (mode === 'register' || mode === 'login') {
         const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
         if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.onresult = (e: any) => { capturedText = e.results[0][0].transcript; };
            recognition.start();
            setTimeout(() => recognition.stop(), 4000);
         }
      }

      const [brainSnapshot, rawVoice] = await Promise.all([brainPromise, voicePromise]);
      
      if (!brainSnapshot.isActive) throw new Error("Brain activity not detected. Bio-verification failed.");

      const vp = extractVoiceprint(rawVoice);
      setVoiceprint(vp);
      setRecordingDone(true);
      setIsRecording(false);
      
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      visualizerStream.getTracks().forEach(track => track.stop());

      setStep(2);
      setProcessingStatus("Cross-Analyzing Biometric Match...");
      await new Promise(r => setTimeout(r, 1000));

      if (mode === 'register') {
         if (!capturedText) throw new Error("Could not hear your voice phrase. Please try again.");
         const bwHash = await hashBrainwave(brainSnapshot);
         // Set the "password" as what they just spoke
         setChallenge(capturedText);
         setFactorStatus(["Neural origin verified", "Acoustic pattern captured", `Phrase set: "${capturedText}"`]);
         (window as any)._tempMfa = { vp, bwHash, digits: capturedText };
         setStep(1);
      } else {
         // In login, we first need to fetch the CID to get the expected phrase? 
         // Or just let them speak and see if the resulting key decrypts anything.
         // Actually, most biometric systems let you speak your phrase and then compare.
         // For demo, we assume they know their phrase "Elephant", etc.
         // We look up the CID by VP Hash first.
         const vpHash = await hashVoiceprint(vp);
         const cid = await getIdentityCID(vpHash);
         if (!cid) throw new Error("Voice footprint not found. Register first.");
         
         // Fetch the profile to get the secretPhrase challenge
         setProcessingStatus("Fetching Vault Challenge...");
         const response = await fetch(`https://w3s.link/ipfs/${cid}`);
         const data = await response.json();
         // But it's encrypted! So we need to derive the key with the phrase they JUST spoke.
         
         handleUnlock(vp, brainSnapshot, capturedText);
      }
    } catch (err: any) {
      setError(err.message);
      setIsRecording(false);
      setStep(0);
    }
  };

  const handleRegister = async () => {
    if (!walletAddress) return;
    const mfa = (window as any)._tempMfa;
    if (!mfa) return;
    
    setStep(2);
    try {
      setProcessingStatus('Deriving Cryptographic Key [MFA]...');
      const privKey = await deriveMultiFactorKey(mfa.vp, mfa.bwHash, mfa.digits, walletAddress);
      const vpHash = await hashVoiceprint(mfa.vp);
      
      setProcessingStatus('Sealing Vault on Filecoin...');
      const profile: UserProfile = {
        name: formData.name,
        email: formData.email,
        walletAddress: walletAddress,
        voiceprintHash: vpHash,
        secretPhrase: mfa.digits,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        eegSessions: [],
        cognitiveProfile: {
          dominantState: 'Active',
          totalSessions: 0,
          avgConfidence: 0.98
        }
      };
      
      await saveProfile(profile, privKey);
      setStep(3);
      delete (window as any)._tempMfa;
      if (onSuccess) onSuccess(profile);
    } catch (err: any) {
      setError(err.message);
      setStep(1);
    }
  };

  const handleUnlock = async (capturedVp: number[], brain: any, spokenPhrase: string) => {
    if (!walletAddress) return;
    setStep(2);
    try {
      setProcessingStatus('Acoustic Reconstruction...');
      const bwHash = await hashBrainwave(brain);
      const vpHash = await hashVoiceprint(capturedVp);
      
      // Derive key with the phrase they spoke
      const privKey = await deriveMultiFactorKey(capturedVp, bwHash, spokenPhrase, walletAddress);
      
      setProcessingStatus('Querying On-Chain Identity...');
      const cid = await getIdentityCID(vpHash);
      if (!cid) throw new Error("Biometric mismatch. Unauthorized access.");

      setProcessingStatus('Decrypting Personal Vault...');
      const profile = await loadProfile(vpHash, privKey);
      
      // Double check phrase
      if (profile.secretPhrase.toLowerCase() !== spokenPhrase.toLowerCase()) {
         throw new Error("Secret phrase mismatch. Access denied.");
      }

      setStep(3);
      setSimilarity(0.99);
      if (onSuccess) onSuccess(profile);
    } catch (err: any) {
      setError("Identity verification failed. (Secret phrase or Voice mismatch)");
      setStep(0); 
    }
  };

  return (
    <div className="bg-black border-2 border-[#00ff41] p-1 shadow-[0_0_20px_rgba(0,255,65,0.2)] rounded-sm overflow-hidden relative font-mono">
      {/* Cryptopunk Header Decoration */}
      <div className="bg-[#00ff41] text-black px-4 py-1 text-[10px] font-black uppercase flex justify-between">
         <span>BIOMETRIC_VAULT_v1.0.4</span>
         <span>[SYSTEM_STABLE]</span>
      </div>

      <div className="p-8">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="mic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
            <div className="mb-6 flex items-center justify-center gap-2">
               <Zap className="text-[#00ff41] w-4 h-4 animate-pulse" />
               <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                {mode === 'register' ? 'Set Biological Password' : 'Speak Secret Passage'}
              </h3>
            </div>
            
            <div className="relative mb-8 flex justify-center">
              {isRecording && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border border-[#00ff41]/50 animate-ping" />
                </div>
              )}
              
              <button
                disabled={isRecording}
                onClick={handleMicClick}
                className={`w-20 h-20 flex items-center justify-center transition-all border-4 ${
                  isRecording 
                    ? 'bg-[#00ff41] border-white' 
                    : 'bg-black border-[#00ff41] hover:bg-[#00ff41] hover:text-black'
                }`}
              >
                <Mic className={`w-8 h-8 ${isRecording ? 'text-black' : 'text-[#00ff41]'}`} />
              </button>
            </div>

            <canvas ref={canvasRef} width={300} height={50} className="mx-auto block mb-6 bg-black border border-[#00ff41]/30" />
            
            <p className="text-[#00ff41]/70 text-[10px] uppercase mb-1 font-bold">
              {isRecording ? ">> LISTENING_DEVICE_ACTIVE" : ">> IDLE_READY"}
            </p>
            <p className="text-gray-500 text-xs mb-8">
              {mode === 'register' 
                ? "Speak any unique name or phrase clearly (e.g. 'Elephant' or 'I am Batman')."
                : "Speak your registered secret phrase."}
            </p>
            {error && <p className="text-red-500 text-[10px] p-2 bg-red-500/10 border border-red-500/30 uppercase mt-4">{error}</p>}
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
             <div className="border-b border-[#00ff41]/30 pb-4 mb-4">
               <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
                  <FileCode className="text-[#00ff41]" size={18} />
                  Vault Persona Info
               </h3>
             </div>
             
             <div className="space-y-4">
               <div className="group">
                  <label className="text-[10px] text-[#00ff41] uppercase font-bold mb-1 block opacity-50">Identity_Prop: NAME</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-black border border-[#00ff41]/50 px-4 py-3 text-white outline-none focus:border-[#00ff41] transition-all"
                    placeholder="CRYPTOPUNK_7712"
                   />
               </div>
               <div className="group">
                  <label className="text-[10px] text-[#00ff41] uppercase font-bold mb-1 block opacity-50">Identity_Prop: EMAIL</label>
                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-black border border-[#00ff41]/50 px-4 py-3 text-white outline-none focus:border-[#00ff41] transition-all"
                    placeholder="user@neuralvault.io"
                   />
               </div>
             </div>

             <div className="bg-[#00ff41]/5 p-4 border border-[#00ff41]/20 my-6">
                <p className="text-[10px] text-[#00ff41] leading-relaxed uppercase">
                   Password captured: <span className="text-white font-black underline">"{challenge}"</span>
                </p>
                <p className="text-[9px] text-gray-500 mt-2 italic">Key will be derived from voice biometric + this specific phrase.</p>
             </div>

             <button
               disabled={!formData.name || !formData.email}
               onClick={handleRegister}
               className="w-full py-4 bg-[#00ff41] text-black font-black uppercase text-sm hover:bg-white transition-all shadow-[0_0_15px_rgba(0,255,65,0.4)]"
             >
                Initialize Security Vault
             </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="process" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
            <Cpu className="w-12 h-12 text-[#00ff41] animate-spin mx-auto mb-6" />
            <p className="text-[#00ff41] font-black uppercase tracking-widest text-sm mb-2">{processingStatus}</p>
            <div className="mt-8 space-y-1 text-left inline-block">
               {factorStatus.map((s, i) => (
                 <div key={i} className="flex items-center gap-2 text-[10px] text-white/50 animate-pulse">
                    <span className="text-[#00ff41]">✓</span> {s.toUpperCase()}
                 </div>
               ))}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
            <div className="w-16 h-16 border-4 border-[#00ff41] mx-auto flex items-center justify-center mb-6">
              <Shield className="w-8 h-8 text-[#00ff41]" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter underline decoration-[#00ff41]">Vault Locked</h3>
            <p className="text-gray-500 text-xs mb-8 uppercase max-w-xs mx-auto leading-relaxed">
              Biological signature accepted. Your encrypted persona is stashed on the Filecoin network.
            </p>
            
            <button
               onClick={() => window.location.href = '/dashboard'}
               className="w-full py-4 border-2 border-[#00ff41] text-[#00ff41] font-black uppercase text-sm hover:bg-[#00ff41] hover:text-black transition-all"
            >
              Enter Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Retro Matrix Footer */}
      <div className="bg-[#00ff41]/10 px-4 py-1 text-[8px] text-[#00ff41] font-bold uppercase flex justify-between border-t border-[#00ff41]/20">
         <span>ENC: AES-256 / SHA-256</span>
         <span>AUTH: BIOMETRIC_ORIGIN</span>
      </div>
    </div>
  );
}
