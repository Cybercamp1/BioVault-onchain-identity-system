'use client';

import { useState } from 'react';
import { Check, Loader2, Copy, ExternalLink } from 'lucide-react';
import { getFilecoinGatewayURL } from '@/lib/storacha';

interface Step {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

interface EncryptUploadFlowProps {
  isActive: boolean;
  cid?: string;
  txHash?: string;
  steps: Step[];
}

export default function EncryptUploadFlow({ isActive, cid, txHash, steps }: EncryptUploadFlowProps) {
  const [copied, setCopied] = useState(false);
  const allDone = steps.every(s => s.status === 'done');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isActive && !allDone) return null;

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white/5 rounded-2xl p-6 border border-accent/10">
        <h3 className="text-lg font-semibold text-white mb-4">Processing Pipeline</h3>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                step.status === 'done' ? 'bg-green-500/20 text-green-400'
                : step.status === 'active' ? 'bg-accent/20 text-accent'
                : step.status === 'error' ? 'bg-red-500/20 text-red-400'
                : 'bg-white/5 text-gray-600'
              }`}>
                {step.status === 'done' ? <Check size={16} /> :
                 step.status === 'active' ? <Loader2 size={16} className="animate-spin" /> :
                 i + 1}
              </div>
              <span className={`text-sm ${
                step.status === 'done' ? 'text-green-400'
                : step.status === 'active' ? 'text-white'
                : step.status === 'error' ? 'text-red-400'
                : 'text-gray-600'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Success Result */}
      {allDone && cid && (
        <div className="bg-green-500/5 rounded-2xl p-6 border border-green-500/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check size={18} className="text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-green-400">Session Stored Successfully!</h3>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">CID (Filecoin)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white/5 px-3 py-2 rounded-lg text-sm font-mono text-gray-300 overflow-x-auto">
                  {cid}
                </code>
                <button onClick={() => handleCopy(cid)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400">
                  {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
                <a href={getFilecoinGatewayURL(cid)} target="_blank" rel="noopener noreferrer"
                   className="p-2 hover:bg-white/10 rounded-lg transition-colors text-secondary">
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            {txHash && (
              <div>
                <p className="text-xs text-gray-500 mb-1">NEAR TX</p>
                <code className="block bg-white/5 px-3 py-2 rounded-lg text-sm font-mono text-gray-300">
                  {txHash}
                </code>
              </div>
            )}
          </div>

          <a
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent/80 text-white font-semibold text-sm transition-all"
          >
            Go to Dashboard →
          </a>
        </div>
      )}
    </div>
  );
}
