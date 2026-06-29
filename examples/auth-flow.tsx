import React from 'react';
import { AgentBridgeProvider, useAgentReducer, useAgentState, useAgentAction } from '../src/index';

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

/**
 * Auth flow — demonstrates useAgentReducer with action-driven mutations.
 *
 * An automation client can:
 *   - Read auth status: window.__AGENT__.state.get('auth.status')
 *   - Read user info: window.__AGENT__.state.get('auth.status')
 *   - Login: await window.__AGENT__.actions.invoke('auth.login', { email, password })
 *   - Wait for authenticated: await new Promise(r => {
 *       const unsub = __AGENT__.state.subscribe('auth.status', s => {
 *         if (s === 'authenticated') { unsub(); r(); }
 *       });
 *     });
 */
function AuthFlow() {
  const [auth, dispatch] = useAgentReducer('auth', authReducer, { status: 'logged_out' }, {
    description: 'Authentication state machine',
  });

  const { mutateAsync: login } = useAgentAction(
    'auth.login',
    async (input?: { email: string; password: string }) => {
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
