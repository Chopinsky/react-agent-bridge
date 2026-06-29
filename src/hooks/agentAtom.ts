import { useEffect, useContext, useCallback, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { AgentBridgeCtx } from '../core/AgentBridgeContext';

export interface AgentAtom<T> {
  key: string;
  initial: T;
  options?: {
    schema?: Record<string, unknown>;
    description?: string;
    serializable?: boolean;
    redact?: boolean;
  };
}

export function agentAtom<T>(
  key: string,
  initial: T,
  options?: {
    schema?: Record<string, unknown>;
    description?: string;
    serializable?: boolean;
    redact?: boolean;
  }
): AgentAtom<T> {
  return { key, initial, options };
}

export function useAgentAtom<T>(
  atom: AgentAtom<T>
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const ctx = useContext(AgentBridgeCtx);

  const subscribe = useCallback(
    (cb: () => void) => {
      if (!ctx) return () => {};
      return ctx.subscribe(atom.key, cb);
    },
    [atom.key, ctx]
  );

  const getSnapshot = useCallback(
    () => ctx?.getStateValue(atom.key) as T | undefined,
    [atom.key, ctx]
  );

  const registryValue = useSyncExternalStore(subscribe, getSnapshot);
  const value: T = registryValue !== undefined ? registryValue : atom.initial;

  const setValue = useCallback(
    (newValue: React.SetStateAction<T>) => {
      if (!ctx) return;
      const prev = ctx.getStateValue(atom.key);
      const resolved = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(prev as T)
        : newValue;
      ctx.updateStateValue(atom.key, resolved);
    },
    [atom.key, ctx]
  );

  useEffect(() => {
    if (!ctx) return;
    if (ctx.getStateValue(atom.key) !== undefined) return;
    ctx.registerStateEntry(atom.key, value, {
      serializable: atom.options?.serializable !== false,
      description: atom.options?.description,
      schema: atom.options?.schema,
      redact: atom.options?.redact,
    });
    return () => {
      ctx.unregisterStateEntry(atom.key);
    };
  }, [atom.key, ctx, atom.options?.serializable, atom.options?.description, atom.options?.schema, atom.options?.redact]);

  return [value, setValue];
}
