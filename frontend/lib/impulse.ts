import { EEGSession } from "./types";

export async function analyzeEEG(sessionData: EEGSession) {
  const apiKey = process.env.NEXT_PUBLIC_IMPULSE_AI_API_KEY;
  const state = sessionData.cognitive_state.toLowerCase();
  
  // Try real API first if key exists
  if (apiKey) {
    try {
      console.log("Calling Impulse AI API...");
      // Mock API endpoint for development
      const response = await fetch("https://api.impulseai.dev/v1/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(sessionData)
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn("Impulse AI API call failed, falling back to mock");
    }
  }

  console.log("Using Impulse AI mock deterministic fallback...");
  // Deterministic mock fallback
  await new Promise(r => setTimeout(r, 1200));

  if (state.includes("focus")) {
    return { state: "Focused", confidence: 0.87, alpha: 0.31, beta: 0.78, theta: 0.22 };
  } else if (state.includes("relax")) {
    return { state: "Relaxed", confidence: 0.92, alpha: 0.88, beta: 0.19, theta: 0.41 };
  } else if (state.includes("stress")) {
    return { state: "Stressed", confidence: 0.79, alpha: 0.12, beta: 1.18, theta: 0.63 };
  } else if (state.includes("sleep")) {
    return { state: "Deep Sleep", confidence: 0.95, alpha: 0.05, beta: 0.02, theta: 1.85 };
  } else {
    return { state: "Unknown", confidence: 0.50, alpha: 0.50, beta: 0.50, theta: 0.50 };
  }
}
