# useAgentReducer

A `useReducer`-style hook that syncs reducer state to the agent bridge.

## Import

```tsx
import { useAgentReducer } from 'react-agent-bridge';
```

## Signature

```ts
function useAgentReducer<S, A>(
  key: string,
  reducer: (state: S, action: A) => S,
  initial: S | (() => S),
  options?: AgentStateOptions
): [S, React.Dispatch<A>]
```

## Options

Same as `useAgentState`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `description` | `string` | — | Human-readable description |
| `schema` | `Record<string, unknown>` | — | JSON Schema |
| `serializable` | `boolean` | `true` | Include in snapshots |
| `redact` | `boolean` | `false` | Redact in snapshots |

## Example

```tsx
type AuthState = { user: string | null; loading: boolean; error: string | null };
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: string }
  | { type: 'LOGIN_FAILURE'; error: string }
  | { type: 'LOGOUT' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { user: action.user, loading: false, error: null };
    case 'LOGIN_FAILURE':
      return { ...state, loading: false, error: action.error };
    case 'LOGOUT':
      return { user: null, loading: false, error: null };
  }
}

function LoginForm() {
  const [auth, dispatch] = useAgentReducer('auth', authReducer, {
    user: null,
    loading: false,
    error: null,
  }, {
    description: 'Authentication state machine',
  });

  const login = async () => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const user = await api.login();
      dispatch({ type: 'LOGIN_SUCCESS', user });
    } catch (err) {
      dispatch({ type: 'LOGIN_FAILURE', error: err.message });
    }
  };

  // ...
}
```

```js
// Agent observes state transitions:
window.__AGENT__.state.get('auth');
// { user: null, loading: true, error: null }

// After success:
// { user: 'alice', loading: false, error: null }
```

## How it works

1. Uses React's `useReducer` internally for the state machine logic.
2. On mount, registers the initial value in the registry.
3. On every render where state changes, calls `ctx.updateStateValue(key, state)` to sync the latest reducer state.
4. On unmount, unregisters the entry.
