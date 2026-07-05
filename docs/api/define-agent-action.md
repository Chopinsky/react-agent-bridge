# defineAgentAction

Pre-define an action outside of React components for registration via the provider's `registerActions` prop.

## Import

```tsx
import { defineAgentAction } from 'react-agent-bridge';
```

## Signature

```ts
function defineAgentAction<TInput, TOutput>(
  name: string,
  handler: (input: TInput | undefined, ctx: ActionContext) => TOutput | Promise<TOutput>,
  options?: {
    description?: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    idempotent?: boolean;
  }
): DefinedAgentAction<TInput, TOutput>
```

## Example

```tsx
// actions.ts
import { defineAgentAction } from 'react-agent-bridge';

export const addToCart = defineAgentAction(
  'addToCart',
  async (input: { id: string; name: string; price: number }, ctx) => {
    // ctx.signal — AbortSignal
    // ctx.dryRun — boolean
    const result = await db.insert('cart_items', input);
    return result;
  },
  {
    description: 'Add an item to the shopping cart',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        price: { type: 'number' },
      },
      required: ['id', 'name'],
    },
    idempotent: false,
  }
);

export const checkout = defineAgentAction(
  'checkout',
  async (input: { coupon?: string }) => {
    return await api.submitOrder(input);
  },
  { description: 'Submit the current cart as an order' }
);

// App.tsx
import { AgentBridgeProvider } from 'react-agent-bridge';
import { addToCart, checkout } from './actions';

function App() {
  return (
    <AgentBridgeProvider appId="my-store" registerActions={[addToCart, checkout]}>
      <YourComponents />
    </AgentBridgeProvider>
  );
}
```

## When to use

- Actions that don't depend on React component lifecycle.
- Actions shared across multiple components or routes.
- Actions that should be registered immediately when the provider mounts.
- Actions defined in separate modules or feature folders.

For component-specific actions (e.g., that call component state setters), use `useAgentAction` instead.
