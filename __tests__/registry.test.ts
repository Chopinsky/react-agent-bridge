import { createRegistry } from '../src/core/registry';

describe('Registry', () => {
  const baseConfig: import('../src/core/types').AgentBridgeConfig = {
    appId: 'test',
    enabled: true,
    env: 'development',
    production: { enabled: false },
    devtools: { attachTo: '__AGENT__', debounceMs: 0 },
  };

  test('registerStateEntry stores a state value and descriptor', () => {
    const registry = createRegistry(baseConfig);
    registry.registerStateEntry('test.key', 'initial', { serializable: true });
    expect(registry.getStateValue('test.key')).toBe('initial');
    const desc = registry.getStateDescriptor('test.key');
    expect(desc).toBeDefined();
    expect(desc!.key).toBe('test.key');
    expect(desc!.version).toBe(1);
  });

  test('registerStateEntry increments version on update', () => {
    const registry = createRegistry(baseConfig);
    registry.registerStateEntry('test.key', 'v1', { serializable: true });
    registry.updateStateValue('test.key', 'v2');
    expect(registry.getStateValue('test.key')).toBe('v2');
    expect(registry.getStateDescriptor('test.key')!.version).toBe(2);
  });

  test('unregisterStateEntry removes entry and returns true', () => {
    const registry = createRegistry(baseConfig);
    registry.registerStateEntry('test.key', 'val', { serializable: true });
    const removed = registry.unregisterStateEntry('test.key');
    expect(removed).toBe(true);
    expect(registry.getStateDescriptor('test.key')).toBeUndefined();
  });

  test('unregisterStateEntry on missing key returns false', () => {
    const registry = createRegistry(baseConfig);
    expect(registry.unregisterStateEntry('nonexistent')).toBe(false);
  });

  test('registerStateEntry uses ref-counting for StrictMode safety', () => {
    const registry = createRegistry(baseConfig);
    const ref1 = registry.registerStateEntry('test.key', 'val', { serializable: true });
    const ref2 = registry.registerStateEntry('test.key', 'val', { serializable: true });
    expect(ref1).toBe(1);
    expect(ref2).toBe(2);
    registry.unregisterStateEntry('test.key');
    expect(registry.getStateDescriptor('test.key')).toBeDefined();
    registry.unregisterStateEntry('test.key');
    expect(registry.getStateDescriptor('test.key')).toBeUndefined();
  });

  test('getSnapshot returns all state key-value pairs', () => {
    const registry = createRegistry(baseConfig);
    registry.registerStateEntry('a', 1, { serializable: true });
    registry.registerStateEntry('b', 2, { serializable: true });
    expect(registry.getSnapshot()).toEqual({ a: 1, b: 2 });
  });

  test('getAllDescriptors returns descriptors keyed by path', () => {
    const registry = createRegistry(baseConfig);
    registry.registerStateEntry('a', 1, { serializable: true, description: 'first' });
    const descs = registry.getAllDescriptors();
    expect(descs['a'].description).toBe('first');
  });

  test('registerActionEntry stores and lists action', () => {
    const registry = createRegistry(baseConfig);
    const handler = async () => ({ ok: true } as const);
    registry.registerActionEntry('test.action', handler, { idempotent: false });
    const listed = registry.getActionDescriptor('test.action');
    expect(listed).toBeDefined();
    expect(listed!.name).toBe('test.action');
  });

  test('unregisterActionEntry removes action', () => {
    const registry = createRegistry(baseConfig);
    registry.registerActionEntry('a', async () => ({ ok: true }), {});
    expect(registry.unregisterActionEntry('a')).toBe(true);
    expect(registry.getActionDescriptor('a')).toBeUndefined();
  });

  test('invokeAction calls handler and returns ActionResult', async () => {
    const registry = createRegistry(baseConfig);
    const handler = async (input: unknown) => ({ result: (input as any).x * 2 });
    registry.registerActionEntry('math.double', handler, {});
    const result = await registry.invokeAction('math.double', { x: 5 });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ result: 10 });
  });

  test('invokeAction on unknown name returns NOT_FOUND error', async () => {
    const registry = createRegistry(baseConfig);
    const result = await registry.invokeAction('missing');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('NOT_FOUND');
  });

  test('invokeAction passes ActionContext with signal and dryRun', async () => {
    const registry = createRegistry(baseConfig);
    let capturedCtx: import('../src/core/types').ActionContext | null = null;
    registry.registerActionEntry('test', async (_input: unknown, ctx: import('../src/core/types').ActionContext) => {
      capturedCtx = ctx;
      return null;
    }, {});
    await registry.invokeAction('test', {}, { dryRun: true });
    expect(capturedCtx).toBeDefined();
    expect(capturedCtx!.dryRun).toBe(true);
    expect(capturedCtx!.signal).toBeInstanceOf(AbortSignal);
  });

  test('subscribe returns unsubscribe function that stops notifications', () => {
    const registry = createRegistry(baseConfig);
    registry.registerStateEntry('k', 1, { serializable: true });
    const received: number[] = [];
    const unsub = registry.subscribe('k', (v: unknown) => received.push(v as number));
    registry.updateStateValue('k', 2);
    registry.updateStateValue('k', 3);
    unsub();
    registry.updateStateValue('k', 4);
    expect(received).toEqual([2, 3]);
  });

  test('subscribe wildcard fires on any state change', () => {
    const registry = createRegistry(baseConfig);
    registry.registerStateEntry('a', 1, { serializable: true });
    registry.registerStateEntry('b', 2, { serializable: true });
    const keys: string[] = [];
    const unsub = registry.subscribe('*', (value: unknown, key?: string) => keys.push(key as string));
    registry.updateStateValue('a', 10);
    registry.updateStateValue('b', 20);
    unsub();
    expect(keys).toEqual(['a', 'b']);
  });

  test('registerStateEntry respects allowlist — excluded key not registered', () => {
    const config = {
      ...baseConfig,
      production: { enabled: true, token: 'tok', allowlist: { states: ['allowed.key'] } },
    };
    const registry = createRegistry(config);
    registry.registerStateEntry('blocked.key', 'val', { serializable: true });
    expect(registry.getStateDescriptor('blocked.key')).toBeUndefined();
    registry.registerStateEntry('allowed.key', 'val', { serializable: true });
    expect(registry.getStateDescriptor('allowed.key')).toBeDefined();
  });

  test('registerActionEntry respects allowlist — excluded action not registered', () => {
    const config = {
      ...baseConfig,
      production: { enabled: true, token: 'tok', allowlist: { actions: ['allowed.action'] } },
    };
    const registry = createRegistry(config);
    registry.registerActionEntry('blocked.action', async () => ({ ok: true }), {});
    expect(registry.getActionDescriptor('blocked.action')).toBeUndefined();
    registry.registerActionEntry('allowed.action', async () => ({ ok: true }), {});
    expect(registry.getActionDescriptor('allowed.action')).toBeDefined();
  });

  test('invokeAction checks token when production.token is set', async () => {
    const config = {
      ...baseConfig,
      production: { enabled: true, token: 'secret123' },
    };
    const registry = createRegistry(config);
    registry.registerActionEntry('test', async () => ({ result: 'ok' }), {});
    const noToken = await registry.invokeAction('test', {}, {});
    expect(noToken.ok).toBe(false);
    expect(noToken.error?.code).toBe('UNAUTHORIZED');
    const withToken = await registry.invokeAction('test', {}, { token: 'secret123' });
    expect(withToken.ok).toBe(true);
  });

  test('invokeAction denies when disabled', async () => {
    const config = { ...baseConfig, enabled: false };
    const registry = createRegistry(config);
    registry.registerActionEntry('test', async () => ({ result: 'ok' }), {});
    const result = await registry.invokeAction('test');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('DISABLED');
  });

  test('invokeAction denies when in production but production.enabled is false', async () => {
    // Simulate production env — enabled but production.enabled is false
    const config = {
      ...baseConfig,
      enabled: true,
      env: 'production' as const,
    };
    const registry = createRegistry(config);
    registry.registerActionEntry('test', async () => ({ result: 'ok' }), {});
    const result = await registry.invokeAction('test');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('DISABLED');
  });

  test('listAllActions returns all action descriptors', () => {
    const registry = createRegistry(baseConfig);
    registry.registerActionEntry('a1', async () => ({ ok: true }), { description: 'alpha' });
    registry.registerActionEntry('b2', async () => ({ ok: true }), { description: 'beta' });
    const list = registry.listAllActions();
    expect(list['a1'].description).toBe('alpha');
    expect(list['b2'].description).toBe('beta');
  });
});
