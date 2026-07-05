# react-agent-bridge

Thin React hooks that expose opt-in state and actions to CDP/automation clients via a schema-described registry at `window.__AGENT__`.

---

## Why?

DOM scraping is token-inefficient, brittle, and blind. `react-agent-bridge` solves with a structured registry:

| Approach | Token Cost | Reliable | Discoverable | Reactive |
|----------|-----------|----------|--------------|----------|
| DOM scrape | 2000–10000 | Brittle | Blind | No |
| `state.get('key')` | ~10 | Typed | Schema | Yes |
| `actions.invoke('name', payload)` | ~20 | Error-handled | Schema | N/A |

## Quick Start

```bash
npm install react-agent-bridge
```

```tsx
import { AgentBridgeProvider, useAgentState, useAgentAction } from 'react-agent-bridge';

// 1. Wrap your app
function App() {
  return (
    <AgentBridgeProvider appId="my-app">
      <Counter />
    </AgentBridgeProvider>
  );
}

// 2. Use hooks to expose state & actions
function Counter() {
  const [count, setCount] = useAgentState('count', 0, {
    description: 'Current counter value',
  });

  useAgentAction('increment', () => {
    setCount((c) => c + 1);
  }, { description: 'Increment the counter' });

  return <div>{count}</div>;
}
```

```js
// 3. Agent reads state & invokes actions
const bridge = window.__AGENT__;

const snapshot = bridge.state.get();          // { count: 0 }
const count = bridge.state.get('count');      // 0
const result = await bridge.actions.invoke('increment');
```

## Documentation

- [Getting Started](/react-agent-bridge/getting-started)
- API Reference
  - [AgentBridgeProvider](/react-agent-bridge/api/provider)
  - [useAgentState](/react-agent-bridge/api/use-agent-state)
  - [useAgentAction](/react-agent-bridge/api/use-agent-action)
  - [useAgentReducer](/react-agent-bridge/api/use-agent-reducer)
  - [useAgentAtom](/react-agent-bridge/api/use-agent-atom)
  - [createAgentStore](/react-agent-bridge/api/create-agent-store)
  - [defineAgentAction](/react-agent-bridge/api/define-agent-action)
  - [AgentActionError](/react-agent-bridge/api/agent-action-error)
  - [window.__AGENT__ Surface](/react-agent-bridge/api/window-agent)
  - [Type Reference](/react-agent-bridge/api/types)
- Examples
  - [Basic Counter](/react-agent-bridge/examples/basic-usage)
  - [Checkout Form](/react-agent-bridge/examples/checkout-form)
  - [Auth Flow](/react-agent-bridge/examples/auth-flow)
  - [Module Store](/react-agent-bridge/examples/store-usage)
  - [Production Setup](/react-agent-bridge/examples/production-setup)
  - [Micro-Frontend](/react-agent-bridge/examples/micro-frontend)
- Guides
  - [How Agents Read State](/react-agent-bridge/guides/agent-reads-state)
  - [Production Configuration](/react-agent-bridge/guides/production-config)
