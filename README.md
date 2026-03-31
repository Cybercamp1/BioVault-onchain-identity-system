# 🧬 BioVault AI: Multi-Modal Biometric Security

BioVault AI is a futuristic, decentralized biometric authentication system that replaces traditional passwords and private keys with **Face + Voice** multi-modal embeddings. It introduces a **Biometric NFT Identity** system for privacy-preserving digital sovereignty.

### 🎭 The Cinematic Interface
Inspired by *Iron Man* and *Mission Impossible*, the BioVault HUD provides real-time face tracking and voice waveform visualization. It analyzes your biological entropy to unlock a secure cryptographic vault on-chain.

### 🛡️ Why BioVault AI?
*   **Zero Raw Data**: We never store images or audio files. Only numerical embeddings (vectors) are extracted, and these are immediately encrypted.
*   **Privacy-Preserving NFT**: Your digital identity is an NFT that contains a hashed Cognito-ID and an AI-generated personality profile, without revealing any PII.
*   **Biometric Wallet Locking**: Your wallet's private key is encrypted with a key derived directly from your biometrics.
*   **Voice-Confirmed Transactions**: Every send request requires a real-time vocal signature to confirm the action.

### 🔗 Technology Stack
*   **Face Recognition**: `face-api.js` (ResNet-34) for 128-float descriptors.
*   **Voice Processing**: Web Audio API (FFT Spectral Analysis) for 32-bin acoustic signatures.
*   **Encryption**: **Lit Protocol** for threshold-based access control.
*   **Storage**: **Filecoin / IPFS (via Storacha)** for decentralized profile hosting.
*   **Blockchain**: **NEAR Protocol** (Mock) / **EVM ERC-721** (Mock) for Identity NFTs.
*   **Frontend**: **Next.js 14**, **TailwindCSS**, **Framer Motion**.

### 🏗️ Getting Started
1. `cd frontend && npm install`
2. `npm run dev`
3. Access at [http://localhost:3000](http://localhost:3000)

### 📂 Architecture
*   `components/BiometricHUD.tsx`: The cinematic scanning interface.
*   `lib/faceBiometric.ts`: Facial descriptor extraction & comparison.
*   `lib/voiceBiometric.ts`: Acoustic signature extraction & multi-factor key derivation.
*   `lib/personality.ts`: AI identity profiling & Cognito-ID generation.
*   `lib/voiceProfile.ts`: Encrypted profile management (Storacha/Filecoin).

**BioVault AI** is the first step toward a world where your biology is your key.
© 2026 BioVault AI // Internal Secure Infrastructure.
