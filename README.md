# react-agent-bridge

**Thin React hooks that expose opt-in state and actions to CDP/automation clients via a schema-described registry at `window.__AGENT__`.**

---

## Why?

Automation clients — LLM browser agents, Playwright scripts, CDP consumers — interact with SPAs through the DOM. This is:

- **Token-inefficient.** An agent must parse hundreds of lines of HTML to extract a few values.
- **Brittle.** CSS selectors and DOM structure change more often than business logic.
- **Blind.** The agent cannot discover available operations or state shape without scraping.

`react-agent-bridge` solves this by exposing a **structured, schema-described registry** at `window.__AGENT__`. Agents read state and invoke business-logic actions in one call — no DOM scraping, no selector maintenance, no wasted tokens.

| Approach | Token cost | Reliable | Discoverable |
|----------|-----------|----------|--------------|
| DOM scraping (innerText, selectors) | High (parse entire DOM) | Brittle (CSS changes) | No |
| `window.__AGENT__.state.get('key')` | 1 call, ~50 chars | Yes (API contract) | Yes (schemas + list) |
| `await window.__AGENT__.actions.mutate('name', payload)` | 1 call, ~80 chars | Yes (business logic preserved) | Yes (descriptors) |

---

## How it works

```tsx
import { AgentBridgeProvider, useAgentState, useAgentAction } from 'react-agent-bridge';

function Counter() {
  const [count, setCount] = useAgentState('counter.value', 0, {
    description: 'Current counter value',
  });

  const { mutate: increment } = useAgentAction(
    'counter.increment',
    async () => { setCount((c) => c + 1); },
    { description: 'Increment the counter by 1' }
  );

  return <button onClick={increment}>{count}</button>;
}

function App() {
  return (
    <AgentBridgeProvider appId="my-app">
      <Counter />
    </AgentBridgeProvider>
  );
}
```

From the browser console or an LLM agent:

```javascript
// Read state — 1 call, no DOM parsing
window.__AGENT__.state.get('counter.value')       // → 0
window.__AGENT__.state.list()                     // → { 'counter.value': { type: 'number', ... }, ... }

// Invoke action — business logic runs untouched
await window.__AGENT__.actions.invoke('counter.increment')
// → { ok: true, data: null }

// Subscribe to changes
window.__AGENT__.state.subscribe('counter.value', console.log)
```

---

## Features

### 🧠 Agent-friendly
- **Read state** with `state.get('path.to.key')` or snapshot with `state.get()`
- **Invoke actions** via `actions.invoke`, `actions.mutate`, `actions.dispatch`, or `actions.send`
- **Discover** available state and actions with `state.list()` and `actions.list()`
- **Subscribe** to state changes with `state.subscribe('key', cb)`
- **Schema-described** — JSON Schema descriptors tell agents the shape and valid values

### 🔒 Production-safe
- **Disabled by default** in production — explicit opt-in required
- **Token auth** — optional bearer token for action invocations in production
- **Allowlist** — restrict which state keys and actions are exposed
- **No mutation from the agent surface** — state reads only; all mutations go through registered actions

### 🪝 Familiar API
- `useAgentState` — drop-in replacement for `useState` with registry key
- `useAgentAction` — register invocable actions (TanStack Query `useMutation`-aligned)
- `useAgentReducer` — register reducer-managed state
- `agentAtom` + `useAgentAtom` — Jotai-aligned atomic state
- `createAgentStore` — Zustand-aligned module-level store
- `useAgentStateValue` / `useSetAgentState` — read/write split hooks

---

## Installation

```bash
npm install react-agent-bridge
```

Peer dependencies: `react >= 18`, `react-dom >= 18`.

---

## Quick Start

```tsx
import { AgentBridgeProvider, useAgentState, useAgentAction } from 'react-agent-bridge';

// 1. Wrap your app
<AgentBridgeProvider appId="my-app">
  <YourApp />
</AgentBridgeProvider>

// 2. Replace useState with useAgentState
const [form, setForm] = useAgentState('checkout.form', { email: '' }, {
  description: 'Checkout form data',
});

// 3. Register actions
const { mutate: submit } = useAgentAction('checkout.submit', async (input) => {
  // your business logic
  return api.submit(input);
});
```

---

## API Surface (`window.__AGENT__`)

### State (read-only)

| Method | Description |
|--------|-------------|
| `state.get()` | Full state snapshot |
| `state.get('path.key')` | Single key value |
| `state.getState('path.key')` | Alias for `get` |
| `state.list()` | All state descriptors |
| `state.subscribe('key', cb)` | Listen to changes |

### Actions

| Method | Description |
|--------|-------------|
| `actions.invoke('name', input, opts?)` | Canonical invocation |
| `actions.mutate('name', input, opts?)` | TanStack Query alias |
| `actions.dispatch({ type, payload }, opts?)` | Redux alias |
| `actions.send({ type, ...payload }, opts?)` | XState alias |
| `actions.list()` | All action descriptors |

---

## Token Efficiency for Agents

Without `react-agent-bridge`, an LLM agent wanting to know the current checkout state must:

1. **Fetch the DOM** — thousands of characters of HTML
2. **Find the relevant element** — parse selectors, navigate the tree
3. **Extract text content** — innerText, value attributes
4. **Parse and interpret** — convert strings to structured data

That's **2,000–10,000+ tokens** for a single value.

With `react-agent-bridge`:

```
window.__AGENT__.state.get('checkout.form')
```

That's **~50 characters** — roughly **10–20 tokens**. A 99% reduction.

For action invocation, instead of:
1. Find the submit button via selector
2. Click it
3. Wait for navigation
4. Verify by scraping again

You do:

```
await window.__AGENT__.actions.invoke('checkout.submit', { email, items })
```

**~80 characters** — ~20 tokens. And you get a structured `ActionResult` back.

---

## Production Configuration

```tsx
<AgentBridgeProvider
  appId="my-app"
  production={{
    enabled: true,                              // enable in production
    token: process.env.AGENT_BRIDGE_TOKEN,      // optional bearer token
    allowlist: {
      states: ['checkout.form', 'auth.status'], // exposed state keys
      actions: ['checkout.submit'],             // invocable actions
    },
  }}
>
```

---

## Examples

See [`examples/`](./examples/) for runnable scenarios:

| Example | Demonstrates |
|---------|-------------|
| `basic-usage.tsx` | useAgentState + useAgentAction counter |
| `checkout-form.tsx` | Form state with schema + action-driven submission |
| `auth-flow.tsx` | useAgentReducer state machine + login/logout actions |
| `store-usage.tsx` | createAgentStore for module-level shared state |
| `production-setup.tsx` | Token auth + allowlist in production |
| `micro-frontend.tsx` | Namespaced prefixes per sub-app |

---

## License

MIT
