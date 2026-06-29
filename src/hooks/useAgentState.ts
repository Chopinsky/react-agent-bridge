import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AgentBridgeCtx } from '../core/AgentBridgeContext';

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
  const [value, setValue] = useState<T>(initial);
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (!ctx) return;
    ctx.registerStateEntry(key, value, {
      serializable: options?.serializable !== false,
      description: options?.description,
      schema: options?.schema,
      redact: options?.redact,
      prefix: options?.prefix,
    });

    const unsub = ctx.subscribe(key, (v: unknown) => {
      if (!isInternalUpdate.current) {
        setValue(v as T);
      }
    });

    return () => {
      unsub();
      ctx.unregisterStateEntry(key);
    };
  }, []);

  const syncValue = useCallback((newValue: React.SetStateAction<T>) => {
    setValue((prev) => {
      const resolved = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      isInternalUpdate.current = true;
      if (ctx) {
        ctx.updateStateValue(key, resolved);
      }
      setTimeout(() => { isInternalUpdate.current = false; });
      return resolved;
    });
  }, [key, ctx]);

  return [value, syncValue];
}

export function useAgentStateValue<T>(key: string): T {
  const ctx = useContext(AgentBridgeCtx);
  const [value, setValue] = useState<T>(() => ctx?.getStateValue(key) as T);

  useEffect(() => {
    if (!ctx) return;
    const unsub = ctx.subscribe(key, (v: unknown) => setValue(v as T));
    const current = ctx.getStateValue(key);
    if (current !== undefined) {
      setValue(current as T);
    }
    return unsub;
  }, [key, ctx]);

  return value;
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
