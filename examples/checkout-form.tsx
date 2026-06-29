import React from 'react';
import { AgentBridgeProvider, useAgentState, useAgentAction } from '../src/index';

/**
 * Checkout form — demonstrates form state + action-driven submission.
 *
 * An automation client can:
 *   - Read form state: window.__AGENT__.state.get('checkout.form')
 *   - Read current step: window.__AGENT__.state.get('checkout.step')
 *   - Invoke submit: await window.__AGENT__.actions.invoke('checkout.submit')
 *   - Wait for confirmation: window.__AGENT__.state.get('checkout.confirmation')
 *
 * No DOM scraping needed — the agent reads state and invokes actions directly.
 */
function CheckoutForm() {
  const [form, setForm] = useAgentState('checkout.form', {
    email: '',
    items: [] as string[],
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
    async (input?: { email?: string; items?: string[] }) => {
      const data = input ?? form;
      if (!data.email || data.items.length === 0) {
        throw new (await import('../src/actions/errors')).AgentActionError(
          'VALIDATION', 'Missing email or items'
        );
      }
      // Simulate API call
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
