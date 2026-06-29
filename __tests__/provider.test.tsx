import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { AgentBridgeProvider } from '../src/provider';
import { useAgentState } from '../src/hooks/useAgentState';
import { useAgentAction } from '../src/hooks/useAgentAction';
import { createAgentStore } from '../src/hooks/createAgentStore';
import { agentAtom, useAgentAtom } from '../src/hooks/agentAtom';
import { useAgentReducer } from '../src/hooks/useAgentReducer';
import { detachWindow } from '../src/global/attachWindow';

beforeEach(() => {
  detachWindow('__AGENT__');
});

describe('AgentBridgeProvider', () => {
  test('renders children and attaches window.__AGENT__', () => {
    render(
      <AgentBridgeProvider appId="test-app" enabled={true}>
        <div data-testid="child">hello</div>
      </AgentBridgeProvider>
    );
    expect(screen.getByTestId('child').textContent).toBe('hello');
    expect((globalThis as any).__AGENT__).toBeDefined();
    expect((globalThis as any).__AGENT__.meta.appId).toBe('test-app');
  });
});

describe('useAgentState', () => {
  test('registers state and exposes it on window.__AGENT__', () => {
    function TestComp() {
      const [val] = useAgentState('test.key', 'initial');
      return <div>{val}</div>;
    }
    render(
      <AgentBridgeProvider appId="test" enabled={true}>
        <TestComp />
      </AgentBridgeProvider>
    );
    expect((globalThis as any).__AGENT__.state.get('test.key')).toBe('initial');
  });

  test('setter updates React state and registry', () => {
    function TestComp() {
      const [val, setVal] = useAgentState('test.key', 'initial');
      return <button onClick={() => setVal('updated')}>{val}</button>;
    }
    render(
      <AgentBridgeProvider appId="test" enabled={true}>
        <TestComp />
      </AgentBridgeProvider>
    );
    act(() => { screen.getByRole('button').click(); });
    expect(screen.getByRole('button').textContent).toBe('updated');
    expect((globalThis as any).__AGENT__.state.get('test.key')).toBe('updated');
  });

  test('functional update works', () => {
    function TestComp() {
      const [count, setCount] = useAgentState('counter', 0);
      return <button onClick={() => setCount((c: number) => c + 1)}>{count}</button>;
    }
    render(
      <AgentBridgeProvider appId="test" enabled={true}>
        <TestComp />
      </AgentBridgeProvider>
    );
    act(() => { screen.getByRole('button').click(); });
    act(() => { screen.getByRole('button').click(); });
    expect(screen.getByRole('button').textContent).toBe('2');
  });

  test('unregisters key on unmount', () => {
    function TestComp() {
      useAgentState('temp.key', 'val');
      return <div />;
    }
    function App({ show }: { show: boolean }) {
      return (
        <AgentBridgeProvider appId="test" enabled={true}>
          {show && <TestComp />}
          <div data-testid="marker" />
        </AgentBridgeProvider>
      );
    }
    const { rerender } = render(<App show={true} />);
    expect((globalThis as any).__AGENT__.state.get('temp.key')).toBe('val');
    rerender(<App show={false} />);
    // TestComp unmounted, temp.key should be unregistered
    expect((globalThis as any).__AGENT__.state.get('temp.key')).toBeUndefined();
  });

  test('prefix option filters state keys by prefix', () => {
    function TestComp() {
      const [v] = useAgentState('included', 'yes', { prefix: 'test' });
      return <div>{v}</div>;
    }
    render(
      <AgentBridgeProvider appId="test" enabled={true} prefix="test">
        <TestComp />
      </AgentBridgeProvider>
    );
    // State key should be "test.included"
    expect((globalThis as any).__AGENT__.state.get('test.included')).toBe('yes');
    expect((globalThis as any).__AGENT__.state.get('included')).toBeUndefined();
  });
});

describe('useAgentAction', () => {
  test('registers action invocable from window.__AGENT__', async () => {
    function TestComp() {
      const { mutateAsync } = useAgentAction('test.action', async (input?: unknown) => {
        return { received: input };
      });
      return <button onClick={() => mutateAsync({ x: 1 })}>go</button>;
    }
    render(
      <AgentBridgeProvider appId="test" enabled={true}>
        <TestComp />
      </AgentBridgeProvider>
    );
    const result = await (globalThis as any).__AGENT__.actions.invoke('test.action', { x: 1 });
    expect(result.ok).toBe(true);
    expect(result.data.received).toEqual({ x: 1 });
  });

  test('mutate returns void, mutateAsync returns promise', async () => {
    let captured: any = null;
    function TestComp() {
      const { mutate, mutateAsync } = useAgentAction('test.action', async (input?: unknown) => {
        captured = input;
        return 'done';
      });
      return (
        <div>
          <button id="fn" onClick={() => mutate('fire')}>fire</button>
          <button id="fn-async" onClick={() => mutateAsync('async')}>async</button>
        </div>
      );
    }
    render(
      <AgentBridgeProvider appId="test" enabled={true}>
        <TestComp />
      </AgentBridgeProvider>
    );
    act(() => { screen.getByText('fire').click(); });
    expect(captured).toBe('fire');
  });

  test('action result is ActionResult shape', async () => {
    function TestComp() {
      const { mutateAsync } = useAgentAction('test.action', async () => 'ok');
      return <div />;
    }
    render(
      <AgentBridgeProvider appId="test" enabled={true}>
        <TestComp />
      </AgentBridgeProvider>
    );
    const result = await (globalThis as any).__AGENT__.actions.invoke('test.action');
    expect(result).toEqual({ ok: true, data: 'ok' });
  });
});

describe('useAgentReducer', () => {
  test('reducer state accessible via registry', () => {
    function reducer(state: number, action: string): number {
      return action === 'inc' ? state + 1 : state;
    }
    function TestComp() {
      const [count] = useAgentReducer('reducer.key', reducer, 0);
      return <div>{count}</div>;
    }
    render(
      <AgentBridgeProvider appId="test" enabled={true}>
        <TestComp />
      </AgentBridgeProvider>
    );
    expect((globalThis as any).__AGENT__.state.get('reducer.key')).toBe(0);
  });
});

describe('agentAtom + useAgentAtom', () => {
  test('atom state accessible via registry', () => {
    const myAtom = agentAtom('atom.key', 'atom-val', { description: 'test atom' });
    function TestComp() {
      const [val] = useAgentAtom(myAtom);
      return <div>{val}</div>;
    }
    render(
      <AgentBridgeProvider appId="test" enabled={true}>
        <TestComp />
      </AgentBridgeProvider>
    );
    expect((globalThis as any).__AGENT__.state.get('atom.key')).toBe('atom-val');
    expect((globalThis as any).__AGENT__.state.list()['atom.key'].description).toBe('test atom');
  });
});

describe('createAgentStore', () => {
  test('store registers keys under namespace prefix', () => {
    const store = createAgentStore('ns', { a: 1, b: 2 });
    function TestComp() {
      const a = store.use('a');
      const b = store.use('b');
      return <div>{a}{b}</div>;
    }
    render(
      <AgentBridgeProvider appId="test" enabled={true}>
        <TestComp />
      </AgentBridgeProvider>
    );
    expect((globalThis as any).__AGENT__.state.get('ns.a')).toBe(1);
    expect((globalThis as any).__AGENT__.state.get('ns.b')).toBe(2);
  });

  test('store.useSet returns setter that updates registry', () => {
    const store = createAgentStore('ns', { x: 10 });
    function TestComp() {
      const x = store.use('x');
      const setX = store.useSet('x');
      return <button onClick={() => setX(20)}>{x}</button>;
    }
    render(
      <AgentBridgeProvider appId="test" enabled={true}>
        <TestComp />
      </AgentBridgeProvider>
    );
    expect((globalThis as any).__AGENT__.state.get('ns.x')).toBe(10);
    act(() => { screen.getByRole('button').click(); });
    expect(screen.getByRole('button').textContent).toBe('20');
    expect((globalThis as any).__AGENT__.state.get('ns.x')).toBe(20);
  });

  test('store.getState and store.setState work outside React', () => {
    const store = createAgentStore('ns', { val: 'initial' });
    render(
      <AgentBridgeProvider appId="test" enabled={true}>
        <div />
      </AgentBridgeProvider>
    );
    expect(store.getState('val')).toBe('initial');
    store.setState('val', 'from-outside');
    expect(store.getState('val')).toBe('from-outside');
    expect((globalThis as any).__AGENT__.state.get('ns.val')).toBe('from-outside');
  });
});

describe('disabled mode', () => {
  test('hooks work as regular React when enabled is false', () => {
    function TestComp() {
      const [val, setVal] = useAgentState('disabled.key', 'default');
      return <button onClick={() => setVal('changed')}>{val}</button>;
    }
    render(
      <AgentBridgeProvider appId="test" enabled={false}>
        <TestComp />
      </AgentBridgeProvider>
    );
    expect((globalThis as any).__AGENT__?.state).toBeUndefined();
    act(() => { screen.getByRole('button').click(); });
    expect(screen.getByRole('button').textContent).toBe('changed');
  });
});
