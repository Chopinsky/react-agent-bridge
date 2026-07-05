---
title: useAgentAction
parent: API Reference
nav_order: 3
---

# useAgentAction

Register an invocable action handler that CDP agents can call via `window.__AGENT__.actions.invoke()`.

## Import

```tsx
import { useAgentAction } from 'react-agent-bridge';
```

## Signature

```ts
function useAgentAction<TInput, TOutput>(
  name: string,
  handler: (input: TInput | undefined, ctx: ActionContext) => TOutput | Promise<TOutput>,
  options?: UseAgentActionOptions
): {
  mutate: (input?: TInput) => void;
  mutateAsync: (input?: TInput) => Promise<ActionResult<TOutput>>;
}
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `description` | `string` | Human-readable description for discovery |
| `inputSchema` | `Record<string, unknown>` | JSON Schema for input validation |
| `outputSchema` | `Record<string, unknown>` | JSON Schema for output shape |
| `idempotent` | `boolean` | Whether repeated calls with same input produce same result |
| `deps` | `DependencyList` | Custom effect dependencies (default: `[name, ctx]`) |
| `dryRun` | `(input: TInput) => { ok: boolean; errors?: unknown[] }` | Logic for dry-run mode |
| `rollback` | `(error, ctx) => void` | Compensation logic for rollback support |

## Returns

| Return | Description |
|--------|-------------|
| `mutate(input?)` | Fire-and-forget invocation (void) |
| `mutateAsync(input?)` | Async invocation returning `ActionResult<TOutput>` |

## Example

```tsx
function CheckoutButton() {
  const [items, setItems] = useAgentState('cart.items', []);
  const [submitted, setSubmitted] = useAgentState('checkout.submitted', false);

  const { mutateAsync } = useAgentAction(
    'checkout',
    async (input: { coupon?: string }, ctx) => {
      // ctx.signal — AbortSignal for cancellation
      // ctx.dryRun — boolean for validation-only mode
      const result = await api.submitOrder({ items, coupon: input?.coupon });
      setSubmitted(true);
      setItems([]);
      return result;
    },
    {
      description: 'Submit the current cart as an order',
      inputSchema: {
        type: 'object',
        properties: { coupon: { type: 'string' } },
      },
      idempotent: false,
    }
  );

  return <button onClick={() => mutateAsync({ coupon: 'SAVE10' })}>Checkout</button>;
}
```

```js
// Agent calls:
const result = await window.__AGENT__.actions.invoke('checkout', { coupon: 'SAVE10' });
// { ok: true, data: { orderId: 'ord_123', total: 89.99 } }
```

## ActionContext

Passed to every handler:

```ts
interface ActionContext {
  signal: AbortSignal; // For cancellation
  dryRun: boolean;     // True during dry-run invocations
}
```

## ActionResult

```ts
interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### Throwing structured errors

```tsx
import { AgentActionError } from 'react-agent-bridge';

useAgentAction('checkout', async (input) => {
  if (!input?.coupon) {
    throw new AgentActionError('VALIDATION', 'Coupon is required');
  }
  // ...
});
```

The agent receives:

```js
{ ok: false, error: { code: 'VALIDATION', message: 'Coupon is required' } }
```

## Batching

When an action updates multiple state keys, notifications are batched and deduplicated — subscribers receive only the final value for each key after the action completes.
