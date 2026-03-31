import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Mono, Orbitron } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import Navbar from '@/components/Navbar';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-hud',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BioVault AI — The Future of Biometric Security',
  description: 'A multi-modal biometric vault using Face and Voice. Secure your wallet without passwords or private keys.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} ${orbitron.variable} font-sans bg-background text-white min-h-screen antialiased`}>
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
