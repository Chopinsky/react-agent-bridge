import React from 'react';

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
    handler: (input: unknown, ctx: any) => unknown | Promise<unknown>,
    options: any
  ): void;
  unregisterActionEntry(name: string): boolean;
  invokeAction(name: string, input?: unknown, options?: { token?: string; dryRun?: boolean }): Promise<any>;
  subscribe(key: string, cb: (value: unknown, key?: string) => void): () => void;
  getSnapshot(): Record<string, unknown>;
  getAllDescriptors(): Record<string, any>;
  listAllActions(): Record<string, any>;
  getInternalRegistry(): any;
}

export const AgentBridgeCtx = React.createContext<RegistryHandle | null>(null);
