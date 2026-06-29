import React from 'react';
import { AgentBridgeProvider, useAgentState, useAgentAction } from '../src/index';

/**
 * Basic counter — demonstrates useAgentState + useAgentAction.
 *
 * An automation client (Playwright, CDP, LLM agent) can:
 *   - Read state: window.__AGENT__.state.get('counter.value')  → 0
 *   - Invoke action: await window.__AGENT__.actions.invoke('counter.increment')
 *   - Subscribe to changes: window.__AGENT__.state.subscribe('counter.value', cb)
 */
function Counter() {
  const [count, setCount] = useAgentState('counter.value', 0, {
    description: 'Current counter value',
  });

  const { mutate: increment } = useAgentAction(
    'counter.increment',
    async () => {
      setCount((c: number) => c + 1);
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
