import { useContext, useEffect, useCallback, useRef } from 'react';
import { AgentBridgeCtx } from '../core/AgentBridgeContext';
import type { ActionContext, ActionResult } from '../core/types';

export function useAgentAction<TInput, TOutput>(
  name: string,
  handler: (input: TInput | undefined, ctx: ActionContext) => TOutput | Promise<TOutput>,
  options?: {
    description?: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    idempotent?: boolean;
    deps?: React.DependencyList;
    dryRun?: (input: TInput) => { ok: boolean; errors?: unknown[] };
    rollback?: (error: unknown, ctx: { input: unknown; partialResult?: unknown }) => void;
  }
): {
  mutate: (input?: TInput) => void;
  mutateAsync: (input?: TInput) => Promise<ActionResult<TOutput>>;
} {
  const ctx = useContext(AgentBridgeCtx);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const deps = options?.deps ?? [name, ctx];

  useEffect(() => {
    if (!ctx) return;
    const wrappedHandler = async (input: unknown, actionCtx: ActionContext) => {
      return handlerRef.current(input as TInput | undefined, actionCtx);
    };
    ctx.registerActionEntry(name, wrappedHandler, {
      description: options?.description,
      inputSchema: options?.inputSchema,
      outputSchema: options?.outputSchema,
      idempotent: options?.idempotent,
      supportsDryRun: !!options?.dryRun,
      supportsRollback: !!options?.rollback,
    });
    return () => {
      ctx.unregisterActionEntry(name);
    };
  }, deps);

  const mutateAsync = useCallback(async (input?: TInput): Promise<ActionResult<TOutput>> => {
    if (!ctx) {
      return { ok: false, error: { code: 'DISABLED', message: 'Agent bridge not available' } };
    }
    try {
      const actionCtx: ActionContext = {
        signal: new AbortController().signal,
        dryRun: false,
      };
      const data = await handler(input, actionCtx);
      return { ok: true, data: data as TOutput };
    } catch (err: any) {
      if (err && err.code) {
        return { ok: false, error: { code: err.code, message: err.message, details: err.details } };
      }
      return { ok: false, error: { code: 'INTERNAL', message: String(err?.message ?? err) } };
    }
  }, [handler, ctx]);

  const mutate = useCallback((input?: TInput): void => {
    mutateAsync(input).catch(() => {});
  }, [mutateAsync]);

  return { mutate, mutateAsync };
}
