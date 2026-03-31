'use client';

import { useState } from 'react';
import { grantAccess, revokeAccess } from '@/lib/near';
import { Shield, UserPlus, Trash2, Lock } from 'lucide-react';

interface Grant {
  address: string;
  date: string;
}

interface AccessControlPanelProps {
  grants: Grant[];
  onRefresh: () => void;
}

export default function AccessControlPanel({ grants, onRefresh }: AccessControlPanelProps) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleGrant = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const tx = await grantAccess(address.trim());
      setStatus({ type: 'success', message: `Access granted! TX: ${tx}` });
      setAddress('');
      onRefresh();
    } catch (e: any) {
      setStatus({ type: 'error', message: e.message || 'Failed to grant access' });
    }
    setLoading(false);
  };

  const handleRevoke = async (addr: string) => {
    setRevokeLoading(addr);
    try {
      await revokeAccess(addr);
      onRefresh();
    } catch (e: any) {
      setStatus({ type: 'error', message: e.message || 'Failed to revoke access' });
    }
    setRevokeLoading(null);
  };

  return (
    <div className="space-y-8">
      {/* Grant Access Form */}
      <div className="bg-white/5 rounded-2xl p-6 border border-accent/10">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={20} className="text-accent" />
          <h3 className="text-lg font-semibold text-white">Grant Access</h3>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter researcher wallet address (0x... or .near)"
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-accent/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-accent/50 font-mono"
          />
          <button
            onClick={handleGrant}
            disabled={loading || !address.trim()}
            className="px-6 py-3 rounded-xl bg-accent hover:bg-accent/80 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="31.416" strokeDashoffset="10" /></svg>
                Granting...
              </span>
            ) : 'Grant Access'}
          </button>
        </div>
        {status && (
          <div className={`mt-3 px-4 py-2 rounded-lg text-sm ${
            status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {status.message}
          </div>
        )}
      </div>

      {/* Grants Table */}
      <div className="bg-white/5 rounded-2xl p-6 border border-accent/10">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-accent" />
          <h3 className="text-lg font-semibold text-white">Active Grants</h3>
          <span className="ml-auto text-xs text-gray-500">{grants.length} researcher(s)</span>
        </div>

        {grants.length === 0 ? (
          <div className="text-center py-12">
            <Lock size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No active grants. Your data is private.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-white/10">
                  <th className="pb-3 text-xs text-gray-500 font-medium">Researcher Address</th>
                  <th className="pb-3 text-xs text-gray-500 font-medium">Granted</th>
                  <th className="pb-3 text-xs text-gray-500 font-medium">Status</th>
                  <th className="pb-3 text-xs text-gray-500 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.address} className="border-b border-white/5">
                    <td className="py-3 font-mono text-sm text-gray-300">
                      {g.address.length > 20 ? `${g.address.slice(0, 8)}...${g.address.slice(-4)}` : g.address}
                    </td>
                    <td className="py-3 text-sm text-gray-500">{g.date}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                        Active
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleRevoke(g.address)}
                        disabled={revokeLoading === g.address}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-all border border-red-500/20 disabled:opacity-40"
                      >
                        {revokeLoading === g.address ? 'Revoking...' : (
                          <span className="flex items-center gap-1"><Trash2 size={12} /> Revoke</span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
