export type PersonalityType = 
  | "Strategic Thinker" 
  | "Fast Analyzer" 
  | "Calm Decision Maker" 
  | "Empathetic Leader" 
  | "Aggressive Risk-Taker"
  | "Silent Observer";

export function generateCognitoId(): string {
  // Generate random hash-like string
  return "UID-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function analyzePersonality(faceDescriptor: Float32Array, voiceprint: number[]): PersonalityType {
  // In a real app, this would use a tiny model. 
  // For the demo, we use a deterministic heuristic based on the biometrics.
  const score = faceDescriptor.reduce((a, b) => a + b, 0) + voiceprint.reduce((a, b) => a + b, 0);
  const types: PersonalityType[] = [
    "Strategic Thinker", 
    "Fast Analyzer", 
    "Calm Decision Maker", 
    "Empathetic Leader", 
    "Aggressive Risk-Taker",
    "Silent Observer"
  ];
  return types[Math.floor(Math.abs(score * 100)) % types.length];
}
