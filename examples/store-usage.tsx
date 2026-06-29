import React from 'react';
import { AgentBridgeProvider, createAgentStore } from '../src/index';

/**
 * Store usage — demonstrates createAgentStore for module-level shared state.
 *
 * The store is readable from outside React (great for CDP/agents):
 *   - window.__AGENT__.state.get('cart.items')  → [...]
 *   - window.__AGENT__.state.get('cart.total')   → 29.99
 *
 * Mutations go through registered actions, not direct state.set.
 * The store's setState is for in-app convenience only.
 */

interface CartState {
  items: { id: string; name: string; price: number }[];
  total: number;
}

export const cartStore = createAgentStore('cart', {
  items: [] as { id: string; name: string; price: number }[],
  total: 0,
});

function CartItem({ id, name, price }: { id: string; name: string; price: number }) {
  return <li>{name} — ${price}</li>;
}

export function CartApp() {
  const items = cartStore.use('items');
  const total = cartStore.use('total');

  return (
    <div>
      <h2>Cart ({items.length} items)</h2>
      <ul>{items.map((item) => <CartItem key={item.id} {...item} />)}</ul>
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
