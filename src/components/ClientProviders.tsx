'use client';

import { AIHighlightProvider } from '@/lib/ai-highlight';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AIHighlightProvider>
      {children}
    </AIHighlightProvider>
  );
}
