# Production Setup

Source: [`examples/production-setup.tsx`](/react-agent-bridge/blob/master/examples/production-setup.tsx)

Demonstrates token authentication and allowlist configuration for production environments.

## What it shows

- Enabling the bridge in production via `production.enabled`
- Bearer token verification on action invocations
- Allowlist to restrict which states/actions are accessible
- Environment-conditional configuration

## Code

```tsx
import { AgentBridgeProvider, useAgentState, useAgentAction } from 'react-agent-bridge';

function PaymentWidget() {
  const [balance] = useAgentState('payment.balance', 500, {
    description: 'Current account balance',
  });

  const { mutateAsync: processPayment } = useAgentAction(
    'payment.process',
    async (input) => {
      if (!input || input.amount <= 0) {
        throw new Error('Invalid amount');
      }
      await new Promise((r) => setTimeout(r, 50));
      return { success: true, charged: input.amount };
    },
    {
      description: 'Process a payment transaction',
      inputSchema: {
        type: 'object',
        properties: { amount: { type: 'number', minimum: 1 } },
        required: ['amount'],
      },
    }
  );

  return (
    <div>
      <p>Balance: ${balance}</p>
      <button onClick={() => processPayment({ amount: 50 })}>Pay $50</button>
    </div>
  );
}

export function ProductionApp() {
  return (
{% raw %}
    <AgentBridgeProvider
      appId="payment-app"
      enabled={process.env.NODE_ENV === 'development' || process.env.REACT_APP_AGENT_BRIDGE === 'true'}
      production={{
        enabled: process.env.REACT_APP_AGENT_BRIDGE === 'true',
        token: process.env.REACT_APP_AGENT_BRIDGE_TOKEN,
        allowlist: {
          states: ['payment.balance'],
          actions: ['payment.process'],
        },
      }}
    >
      <PaymentWidget />
    </AgentBridgeProvider>
{% endraw %}
  );
}
```

## Agent interaction

```js
// Reading state works without token (if allowlisted)
window.__AGENT__.state.get('payment.balance');
// 500

// Invoking actions requires the token
const result = await window.__AGENT__.actions.invoke(
  'payment.process',
  { amount: 100 },
  { token: process.env.REACT_APP_AGENT_BRIDGE_TOKEN }
);

// Without token:
const failed = await window.__AGENT__.actions.invoke('payment.process', { amount: 100 });
// { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } }

// Unauthorized access to non-allowlisted state:
window.__AGENT__.state.get('some.other.key');
// Returns undefined or the key doesn't appear in state.list()
```
