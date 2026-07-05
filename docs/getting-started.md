---
title: Getting Started
nav_order: 2
---

# Getting Started

## Installation

```bash
npm install react-agent-bridge
```

**Peer dependencies:** `react >= 18` and `react-dom >= 18` (required for `useSyncExternalStore`).

## 1. Wrap your app with the Provider

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

```js
const items = window.__AGENT__.state.get('cart.items');
const allState = window.__AGENT__.state.get();
const descriptors = window.__AGENT__.state.list();

const unsub = window.__AGENT__.state.subscribe('cart.items', (newItems) => {
  console.log('Cart updated:', newItems);
});

const result = await window.__AGENT__.actions.invoke('addToCart', {
  id: 'skateboard-1', name: 'Skateboard', price: 89.99,
});

await window.__AGENT__.actions.dispatch({ type: 'checkout', payload: { coupon: 'SAVE10' } });
await window.__AGENT__.actions.send({ type: 'checkout', coupon: 'SAVE10' });
```
