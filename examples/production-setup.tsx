import React from 'react';
import { AgentBridgeProvider, useAgentState, useAgentAction } from '../src/index';

/**
 * Production setup — demonstrates token auth and allowlist.
 *
 * State is readable by anyone, but action invocations require a valid token.
 * Only whitelisted state keys and actions are exposed on window.__AGENT__.
 *
 * Automation client (with token):
 *   await window.__AGENT__.actions.invoke('payment.process', { amount: 100 }, { token: 's3cret' });
 *
 * Without token, the call returns:
 *   { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } }
 */
function PaymentWidget() {
  const [balance] = useAgentState('payment.balance', 500, {
    description: 'Current account balance',
  });

  const { mutateAsync: processPayment } = useAgentAction(
    'payment.process',
    async (input?: { amount: number }) => {
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
  );
}
