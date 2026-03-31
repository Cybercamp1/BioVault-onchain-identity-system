'use client';

import { useState, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import EEGChart from '@/components/EEGChart';
import EncryptUploadFlow from '@/components/EncryptUploadFlow';
import { EEGSession } from '@/lib/types';
import { parseEEGFile } from '@/utils/eegParser';
import { uploadEncryptedEEG } from '@/lib/storacha';
import { storeSession } from '@/lib/near';
import { encryptEEGData } from '@/lib/lit';
import { Upload, Brain, FileJson, ChevronDown } from 'lucide-react';

// Sample sessions embedded for guaranteed demo
const SAMPLE_SESSIONS: Record<string, EEGSession> = {};

function generateSampleSession(state: string, label: string): EEGSession {
  const sampleRate = 256;
  const duration = 10;
  const numSamples = sampleRate * duration;
  const params: Record<string, { alpha: number; beta: number; theta: number; noise: number }> = {
    focus: { alpha: 0.5, beta: 1.2, theta: 0.2, noise: 0.1 },
    relaxed: { alpha: 1.5, beta: 0.3, theta: 0.4, noise: 0.05 },
    stressed: { alpha: 0.2, beta: 1.8, theta: 0.6, noise: 0.3 },
  };
  const p = params[state] || params.focus;
  const data: Record<string, number[]> = {};
  for (let ch = 1; ch <= 8; ch++) {
    const arr: number[] = [];
    const scale = 0.8 + Math.random() * 0.4;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      arr.push(
        (p.alpha * Math.sin(2 * Math.PI * 10 * t) +
         p.beta * Math.sin(2 * Math.PI * 20 * t) +
         p.theta * Math.sin(2 * Math.PI * 6 * t) +
         (Math.random() - 0.5) * p.noise * 2) * scale
      );
    }
    data[`ch${ch}`] = arr;
  }
  return {
    session_id: `sess_${Math.floor(Math.random() * 9000) + 1000}`,
    label,
    cognitive_state: state,
    duration_sec: duration,
    sample_rate: sampleRate,
    channels: 8,
    data,
  };
}

export default function UploadPage() {
  const { address, isConnected } = useAccount();
  const [eegData, setEegData] = useState<EEGSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cid, setCid] = useState<string | undefined>();
  const [txHash, setTxHash] = useState<string | undefined>();
  const [showSamples, setShowSamples] = useState(false);
  const [steps, setSteps] = useState<{ label: string; status: 'pending' | 'active' | 'done' | 'error' }[]>([
    { label: 'Preparing data...', status: 'pending' as const },
    { label: 'Encrypting with Lit Protocol...', status: 'pending' as const },
    { label: 'Uploading to Filecoin via Storacha...', status: 'pending' as const },
    { label: 'Recording on NEAR Blockchain...', status: 'pending' as const },
    { label: 'Complete!', status: 'pending' as const },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const session = parseEEGFile(e.target?.result as string);
        setEegData(session);
      } catch (err: any) {
        setError(err.message || 'Invalid EEG file');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      handleFileUpload(file);
    } else {
      setError('Please drop a .json EEG file');
    }
  }, [handleFileUpload]);

  const loadSample = (state: string) => {
    const label = `${state}_001`;
    const session = generateSampleSession(state, label);
    setEegData(session);
    setShowSamples(false);
    setError(null);
  };

  const updateStep = (index: number, status: 'pending' | 'active' | 'done' | 'error') => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
  };

  const handleEncryptAndStore = async () => {
    if (!eegData) return;
    setIsProcessing(true);
    setCid(undefined);
    setTxHash(undefined);
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const })));

    try {
      // Step 1: Prepare
      updateStep(0, 'active');
      const jsonString = JSON.stringify(eegData);
      await new Promise(r => setTimeout(r, 800));
      updateStep(0, 'done');

      // Step 2: Encrypt with Lit
      updateStep(1, 'active');
      const { ciphertext, dataToEncryptHash } = await encryptEEGData(jsonString, address || '0x0');
      console.log('Lit Protocol: Encrypted EEG data');
      updateStep(1, 'done');

      // Step 3: Upload to Filecoin
      updateStep(2, 'active');
      const resultCid = await uploadEncryptedEEG(ciphertext, dataToEncryptHash, eegData.label);
      setCid(resultCid);
      updateStep(2, 'done');

      // Step 4: Record on NEAR
      updateStep(3, 'active');
      const tx = await storeSession(resultCid, dataToEncryptHash, eegData.label, eegData.cognitive_state);
      setTxHash(tx);
      updateStep(3, 'done');

      // Step 5: Complete
      updateStep(4, 'done');
    } catch (err: any) {
      setError(err.message || 'Processing failed');
      const activeIdx = (steps as any).findIndex((s: any) => s.status === 'active');
      if (activeIdx >= 0) updateStep(activeIdx, 'error');
    }
    setIsProcessing(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Upload <span className="text-accent">EEG Session</span>
        </h1>
        <p className="text-gray-400 mb-10">Upload or select sample brainwave data to encrypt and store.</p>
      </motion.div>

      {/* SECTION 1: Data Input */}
      <div className="space-y-6 mb-10">
        {/* Drag & Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-accent/30 hover:border-accent/60 rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 hover:bg-accent/5 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          />
          <Brain size={48} className="mx-auto text-accent/50 group-hover:text-accent mb-4 transition-colors" />
          <p className="text-lg text-gray-400 group-hover:text-white transition-colors">
            Drop your <span className="text-accent font-semibold">.json</span> EEG file here
          </p>
          <p className="text-sm text-gray-600 mt-2">or click to browse</p>
        </div>

        {/* OR Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-gray-500 text-sm">OR</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Sample Data Buttons */}
        <div className="relative">
          <button
            onClick={() => setShowSamples(!showSamples)}
            className="w-full flex items-center justify-between px-6 py-4 rounded-xl bg-white/5 border border-accent/20 hover:border-accent/40 text-white transition-all"
          >
            <span className="flex items-center gap-2">
              <FileJson size={18} className="text-accent" />
              Use Sample Data
            </span>
            <ChevronDown size={18} className={`transition-transform ${showSamples ? 'rotate-180' : ''}`} />
          </button>
          {showSamples && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 mt-2 bg-background border border-accent/20 rounded-xl overflow-hidden z-20 shadow-xl"
            >
              {['focus', 'relaxed', 'stressed'].map(state => (
                <button
                  key={state}
                  onClick={() => loadSample(state)}
                  className="w-full px-6 py-3 text-left hover:bg-accent/10 transition-colors text-sm text-gray-300 hover:text-white capitalize flex items-center gap-3"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    state === 'focus' ? 'bg-blue-500' : state === 'relaxed' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  {state} Session
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* SECTION 2: EEG Preview */}
      {eegData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">EEG Preview</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
              <span>ID: {eegData.session_id}</span>
              <span>{eegData.duration_sec}s</span>
              <span>{eegData.sample_rate}Hz</span>
              <span>{eegData.channels}ch</span>
            </div>
          </div>
          <EEGChart data={eegData} channels={['ch1', 'ch2', 'ch3']} />
        </motion.div>
      )}

      {/* SECTION 3: Encrypt & Store */}
      {eegData && !isProcessing && !cid && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10">
          {!isConnected ? (
            <div className="px-6 py-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm text-center">
              ⚠️ Connect your wallet to encrypt & store data on-chain
            </div>
          ) : null}
          <button
            onClick={handleEncryptAndStore}
            disabled={isProcessing}
            className="mt-4 w-full py-4 rounded-2xl bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 text-white font-bold text-lg transition-all duration-300 shadow-xl shadow-accent/25 hover:shadow-accent/40 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <Upload size={20} />
            Encrypt & Store on Filecoin
          </button>
        </motion.div>
      )}

      {/* SECTION 4 & 5: Progress + Result */}
      <EncryptUploadFlow isActive={isProcessing} cid={cid} txHash={txHash} steps={steps} />
    </div>
  );
}
