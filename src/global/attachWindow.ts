import { AgentBridgeConfig } from '../core/types';

interface RegistryShape {
  getSnapshot(): Record<string, unknown>;
  getStateValue(key: string): unknown | undefined;
  getAllDescriptors(): Record<string, import('../core/types').StateDescriptor>;
  subscribe(key: string, cb: (value: unknown, key?: string) => void): () => void;
  invokeAction(name: string, input?: unknown, options?: { token?: string; dryRun?: boolean }): Promise<import('../core/types').ActionResult>;
  listAllActions(): Record<string, import('../core/types').ActionDescriptor>;
  getInternalRegistry(): import('../core/types').InternalRegistry;
}

export function attachWindow(
  attachTo: string,
  versionOrAppId: string,
  registry: RegistryShape
): void {
  const config: AgentBridgeConfig = registry.getInternalRegistry().config;
  const version = versionOrAppId;

  const bridge = {
    version,
    meta: {
      appId: config.appId,
      env: config.env || 'development',
      enabled: config.enabled,
    },
    state: {
      get: (path?: string) => {
        if (path === undefined) return registry.getSnapshot();
        return registry.getStateValue(path);
      },
      getState: (path?: string) => {
        if (path === undefined) return registry.getSnapshot();
        return registry.getStateValue(path);
      },
      list: () => registry.getAllDescriptors(),
      subscribe: (path: string, cb: (value: unknown) => void) => registry.subscribe(path, cb),
    },
    actions: {
      invoke: async (name: string, input?: unknown, options?: { token?: string; dryRun?: boolean }) =>
        registry.invokeAction(name, input, options),
      mutate: async (name: string, input?: unknown, options?: { token?: string; dryRun?: boolean }) =>
        registry.invokeAction(name, input, options),
      dispatch: async (
        event: { type: string; payload?: unknown },
        options?: { token?: string; dryRun?: boolean }
      ) => registry.invokeAction(event.type, event.payload, options),
      send: async (
        event: { type: string; [key: string]: unknown },
        options?: { token?: string; dryRun?: boolean }
      ) => {
        const { type, ...payload } = event;
        return registry.invokeAction(type, payload, options);
      },
      list: () => registry.listAllActions(),
    },
    _registry: registry.getInternalRegistry(),
  };

  (globalThis as any)[attachTo] = bridge;
}

export function detachWindow(attachTo: string): void {
  delete (globalThis as any)[attachTo];
}
