import { useState, useEffect, useContext, useCallback } from 'react';
import { AgentBridgeCtx } from '../core/AgentBridgeContext';

export interface AgentAtom<T> {
  key: string;
  initial: T;
  options?: {
    schema?: Record<string, unknown>;
    description?: string;
    serializable?: boolean;
  };
}

export function agentAtom<T>(
  key: string,
  initial: T,
  options?: {
    schema?: Record<string, unknown>;
    description?: string;
    serializable?: boolean;
  }
): AgentAtom<T> {
  return { key, initial, options };
}

export function useAgentAtom<T>(
  atom: AgentAtom<T>
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const ctx = useContext(AgentBridgeCtx);
  const [value, setValue] = useState<T>(atom.initial);

  useEffect(() => {
    if (!ctx) return;
    ctx.registerStateEntry(atom.key, value, {
      serializable: atom.options?.serializable !== false,
      description: atom.options?.description,
      schema: atom.options?.schema,
    });
    const unsub = ctx.subscribe(atom.key, (v: unknown) => setValue(v as T));
    return () => {
      unsub();
      ctx.unregisterStateEntry(atom.key);
    };
  }, []);

  const syncValue = useCallback((newValue: React.SetStateAction<T>) => {
    setValue((prev) => {
      const resolved = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      if (ctx) {
        ctx.updateStateValue(atom.key, resolved);
      }
      return resolved;
    });
  }, [atom.key, ctx]);

  return [value, syncValue];
}
