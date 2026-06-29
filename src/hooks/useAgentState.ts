import { useEffect, useContext, useCallback, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { AgentBridgeCtx } from '../core/AgentBridgeContext';

function getInitialValue<T>(initial: T | (() => T)): T {
  return typeof initial === 'function' ? (initial as () => T)() : initial;
}

export function useAgentState<T>(
  key: string,
  initial: T | (() => T),
  options?: {
    schema?: Record<string, unknown>;
    description?: string;
    serializable?: boolean;
    redact?: boolean;
    debounceMs?: number;
    prefix?: string;
  }
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const ctx = useContext(AgentBridgeCtx);

  const subscribe = useCallback(
    (cb: () => void) => {
      if (!ctx) return () => {};
      return ctx.subscribe(key, cb);
    },
    [key, ctx]
  );

  const getSnapshot = useCallback(
    () => ctx?.getStateValue(key) as T | undefined,
    [key, ctx]
  );

  const registryValue = useSyncExternalStore(subscribe, getSnapshot);
  const hasRegistryValue = registryValue !== undefined;
  const value: T = hasRegistryValue ? registryValue : getInitialValue(initial);

  const setValue = useCallback(
    (newValue: React.SetStateAction<T>) => {
      if (!ctx) return;
      const prev = ctx.getStateValue(key);
      const resolved = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(prev as T)
        : newValue;
      ctx.updateStateValue(key, resolved);
    },
    [key, ctx]
  );

  useEffect(() => {
    if (!ctx) return;
    if (ctx.getStateValue(key) !== undefined) return;
    ctx.registerStateEntry(key, value, {
      serializable: options?.serializable !== false,
      description: options?.description,
      schema: options?.schema,
      redact: options?.redact,
    });
    return () => {
      ctx.unregisterStateEntry(key);
    };
  }, [key, ctx, options?.serializable, options?.description, options?.schema, options?.redact]);

  return [value, setValue];
}

export function useAgentStateValue<T>(key: string): T | undefined {
  const ctx = useContext(AgentBridgeCtx);

  const subscribe = useCallback(
    (cb: () => void) => {
      if (!ctx) return () => {};
      return ctx.subscribe(key, cb);
    },
    [key, ctx]
  );

  const getSnapshot = useCallback(
    () => ctx?.getStateValue(key) as T | undefined,
    [key, ctx]
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useSetAgentState<T>(
  key: string
): React.Dispatch<React.SetStateAction<T>> {
  const ctx = useContext(AgentBridgeCtx);
  return useCallback((newValue: React.SetStateAction<T>) => {
    if (!ctx) return;
    const prev = ctx.getStateValue(key);
    const resolved = typeof newValue === 'function'
      ? (newValue as (prev: T) => T)(prev as T)
      : newValue;
    ctx.updateStateValue(key, resolved);
  }, [key, ctx]);
}
