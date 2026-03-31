'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';

const WINDOW_SIZE = 200;

interface DataPoint {
  t: number;
  ch1: number;
  ch2: number;
  ch3: number;
}

export default function LiveEEGStream() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isLive, setIsLive] = useState(true);
  const tickRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const generatePoint = useCallback(() => {
    const t = tickRef.current;
    tickRef.current += 1;
    const noise = () => (Math.random() - 0.5) * 0.15;
    return {
      t,
      ch1: Math.sin(t / 10) * 0.8 + noise(),
      ch2: Math.sin(t / 5) * 0.5 + noise(),
      ch3: Math.sin(t / 16) * 0.6 + noise(),
    };
  }, []);

  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(() => {
        setData(prev => {
          const newPoint = generatePoint();
          const next = [...prev, newPoint];
          return next.length > WINDOW_SIZE ? next.slice(-WINDOW_SIZE) : next;
        });
      }, 50);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive, generatePoint]);

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-accent/10 relative">
      {/* LIVE badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {isLive && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live</span>
          </span>
        )}
        <button
          onClick={() => setIsLive(!isLive)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            isLive
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          }`}
        >
          {isLive ? 'Stop' : 'Start'}
        </button>
      </div>

      <h3 className="text-sm font-mono text-gray-400 mb-4">Simulated EEG Stream</h3>

      <div className="space-y-3">
        {[
          { key: 'ch1', color: '#7B5EA7', label: 'Alpha (10Hz)' },
          { key: 'ch2', color: '#00B4D8', label: 'Beta (20Hz)' },
          { key: 'ch3', color: '#00D084', label: 'Theta (6Hz)' },
        ].map(({ key, color, label }) => (
          <div key={key}>
            <span className="text-xs font-mono text-gray-500 ml-1">{label}</span>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={data} margin={{ top: 2, right: 10, left: 0, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <YAxis domain={[-1.5, 1.5]} hide />
                <XAxis dataKey="t" hide />
                <Line type="monotone" dataKey={key} stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}
