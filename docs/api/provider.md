# AgentBridgeProvider

The root provider component. Wraps your React app, creates the internal state/action registry, and attaches `window.__AGENT__` to the global scope for CDP/automation agents.

## Import

```tsx
import { AgentBridgeProvider } from 'react-agent-bridge';
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appId` | `string` | — | Unique identifier for your application |
| `enabled` | `boolean` | `true` | Master switch; when `false`, no bridge is attached |
| `prefix` | `string` | — | Optional namespace prefix for all state/action keys (use with micro-frontends) |
| `production` | `ProductionConfig` | `{}` | Production-mode settings |
| `devtools` | `DevtoolsConfig` | `{}` | Devtools configuration |
| `registerActions` | `DefinedAgentAction[]` | — | Pre-defined actions to register on mount |
| `children` | `ReactNode` | — | App content |

### ProductionConfig

```ts
interface ProductionConfig {
  enabled?: boolean;     // Allow bridge in production (default: false)
  token?: string;        // Bearer token required for all action invocations
  allowlist?: {
    states?: string[];   // State keys allowed in production (empty = none, omit = all)
    actions?: string[];  // Action names allowed in production
  };
}
```

### DevtoolsConfig

```ts
interface DevtoolsConfig {
  attachTo?: string;  // Global property name (default: '__AGENT__')
  debounceMs?: number; // Notification debounce in ms (default: 0)
}
```

## Usage

### Basic

```tsx
<AgentBridgeProvider appId="my-store">
  <App />
</AgentBridgeProvider>
```

### Production-safe

```tsx
{% raw %}
<AgentBridgeProvider
  appId="my-store"
  production={{
    enabled: true,
    token: 'Bearer sk-prod-abc123',
    allowlist: {
      states: ['cart.items', 'user.name'],
      actions: ['addToCart', 'checkout'],
    },
  }}
>
  <App />
</AgentBridgeProvider>
{% endraw %}
```

### With pre-defined actions

```tsx
const addToCart = defineAgentAction('addToCart', async (input) => {
  // ...
}, { description: 'Add item to cart' });

<AgentBridgeProvider appId="my-store" registerActions={[addToCart]}>
  <App />
</AgentBridgeProvider>
```

### Micro-frontend with prefix

```tsx
<AgentBridgeProvider appId="checkout-app" prefix="checkout">
  <CheckoutForm />
</AgentBridgeProvider>
```
