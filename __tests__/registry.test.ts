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

  test('invokeAction validates input against schema and rejects invalid', async () => {
    const registry = createRegistry(baseConfig);
    registry.registerActionEntry('validated', async (input) => input, {
      inputSchema: { type: 'object', required: ['name'] },
    });
    const valid = await registry.invokeAction('validated', { name: 'Alice' });
    expect(valid.ok).toBe(true);
    const invalid = await registry.invokeAction('validated', { age: 30 });
    expect(invalid.ok).toBe(false);
    expect(invalid.error?.code).toBe('VALIDATION');
  });

  test('getSnapshot returns [REDACTED] for redacted entries', () => {
    const registry = createRegistry(baseConfig);
    registry.registerStateEntry('public', 'visible', { serializable: true });
    registry.registerStateEntry('secret', 'hidden', { serializable: true, redact: true });
    const snapshot = registry.getSnapshot();
    expect(snapshot.public).toBe('visible');
    expect(snapshot.secret).toBe('[REDACTED]');
  });

  test('getSnapshot excludes non-serializable entries', () => {
    const registry = createRegistry(baseConfig);
    registry.registerStateEntry('serial', 'ok', { serializable: true });
    registry.registerStateEntry('nonserial', 'skip', { serializable: false });
    const snapshot = registry.getSnapshot();
    expect(snapshot.serial).toBe('ok');
    expect(snapshot.nonserial).toBeUndefined();
  });

  test('empty allowlist denies all entries', () => {
    const config = {
      ...baseConfig,
      production: { enabled: true, token: 'tok', allowlist: { states: [], actions: [] } },
    };
    const registry = createRegistry(config);
    registry.registerStateEntry('any.key', 'val', { serializable: true });
    expect(registry.getStateDescriptor('any.key')).toBeUndefined();
    registry.registerActionEntry('any.action', async () => null, {});
    expect(registry.getActionDescriptor('any.action')).toBeUndefined();
  });

  test('serializeValue serializes Date, Map, Set in snapshot', () => {
    const registry = createRegistry(baseConfig);
    const now = new Date('2026-01-01T00:00:00Z');
    const map = new Map([['a', 1]]);
    const set = new Set([1, 2, 3]);
    registry.registerStateEntry('d', now, { serializable: true });
    registry.registerStateEntry('m', map, { serializable: true });
    registry.registerStateEntry('s', set, { serializable: true });
    const snapshot = registry.getSnapshot();
    expect(snapshot.d).toBe('2026-01-01T00:00:00.000Z');
    expect(snapshot.m).toEqual([['a', 1]]);
    expect(snapshot.s).toEqual([1, 2, 3]);
  });

  test('invokeAction with array type validation', async () => {
    const registry = createRegistry(baseConfig);
    registry.registerActionEntry('arr', async (input) => input, {
      inputSchema: { type: 'array' },
    });
    const valid = await registry.invokeAction('arr', [1, 2, 3]);
    expect(valid.ok).toBe(true);
    const invalid = await registry.invokeAction('arr', 'not-array');
    expect(invalid.ok).toBe(false);
    expect(invalid.error?.code).toBe('VALIDATION');
  });

  describe('action-scoped notification batching', () => {
    test('batches multiple state updates from a single action', async () => {
      const registry = createRegistry(baseConfig);
      registry.registerStateEntry('a', 0, { serializable: true });
      registry.registerStateEntry('b', 0, { serializable: true });
      const received: string[] = [];
      registry.subscribe('a', () => received.push('a'));
      registry.subscribe('b', () => received.push('b'));

      registry.registerActionEntry('multi', async () => {
        registry.updateStateValue('a', 1);
        registry.updateStateValue('b', 1);
        registry.updateStateValue('a', 2);
        return 'done';
      }, {});

      await registry.invokeAction('multi');
      // Both notifications should fire, but 'a' should only fire once (deduped to last value)
      expect(received).toEqual(['a', 'b']);
      expect(registry.getStateValue('a')).toBe(2);
      expect(registry.getStateValue('b')).toBe(1);
    });

    test('direct updateStateValue notifies synchronously outside action', () => {
      const registry = createRegistry(baseConfig);
      registry.registerStateEntry('x', 0, { serializable: true });
      const received: number[] = [];
      registry.subscribe('x', (v: unknown) => received.push(v as number));

      registry.updateStateValue('x', 1);
      expect(received).toEqual([1]);

      registry.updateStateValue('x', 2);
      expect(received).toEqual([1, 2]);
    });

    test('subscriptions do not fire during action execution', async () => {
      const registry = createRegistry(baseConfig);
      registry.registerStateEntry('status', 'idle', { serializable: true });
      const updates: string[] = [];
      registry.subscribe('status', (v: unknown) => updates.push(v as string));

      registry.registerActionEntry('longAction', async () => {
        registry.updateStateValue('status', 'busy');
        // Subscriber should NOT have fired yet
        expect(updates).toEqual([]);
        return 'done';
      }, {});

      await registry.invokeAction('longAction');
      // After action completes, the final notification fires
      expect(updates).toEqual(['busy']);
      expect(registry.getStateValue('status')).toBe('busy');
    });

    test('nested invokeAction within an action batches all updates together', async () => {
      const registry = createRegistry(baseConfig);
      registry.registerStateEntry('outer', 'init', { serializable: true });
      registry.registerStateEntry('inner', 'init', { serializable: true });
      const updates: Array<{ key: string; value: unknown }> = [];
      registry.subscribe('outer', (v: unknown) => updates.push({ key: 'outer', value: v }));
      registry.subscribe('inner', (v: unknown) => updates.push({ key: 'inner', value: v }));

      registry.registerActionEntry('innerAction', async () => {
        registry.updateStateValue('inner', 'from-inner');
        return 'done';
      }, {});

      registry.registerActionEntry('outerAction', async () => {
        registry.updateStateValue('outer', 'before-inner');
        await registry.invokeAction('innerAction');
        registry.updateStateValue('outer', 'after-inner');
        return 'done';
      }, {});

      await registry.invokeAction('outerAction');
      // All updates should be batched into a single flush after outerAction completes
      expect(updates).toContainEqual({ key: 'outer', value: 'after-inner' });
      expect(updates).toContainEqual({ key: 'inner', value: 'from-inner' });
      expect(registry.getStateValue('outer')).toBe('after-inner');
      expect(registry.getStateValue('inner')).toBe('from-inner');
    });
  });
});
