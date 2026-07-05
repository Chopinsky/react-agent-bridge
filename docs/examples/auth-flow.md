---
title: Auth Flow
parent: Examples
nav_order: 3
---

# Auth Flow

Source: [`examples/auth-flow.tsx`](/react-agent-bridge/blob/master/examples/auth-flow.tsx)

Demonstrates `useAgentReducer` with a state machine pattern and action-driven mutations.

## What it shows

- `useAgentReducer` for state machine logic
- Action-registered login/logout operations
- Agent can observe state transitions and wait for specific states

## Code

```tsx
import { AgentBridgeProvider, useAgentReducer, useAgentAction } from 'react-agent-bridge';

type AuthState = { status: 'logged_out' | 'loading' | 'authenticated'; user?: string };
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: string }
  | { type: 'LOGIN_FAIL' }
  | { type: 'LOGOUT' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START': return { ...state, status: 'loading' };
    case 'LOGIN_SUCCESS': return { status: 'authenticated', user: action.user };
    case 'LOGIN_FAIL': return { status: 'logged_out' };
    case 'LOGOUT': return { status: 'logged_out' };
    default: return state;
  }
}

function AuthFlow() {
  const [auth, dispatch] = useAgentReducer('auth', authReducer, { status: 'logged_out' }, {
    description: 'Authentication state machine',
  });

  const { mutateAsync: login } = useAgentAction(
    'auth.login',
    async (input) => {
      dispatch({ type: 'LOGIN_START' });
      try {
        await new Promise((r) => setTimeout(r, 200));
        dispatch({ type: 'LOGIN_SUCCESS', user: input?.email ?? 'unknown' });
        return { user: input?.email };
      } catch {
        dispatch({ type: 'LOGIN_FAIL' });
        throw new Error('Login failed');
      }
    },
    { description: 'Authenticate user with email and password' }
  );

  const { mutateAsync: logout } = useAgentAction(
    'auth.logout',
    async () => {
      dispatch({ type: 'LOGOUT' });
    },
    { description: 'Log out current user' }
  );

  return (
    <div>
      <p>Status: {auth.status}</p>
      {auth.status === 'authenticated' && <p>User: {auth.user}</p>}
      {auth.status === 'logged_out' && (
        <button onClick={() => login({ email: 'alice@example.com', password: 'secret' })}>
          Login
        </button>
      )}
      {auth.status === 'authenticated' && (
        <button onClick={() => logout()}>Logout</button>
      )}
    </div>
  );
}

export function AuthApp() {
  return (
    <AgentBridgeProvider appId="auth-app">
      <AuthFlow />
    </AgentBridgeProvider>
  );
}
```

## Agent interaction

```js
// Read auth state
window.__AGENT__.state.get('auth');
// { status: 'logged_out' }

// Login
await window.__AGENT__.actions.invoke('auth.login', {
  email: 'alice@example.com',
  password: 'secret',
});

// Read updated state
window.__AGENT__.state.get('auth');
// { status: 'authenticated', user: 'alice@example.com' }

// Async wait for a specific state
await new Promise((resolve) => {
  const unsub = window.__AGENT__.state.subscribe('auth', (state) => {
    if (state.status === 'authenticated') {
      unsub();
      resolve();
    }
  });
});

// Invoke logout
await window.__AGENT__.actions.invoke('auth.logout');
```
