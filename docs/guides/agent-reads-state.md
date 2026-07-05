# How Agents Read State

This guide explains the complete flow from React component state to the agent-accessible `window.__AGENT__` surface, covering every read pattern an automation client can use.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ React Component                                             │
│  useAgentState('cart.items', [])                            │
│       │                                                     │
│       ▼                                                     │
│  Registry (internal Map)                                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │  states: Map {                                    │       │
│  │    'cart.items' → { value: [...], descriptor, ...}│       │
│  │    'user.name'  → { value: 'Alice', descriptor }  │       │
│  │  }                                                │       │
│  └──────────────────────────────────────────────────┘       │
│       │                                                     │
│       ▼                                                     │
│  attachWindow()                                             │
│       │                                                     │
│       ▼                                                     │
│  window.__AGENT__ —══════════► CDP / Automation Agent       │
└─────────────────────────────────────────────────────────────┘
```

## Layer 1: React Hooks Register State

When a component mounts with `useAgentState('cart.items', [])`:

```tsx
function Cart() {
  const [items, setItems] = useAgentState('cart.items', [], {
    description: 'Shopping cart items',
    schema: { type: 'array', items: { type: 'object' } },
  });
  // ...
}
```

The hook calls `ctx.registerStateEntry('cart.items', [], options)` which stores the value in the registry's internal `Map`. The key is now visible to agents.

## Layer 2: React → Registry Sync (Write Path)

When state changes (via setter, reducer dispatch, or action handler), the hook calls `ctx.updateStateValue(key, newValue)`:

```
setItems([skateboard, helmet])
  ──> ctx.updateStateValue('cart.items', [skateboard, helmet])
        ──> registry Map updated
        ──> scheduleNotify('cart.items', [skateboard, helmet])
              ──> React subscribers re-render (via useSyncExternalStore)
              ──> External subscribers notified
```

## Layer 3: The window.__AGENT__ Surface

The `attachWindow()` function in the provider's `useEffect` builds a bridge object and assigns it to `globalThis.__AGENT__`:

```ts
const bridge = {
  version: '0.1.0',
  meta: { appId: 'my-app', env: 'development', enabled: true },
  state: {
    get: (path?) => path ? registry.getStateValue(path) : registry.getSnapshot(),
    list: () => registry.getAllDescriptors(),
    subscribe: (path, cb) => registry.subscribe(path, cb),
  },
  actions: { /* invoke, mutate, dispatch, send, list */ },
};

globalThis.__AGENT__ = bridge;
```

## Reading State: Patterns

### 1. Read a single value

```js
const items = window.__AGENT__.state.get('cart.items');
// [{ id: '1', name: 'Skateboard', price: 89.99 }]
```

### 2. Read the full snapshot

Returns all serializable, non-redacted state values in one object:

```js
const all = window.__AGENT__.state.get();
// {
//   'cart.items': [{ id: '1', name: 'Skateboard', price: 89.99 }],
//   'user.name': 'Alice',
//   'auth': '[REDACTED]',  // redacted keys show placeholder
// }
```

**Snapshot rules:**
- Only keys where `serializable !== false` are included
- Keys with `redact: true` appear as the string `'[REDACTED]'`
- Custom serializers are applied (e.g., `Date` → ISO string, `Map`/`Set` → arrays)

### 3. Discover available state (schema introspection)

```js
const descriptors = window.__AGENT__.state.list();
// {
//   'cart.items': {
//     key: 'cart.items',
//     type: 'object',
//     description: 'Shopping cart items',
//     schema: { type: 'array', items: { type: 'object' } },
//     serializable: true,
//     version: 3,
//     updatedAt: 1712345678000,
//   },
//   'user.name': {
//     key: 'user.name',
//     type: 'string',
//     description: 'Logged-in user',
//     redacted: true,
//     serializable: true,
//     version: 1,
//     updatedAt: 1712345000000,
//   },
// }
```

Use this for dynamic discovery — the agent can learn what state is available and its schema without prior knowledge.

### 4. Subscribe to changes

```js
// Subscribe to a specific key
const unsub = window.__AGENT__.state.subscribe('cart.items', (newItems) => {
  console.log('Cart updated:', newItems);
});

// Later, unsubscribe
unsub();
```

```js
// Subscribe to ALL state changes (wildcard)
window.__AGENT__.state.subscribe('*', (value, key) => {
  console.log(`State "${key}" changed:`, value);
});
```

This is how agents reactively wait for conditions:

```js
// Wait for checkout to complete
await new Promise((resolve) => {
  const unsub = window.__AGENT__.state.subscribe('checkout.step', (step) => {
    if (step === 'confirm') {
      unsub();
      resolve();
    }
  });
});
```

## The Subscription / Notification Pipeline

```
                write ──► registry.updateStateValue(key, value)
                               │
                               ├── batchDepth > 0?
                               │   YES → pendingNotifications.push({key, value})
                               │   NO  → notifySubscribers(key, value)
                               │
                          notifySubscribers(key, value)
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
            key subscribers           wildcard ('*')
            cb(value)                 cb(value, key)
```

### Batching

During action execution, multiple state writes are batched and deduplicated:

```ts
// Inside an action handler:
setItems([]);        // queued
setStep('confirm');  // queued
setItems(newItems);  // deduped — replaces previous 'cart.items'

// After action completes:
// 'cart.items' notified once with final value
// 'checkout.step' notified once
```

This prevents intermediate states from leaking to subscribers.

## The Agent Action Write Pattern

Actions can read and write state. When an agent calls `actions.invoke`, the handler runs with access to React state setters:

```js
// Agent calls:
const result = await window.__AGENT__.actions.invoke('checkout', { coupon: 'SAVE10' });
```

```tsx
// Inside the handler defined with useAgentAction:
useAgentAction('checkout', async (input, ctx) => {
  const currentItems = window.__AGENT__.state.get('cart.items');
  // ... process order ...
  setStep('confirm');
  setItems([]);
  return { orderId: 'ord_123' };
});
```

## Production Guards

In production, access control is enforced at the registry level:

| Scenario | Behavior |
|----------|----------|
| Bridge disabled | `state.get()` returns empty, `actions.invoke()` returns `{ ok: false, error: { code: 'DISABLED' } }` |
| Token required | `actions.invoke()` returns `UNAUTHORIZED` if token is missing or wrong |
| Allowlist restricts state | Non-allowlisted keys won't be registered — `state.get(key)` returns `undefined` |
| Allowlist restricts actions | Non-allowlisted actions can't be registered — `actions.invoke(name)` returns `NOT_FOUND` |

## Full Agent Pattern

```js
class ShoppingAgent {
  async run() {
    const bridge = window.__AGENT__;

    // 1. Verify bridge is available
    if (!bridge || !bridge.meta.enabled) return;

    // 2. Discover available state
    const stateKeys = Object.keys(bridge.state.list());
    console.log('Available state:', stateKeys);

    // 3. Read current values
    const items = bridge.state.get('cart.items');
    const user = bridge.state.get('user.name');

    // 4. Subscribe and wait for changes
    const checkoutResult = await new Promise((resolve) => {
      const unsub = bridge.state.subscribe('checkout.step', (step) => {
        if (step === 'confirm') {
          unsub();
          resolve(bridge.state.get('checkout.confirmation'));
        }
      });

      // Trigger the action
      bridge.actions.invoke('checkout.submit');
    });

    // 5. Invoke next action
    await bridge.actions.invoke('payment.process', { amount: 89.99 }, {
      token: 'my-token',  // Only needed in production
    });
  }
}
```

## Summary

| Pattern | Method | Use Case |
|---------|--------|----------|
| Read single key | `state.get('key')` | Fetch a specific value |
| Read all state | `state.get()` | Full snapshot |
| Discover schema | `state.list()` | Dynamic introspection |
| React to changes | `state.subscribe('key', cb)` | Wait for conditions |
| Invoke action | `actions.invoke('name', input)` | Trigger side effects |
| List actions | `actions.list()` | Discover available actions |
