# Getting Started

## Installation

```bash
npm install react-agent-bridge
```

**Peer dependencies:** `react >= 18` and `react-dom >= 18` (required for `useSyncExternalStore`).

## 1. Wrap your app with the Provider

The `AgentBridgeProvider` creates the internal registry and attaches `window.__AGENT__`.

```tsx
import { AgentBridgeProvider } from 'react-agent-bridge';

function App() {
  return (
    <AgentBridgeProvider appId="my-app">
      <YourComponents />
    </AgentBridgeProvider>
  );
}
```

## 2. Expose state with hooks

Use `useAgentState` as a drop-in replacement for `useState`. It registers the key in the bridge so agents can read it.

```tsx
import { useAgentState } from 'react-agent-bridge';

function Cart() {
  const [items, setItems] = useAgentState('cart.items', [], {
    description: 'Shopping cart line items',
  });

  const addItem = (item) => setItems([...items, item]);

  return (
    <ul>
      {items.map((item, i) => <li key={i}>{item.name}</li>)}
    </ul>
  );
}
```

## 3. Expose actions with useAgentAction

Register invocable actions that agents can call.

```tsx
import { useAgentAction } from 'react-agent-bridge';

useAgentAction('addToCart', (input) => {
  setItems((prev) => [...prev, input]);
}, {
  description: 'Add an item to the cart',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'string' }, name: { type: 'string' }, price: { type: 'number' } },
    required: ['id', 'name'],
  },
});
```

## 4. Agent reads & writes

From any CDP/automation client, access the bridge via `window.__AGENT__`:

```js
// Read state
const items = window.__AGENT__.state.get('cart.items');

// Get full snapshot
const allState = window.__AGENT__.state.get();

// List all registered state keys with schemas
const descriptors = window.__AGENT__.state.list();

// Subscribe to changes
const unsub = window.__AGENT__.state.subscribe('cart.items', (newItems) => {
  console.log('Cart updated:', newItems);
});

// Invoke actions
const result = await window.__AGENT__.actions.invoke('addToCart', {
  id: 'skateboard-1',
  name: 'Skateboard',
  price: 89.99,
});

// Alias for invoke
await window.__AGENT__.actions.mutate('addToCart', { id: 'helmet-1', name: 'Helmet', price: 29.99 });

// Dispatch-style call
await window.__AGENT__.actions.dispatch({ type: 'checkout', payload: { coupon: 'SAVE10' } });

// Rest-param style call
await window.__AGENT__.actions.send({ type: 'checkout', coupon: 'SAVE10' });
```

## Next Steps

- [API Reference](/react-agent-bridge/api/provider)
- [How Agents Read State](/react-agent-bridge/guides/agent-reads-state)
- [Examples](/react-agent-bridge/examples/basic-usage)
