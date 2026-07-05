---
layout: home
title: Home
nav_order: 1
---

# react-agent-bridge

Thin React hooks that expose opt-in state and actions to CDP/automation clients via a schema-described registry at `window.__AGENT__`.

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

function App() {
  return (
    <AgentBridgeProvider appId="my-app">
      <Counter />
    </AgentBridgeProvider>
  );
}

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
const bridge = window.__AGENT__;
const snapshot = bridge.state.get();
const count = bridge.state.get('count');
const result = await bridge.actions.invoke('increment');
```

## Next Steps

- [Getting Started](/react-agent-bridge/getting-started) — full walkthrough
- [API Reference](/react-agent-bridge/api/) — all hooks, utilities, and types
- [Examples](/react-agent-bridge/examples/) — runnable code samples
- [Guides](/react-agent-bridge/guides/) — agent state reading, production config
