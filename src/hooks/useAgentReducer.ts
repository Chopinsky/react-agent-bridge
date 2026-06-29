import { useReducer, useEffect, useContext, useRef } from 'react';
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
  const [state, dispatch] = typeof initial === 'function'
    ? useReducer(reducer, undefined as S, initial as () => S)
    : useReducer(reducer, initial);

  const registered = useRef(false);

  useEffect(() => {
    if (!ctx) return;
    ctx.registerStateEntry(key, state, {
      serializable: options?.serializable !== false,
      description: options?.description,
      schema: options?.schema,
      redact: options?.redact,
    });
    registered.current = true;
    return () => {
      registered.current = false;
      ctx.unregisterStateEntry(key);
    };
  }, [key, ctx, options?.serializable, options?.description, options?.schema, options?.redact]);

  useEffect(() => {
    if (!registered.current) return;
    if (ctx) {
      ctx.updateStateValue(key, state);
    }
  }, [state, key, ctx]);

  return [state, dispatch];
}
