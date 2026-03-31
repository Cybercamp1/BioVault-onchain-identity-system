'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import AccessControlPanel from '@/components/AccessControlPanel';
import { getMyGrants } from '@/lib/near';
import { Shield } from 'lucide-react';

interface Grant {
  address: string;
  date: string;
}

export default function AccessPage() {
  const { address } = useAccount();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [auditLog, setAuditLog] = useState<{ action: string; address: string; date: string }[]>([]);

  const loadGrants = async () => {
    try {
      const addrs = await getMyGrants();
      setGrants(addrs.map(a => ({
        address: a,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      })));
    } catch (err) {
      console.error('Failed to load grants:', err);
    }
  };

  useEffect(() => {
    loadGrants();
  }, [address]);

  const handleRefresh = () => {
    loadGrants();
    // Add to audit log
    setAuditLog(prev => [
      { action: 'Updated', address: 'access list', date: new Date().toLocaleString() },
      ...prev,
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={28} className="text-accent" />
          <h1 className="text-3xl sm:text-4xl font-bold">
            Access <span className="text-accent">Control</span>
          </h1>
        </div>
        <p className="text-gray-400">Control who can see your brain data on the NEAR blockchain.</p>
      </motion.div>

      <AccessControlPanel grants={grants} onRefresh={handleRefresh} />

      {/* Audit Log */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 bg-white/5 rounded-2xl p-6 border border-accent/10"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Audit Log</h3>
        {auditLog.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No activity yet.</p>
        ) : (
          <div className="space-y-2">
            {auditLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-white/5 last:border-0">
                <span className={`w-2 h-2 rounded-full ${entry.action === 'Granted' ? 'bg-green-500' : entry.action === 'Revoked' ? 'bg-red-500' : 'bg-accent'}`} />
                <span className="text-gray-400">
                  <span className="text-white font-medium">{entry.action}</span> access to{' '}
                  <span className="font-mono text-accent">{entry.address}</span>
                </span>
                <span className="ml-auto text-xs text-gray-600">{entry.date}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
