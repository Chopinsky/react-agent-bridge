---
title: window.__AGENT__ Surface
parent: API Reference
nav_order: 9
---

# window.__AGENT__ Surface

The public API that CDP/automation agents interact with. Attached to `globalThis` by the `AgentBridgeProvider`.

## Structure

```ts
interface AgentBridge {
  version: string;
  meta: {
    appId: string;
    env: 'development' | 'production';
    enabled: boolean;
  };
  state: StateNamespace;
  actions: ActionsNamespace;
  _registry: InternalRegistry;  // For devtools
}
```

## State Namespace

```ts
interface StateNamespace {
  get(path?: string): unknown;
  getState(path?: string): unknown;
  list(): Record<string, StateDescriptor>;
  subscribe(path: string, cb: (value: unknown) => void): () => void;
}
```

### state.get(path?)

Returns the value for a specific key, or the full snapshot if called without arguments.

```js
// Full snapshot (serializable, non-redacted values only)
const snapshot = window.__AGENT__.state.get();
// { 'cart.items': [...], 'user.name': 'Alice', 'auth': [REDACTED] }

// Single key
const items = window.__AGENT__.state.get('cart.items');
// [{ id: '1', name: 'Skateboard', price: 89.99 }]
```

### state.list()

Returns all registered state descriptors with their schemas and metadata.

```js
const descriptors = window.__AGENT__.state.list();
// {
//   'cart.items': { key: 'cart.items', type: 'object', description: 'Shopping cart line items', schema: {...}, version: 3, serializable: true, updatedAt: 1712345678000 },
//   'user.name': { key: 'user.name', type: 'string', description: 'Logged-in user', redacted: true, version: 1, updatedAt: 1712345000000 },
// }
```

### state.subscribe(path, callback)

Subscribe to changes for a specific key. Returns an unsubscribe function.

```js
const unsub = window.__AGENT__.state.subscribe('cart.items', (newItems) => {
  console.log('Cart updated:', newItems);
});

// Later, to stop listening:
unsub();
```

You can also subscribe to all changes with `'*'`:

```js
window.__AGENT__.state.subscribe('*', (value, key) => {
  console.log(`State changed: ${key}`, value);
});
```

## Actions Namespace

```ts
interface ActionsNamespace {
  invoke(name: string, input?: unknown, options?: InvokeOptions): Promise<ActionResult>;
  mutate(name: string, input?: unknown, options?: InvokeOptions): Promise<ActionResult>;
  dispatch(event: { type: string; payload?: unknown }, options?: InvokeOptions): Promise<ActionResult>;
  send(event: { type: string; [key: string]: unknown }, options?: InvokeOptions): Promise<ActionResult>;
  list(): Record<string, ActionDescriptor>;
}
```

### actions.invoke(name, input?, options?)

Invoke a registered action by name. Returns `ActionResult`.

```js
const result = await window.__AGENT__.actions.invoke('addToCart', {
  id: 'skateboard-1',
  name: 'Skateboard',
  price: 89.99,
});

if (result.ok) {
  console.log('Added:', result.data);
} else {
  console.error('Failed:', result.error);
}
```

### actions.mutate()

Alias for `invoke`.

### actions.dispatch(event)

Dispatch-style invocation — `type` maps to the action name, `payload` maps to the input.

```js
await window.__AGENT__.actions.dispatch({
  type: 'addToCart',
  payload: { id: 'helmet-1', name: 'Helmet', price: 29.99 },
});
```

### actions.send(event)

Rest-parameter style — `type` maps to the action name, all other properties form the input.

```js
await window.__AGENT__.actions.send({
  type: 'checkout',
  coupon: 'SAVE10',
});
```

### actions.list()

Returns all registered action descriptors.

```js
const actions = window.__AGENT__.actions.list();
// {
//   'addToCart': { name: 'addToCart', description: 'Add item to cart', inputSchema: {...}, idempotent: false },
//   'checkout': { name: 'checkout', description: 'Submit cart as order' },
// }
```

### InvokeOptions

```ts
interface InvokeOptions {
  token?: string;   // Required if production.token is set
  dryRun?: boolean; // Validate without side effects
}
```

### ActionResult

```ts
interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;         // Present on success
  error?: {         // Present on failure
    code: string;
    message: string;
    details?: unknown;
  };
}
```

## Meta

```js
window.__AGENT__.meta;
// { appId: 'my-store', env: 'development', enabled: true }
```

## Devtools

```js
window.__AGENT__._registry;
// { states: Map, actions: Map, config: { appId, enabled, ... } }
```

Direct access to the internal `Map`s for debugging and devtools integration.
