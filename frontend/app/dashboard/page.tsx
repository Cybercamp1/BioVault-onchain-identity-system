'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Wallet, Send, RefreshCw, Lock, 
  Mic, Loader2, CheckCircle, AlertCircle, 
  Cpu, Zap, Fingerprint, CreditCard, ArrowUpRight, Activity 
} from 'lucide-react';
import { recordVoice, extractVoiceprint, compareVoiceprints } from '@/lib/voiceBiometric';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  
  const [profile, setProfile] = useState<any>(null);
  const [nfts, setNfts] = useState<any[]>([]);
  const [txStep, setTxStep] = useState<'idle' | 'input' | 'confirm' | 'processing' | 'success'>('idle');
  const [txAmount, setTxAmount] = useState('');
  const [txRecipient, setTxRecipient] = useState('');
  const [voiceConfidence, setVoiceConfidence] = useState(0);

  const [lockTimer, setLockTimer] = useState(300); // 5 minutes
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Load mock data from local storage
    const storedNfts = JSON.parse(localStorage.getItem('mock_near_nfts') || '[]');
    setNfts(storedNfts);
    
    // Simplification: use the first NFT's metadata as profile info for demo
    if (storedNfts.length > 0) {
      setProfile(storedNfts[0].metadata);
    }

    // Lock timer logic
    const interval = setInterval(() => {
       setLockTimer(prev => {
          if (prev <= 1) {
             window.location.href = '/identity'; // Redirect to re-authenticate
             return 0;
          }
          return prev - 1;
       });
    }, 1000);

    // Security alerts logic
    const alerts = JSON.parse(localStorage.getItem('security_alerts') || '[]');
    setSecurityAlerts(alerts.reverse().slice(0, 5));

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendRequest = () => {
    setTxStep('confirm');
  };

  const confirmWithVoice = async () => {
    try {
      setTxStep('confirm');
      // Start recording for confirmation
      const voiceRaw = await recordVoice(3000);
      const vp = extractVoiceprint(voiceRaw);
      
      setTxStep('processing');
      await new Promise(r => setTimeout(r, 2000)); // Simulate chain processing
      
      setTxStep('success');
      setTimeout(() => setTxStep('idle'), 4000);
    } catch (err) {
      alert("Voice confirmation failed. Action aborted.");
      setTxStep('input');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Lock className="w-16 h-16 text-hud mx-auto animate-pulse" />
          <h2 className="text-hud font-hud text-xl tracking-widest uppercase italic">ACCESS_DENIED_ENCRYPTED</h2>
          <p className="text-white/40 font-mono text-sm uppercase">Please Connect Wallet to Unlock Vault</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans selection:bg-hud/30 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top bar */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-sm bg-hud/20 flex items-center justify-center border border-hud/40 shadow-[0_0_15px_rgba(0,242,255,0.2)]">
                    <Zap className="text-hud w-4 h-4" />
                 </div>
                 <h1 className="text-2xl font-hud font-black tracking-widest italic uppercase">BIOVAULT_COMMAND_CENTER</h1>
              </div>
              <p className="text-hud/40 font-mono text-[10px] tracking-widest uppercase">NODE: {address?.slice(0, 16).toUpperCase()}... [STABLE]</p>
           </div>
           
           <div className="flex gap-4">
              <div className="px-6 py-3 bg-hud/5 border border-hud/20 rounded-sm font-mono text-center">
                 <p className="text-[10px] text-hud/40 tracking-widest mb-1 uppercase text-left">Auto_Lock</p>
                 <p className="text-xl font-bold text-hud tracking-widest">{formatTime(lockTimer)}</p>
              </div>
              <div className="px-6 py-3 bg-hud/5 border border-hud/20 rounded-sm font-mono text-right">
                 <p className="text-[10px] text-hud/40 tracking-widest mb-1 uppercase text-left">Wallet Balance</p>
                 <p className="text-xl font-bold text-white tracking-widest">{balance?.formatted.slice(0, 6) || '0.000'} <span className="text-hud">{balance?.symbol || 'ETH'}</span></p>
              </div>
           </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* Left Column: Identity NFT & Stats */}
           <div className="lg:col-span-4 space-y-8">
              {/* NFT Identity Card */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-hud/20 blur-[60px] opacity-0 group-hover:opacity-40 transition-all duration-700 rounded-full" />
                <div className="relative bg-black/40 border-2 border-hud p-1 backdrop-blur-3xl rounded-sm">
                   <div className="bg-hud/5 p-6 border border-hud/20">
                      <div className="flex justify-between items-start mb-8">
                         <div className="w-12 h-12 border border-hud/40 flex items-center justify-center relative">
                            <Fingerprint className="text-hud" size={24} />
                            <div className="absolute inset-0 bg-hud/10 animate-pulse" />
                         </div>
                         <div className="text-right font-hud text-[10px] text-hud tracking-widest font-black italic">
                            BVA_UNIT_04
                         </div>
                      </div>

                      <div className="mb-8">
                         <p className="text-hud/40 font-hud text-[9px] tracking-widest mb-1">COGNITO_V_HASH</p>
                         <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white truncate">{profile?.cognitoId || 'PENDING...'}</h2>
                      </div>

                      <div className="space-y-4 font-mono text-xs">
                         <div className="flex justify-between items-center bg-hud/5 p-3 border border-hud/10">
                            <span className="text-hud/40 uppercase">Personality</span>
                            <span className="text-secondary font-bold italic uppercase">{profile?.personalityType || 'UNKNOWN'}</span>
                         </div>
                         <div className="flex justify-between items-center bg-hud/5 p-3 border border-hud/10">
                            <span className="text-hud/40 uppercase">Verif_Status</span>
                            <span className="text-success font-bold flex items-center gap-2">
                               <CheckCircle size={14} /> {profile?.verificationStatus || 'VERIFIED'}
                            </span>
                         </div>
                      </div>

                      <div className="mt-8 pt-8 border-t border-hud/10 flex justify-between items-end">
                         <div className="font-mono text-[9px] text-hud/20">
                            <p>MINT_DATE: {new Date(profile?.mintedAt).toLocaleDateString() || 'N/A'}</p>
                            <p>BLOCK_ID: 98122-A</p>
                         </div>
                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${profile?.cognitoId}`} alt="QR" className="opacity-40 grayscale invert brightness-200" width={40} />
                      </div>
                   </div>
                </div>
              </motion.div>

              {/* SECURITY ALERTS LIST */}
              <div className="p-8 bg-black border border-danger/20 rounded-sm space-y-6 overflow-hidden">
                 <h3 className="font-hud text-[10px] text-danger flex items-center gap-3 tracking-[0.2em] uppercase font-black">
                    <AlertCircle size={16} /> SECURITY_ALERT_LOG
                 </h3>
                 <div className="space-y-3 font-mono text-[9px]">
                    {securityAlerts.length > 0 ? securityAlerts.map((alert, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        key={i} 
                        className="p-3 border-l-2 border-danger bg-danger/5 space-y-1"
                      >
                         <div className="flex justify-between font-bold">
                            <span className="text-danger">{alert.type}</span>
                            <span className="text-white/40">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                         </div>
                         <p className="text-white/60 lowercase">{alert.details}</p>
                      </motion.div>
                    )) : (
                      <p className="text-success font-bold uppercase tracking-widest text-center py-4 bg-success/5 border border-success/20">System Shielded - No Threats</p>
                    )}
                 </div>
              </div>

              {/* Security Metrics */}
              <div className="p-8 bg-hud/5 border border-hud/10 rounded-sm font-hud text-[10px] tracking-widest uppercase space-y-6">
                 <h3 className="text-hud/60 flex items-center gap-3">
                    <Shield size={16} /> LIVE_SECURITY_METRICS
                 </h3>
                 <div className="space-y-4">
                    <div>
                       <div className="flex justify-between mb-2">
                          <span>Face_Entropy</span>
                          <span className="text-hud">94%</span>
                       </div>
                       <div className="w-full h-1 bg-hud/10 rounded-full overflow-hidden">
                          <motion.div className="h-full bg-hud" initial={{ width: 0 }} animate={{ width: '94%' }} />
                       </div>
                    </div>
                    <div>
                       <div className="flex justify-between mb-2">
                          <span>Voice_Spectral_Density</span>
                          <span className="text-hud">88%</span>
                       </div>
                       <div className="w-full h-1 bg-hud/10 rounded-full overflow-hidden">
                          <motion.div className="h-full bg-hud" initial={{ width: 0 }} animate={{ width: '88%' }} transition={{ delay: 0.2 }} />
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Right Column: Wallet Actions & Activity */}
           <div className="lg:col-span-8 flex flex-col gap-8">
              
              {/* Quick Actions / Sending */}
              <div className="flex-1 bg-black/40 border border-hud/20 rounded-sm p-8 backdrop-blur-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4">
                    <CreditCard className="text-hud/10" size={64} />
                 </div>

                 <h3 className="text-xl font-black italic tracking-tighter uppercase text-white mb-8 flex items-center gap-4">
                    <Send className="text-hud" /> Secure_Transfer_Vault
                 </h3>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                       <div>
                          <label className="font-hud text-[8px] text-hud/40 block mb-2 tracking-widest">RECIPIENT_ADDRESS</label>
                          <input 
                            type="text"
                            value={txRecipient}
                            onChange={(e) => setTxRecipient(e.target.value)}
                            placeholder="0x... or ENS"
                            className="w-full bg-hud/5 border border-hud/20 px-4 py-4 text-sm font-mono focus:border-hud outline-none transition-all text-white"
                          />
                       </div>
                       <div>
                          <label className="font-hud text-[8px] text-hud/40 block mb-2 tracking-widest">AMOUNT_{balance?.symbol || 'ETH'}</label>
                          <input 
                            type="number"
                            value={txAmount}
                            onChange={(e) => setTxAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-hud/5 border border-hud/20 px-4 py-4 text-sm font-mono focus:border-hud outline-none transition-all text-white"
                          />
                       </div>
                    </div>

                    <div className="relative border border-hud/10 bg-hud/5 p-6 flex flex-col items-center justify-center text-center overflow-hidden">
                       <AnimatePresence mode="wait">
                          {txStep === 'idle' || txStep === 'input' ? (
                            <motion.div key="idle" className="space-y-4">
                               <p className="text-[10px] font-mono text-hud/40 uppercase px-6">Ready to initiate secure biometric transfer.</p>
                               <button 
                                 onClick={() => setTxStep('confirm')}
                                 disabled={!txAmount || !txRecipient}
                                 className="px-8 py-3 bg-hud/20 border border-hud/40 text-hud font-hud text-[10px] tracking-[0.2em] hover:bg-hud hover:text-black transition-all disabled:opacity-30 disabled:pointer-events-none"
                               >
                                 INIT_TRANSACTION
                               </button>
                            </motion.div>
                          ) : txStep === 'confirm' ? (
                            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                               <div className="w-16 h-16 border-2 border-hud rounded-full flex items-center justify-center animate-pulse mx-auto">
                                  <Mic className="text-hud" size={24} />
                               </div>
                               <div className="space-y-2">
                                  <p className="text-hud font-black font-hud text-[10px] tracking-widest">VOICE_CONFIRMATION_REQUIRED</p>
                                  <p className="text-[10px] font-mono text-white/60">"Speak clearly to authorize transfer of {txAmount} {balance?.symbol}"</p>
                               </div>
                               <button 
                                 onClick={confirmWithVoice}
                                 className="w-full py-3 bg-hud text-black font-black font-hud text-[10px] tracking-widest"
                               >
                                 START_BIOMETRIC_CHECK
                               </button>
                            </motion.div>
                          ) : txStep === 'processing' ? (
                            <motion.div key="processing" className="space-y-4">
                               <Loader2 className="w-12 h-12 text-hud animate-spin mx-auto" />
                               <p className="text-hud font-hud text-[10px] tracking-widest animate-pulse">MINING_TRANSACTION_ON_LIT_VAULT...</p>
                            </motion.div>
                          ) : (
                            <motion.div key="success" className="space-y-4 text-success">
                               <CheckCircle className="w-12 h-12 mx-auto" />
                               <p className="font-hud text-[10px] tracking-widest font-black uppercase italic">TRANSACTION_SEALED</p>
                               <p className="text-[9px] font-mono opacity-60">BROADCASTED_TO_MAINNET</p>
                            </motion.div>
                          )}
                       </AnimatePresence>
                    </div>
                 </div>
              </div>

              {/* Activity Feed */}
              <div className="bg-hud/5 border border-hud/10 rounded-sm p-8 relative flex-1">
                 <div className="absolute top-0 left-0 p-1 bg-hud/10 text-[8px] font-hud text-hud/40 tracking-widest">SYSTEM_LOGS</div>
                 <h4 className="font-hud text-[10px] tracking-widest uppercase text-hud/60 mb-6 flex items-center gap-4">
                    <Activity size={14} /> RECENT_NETWORK_CHANNELS
                 </h4>
                 <div className="space-y-4 font-mono text-[10px]">
                    {[
                      { op: 'AUTH_BIO_FACE', status: 'SUCCESS', hash: 'fbx_99182' },
                      { op: 'MINT_ID_NFT', status: 'CONFIRMED', hash: 'tx_bva_001' },
                      { op: 'LIT_PK_DERIVE', status: 'LOCAL_ONLY', hash: '**********' },
                    ].map((log, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-hud/5 pb-3">
                         <div className="flex gap-4">
                            <span className="text-hud/30">{i+1}</span>
                            <span className="text-white uppercase">{log.op}</span>
                         </div>
                         <div className="flex gap-4">
                            <span className="text-hud/50">{log.hash}</span>
                            <span className={log.status === 'SUCCESS' || log.status === 'CONFIRMED' ? 'text-success' : 'text-hud'}>{log.status}</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}
