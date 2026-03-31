'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function NeuralBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
      {/* Anime Stylized Backdrop */}
      <div className="absolute inset-0 opacity-40">
        <Image 
          src="/neural-bg.png" 
          alt="Neural Connection" 
          fill 
          className="object-cover"
          priority
        />
      </div>

      {/* Dynamic Overlay Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
      
      {/* Animated Data Particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%", 
              opacity: 0 
            }}
            animate={{ 
              y: [null, "-10%"],
              opacity: [0, 0.5, 0]
            }}
            transition={{ 
              duration: 3 + Math.random() * 5, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 5
            }}
            className="absolute w-1 h-1 bg-accent rounded-full blur-[1px]"
          />
        ))}
      </div>

      {/* Scanline / Grid Effect */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
    </div>
  );
}
