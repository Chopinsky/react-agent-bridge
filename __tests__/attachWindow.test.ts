import { attachWindow, detachWindow } from '../src/global/attachWindow';
import { createRegistry } from '../src/core/registry';

describe('attachWindow', () => {
  beforeEach(() => {
    delete (globalThis as any).__AGENT__;
  });

  test('attaches agent bridge to window.__AGENT__', () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    attachWindow('__AGENT__', 'test', registry);
    expect((globalThis as any).__AGENT__).toBeDefined();
    expect((globalThis as any).__AGENT__.meta.appId).toBe('test');
  });

  test('state.get returns full snapshot when called with no args', () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    registry.registerStateEntry('foo', 1, { serializable: true });
    registry.registerStateEntry('bar', 'hello', { serializable: true });
    attachWindow('__AGENT__', 'test', registry);
    const snapshot = (globalThis as any).__AGENT__.state.get();
    expect(snapshot).toEqual({ foo: 1, bar: 'hello' });
  });

  test('state.get with path returns single key', () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    registry.registerStateEntry('user.name', 'Alice', { serializable: true });
    attachWindow('__AGENT__', 'test', registry);
    expect((globalThis as any).__AGENT__.state.get('user.name')).toBe('Alice');
  });

  test('state.getState is alias for get', () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    registry.registerStateEntry('x', 42, { serializable: true });
    attachWindow('__AGENT__', 'test', registry);
    expect((globalThis as any).__AGENT__.state.getState('x')).toBe(42);
  });

  test('state.list returns descriptors', () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    registry.registerStateEntry('k', 'v', { serializable: true, description: 'test key' });
    attachWindow('__AGENT__', 'test', registry);
    const descs = (globalThis as any).__AGENT__.state.list();
    expect(descs['k'].description).toBe('test key');
  });

  test('state.subscribe delegates to registry subscribe', () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    registry.registerStateEntry('k', 0, { serializable: true });
    attachWindow('__AGENT__', 'test', registry);
    const received: number[] = [];
    const unsub = (globalThis as any).__AGENT__.state.subscribe('k', (v: unknown) => received.push(v as number));
    registry.updateStateValue('k', 10);
    registry.updateStateValue('k', 20);
    unsub();
    registry.updateStateValue('k', 30);
    expect(received).toEqual([10, 20]);
  });

  test('actions.invoke calls registry.invokeAction and returns promise', async () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    registry.registerActionEntry('test', async (input) => ({ doubled: (input as any).x * 2 }), {});
    attachWindow('__AGENT__', 'test', registry);
    const result = await (globalThis as any).__AGENT__.actions.invoke('test', { x: 5 });
    expect(result.ok).toBe(true);
    expect(result.data.doubled).toBe(10);
  });

  test('actions.mutate alias works', async () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    registry.registerActionEntry('test', async () => 'ok', {});
    attachWindow('__AGENT__', 'test', registry);
    const result = await (globalThis as any).__AGENT__.actions.mutate('test');
    expect(result.ok).toBe(true);
  });

  test('actions.dispatch alias works', async () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    registry.registerActionEntry('test', async (input) => input, {});
    attachWindow('__AGENT__', 'test', registry);
    const result = await (globalThis as any).__AGENT__.actions.dispatch({ type: 'test', payload: { x: 1 } });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ x: 1 });
  });

  test('actions.send alias works', async () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    registry.registerActionEntry('test', async (input) => input, {});
    attachWindow('__AGENT__', 'test', registry);
    const result = await (globalThis as any).__AGENT__.actions.send({ type: 'test', x: 1, y: 2 });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ x: 1, y: 2 });
  });

  test('actions.list returns action descriptors', () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    registry.registerActionEntry('a1', async () => null, { description: 'first' });
    attachWindow('__AGENT__', 'test', registry);
    const list = (globalThis as any).__AGENT__.actions.list();
    expect(list['a1'].description).toBe('first');
  });

  test('meta exposes appId, env, enabled', () => {
    const registry = createRegistry({
      appId: 'my-app', enabled: true, env: 'production',
      production: { enabled: true, token: 'tok' },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    attachWindow('__AGENT__', 'my-app', registry);
    const meta = (globalThis as any).__AGENT__.meta;
    expect(meta.appId).toBe('my-app');
    expect(meta.env).toBe('production');
    expect(meta.enabled).toBe(true);
  });

  test('version is set', () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    attachWindow('__AGENT__', '0.1.0', registry);
    expect((globalThis as any).__AGENT__.version).toBe('0.1.0');
  });

  test('detachWindow removes window.__AGENT__', () => {
    const registry = createRegistry({
      appId: 'test', enabled: true, env: 'development',
      production: { enabled: false },
      devtools: { attachTo: '__AGENT__', debounceMs: 0 },
    });
    attachWindow('__AGENT__', 'test', registry);
    expect((globalThis as any).__AGENT__).toBeDefined();
    detachWindow('__AGENT__');
    expect((globalThis as any).__AGENT__).toBeUndefined();
  });
});
