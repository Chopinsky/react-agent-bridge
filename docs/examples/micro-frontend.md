---
title: Micro-Frontend Namespacing
parent: Examples
nav_order: 6
---

# Micro-Frontend Namespacing

Source: [`examples/micro-frontend.tsx`](/react-agent-bridge/blob/master/examples/micro-frontend.tsx)

Demonstrates how to use the `prefix` prop to prevent key collisions when multiple sub-apps share the page.

## What it shows

- Nested `AgentBridgeProvider` with different `prefix` values
- Same `key` used by different sub-apps resolves to different registry keys
- Agent sees prefixed keys: `checkout.form` and `profile.form`

## Code

```tsx
import { AgentBridgeProvider, useAgentState, useAgentAction } from 'react-agent-bridge';

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
    <>
      <AgentBridgeProvider appId="multi-app" prefix="checkout">
        <h3>Checkout</h3>
        <CheckoutWidget />
      </AgentBridgeProvider>

      <AgentBridgeProvider appId="multi-app" prefix="profile">
        <h3>Profile</h3>
        <ProfileWidget />
      </AgentBridgeProvider>
    </>
  );
}
```

## Agent interaction

```js
// No key collision — both 'form' keys are namespaced by prefix
window.__AGENT__.state.get('checkout.form');
// ''

window.__AGENT__.state.get('profile.form');
// ''

// Discover all available state
window.__AGENT__.state.list();
// {
//   'checkout.form': { key: 'checkout.form', description: 'Checkout email field', ... },
//   'profile.form': { key: 'profile.form', description: 'Profile name field', ... },
// }

// Invoke scoped actions
await window.__AGENT__.actions.invoke('checkout.form.submit');
await window.__AGENT__.actions.invoke('profile.form.save');
```
