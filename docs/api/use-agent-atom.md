---
title: agentAtom / useAgentAtom
parent: API Reference
nav_order: 5
---

# agentAtom / useAgentAtom

A Jotai-inspired atomic state pattern. Create atoms outside components, then use them within components.

## Import

```tsx
import { agentAtom, useAgentAtom } from 'react-agent-bridge';
```

## agentAtom

```ts
function agentAtom<T>(
  key: string,
  initial: T,
  options?: AgentStateOptions
): AgentAtom<T>
```

Creates an atom descriptor — a lightweight config object holding the key, initial value, and options.

## useAgentAtom

```ts
function useAgentAtom<T>(atom: AgentAtom<T>): [T, React.Dispatch<React.SetStateAction<T>>]
```

Consumes an atom — registers the key on mount, returns the current value and a setter.

## Example

```tsx
// atoms.ts — defined outside components
const cartAtom = agentAtom<CartItem[]>('cart.items', [], {
  description: 'Shopping cart items',
  schema: {
    type: 'array',
    items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, price: { type: 'number' } } },
  },
});

const userAtom = agentAtom<{ name: string } | null>('user.profile', null, {
  description: 'Logged-in user profile',
  redact: true,
});

// Cart.tsx
function Cart() {
  const [items, setItems] = useAgentAtom(cartAtom);

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div>
      <h2>Cart ({items.length} items)</h2>
      <p>Total: ${total}</p>
      <button onClick={() => setItems([])}>Clear</button>
    </div>
  );
}
```

## When to use

Use `agentAtom` + `useAgentAtom` when you want to define state descriptors in a central place (like a separate `atoms.ts` file) and import them across multiple components. This keeps your state configuration DRY while maintaining the agent bridge visibility.
