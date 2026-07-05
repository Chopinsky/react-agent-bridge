# Basic Usage — Counter

Source: [`examples/basic-usage.tsx`](/react-agent-bridge/blob/master/examples/basic-usage.tsx)

Demonstrates the core `useAgentState` + `useAgentAction` pattern with a counter.

## What it shows

- Registering state with `useAgentState('counter.value', 0)`
- Registering an action with `useAgentAction('counter.increment', handler)`
- Reading state and invoking actions from an automation client

## Code

```tsx
import { AgentBridgeProvider, useAgentState, useAgentAction } from 'react-agent-bridge';

function Counter() {
  const [count, setCount] = useAgentState('counter.value', 0, {
    description: 'Current counter value',
  });

  const { mutate: increment } = useAgentAction(
    'counter.increment',
    async () => {
      setCount((c) => c + 1);
    },
    { description: 'Increment the counter by 1' }
  );

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}

export function BasicUsageApp() {
  return (
    <AgentBridgeProvider appId="counter-app">
      <Counter />
    </AgentBridgeProvider>
  );
}
```

## Agent interaction

```js
// Read current count
window.__AGENT__.state.get('counter.value');  // 0

// Invoke increment
await window.__AGENT__.actions.invoke('counter.increment');

// Verify new value
window.__AGENT__.state.get('counter.value');  // 1

// Subscribe to changes
const unsub = window.__AGENT__.state.subscribe('counter.value', (val) => {
  console.log('Count changed to:', val);
});

// Discover available state and actions
window.__AGENT__.state.list();
// { 'counter.value': { key: 'counter.value', type: 'number', description: 'Current counter value', ... } }

window.__AGENT__.actions.list();
// { 'counter.increment': { name: 'counter.increment', description: 'Increment the counter by 1' } }
```
