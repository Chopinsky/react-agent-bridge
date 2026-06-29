import { useState, useEffect, useContext, useCallback } from 'react';
import { AgentBridgeCtx, RegistryHandle } from '../core/AgentBridgeContext';

export interface AgentStore<T extends Record<string, unknown>> {
  use<K extends keyof T>(key: K): T[K];
  useSet<K extends keyof T>(key: K): React.Dispatch<React.SetStateAction<T[K]>>;
  getState<K extends keyof T>(key: K): T[K];
  setState<K extends keyof T>(key: K, value: T[K]): void;
  subscribe<K extends keyof T>(key: K, cb: (value: T[K]) => void): () => void;
  _registerAll(ctx: RegistryHandle): void;
}

let globalCtx: RegistryHandle | null = null;

function getCtx(): RegistryHandle | null {
  return globalCtx;
}

function setCtx(ctx: RegistryHandle | null) {
  globalCtx = ctx;
}

export { getCtx, setCtx };

export function createAgentStore<T extends Record<string, unknown>>(
  namespace: string,
  initial: T,
  options?: {
    schemas?: Partial<Record<keyof T, Record<string, unknown>>>;
  }
): AgentStore<T> {
  let registered = false;

  function makeKey<K extends keyof T>(key: K): string {
    return `${namespace}.${String(key)}`;
  }

  function registerAllKeys(ctx: RegistryHandle) {
    if (registered) return;
    for (const key of Object.keys(initial)) {
      const fullKey = `${namespace}.${key}`;
      ctx.registerStateEntry(fullKey, (initial as any)[key], {
        serializable: true,
        schema: (options?.schemas as any)?.[key],
      });
    }
    registered = true;
  }

  const store: AgentStore<T> = {
    use<K extends keyof T>(key: K): T[K] {
      const ctx = useContext(AgentBridgeCtx);
      const fullKey = makeKey(key);
      const [value, setValue] = useState<T[K]>(() => initial[key]);

      useEffect(() => {
        if (!ctx) return;
        registerAllKeys(ctx);
        const unsub = ctx.subscribe(fullKey, (v: unknown) => setValue(v as T[K]));
        return () => {
          unsub();
          ctx.unregisterStateEntry(fullKey);
        };
      }, []);

      return value;
    },

    useSet<K extends keyof T>(key: K): React.Dispatch<React.SetStateAction<T[K]>> {
      const ctx = useContext(AgentBridgeCtx);
      const fullKey = makeKey(key);
      return useCallback((newValue: React.SetStateAction<T[K]>) => {
        if (!ctx) return;
        const prev = ctx.getStateValue(fullKey) as T[K] | undefined;
        const resolved = typeof newValue === 'function'
          ? (newValue as (prev: T[K]) => T[K])(prev ?? initial[key])
          : newValue;
        ctx.updateStateValue(fullKey, resolved);
      }, [fullKey, ctx]);
    },

    getState<K extends keyof T>(key: K): T[K] {
      const ctx = getCtx();
      if (ctx) registerAllKeys(ctx);
      const fullKey = makeKey(key);
      const val = ctx?.getStateValue(fullKey);
      return (val !== undefined ? val : initial[key]) as T[K];
    },

    setState<K extends keyof T>(key: K, value: T[K]): void {
      const ctx = getCtx();
      if (ctx) {
        registerAllKeys(ctx);
        ctx.updateStateValue(makeKey(key), value);
      }
    },

    subscribe<K extends keyof T>(key: K, cb: (value: T[K]) => void): () => void {
      const ctx = getCtx();
      if (!ctx) return () => {};
      return ctx.subscribe(makeKey(key), (v: unknown) => cb(v as T[K]));
    },

    _registerAll(ctx: RegistryHandle) {
      registerAllKeys(ctx);
    },
  };

  return store;
}
