import type { ActionContext, ActionDescriptor } from '../core/types';

export interface DefinedAgentAction<TInput, TOutput> {
  name: string;
  handler: (input: TInput | undefined, ctx: ActionContext) => TOutput | Promise<TOutput>;
  descriptor: Partial<ActionDescriptor>;
}

export function defineAgentAction<TInput, TOutput>(
  name: string,
  handler: (input: TInput | undefined, ctx: ActionContext) => TOutput | Promise<TOutput>,
  options?: {
    description?: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    idempotent?: boolean;
  }
): DefinedAgentAction<TInput, TOutput> {
  return {
    name,
    handler,
    descriptor: {
      description: options?.description,
      inputSchema: options?.inputSchema,
      outputSchema: options?.outputSchema,
      idempotent: options?.idempotent,
    },
  };
}
