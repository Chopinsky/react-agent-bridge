# Module Store

Source: [`examples/store-usage.tsx`](/react-agent-bridge/blob/master/examples/store-usage.tsx)

Demonstrates `createAgentStore` for module-level shared state accessible outside React.

## What it shows

- Creating a Zustand-like store at module scope
- Reading state inside components with `store.use()`
- Namespaced keys (`cart.items`, `cart.total`) in the agent bridge
- Non-React access via `store.getState()` and `store.subscribe()`

## Code

```tsx
import { AgentBridgeProvider, createAgentStore } from 'react-agent-bridge';

interface CartState {
  items: { id: string; name: string; price: number }[];
  total: number;
}

export const cartStore = createAgentStore('cart', {
  items: [],
  total: 0,
});

function CartApp() {
  const items = cartStore.use('items');
  const total = cartStore.use('total');

  return (
    <div>
      <h2>Cart ({items.length} items)</h2>
      <ul>{items.map((item) => <li key={item.id}>{item.name} — ${item.price}</li>)}</ul>
      <p>Total: ${total}</p>
    </div>
  );
}

export function StoreExampleApp() {
  return (
    <AgentBridgeProvider appId="store-app">
      <CartApp />
    </AgentBridgeProvider>
  );
}
```

## Agent interaction

```js
// Read namespaced state
window.__AGENT__.state.get('cart.items');
// []

window.__AGENT__.state.get('cart.total');
// 0

// Full snapshot
window.__AGENT__.state.get();
// { 'cart.items': [], 'cart.total': 0 }
```

## Outside React access

```ts
// In a non-React module (e.g., analytics, middleware):
import { cartStore } from './store';

// Read
const items = cartStore.getState('items');

// Subscribe
const unsub = cartStore.subscribe('items', (newItems) => {
  console.log('Cart items changed:', newItems);
});

// Write
cartStore.setState('items', [{ id: '1', name: 'Skateboard', price: 89.99 }]);
```
