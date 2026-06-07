import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MAX-DEPLOY — Career OS',
  description: 'AI-native career operations platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
