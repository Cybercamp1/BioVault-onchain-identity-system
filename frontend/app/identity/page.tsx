'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, FileKey, Wallet, Search, Fingerprint, Activity, Terminal } from 'lucide-react';
import Link from 'next/link';
import BiometricHUD from '@/components/BiometricHUD';
import { UserProfile, saveProfile, loadProfile } from '@/lib/voiceProfile';
import { mintBioVaultNFT, getIdentityCID } from '@/lib/near';
import { generateCognitoId, analyzePersonality } from '@/lib/personality';
import { deriveMultiFactorKey, hashVoiceprint } from '@/lib/voiceBiometric';
import { hashDescriptor } from '@/lib/faceBiometric';
import { uploadImageToStoracha, uploadTransactionToFilecoin } from '@/lib/storacha';

export default function IdentityPage() {
  const { address } = useAccount();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nftId, setNftId] = useState<string | null>(null);
  const [creationTxCid, setCreationTxCid] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', email: '' });

  // Handle successful biometric capture
// ... (rest of the handleBioSuccess change, setting creationTxCid) ...
  const handleBioSuccess = async (data: { face: Float32Array; voice: number[]; pixelNFT: string }) => {
    if (!address) return;
    setLoading(true);

    try {
      const vpHashing = await hashVoiceprint(data.voice);
      const faceHashing = await hashDescriptor(data.face);

      if (mode === 'register') {
        const cognitoId = generateCognitoId();
        const personality = analyzePersonality(data.face, data.voice);
        const bioKey = await deriveMultiFactorKey(data.voice, faceHashing, 'BioVaultSecret', address);

        // 1. Upload Pixel NFT Image to Filecoin
        const pixelCid = await uploadImageToStoracha(data.pixelNFT, `nft_${cognitoId}.png`);
        const filecoinUrl = `https://w3s.link/ipfs/${pixelCid}`;

        const newProfile: UserProfile = {
          name: formData.name,
          email: formData.email,
          walletAddress: address,
          cognitoId,
          personalityType: personality,
          voiceprintHash: vpHashing,
          faceDescriptorHash: faceHashing,
          profileBackground: data.pixelNFT, // Use local data URL for instant preview
          secretPhrase: 'BioVaultSecret',
          createdAt: Date.now(),
          lastLogin: Date.now(),
          eegSessions: [],
          cognitiveProfile: { dominantState: 'Neutral', totalSessions: 0, avgConfidence: 0.99 }
        };

        // 2. Upload Profile creation "Transaction" to Filecoin
        const txCid = await uploadTransactionToFilecoin({
          event: 'PIXEL_NFT_GENESIS',
          owner: address,
          nftCid: pixelCid,
          biometricHash: vpHashing,
          timestamp: Date.now()
        });
        
        console.log(`Creation transaction logged at Filecoin CID: ${txCid}`);
        setCreationTxCid(txCid);

        await saveProfile(newProfile, bioKey);
        const nft = await mintBioVaultNFT(vpHashing, cognitoId, personality, filecoinUrl); // Added pixelNFT
        setNftId(nft.id);
        setProfile(newProfile);
        setIsUnlocked(true);
      } else {
        // Login Logic
        const cid = await getIdentityCID(vpHashing);
        if (!cid) throw new Error("BIOMETRIC_OFFSET_MISMATCH: Footprint not found.");

        const bioKey = await deriveMultiFactorKey(data.voice, faceHashing, 'BioVaultSecret', address);
        const loaded = await loadProfile(vpHashing, bioKey);
        setProfile(loaded);
        setIsUnlocked(true);
      }
    } catch (err: any) {
      alert(err.message || "VAULT_ACCESS_DENIED");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12 px-4 font-sans selection:bg-hud/30 overflow-hidden relative">
      {/* HUD Background Decorations */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-hud/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="text-center mb-16 relative">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-2 rounded-sm border border-hud/20 bg-hud/5 mb-8"
          >
            <Activity className="w-4 h-4 text-hud animate-pulse" />
            <span className="font-hud text-[10px] tracking-[0.4em] text-hud font-bold">BIOVAULT_AIV_CORE_v2.0.1</span>
          </motion.div>

          <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase mb-6">
            Identity <span className="text-transparent border-t border-b border-hud/40 bg-clip-text bg-gradient-to-r from-hud via-white to-secondary">Re-Defined</span>
          </h1>
          <p className="font-mono text-hud/60 text-xs tracking-widest max-w-2xl mx-auto uppercase">
            Replacing traditional access vectors with 128-bit biometric entropy.
          </p>
        </header>

        {!isUnlocked ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Sidebar / Inputs */}
            <div className="lg:col-span-4 space-y-6">
               <div className="bg-black/40 border border-hud/10 p-8 rounded-sm backdrop-blur-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-hud/40 group-hover:h-full transition-all duration-700" />
                  
                  <nav className="flex gap-2 mb-8 p-1 bg-hud/5 border border-hud/10 rounded-sm">
                    {['register', 'login'].map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m as any)}
                        className={`flex-1 py-3 font-hud text-[10px] tracking-widest transition-all ${
                          mode === m 
                          ? 'bg-hud text-black font-black' 
                          : 'text-hud/50 hover:text-hud'
                        }`}
                      >
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </nav>

                  <AnimatePresence mode="wait">
                    {mode === 'register' ? (
                      <motion.div 
                        key="reg" 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <div className="space-y-4">
                           <div>
                              <label className="font-hud text-[9px] text-hud/40 block mb-2 tracking-[0.2em]">IDENTITY.NAME</label>
                              <input 
                                type="text"
                                placeholder="J. JARVIS"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full bg-hud/5 border border-hud/20 px-4 py-3 text-sm font-mono focus:border-hud outline-none transition-all text-white"
                              />
                           </div>
                           <div>
                              <label className="font-hud text-[9px] text-hud/40 block mb-2 tracking-[0.2em]">IDENTITY.SEC_TAG</label>
                              <input 
                                type="email"
                                placeholder="ACCESS@BIOVAULT.AI"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="w-full bg-hud/5 border border-hud/20 px-4 py-3 text-sm font-mono focus:border-hud outline-none transition-all text-white"
                              />
                           </div>
                        </div>
                        <p className="text-[10px] text-hud/40 italic leading-relaxed font-mono">
                          * Your biometric embeddings will be hashed using SHA-256 and stored on decentralized Filecoin nodes. No raw data ever leaves your device.
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="log" 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 20 }}
                        className="py-6 text-center"
                      >
                        <Search className="w-12 h-12 text-hud/30 mx-auto mb-4" />
                        <p className="text-hud/60 font-hud text-[10px] tracking-widest italic leading-relaxed">
                          INITIATING BIOMETRIC_RECONSTRUCTION. PLEASE ALIGN YOUR SENSORS.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>

               {/* System Info Cards */}
               <div className="p-6 bg-hud/5 border border-hud/10 rounded-sm font-mono space-y-4">
                  <div className="flex justify-between items-center text-[10px]">
                     <span className="text-hud/40">SYSTEM_STATUS</span>
                     <span className="text-success font-bold">ONLINE</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                     <span className="text-hud/40">ENC_LAYER</span>
                     <span className="text-hud">LIT_GALLOWS_2</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                     <span className="text-hud/40">DE_ST_NODE</span>
                     <span className="text-hud text-right">L'HOUSE / IPFS</span>
                  </div>
               </div>
            </div>

            {/* Main HUD Interface */}
            <div className="lg:col-span-8 relative">
              <div className="absolute -top-10 -right-10 w-40 h-40 border-t border-r border-hud/20 pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 border-b border-l border-hud/20 pointer-events-none" />
              
              <BiometricHUD mode={mode} onSuccess={handleBioSuccess} />
            </div>
          </div>
        ) : (
          /* Profile / Success Card */
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto"
          >
             <div className="bg-black/60 border border-hud/30 rounded-sm p-1 backdrop-blur-2xl">
                <div className="bg-hud/10 border border-hud/20 p-8 flex flex-col md:flex-row gap-12 relative overflow-hidden">
                   {/* Scanning deco */}
                   <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-hud/5 to-transparent skew-x-12" />
                   
                   {/* Avatar/NFT Preview */}
                   <div className="relative group">
                      <div className="w-56 h-56 rounded-sm border border-hud bg-hud/10 relative overflow-hidden">
                         {profile?.profileBackground ? (
                            <img 
                               src={profile.profileBackground} 
                               alt="Pixel NFT" 
                               className="w-full h-full object-cover"
                            />
                         ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-hud/20">
                               <Fingerprint size={120} className="animate-pulse" />
                            </div>
                         )}
                         <div className="absolute inset-0 bg-hud/20 mix-blend-overlay" />
                         {/* Static Glitch effect */}
                         <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/oEI9uWUicv_R6/giphy.gif')] opacity-10 mix-blend-screen" />
                      </div>
                      <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-hud flex items-center justify-center text-black">
                         <Lock size={20} />
                      </div>
                   </div>

                   <div className="flex-1 space-y-8 pt-4">
                      <div>
                        <div className="flex items-center gap-4 mb-2">
                           <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">
                             {profile?.name}
                           </h2>
                           <span className="px-3 py-1 bg-hud text-black font-hud text-[8px] font-black tracking-widest rounded-sm">
                             VERIFIED_ORIGIN
                           </span>
                        </div>
                        <p className="font-mono text-hud/60 text-xs">{profile?.email}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-hud/10 pt-6 font-mono">
                         <div>
                            <p className="text-[10px] text-hud/40 mb-1">COGNITO_ID</p>
                            <p className="text-sm font-bold text-hud tracking-widest">{profile?.cognitoId}</p>
                         </div>
                         <div>
                            <p className="text-[10px] text-hud/40 mb-1">PERSONALITY_AIV</p>
                            <p className="text-sm font-bold text-secondary uppercase italic">{profile?.personalityType}</p>
                         </div>
                         <div>
                            <p className="text-[10px] text-hud/40 mb-1">WALLET_TX_AUTH</p>
                            <p className="text-sm font-bold text-white truncate">{address?.slice(0, 10)}...</p>
                         </div>
                         <div>
                            <p className="text-[10px] text-hud/40 mb-1">NFT_TOKEN_ID</p>
                            <p className="text-sm font-bold text-warning">{nftId || 'SYNCING...'}</p>
                         </div>
                         <div className="col-span-2 mt-4 pt-4 border-t border-hud/10">
                            <p className="text-[9px] text-hud/40 mb-1 font-hud tracking-[0.2em] animate-pulse">FILECOIN_GEN_TX_CID</p>
                            <p className="text-[10px] font-mono text-hud truncate">
                               {creationTxCid ? `ipfs://${creationTxCid}` : 'VERIFYING_DECENTRALIZED_STORAGE...'}
                            </p>
                         </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                         <Link 
                            href="/dashboard"
                            className="flex-1 bg-hud text-black py-4 font-hud text-[10px] tracking-[0.2em] font-black text-center border border-hud hover:bg-black hover:text-hud transition-all shadow-[0_0_30px_rgba(0,242,255,0.2)]"
                         >
                            ACCESS_VAULT_DASHBOARD
                         </Link>
                         <button
                           onClick={() => window.location.reload()}
                           className="px-6 border border-hud/20 hover:border-hud transition-all text-hud"
                         >
                           <Terminal size={18} />
                         </button>
                      </div>
                   </div>
                </div>
             </div>

             <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'DECENTRALIZED_STORAGE', val: 'IPFS_PINNED', icon: Shield },
                  { label: 'ACCESS_CONTROL', val: 'LIT_PROTOCOL', icon: Lock },
                  { label: 'IDENTITY_LAYER', val: 'ERC-721_MOCK', icon: FileKey },
                ].map((stat, i) => (
                  <div key={i} className="bg-hud/5 border border-hud/10 p-6 rounded-sm group hover:border-hud/40 transition-all">
                     <stat.icon className="text-hud/40 mb-4 group-hover:text-hud transition-all" />
                     <p className="text-[9px] font-hud text-hud/40 tracking-widest mb-1">{stat.label}</p>
                     <p className="text-xs font-mono font-bold">{stat.val}</p>
                  </div>
                ))}
             </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
