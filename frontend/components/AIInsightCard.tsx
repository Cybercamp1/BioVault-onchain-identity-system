'use client';

interface AIInsight {
  state: string;
  confidence: number;
  alpha: number;
  beta: number;
  theta: number;
}

interface AIInsightCardProps {
  insight: AIInsight;
  onClose: () => void;
}

const STATE_STYLES: Record<string, { gradient: string; color: string }> = {
  Focused: { gradient: 'from-blue-600 to-cyan-500', color: '#3B82F6' },
  Relaxed: { gradient: 'from-green-600 to-emerald-400', color: '#22C55E' },
  Stressed: { gradient: 'from-red-600 to-orange-400', color: '#EF4444' },
  'Deep Sleep': { gradient: 'from-purple-600 to-indigo-400', color: '#8B5CF6' },
  Unknown: { gradient: 'from-gray-600 to-gray-400', color: '#9CA3AF' },
};

export default function AIInsightCard({ insight, onClose }: AIInsightCardProps) {
  const style = STATE_STYLES[insight.state] || STATE_STYLES.Unknown;
  const confPct = Math.round(insight.confidence * 100);

  // SVG circular progress
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (insight.confidence * circumference);

  const waves = [
    { label: 'Alpha', value: insight.alpha, max: 2, color: '#3B82F6' },
    { label: 'Beta', value: insight.beta, max: 2, color: '#F59E0B' },
    { label: 'Theta', value: insight.theta, max: 2, color: '#7B5EA7' },
  ];

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-accent/20 backdrop-blur-xl animate-in slide-in-from-right">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">AI Cognitive Analysis</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl">✕</button>
      </div>

      {/* State Label */}
      <div className="text-center mb-6">
        <span className={`text-3xl font-bold bg-gradient-to-r ${style.gradient} bg-clip-text text-transparent`}>
          {insight.state.toUpperCase()}
        </span>
      </div>

      {/* Confidence Ring */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <svg width="130" height="130" className="-rotate-90">
            <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <circle
              cx="65" cy="65" r={radius}
              fill="none"
              stroke={style.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-2xl font-bold text-white">{confPct}%</span>
              <p className="text-xs text-gray-400">Confidence</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wave Power Bars */}
      <div className="space-y-3 mb-6">
        {waves.map(w => (
          <div key={w.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">{w.label} Power</span>
              <span className="text-white font-mono">{w.value.toFixed(2)}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min((w.value / w.max) * 100, 100)}%`,
                  backgroundColor: w.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Badge */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs text-accent">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          Powered by Impulse AI
        </span>
      </div>
    </div>
  );
}
