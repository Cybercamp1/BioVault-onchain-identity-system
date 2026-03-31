'use client';

import { EEGSession } from '@/lib/types';
import { prepareChartData } from '@/utils/eegParser';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CHANNEL_COLORS: Record<string, string> = {
  ch1: '#7B5EA7',
  ch2: '#00B4D8',
  ch3: '#00D084',
  ch4: '#FF6B6B',
  ch5: '#FFD93D',
  ch6: '#6BCB77',
  ch7: '#4D96FF',
  ch8: '#FF6B9D',
};

interface EEGChartProps {
  data: EEGSession;
  channels?: string[];
}

export default function EEGChart({ data, channels }: EEGChartProps) {
  const displayChannels = channels || ['ch1', 'ch2', 'ch3'];
  const chartData = prepareChartData(data, displayChannels, 500);

  return (
    <div className="space-y-4">
      {displayChannels.map((ch) => (
        <div key={ch} className="bg-white/5 rounded-xl p-4 border border-accent/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[ch] || '#7B5EA7' }} />
            <span className="text-sm font-mono text-gray-400 uppercase">{ch}</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="time"
                stroke="#666"
                tick={{ fontSize: 10, fill: '#666' }}
                tickFormatter={(v) => `${v}s`}
              />
              <YAxis
                domain={[-3, 3]}
                stroke="#666"
                tick={{ fontSize: 10, fill: '#666' }}
                width={40}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #7B5EA7', borderRadius: '8px', fontSize: '12px' }}
                labelFormatter={(v) => `${v}s`}
                formatter={(value: number) => [value.toFixed(4), ch]}
              />
              <Line
                type="monotone"
                dataKey={ch}
                stroke={CHANNEL_COLORS[ch] || '#7B5EA7'}
                strokeWidth={1.5}
                dot={false}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
