import React from 'react';
import { AgentBridgeProvider, useAgentState, useAgentAction } from '../src/index';

/**
 * Micro-frontend with prefix — demonstrates namespaced state per sub-app.
 *
 * Each sub-app gets its own prefix, preventing key collisions:
 *   - checkout app:  window.__AGENT__.state.get('checkout.form')
 *   - profile app:   window.__AGENT__.state.get('profile.form')
 *
 * An agent can discover all available state and actions via:
 *   window.__AGENT__.state.list()
 *   window.__AGENT__.actions.list()
 */

function CheckoutWidget() {
  const [email] = useAgentState('form', '', {
    description: 'Checkout email field',
  });
  const { mutate: submit } = useAgentAction(
    'form.submit',
    async () => ({ ok: true }),
    { description: 'Submit checkout form' }
  );

  return (
    <div>
      <p>Checkout email: {email || '(empty)'}</p>
      <button onClick={() => submit()}>Submit Checkout</button>
    </div>
  );
}

function ProfileWidget() {
  const [name] = useAgentState('form', '', {
    description: 'Profile name field',
  });
  const { mutate: save } = useAgentAction(
    'form.save',
    async () => ({ ok: true }),
    { description: 'Save profile' }
  );

  return (
    <div>
      <p>Profile name: {name || '(empty)'}</p>
      <button onClick={() => save()}>Save Profile</button>
    </div>
  );
}

export function MicroFrontendApp() {
  return (
    <AgentBridgeProvider appId="multi-app" prefix="checkout">
      <h3>Checkout</h3>
      <CheckoutWidget />

      <AgentBridgeProvider appId="multi-app" prefix="profile">
        <h3>Profile</h3>
        <ProfileWidget />
      </AgentBridgeProvider>
    </AgentBridgeProvider>
  );
}
