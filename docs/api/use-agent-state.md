# useAgentState / useAgentStateValue / useSetAgentState

Drop-in `useState` replacement that registers state in the bridge and keeps it in sync.

## Import

```tsx
import { useAgentState, useAgentStateValue, useSetAgentState } from 'react-agent-bridge';
```

## useAgentState

```ts
function useAgentState<T>(
  key: string,
  initial: T | (() => T),
  options?: AgentStateOptions
): [T, React.Dispatch<React.SetStateAction<T>>]
```

Registers `key` on mount using a ref-counted entry (safe for React StrictMode). Updates are propagated to `window.__AGENT__` and all subscribers.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `description` | `string` | — | Human-readable description for the state key (appears in `state.list()`) |
| `schema` | `Record<string, unknown>` | — | JSON Schema describing the expected shape |
| `serializable` | `boolean` | `true` | Whether this state appears in `state.get()` snapshots |
| `redact` | `boolean` | `false` | When true, shows as `[REDACTED]` in snapshots (value still accessible by direct key) |

### Example

```tsx
function Counter() {
  const [count, setCount] = useAgentState('count', 0, {
    description: 'Current counter value',
    schema: { type: 'integer', minimum: 0 },
  });

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
    </div>
  );
}
```

```js
// Agent reads:
window.__AGENT__.state.get('count');  // 0

// Agent sees schema:
window.__AGENT__.state.list()['count'];
// { key: 'count', type: 'number', description: 'Current counter value', schema: { type: 'integer', minimum: 0 }, version: 1, ... }
```

## useAgentStateValue

```ts
function useAgentStateValue<T>(key: string): T | undefined
```

Read-only version. Returns the current value from the registry without providing a setter.

```tsx
function TotalDisplay() {
  const total = useAgentStateValue<number>('cart.total');
  return <p>Total: ${total}</p>;
}
```

## useSetAgentState

```ts
function useSetAgentState<T>(key: string): React.Dispatch<React.SetStateAction<T>>
```

Setter-only hook. Returns a dispatch function for a key already registered by another component.

```tsx
function ClearCartButton() {
  const setCart = useSetAgentState<CartItem[]>('cart.items');
  return <button onClick={() => setCart([])}>Clear Cart</button>;
}
```

## How it works

1. On mount, calls `ctx.registerStateEntry(key, initial, options)` — this stores the value in the registry's state `Map`.
2. Uses `useSyncExternalStore` (`React 18`) to subscribe to registry changes — ensures the component re-renders when an agent or another component updates the state.
3. The setter calls `ctx.updateStateValue(key, resolved)` which updates the registry and notifies all subscribers (both React and external).
4. On unmount, calls `ctx.unregisterStateEntry(key)` which decrements the ref count. The entry is only removed when all consumers have unmounted.
