---
title: createAgentStore
parent: API Reference
nav_order: 6
---

# createAgentStore

A Zustand-inspired module-level store. Create a store outside React, then access state from components and non-React code with full agent bridge visibility.

## Import

```tsx
import { createAgentStore } from 'react-agent-bridge';
```

## Signature

```ts
function createAgentStore<T extends Record<string, unknown>>(
  namespace: string,
  initial: T,
  options?: { schemas?: Partial<Record<keyof T, Record<string, unknown>>> }
): AgentStore<T>
```

## The Store Object

```ts
interface AgentStore<T> {
  use<K extends keyof T>(key: K): T[K];                         // React hook
  useSet<K extends keyof T>(key: K): React.Dispatch<React.SetStateAction<T[K]>>;
  getState<K extends keyof T>(key: K): T[K];                    // Outside React
  setState<K extends keyof T>(key: K, value: T[K]): void;       // Outside React
  subscribe<K extends keyof T>(key: K, cb: (value: T[K]) => void): () => void;
}
```

## Example

```tsx
// store.ts — at module scope
interface CartStore {
  items: CartItem[];
  coupon: string | null;
  total: number;
}

export const cartStore = createAgentStore<CartStore>('cart', {
  items: [],
  coupon: null,
  total: 0,
}, {
  schemas: {
    items: { type: 'array', items: { type: 'object' } },
    total: { type: 'number', minimum: 0 },
  },
});

// CartList.tsx — React component
function CartList() {
  const items = cartStore.use('items');
  const setItems = cartStore.useSet('items');

  return (
    <ul>
      {items.map((item, i) => <li key={i}>{item.name}</li>)}
      <button onClick={() => setItems([])}>Clear</button>
    </ul>
  );
}

// analytics.ts — non-React code
cartStore.subscribe('items', (items) => {
  trackEvent('cart_updated', { itemCount: items.length });
});

// middleware.js — express/Node code (after store is initialized)
const currentItems = cartStore.getState('items');
console.log('Current cart:', currentItems);
```

```js
// Agent sees namespaced keys:
window.__AGENT__.state.get('cart.items');
window.__AGENT__.state.get('cart.total');
window.__AGENT__.state.get('cart.coupon');
```

## Key features

- **Namespaced keys**: All state keys are prefixed with `{namespace}.` to avoid collisions.
- **Dual access**: Call `store.use()` inside components, `store.getState()` anywhere.
- **Bridge visible**: Every key is automatically registered in the registry and appears in `window.__AGENT__`.
- **Lazy registration**: Keys are registered on first `use()` or `getState()` call, not at store creation.
