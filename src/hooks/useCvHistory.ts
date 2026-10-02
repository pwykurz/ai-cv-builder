import { useCallback, useState } from 'react';
import type { CV } from '../types';

const UNDO_LIMIT = 100;

export type CvUpdater = (prev: CV) => CV;

export function useCvHistory(initial: CV) {
  const [cv, setCvState] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [history, setHistory] = useState<CV[]>([]);

  const dirty = cv !== saved;

  const setCv = useCallback((updater: CvUpdater) => {
    setCvState((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      setHistory((h) => [...h.slice(-(UNDO_LIMIT - 1)), prev]);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      const prev = h.at(-1);
      if (!prev) return h;
      setCvState(prev);
      return h.slice(0, -1);
    });
  }, []);

  return {
    cv,
    saved,
    dirty,
    canUndo: history.length > 0,
    setCv,
    undo,
    markSaved: setSaved,
  };
}
