'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

export type HighlightEffect = 'glow' | 'pulse';

export interface HighlightTarget {
  type: 'invoice-status' | 'lead-stage' | 'lead-priority' | 'ticket-priority' | 'task-status' | 'client-id' | 'proposal-status' | 'nav-path';
  value?: string;
  id?: string;
  effect: HighlightEffect;
}

interface AIHighlightCtx {
  highlights: HighlightTarget[];
  setHighlights: (targets: HighlightTarget[], durationMs?: number) => void;
  clearHighlights: () => void;
  isHighlighted: (type: HighlightTarget['type'], value?: string, id?: string) => HighlightEffect | null;
  hasAnyHighlight: (type: HighlightTarget['type']) => boolean;
}

const AIHighlightContext = createContext<AIHighlightCtx>({
  highlights: [],
  setHighlights: () => {},
  clearHighlights: () => {},
  isHighlighted: () => null,
  hasAnyHighlight: () => false,
});

export function AIHighlightProvider({ children }: { children: ReactNode }) {
  const [highlights, setHighlightsState] = useState<HighlightTarget[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHighlights = useCallback(() => {
    setHighlightsState([]);
  }, []);

  const setHighlights = useCallback((targets: HighlightTarget[], durationMs = 7000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHighlightsState(targets);
    timerRef.current = setTimeout(() => setHighlightsState([]), durationMs);
  }, []);

  const isHighlighted = useCallback((
    type: HighlightTarget['type'],
    value?: string,
    id?: string,
  ): HighlightEffect | null => {
    for (const h of highlights) {
      if (h.type !== type) continue;
      if (id && h.id === id) return h.effect;
      if (value && h.value === value) return h.effect;
      if (!h.value && !h.id) return h.effect;
    }
    return null;
  }, [highlights]);

  const hasAnyHighlight = useCallback((type: HighlightTarget['type']): boolean => {
    return highlights.some(h => h.type === type);
  }, [highlights]);

  return (
    <AIHighlightContext.Provider value={{ highlights, setHighlights, clearHighlights, isHighlighted, hasAnyHighlight }}>
      {children}
    </AIHighlightContext.Provider>
  );
}

export function useAIHighlight() {
  return useContext(AIHighlightContext);
}
