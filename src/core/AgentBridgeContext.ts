import React from 'react';
import type { ActionResult, ActionDescriptor, StateDescriptor, InternalRegistry, ActionContext } from './types';

export interface RegistryHandle {
  registerStateEntry(
    key: string,
    initial: unknown,
    options: { serializable?: boolean; description?: string; schema?: Record<string, unknown>; redact?: boolean; prefix?: string }
  ): number;
  unregisterStateEntry(key: string): boolean;
  getStateValue(key: string): unknown | undefined;
  updateStateValue(key: string, value: unknown): void;
  registerActionEntry(
    name: string,
    handler: (input: unknown, ctx: ActionContext) => unknown | Promise<unknown>,
    options: Partial<ActionDescriptor>
  ): void;
  unregisterActionEntry(name: string): boolean;
  invokeAction(name: string, input?: unknown, options?: { token?: string; dryRun?: boolean }): Promise<ActionResult>;
  subscribe(key: string, cb: (value: unknown, key?: string) => void): () => void;
  getSnapshot(): Record<string, unknown>;
  getAllDescriptors(): Record<string, StateDescriptor>;
  listAllActions(): Record<string, ActionDescriptor>;
  getInternalRegistry(): InternalRegistry;
}

export const AgentBridgeCtx = React.createContext<RegistryHandle | null>(null);
