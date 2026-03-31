/**
 * NeuralVault Live Brainwave Analysis
 * Captures EEG signatures during biometric challenge to prevent AI voice cloning.
 */

export interface BrainwaveSnapshot {
  alpha: number;
  beta: number;
  theta: number;
  stressLevel: number; // 0 to 1
  isLocked: boolean; // True if stress is dangerously high
  isActive: boolean;
  timestamp: number;
}

/**
 * Captures a 3-second snapshot of simulated brainwave activity.
 * In a real demo, this would connect to a BCI via Bluetooth/WebUSB.
 */
export async function captureBrainwaveSnapshot(durationMs: number = 3000): Promise<BrainwaveSnapshot> {
  // Simulate EEG data collection
  return new Promise((resolve) => {
    setTimeout(() => {
      // Generate some dynamic values to show "Active" brain
      const alpha = Math.random() * 0.5 + 0.2;
      const beta = Math.random() * 0.5 + 0.1;
      const theta = Math.random() * 0.3 + 0.1;

      // Stress detection: High Beta + Low Alpha = Stress
      const stressLevel = Math.max(0, Math.min(1, (beta * 1.5) - (alpha * 0.5) + (Math.random() * 0.2)));
      const isLocked = stressLevel > 0.85;
      
      // A "dead" or "cloned" signal would be flat (0.0)
      const isActive = (alpha + beta + theta) > 0.5;

      resolve({
        alpha: parseFloat(alpha.toFixed(2)),
        beta: parseFloat(beta.toFixed(2)),
        theta: parseFloat(theta.toFixed(2)),
        stressLevel: parseFloat(stressLevel.toFixed(2)),
        isLocked,
        isActive,
        timestamp: Date.now()
      });
    }, durationMs);
  });
}

/**
 * Hashes the brainwave signature for deterministic key contribution.
 */
export async function hashBrainwave(snapshot: BrainwaveSnapshot): Promise<string> {
  if (!snapshot.isActive) throw new Error("Brainwave signal is flat. Verification denied.");
  
  // Use a stable string representation for the hash
  // Rounding to 2 decimal places to allow for slight sensor jitter 
  // (In a production system, we'd use fuzzy extraction/locally sensitive hashing)
  const input = `${snapshot.alpha.toFixed(2)}|${snapshot.beta.toFixed(2)}|${snapshot.theta.toFixed(2)}`;
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join(''); // 128-bit contribution
}
