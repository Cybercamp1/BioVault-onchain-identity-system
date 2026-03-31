'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Eye, Mic, Lock, Cpu, Fingerprint, Zap, Globe, Activity } from 'lucide-react';

const features = [
  { 
    title: 'Multi-Modal Biometrics', 
    desc: 'Face + Voice embedding fusion for 256-bit entropy.', 
    icon: <Fingerprint className="text-hud" /> 
  },
  { 
    title: 'Biometric NFT Identity', 
    desc: 'Trade-able, privacy-preserving digital persona.', 
    icon: <Shield className="text-secondary" /> 
  },
  { 
    title: 'On-Chain Vault', 
    desc: 'Encrypted storage via Lit Protocol & Filecoin.', 
    icon: <Lock className="text-warning" /> 
  },
  { 
    title: 'Voice-Activated Alpha', 
    desc: 'Confirm transactions with neuro-acoustic signatures.', 
    icon: <Mic className="text-hud" /> 
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

export default function Home() {
  return (
    <div className="relative overflow-hidden bg-[#020617] text-white selection:bg-hud/30">
      {/* ─── HUD DECORATIONS ─── */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-hud/5 rounded-full blur-[150px]" />
         <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-secondary/5 rounded-full blur-[150px]" />
         <div className="grid-bg opacity-10 absolute inset-0" />
      </div>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-3 px-6 py-2 rounded-sm bg-hud/5 border border-hud/20 text-hud text-[10px] font-hud tracking-[0.5em] mb-12 uppercase font-black">
              <Activity size={14} className="animate-pulse" /> SYSTEM_BOOT_SEQUENCE_COMPLETE
            </span>
          </motion.div>

          <motion.h1
            className="text-6xl sm:text-7xl md:text-9xl font-black leading-tight mb-8 italic tracking-tighter uppercase"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            The Vault. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-hud via-white to-secondary drop-shadow-[0_0_30px_rgba(0,242,255,0.3)]">
              Redined.
            </span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-white/40 max-w-2xl mx-auto mb-12 leading-relaxed font-mono uppercase tracking-widest text-xs"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            Biometric-Only Authentication. No Passwords. No Private Keys. <br />
            Just your Biological Signature.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
          >
            <Link
              href="/identity"
              className="group relative px-12 py-5 bg-hud text-black font-hud text-xs tracking-[0.3em] font-black transition-all hover:bg-black hover:text-hud border border-hud shadow-[0_0_40px_rgba(0,242,255,0.4)]"
            >
              INITIALIZE_VAULT_ →
            </Link>
            <Link
              href="/dashboard"
              className="px-12 py-5 border border-white/10 text-white/60 font-hud text-xs tracking-[0.3em] hover:bg-white/5 transition-all uppercase"
            >
              System_Status
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── HUD FEATURES ─── */}
      <section className="max-w-7xl mx-auto px-4 py-32 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              variants={fadeUp} custom={i}
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="bg-hud/5 border border-hud/10 p-8 rounded-sm hover:border-hud/40 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-all group-hover:scale-110">
                 {f.icon}
              </div>
              <div className="w-10 h-10 mb-6 flex items-center justify-center border border-hud/20 bg-hud/5">
                 {f.icon}
              </div>
              <h3 className="font-hud text-xs font-black tracking-widest text-white mb-3 uppercase group-hover:text-hud transition-colors">{f.title}</h3>
              <p className="text-white/40 text-[10px] uppercase font-mono leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── CINEMATIC DECO ─── */}
      <section className="relative h-[400px] flex items-center justify-center border-t border-b border-white/5 bg-hud/5 overflow-hidden">
         <div className="absolute w-full h-full opacity-10 bg-[url('https://api.placeholder.com/1920/1080')] bg-cover mix-blend-overlay grayscale" />
         <div className="relative z-10 text-center space-y-4">
            <h2 className="font-hud text-3xl font-black italic tracking-widest text-hud">CYBERNETIC_SECURITY</h2>
            <p className="font-mono text-[10px] text-white/40 uppercase tracking-[0.5em]">256-BIT_AES_VAULT // QUANTUM_READY</p>
         </div>
         {/* Moving circle deco */}
         <div className="absolute w-[600px] h-[600px] border border-hud/10 rounded-full animate-orbit" />
         <div className="absolute w-[800px] h-[800px] border border-hud/5 rounded-full animate-orbit [animation-direction:reverse]" />
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-20 border-t border-white/5 font-hud">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 border border-hud flex items-center justify-center">
                <div className="w-2 h-2 bg-hud animate-ping" />
             </div>
             <span className="text-sm font-black italic tracking-tighter uppercase">BioVault <span className="text-hud">AI</span></span>
          </div>
          <p className="text-white/20 text-[10px] tracking-widest uppercase font-mono">
            &copy; 2026 ARCHIVED_BY_NITHISH // FULL_DECENTRALIZATION_MODE
          </p>
          <div className="flex gap-8 text-[10px] tracking-widest uppercase text-hud/40">
             <a href="#" className="hover:text-hud transition-colors">Github</a>
             <a href="#" className="hover:text-hud transition-colors">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
