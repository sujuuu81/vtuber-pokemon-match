import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VTuberポケモン診断',
  description: 'VTuberアバターの見た目から一番似ているポケモンをAI診断します。'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
