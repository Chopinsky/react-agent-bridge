# Production Configuration

Guidelines for safely deploying `react-agent-bridge` in production environments.

## The default: disabled in production

```tsx
<AgentBridgeProvider appId="my-app">
```

By default, the bridge is **disabled when `NODE_ENV === 'production'`**. The provider detects the environment and skips attaching `window.__AGENT__`.

## Enabling in production

```tsx
<AgentBridgeProvider
  appId="my-app"
  production={{
    enabled: true,
  }}
>
```

This enables the bridge in all environments. Use in combination with the security options below.

## Token authentication

Require a bearer token for all action invocations:

```tsx
<AgentBridgeProvider
  appId="payment-app"
  production={{
    enabled: true,
    token: process.env.REACT_APP_AGENT_BRIDGE_TOKEN,
  }}
>
```

Agents must provide the token:

```js
await window.__AGENT__.actions.invoke('payment.process', { amount: 100 }, {
  token: 'the-secret-token',
});
```

Requests without the token receive:

```json
{ "ok": false, "error": { "code": "UNAUTHORIZED", "message": "Invalid or missing token" } }
```

Note: **Reading state does not require a token.** If you need to restrict read access, consider network-level controls (e.g., same-origin policy, CSP).

## Allowlist

Restrict which state keys and actions are exposed:

```tsx
<AgentBridgeProvider
  appId="my-app"
  production={{
    enabled: true,
    token: process.env.REACT_APP_AGENT_BRIDGE_TOKEN,
    allowlist: {
      states: ['payment.balance', 'order.status'],
      actions: ['payment.process', 'order.cancel'],
    },
  }}
>
```

**Allowlist rules:**
- **`states: ['key1', 'key2']`** — Only these state keys will be registered. Components attempting to register other keys will silently fail.
- **`states: []`** — No state keys are exposed (empty array). State hook calls will have no effect.
- **`states: undefined`** or **omit** — All state keys are allowed.
- **`actions: ['action1']`** — Same logic as states.
- **`actions: []`** — No actions can be registered.
- **`actions: undefined`** or **omit** — All actions are allowed.

## Conditional enabling

Control the bridge via environment variables:

```tsx
<AgentBridgeProvider
  appId="my-app"
  enabled={process.env.REACT_APP_AGENT_BRIDGE === 'true'}
  production={{
    enabled: process.env.REACT_APP_AGENT_BRIDGE === 'true',
    token: process.env.REACT_APP_AGENT_BRIDGE_TOKEN,
  }}
>
```

This lets you toggle the bridge without redeploying.

## State redaction

Mark sensitive state as redacted — it will appear as `'[REDACTED]'` in snapshots but remains accessible by direct key lookup:

```tsx
const [ssn] = useAgentState('user.ssn', '', { redact: true });
```

```js
window.__AGENT__.state.get();
// { 'user.ssn': '[REDACTED]', 'user.name': 'Alice' }

window.__AGENT__.state.get('user.ssn');
// '123-45-6789'  (still accessible with known key)
```

## Non-serializable state

Mark state as non-serializable to exclude it from snapshots entirely:

```tsx
const [ref] = useAgentState('internal.ref', someClassInstance, {
  serializable: false,
});
```

```js
window.__AGENT__.state.get();
// { 'user.name': 'Alice' }  — 'internal.ref' excluded
```

## Network-level security

Since `window.__AGENT__` is a client-side JavaScript object, consider:

- **CSP headers** — Restrict which scripts can access `window.__AGENT__`
- **Same-origin policy** — The bridge is only accessible to scripts running on the same origin
- **Token rotation** — Rotate the bearer token periodically
- **Audit logging** — Log all action invocations server-side
