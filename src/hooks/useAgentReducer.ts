import { useReducer, useEffect, useContext, useCallback } from 'react';
import { AgentBridgeCtx } from '../core/AgentBridgeContext';

export function useAgentReducer<S, A>(
  key: string,
  reducer: (state: S, action: A) => S,
  initial: S | (() => S),
  options?: {
    schema?: Record<string, unknown>;
    description?: string;
    serializable?: boolean;
    redact?: boolean;
  }
): [S, React.Dispatch<A>] {
  const ctx = useContext(AgentBridgeCtx);
  const initState = typeof initial === 'function' ? (initial as () => S)() : initial;
  const [state, dispatch] = useReducer(reducer, initState);

  useEffect(() => {
    if (!ctx) return;
    ctx.registerStateEntry(key, state, {
      serializable: options?.serializable !== false,
      description: options?.description,
      schema: options?.schema,
      redact: options?.redact,
    });
    return () => {
      ctx.unregisterStateEntry(key);
    };
  }, []);

  useEffect(() => {
    if (ctx) {
      ctx.updateStateValue(key, state);
    }
  }, [state, key, ctx]);

  return [state, dispatch];
}
