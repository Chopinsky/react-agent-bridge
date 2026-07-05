---
title: Type Reference
parent: API Reference
nav_order: 10
---

# Type Reference

All TypeScript types exported by `react-agent-bridge`.

## AgentBridge

```ts
interface AgentBridge {
  version: string;
  meta: { appId: string; env: 'development' | 'production'; enabled: boolean };
  state: StateNamespace;
  actions: ActionsNamespace;
  _registry: InternalRegistry;
}
```

## StateNamespace

```ts
interface StateNamespace {
  get(path?: string): unknown;
  getState(path?: string): unknown;
  list(): Record<string, StateDescriptor>;
  subscribe(path: string, cb: (value: unknown) => void): () => void;
}
```

## ActionsNamespace

```ts
interface ActionsNamespace {
  invoke(name: string, input?: unknown, options?: InvokeOptions): Promise<ActionResult>;
  mutate(name: string, input?: unknown, options?: InvokeOptions): Promise<ActionResult>;
  dispatch(event: { type: string; payload?: unknown }, options?: InvokeOptions): Promise<ActionResult>;
  send(event: { type: string; [key: string]: unknown }, options?: InvokeOptions): Promise<ActionResult>;
  list(): Record<string, ActionDescriptor>;
}
```

## StateDescriptor

```ts
interface StateDescriptor {
  key: string;
  type: string;
  description?: string;
  schema?: Record<string, unknown>;
  redacted?: boolean;
  serializable: boolean;
  updatedAt: number;
  version: number;
}
```

## ActionDescriptor

```ts
interface ActionDescriptor {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  idempotent?: boolean;
  supportsDryRun?: boolean;
  supportsRollback?: boolean;
}
```

## ActionResult

```ts
interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}
```

## ActionContext

```ts
interface ActionContext {
  signal: AbortSignal;
  dryRun: boolean;
}
```

## InvokeOptions

```ts
interface InvokeOptions {
  token?: string;
  dryRun?: boolean;
}
```

## AgentBridgeConfig

```ts
interface AgentBridgeConfig {
  appId: string;
  enabled: boolean;
  env?: 'development' | 'production';
  production: ProductionConfig;
  devtools: DevtoolsConfig;
  serializers?: Record<string, (value: unknown) => unknown>;
}
```

## ProductionConfig

```ts
interface ProductionConfig {
  enabled: boolean;
  token?: string;
  allowlist?: { states?: string[]; actions?: string[] };
}
```

## DevtoolsConfig

```ts
interface DevtoolsConfig {
  attachTo: string;
  debounceMs: number;
}
```

## InternalRegistry

```ts
interface InternalRegistry {
  states: Map<string, InternalStateEntry>;
  actions: Map<string, InternalActionEntry>;
  config: AgentBridgeConfig;
}
```

## InternalStateEntry

```ts
interface InternalStateEntry {
  descriptor: StateDescriptor;
  refCount: number;
  value?: unknown;
}
```

## InternalActionEntry

```ts
interface InternalActionEntry {
  descriptor: ActionDescriptor;
  handler: (input: unknown, ctx: ActionContext) => unknown | Promise<unknown>;
}
```

## AgentBridgeProviderProps

```ts
interface AgentBridgeProviderProps {
  appId: string;
  enabled?: boolean;
  prefix?: string;
  production?: ProductionConfig;
  devtools?: DevtoolsConfig;
  registerActions?: DefinedAgentAction<any, any>[];
  children: React.ReactNode;
}
```

## AgentAtom

```ts
interface AgentAtom<T> {
  key: string;
  initial: T;
  options?: {
    schema?: Record<string, unknown>;
    description?: string;
    serializable?: boolean;
    redact?: boolean;
  };
}
```

## AgentStore

```ts
interface AgentStore<T extends Record<string, unknown>> {
  use<K extends keyof T>(key: K): T[K];
  useSet<K extends keyof T>(key: K): React.Dispatch<React.SetStateAction<T[K]>>;
  getState<K extends keyof T>(key: K): T[K];
  setState<K extends keyof T>(key: K, value: T[K]): void;
  subscribe<K extends keyof T>(key: K, cb: (value: T[K]) => void): () => void;
}
```

## DefinedAgentAction

```ts
interface DefinedAgentAction<TInput, TOutput> {
  name: string;
  handler: (input: TInput | undefined, ctx: ActionContext) => TOutput | Promise<TOutput>;
  descriptor: Partial<ActionDescriptor>;
}
```
