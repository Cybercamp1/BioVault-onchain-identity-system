'use client';

import { SessionRecord } from '@/lib/types';
import { getFilecoinGatewayURL } from '@/lib/storacha';
import { ExternalLink, Sparkles } from 'lucide-react';

const STATE_COLORS: Record<string, string> = {
  focus: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  relaxed: 'bg-green-500/20 text-green-400 border-green-500/30',
  stressed: 'bg-red-500/20 text-red-400 border-red-500/30',
  sleep: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

interface SessionCardProps {
  session: SessionRecord;
  onAnalyze: () => void;
}

export default function SessionCard({ session, onAnalyze }: SessionCardProps) {
  const truncateCid = (cid: string) => {
    if (cid.length <= 16) return cid;
    return `${cid.slice(0, 8)}...${cid.slice(-4)}`;
  };

  const stateColor = STATE_COLORS[session.cognitive_state] || STATE_COLORS.focus;
  const date = new Date(session.timestamp).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="bg-white/5 rounded-2xl p-5 border border-accent/10 hover:border-accent/30 transition-all duration-300 hover:-translate-y-1 group">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">{session.label}</h3>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${stateColor}`}>
          {session.cognitive_state}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-3">{date}</p>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded">
          {truncateCid(session.cid)}
        </span>
        <a
          href={getFilecoinGatewayURL(session.cid)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary hover:text-secondary/80 transition-colors"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      <button
        onClick={onAnalyze}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent font-medium text-sm transition-all duration-200 border border-accent/20 hover:border-accent/40"
      >
        <Sparkles size={14} />
        Analyze with AI
      </button>
    </div>
  );
}
