import {
  AgentBridgeConfig,
  ActionContext,
  ActionDescriptor,
  ActionResult,
  InternalActionEntry,
  InternalRegistry,
  StateDescriptor,
} from './types';

type SubscribeCallback = (value: unknown, key?: string) => void;

export function createRegistry(config: AgentBridgeConfig) {
  const states = new Map<string, {
    descriptor: StateDescriptor;
    getValue: () => unknown;
    setValue: (value: unknown) => void;
    refCount: number;
    value: unknown;
  }>();

  const actions = new Map<string, InternalActionEntry>();
  const subscribers = new Map<string, Set<SubscribeCallback>>();

  const prodConfig = config.production;
  const productionRules = prodConfig.enabled;
  const token = productionRules ? prodConfig.token : undefined;
  const allowlist = productionRules ? prodConfig.allowlist : undefined;

  function isAllowed(key: string, type: 'states' | 'actions'): boolean {
    if (!productionRules) return true;
    const list = allowlist?.[type];
    if (!list || list.length === 0) return true;
    return list.includes(key);
  }

  function notifySubscribers(key: string, value: unknown) {
    const specific = subscribers.get(key);
    if (specific) {
      specific.forEach((cb) => cb(value));
    }
    const wildcard = subscribers.get('*');
    if (wildcard) {
      wildcard.forEach((cb) => cb(value, key));
    }
  }

  return {
    registerStateEntry(
      key: string,
      initial: unknown,
      options: { serializable?: boolean; description?: string; schema?: Record<string, unknown>; redact?: boolean }
    ): number {
      if (!isAllowed(key, 'states')) return 0;
      const existing = states.get(key);
      if (existing) {
        existing.refCount++;
        return existing.refCount;
      }
      const now = Date.now();
      const entry = {
        value: initial,
        descriptor: {
          key,
          type: typeof initial,
          description: options.description,
          schema: options.schema,
          redacted: options.redact,
          serializable: options.serializable !== false,
          updatedAt: now,
          version: 1,
        },
        getValue: () => entry.value,
        setValue: (v: unknown) => {
          entry.value = v;
          entry.descriptor.version++;
          entry.descriptor.updatedAt = Date.now();
        },
        refCount: 1,
      };
      states.set(key, entry);
      return 1;
    },

    unregisterStateEntry(key: string): boolean {
      const entry = states.get(key);
      if (!entry) return false;
      entry.refCount--;
      if (entry.refCount <= 0) {
        states.delete(key);
      }
      return true;
    },

    getStateValue(key: string): unknown | undefined {
      return states.get(key)?.value;
    },

    getStateDescriptor(key: string): StateDescriptor | undefined {
      return states.get(key)?.descriptor;
    },

    updateStateValue(key: string, value: unknown): void {
      const entry = states.get(key);
      if (!entry) return;
      entry.value = value;
      entry.descriptor.version++;
      entry.descriptor.updatedAt = Date.now();
      notifySubscribers(key, value);
    },

    getSnapshot(): Record<string, unknown> {
      const snapshot: Record<string, unknown> = {};
      for (const [key, entry] of states) {
        if (entry.descriptor.serializable && !entry.descriptor.redacted) {
          snapshot[key] = entry.value;
        }
      }
      return snapshot;
    },

    getAllDescriptors(): Record<string, StateDescriptor> {
      const descs: Record<string, StateDescriptor> = {};
      for (const [key, entry] of states) {
        descs[key] = entry.descriptor;
      }
      return descs;
    },

    registerActionEntry(
      name: string,
      handler: (input: unknown, ctx: ActionContext) => unknown | Promise<unknown>,
      options: Partial<ActionDescriptor>
    ): void {
      if (!isAllowed(name, 'actions')) return;
      actions.set(name, {
        descriptor: {
          name,
          description: options.description,
          inputSchema: options.inputSchema,
          outputSchema: options.outputSchema,
          idempotent: options.idempotent,
          supportsDryRun: options.supportsDryRun,
          supportsRollback: options.supportsRollback,
        },
        handler,
      });
    },

    unregisterActionEntry(name: string): boolean {
      return actions.delete(name);
    },

    getActionDescriptor(name: string): ActionDescriptor | undefined {
      return actions.get(name)?.descriptor;
    },

    async invokeAction(
      name: string,
      input?: unknown,
      options?: { token?: string; dryRun?: boolean }
    ): Promise<ActionResult> {
      if (!config.enabled) {
        return { ok: false, error: { code: 'DISABLED', message: 'Agent bridge disabled' } };
      }
      const isProd = config.env === 'production';
      if (isProd && !productionRules) {
        return { ok: false, error: { code: 'DISABLED', message: 'Agent bridge disabled in production' } };
      }
      if (token && options?.token !== token) {
        return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } };
      }
      const entry = actions.get(name);
      if (!entry) {
        return { ok: false, error: { code: 'NOT_FOUND', message: `Action "${name}" not found` } };
      }
      try {
        const ctx: ActionContext = {
          signal: new AbortController().signal,
          dryRun: options?.dryRun ?? false,
        };
        const data = await entry.handler(input, ctx);
        return { ok: true, data };
      } catch (err: any) {
        if (err && err.code) {
          return { ok: false, error: { code: err.code, message: err.message, details: err.details } };
        }
        return { ok: false, error: { code: 'INTERNAL', message: String(err?.message ?? err) } };
      }
    },

    subscribe(key: string, cb: SubscribeCallback): () => void {
      if (!subscribers.has(key)) {
        subscribers.set(key, new Set());
      }
      subscribers.get(key)!.add(cb);
      return () => {
        subscribers.get(key)?.delete(cb);
      };
    },

    listAllActions(): Record<string, ActionDescriptor> {
      const descs: Record<string, ActionDescriptor> = {};
      for (const [name, entry] of actions) {
        descs[name] = entry.descriptor;
      }
      return descs;
    },

    getInternalRegistry(): InternalRegistry {
      return {
        states: states as any,
        actions: actions as any,
        config,
      };
    },
  };
}
