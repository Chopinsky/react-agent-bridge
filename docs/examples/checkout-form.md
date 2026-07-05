# Checkout Form

Source: [`examples/checkout-form.tsx`](/react-agent-bridge/blob/master/examples/checkout-form.tsx)

Demonstrates form state management with action-driven submission and validation.

## What it shows

- Structured form state with JSON Schema
- Multi-step state (`checkout.step`)
- Server-like action with input validation
- Throwing structured errors with `AgentActionError`

## Code

```tsx
import { AgentBridgeProvider, useAgentState, useAgentAction } from 'react-agent-bridge';
import { AgentActionError } from 'react-agent-bridge';

function CheckoutForm() {
  const [form, setForm] = useAgentState('checkout.form', {
    email: '',
    items: [],
  }, {
    description: 'Checkout form fields',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        items: { type: 'array', items: { type: 'string' } },
      },
    },
  });

  const [step, setStep] = useAgentState('checkout.step', 'cart', {
    description: 'Current checkout step: cart | payment | confirm',
  });

  const { mutateAsync: submit } = useAgentAction(
    'checkout.submit',
    async (input) => {
      const data = input ?? form;
      if (!data.email || data.items.length === 0) {
        throw new AgentActionError('VALIDATION', 'Missing email or items');
      }
      await new Promise((r) => setTimeout(r, 100));
      setStep('confirm');
      return { ok: true, orderId: 'ord_123' };
    },
    { description: 'Submit checkout form with validation' }
  );

  return (
    <div>
      <p>Step: {step}</p>
      <p>Email: {form.email}</p>
      <p>Items: {form.items.join(', ')}</p>
      <button onClick={() => submit()}>Submit</button>
    </div>
  );
}

export function CheckoutApp() {
  return (
    <AgentBridgeProvider appId="checkout-app">
      <CheckoutForm />
    </AgentBridgeProvider>
  );
}
```

## Agent interaction

```js
// Read form state
window.__AGENT__.state.get('checkout.form');
// { email: '', items: [] }

// Read current step
window.__AGENT__.state.get('checkout.step');
// 'cart'

// Submit with override data
const result = await window.__AGENT__.actions.invoke('checkout.submit', {
  email: 'alice@example.com',
  items: ['skateboard', 'helmet'],
});
// { ok: true, data: { ok: true, orderId: 'ord_123' } }

// Check step transition
window.__AGENT__.state.get('checkout.step');
// 'confirm'

// Validation error (missing fields):
const bad = await window.__AGENT__.actions.invoke('checkout.submit', { email: '' });
// { ok: false, error: { code: 'VALIDATION', message: 'Missing email or items' } }
```
