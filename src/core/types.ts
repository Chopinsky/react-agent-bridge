export type JSONSchema = Record<string, unknown>;

export interface StateDescriptor {
  key: string;
  type: string;
  description?: string;
  schema?: JSONSchema;
  redacted?: boolean;
  serializable: boolean;
  updatedAt: number;
  version: number;
}

export interface ActionDescriptor {
  name: string;
  description?: string;
  inputSchema?: JSONSchema;
  outputSchema?: JSONSchema;
  idempotent?: boolean;
  supportsDryRun?: boolean;
  supportsRollback?: boolean;
}

export interface InvokeOptions {
  token?: string;
  dryRun?: boolean;
}

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface StateNamespace {
  get(path?: string): unknown;
  getState(path?: string): unknown;
  list(): Record<string, StateDescriptor>;
  subscribe(path: string, cb: (value: unknown) => void): () => void;
}

export interface ActionContext {
  signal: AbortSignal;
  dryRun: boolean;
}

export interface ActionsNamespace {
  invoke(name: string, input?: unknown, options?: InvokeOptions): Promise<ActionResult>;
  mutate(name: string, input?: unknown, options?: InvokeOptions): Promise<ActionResult>;
  dispatch(event: { type: string; payload?: unknown }, options?: InvokeOptions): Promise<ActionResult>;
  send(event: { type: string; [key: string]: unknown }, options?: InvokeOptions): Promise<ActionResult>;
  list(): Record<string, ActionDescriptor>;
}

export interface AgentBridge {
  version: string;
  meta: {
    appId: string;
    env: 'development' | 'production';
    enabled: boolean;
  };
  state: StateNamespace;
  actions: ActionsNamespace;
  _registry: InternalRegistry;
}

export interface InternalStateEntry {
  descriptor: StateDescriptor;
  refCount: number;
  value?: unknown;
}

export interface InternalActionEntry {
  descriptor: ActionDescriptor;
  handler: (input: unknown, ctx: ActionContext) => unknown | Promise<unknown>;
}

export interface InternalRegistry {
  states: Map<string, InternalStateEntry>;
  actions: Map<string, InternalActionEntry>;
  config: AgentBridgeConfig;
}

export interface ProductionConfig {
  enabled: boolean;
  token?: string;
  allowlist?: {
    states?: string[];
    actions?: string[];
  };
}

export interface DevtoolsConfig {
  attachTo: string;
  debounceMs: number;
}

export interface AgentBridgeConfig {
  appId: string;
  enabled: boolean;
  env?: 'development' | 'production';
  production: ProductionConfig;
  devtools: DevtoolsConfig;
  serializers?: Record<string, (value: unknown) => unknown>;
}
