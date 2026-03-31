"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, File, Shield, Lock, Clock, Users, 
  CheckCircle2, AlertCircle, Download, Key,
  Mic, Brain, User, X, Calendar, LockIcon,
  ChevronRight, BadgeCheck
} from 'lucide-react';
import FaceScan from './FaceScan';
import { storeFileMetadata, getStoredFiles } from '@/lib/near';
import { uploadFileToStoracha, getFilecoinGatewayURL } from '@/lib/storacha';
import { deriveMasterKey, importMasterKey } from '@/lib/masterKey';
import { cn } from '@/utils/cn'; // Assuming utils/cn exists if it's a shadcn-like project, else I'll define a fallback

type SecurityLevel = 'VOICE' | 'FACE_VOICE' | 'FULL';

interface VaultFile {
    cid: string;
    fileName: string;
    size: number;
    securityLevel: SecurityLevel;
    timelock: number | null;
    ownerFaceHash: string;
    timestamp: number;
}

const FileVault = () => {
    const [files, setFiles] = useState<VaultFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('FACE_VOICE');
    const [timelock, setTimelock] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    
    const [showScan, setShowScan] = useState(false);
    const [authFile, setAuthFile] = useState<VaultFile | null>(null);
    const [activeTab, setActiveTab] = useState<'upload' | 'vault'>('upload');

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        const stored = await getStoredFiles();
        setFiles(stored);
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) setSelectedFile(file);
    };

    const handleFileUpload = async (descriptor: Float32Array) => {
        if (!selectedFile) return;
        setUploading(true);
        setShowScan(false);

        try {
            // 1. Derive master key (mocking voice/brain for now)
            const faceHash = descriptor.toString(); // Simplified for demo
            const voiceHash = "voice_hash_preview_123";
            const brainHash = "brain_hash_preview_456";
            const wallet = "demo.near";
            
            const masterKeyHex = await deriveMasterKey(faceHash, voiceHash, brainHash, wallet);
            const masterKey = await importMasterKey(masterKeyHex);

            // 2. Read and Encrypt
            const fileData = await selectedFile.arrayBuffer();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encryptedData = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                masterKey,
                fileData
            );

            // 3. Upload to Storacha
            const blob = new Blob([iv, new Uint8Array(encryptedData)], { type: 'application/octet-stream' });
            const encryptedFile = new File([blob], selectedFile.name + '.enc');
            const cid = await uploadFileToStoracha(encryptedFile);

            // 4. Store Metadata on NEAR
            await storeFileMetadata(
                cid, 
                selectedFile.name, 
                selectedFile.size, 
                securityLevel, 
                timelock ? new Date(timelock).getTime() : null,
                faceHash
            );

            await loadFiles();
            setSelectedFile(null);
            setActiveTab('vault');
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    const handleFileAccess = async (file: VaultFile) => {
        setAuthFile(file);
        setShowScan(true);
    };

    const onAuthSuccess = (descriptor: Float32Array) => {
        setShowScan(false);
        if (authFile) {
            // In real app, we would decrypt here. For demo, we just trigger download from IPFS.
            window.open(getFilecoinGatewayURL(authFile.cid), '_blank');
            setAuthFile(null);
        } else {
            // Identity Verification flow completed
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 min-h-screen">
            {/* Navigation */}
            <div className="flex space-x-4 mb-8">
                <button 
                    onClick={() => setActiveTab('upload')}
                    className={cn(
                        "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                        activeTab === 'upload' ? "bg-accent text-white shadow-lg shadow-blue-500/20" : "bg-white/5 text-white/50 border border-white/5 hover:bg-white/10"
                    )}
                >
                    Encrypt & Store
                </button>
                <button 
                    onClick={() => setActiveTab('vault')}
                    className={cn(
                        "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                        activeTab === 'vault' ? "bg-secondary text-white shadow-lg shadow-teal-500/20" : "bg-white/5 text-white/50 border border-white/5 hover:bg-white/10"
                    )}
                >
                    Your Secure Vault
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'upload' ? (
                    <motion.div 
                        key="upload-tab"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                    >
                        {/* LEFT: Upload Area */}
                        <div 
                            onDrop={handleFileDrop}
                            onDragOver={(e) => e.preventDefault()}
                            className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] hover:border-blue-500/50 transition-colors group relative overflow-hidden"
                        >
                            {selectedFile ? (
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                                        <File className="text-blue-400" size={40} />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-1">{selectedFile.name}</h3>
                                    <p className="text-white/40 text-sm mb-6">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    <button 
                                        onClick={() => setSelectedFile(null)}
                                        className="text-red-400 text-xs hover:underline"
                                    >
                                        Remove file
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
                                        <Upload className="text-white/40 group-hover:text-emerald-400 transition-colors" size={40} />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Secure Drop</h3>
                                    <p className="text-white/40 text-sm mb-6 max-w-xs mx-auto">
                                        Drag and drop or click to upload any sensitive data. Supported: PDF, Image, Video, EEG.
                                    </p>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        id="file-upload" 
                                        onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
                                    />
                                    <label 
                                        htmlFor="file-upload"
                                        className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-all"
                                    >
                                        Browse Files
                                    </label>
                                </div>
                            )}

                            {uploading && (
                                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50">
                                    <div className="text-center">
                                        <motion.div 
                                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4 animate-spin"
                                        />
                                        <p className="text-blue-400 font-mono tracking-widest animate-pulse">ENCRYPTING & UPLOADING...</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Security Settings */}
                        <div className="space-y-6">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <h4 className="flex items-center space-x-2 text-white/80 font-medium mb-4">
                                    <Shield size={18} className="text-blue-400" />
                                    <span>Biometric Security Tier</span>
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { id: 'VOICE', icon: Mic, label: 'Voice Fingerprint', color: 'blue', desc: 'Fast, basic level security.' },
                                        { id: 'FACE_VOICE', icon: User, label: 'Face + Voice', color: 'teal', desc: 'Secure identity verification.' },
                                        { id: 'FULL', icon: Brain, label: 'Full Neural Biometric', color: 'blue', desc: 'Ultimate protection (Face + Voice + Brain).' }
                                    ].map((tier) => (
                                        <button
                                            key={tier.id}
                                            onClick={() => setSecurityLevel(tier.id as SecurityLevel)}
                                            className={cn(
                                                "flex items-start space-x-4 p-4 rounded-2xl border transition-all text-left",
                                                securityLevel === tier.id 
                                                    ? `bg-${tier.color}-500/10 border-${tier.color}-500/50 ring-1 ring-${tier.color}-500/20`
                                                    : "bg-white/5 border-white/5 hover:border-white/20"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-2 rounded-xl",
                                                securityLevel === tier.id ? `bg-${tier.color}-500/20 text-${tier.color}-400` : "bg-white/10 text-white/30"
                                            )}>
                                                <tier.icon size={20} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm">{tier.label}</div>
                                                <div className="text-xs text-white/40">{tier.desc}</div>
                                            </div>
                                            {securityLevel === tier.id && <BadgeCheck  className="ml-auto text-blue-400" size={18} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-white/80 font-medium">
                                        <Clock size={18} className="text-amber-400" />
                                        <span>Time-Locked Vault</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={!!timelock}
                                        onChange={(e) => setTimelock(e.target.checked ? new Date().toISOString().split('T')[0] : null)}
                                        className="w-4 h-4 rounded border-white/20 bg-slate-900/40 text-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                {timelock && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                                        <input 
                                            type="date" 
                                            value={timelock}
                                            onChange={(e) => setTimelock(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-amber-400 outline-none"
                                        />
                                        <p className="text-[10px] text-amber-500/60 mt-2 px-1">FILE WILL BE COMPLETELY INACCESSIBLE UNTIL THIS DATE.</p>
                                    </motion.div>
                                )}
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 text-white/80 font-medium">
                                        <Users size={18} className="text-cyan-400" />
                                        <span>Grant Shared Access</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={isSharing}
                                        onChange={(e) => setIsSharing(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <button 
                                disabled={!selectedFile || uploading}
                                onClick={() => setShowScan(true)}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/10 transition-all flex items-center justify-center space-x-3"
                            >
                                <Lock size={20} />
                                <span>ENCRYPT & STORE ON NEAR</span>
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="vault-tab"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {files.length === 0 ? (
                            <div className="col-span-full bg-white/5 rounded-3xl p-12 text-center border border-dashed border-white/10">
                                <File className="text-white/10 mx-auto mb-4" size={64} />
                                <h3 className="text-xl font-medium text-white/40">Vault is empty</h3>
                                <button onClick={() => setActiveTab('upload')} className="text-blue-400 text-sm mt-2 hover:underline">Go to Upload</button>
                            </div>
                        ) : (
                            files.map((file, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 group hover:border-white/30 transition-all relative overflow-hidden"
                                >
                                    {/* Security Badge */}
                                    <div className="absolute top-4 right-4">
                                        {file.securityLevel === 'VOICE' && <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20 uppercase tracking-widest">Voice Only</div>}
                                        {file.securityLevel === 'FACE_VOICE' && <div className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/20 uppercase tracking-widest">Face + Voice</div>}
                                        {file.securityLevel === 'FULL' && <div className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded-full border border-purple-500/20 uppercase tracking-widest">Neural Max</div>}
                                    </div>

                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <File className="text-white/60" size={24} />
                                    </div>

                                    <h4 className="text-lg font-semibold truncate pr-20">{file.fileName}</h4>
                                    <div className="text-[10px] font-mono text-white/30 mb-6 tracking-tighter uppercase">CID: {file.cid.slice(0, 20)}...</div>

                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-white/40">
                                            {(file.size / 1024).toFixed(1)} KB • {new Date(file.timestamp).toLocaleDateString()}
                                        </div>
                                        <button 
                                            onClick={() => handleFileAccess(file)}
                                            className="p-3 bg-white/5 group-hover:bg-blue-500 text-white/40 group-hover:text-white rounded-xl transition-all shadow-lg"
                                        >
                                            <Download size={18} />
                                        </button>
                                    </div>

                                    {/* Timelock Indicator */}
                                    {file.timelock && (
                                        <div className="mt-4 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center space-x-2">
                                            <Clock size={14} className="text-amber-400" />
                                            <span className="text-[10px] text-amber-500/80 font-medium">Locked until {new Date(file.timelock).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scan Overlay */}
            <AnimatePresence>
                {showScan && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setShowScan(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-xl"
                        >
                            <button 
                                onClick={() => setShowScan(false)}
                                className="absolute -top-4 -right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-[110]"
                            >
                                <X size={20} />
                            </button>
                            {/* Pass handleFileUpload as onSuccess if in upload flow, else trigger decryption flow */}
                            <FaceScan 
                                onSuccess={authFile ? onAuthSuccess : handleFileUpload} 
                                onFail={() => console.log("Scan failed")} 
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FileVault;
