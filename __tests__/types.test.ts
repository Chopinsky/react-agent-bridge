describe('TypeScript types', () => {
  test('AgentBridge interface compiles and has required namespaces', () => {
    const bridge: import('../src/core/types').AgentBridge = {
      version: '0.1.0',
      meta: { appId: 'test', env: 'development', enabled: true },
      state: {
        get: () => null,
        getState: () => null,
        list: () => ({}),
        subscribe: () => () => {},
      },
      actions: {
        invoke: async () => ({ ok: true }),
        mutate: async () => ({ ok: true }),
        dispatch: async () => ({ ok: true }),
        send: async () => ({ ok: true }),
        list: () => ({}),
      },
      _registry: null as unknown as import('../src/core/types').InternalRegistry,
    };
    expect(bridge.version).toBe('0.1.0');
    expect(bridge.meta.appId).toBe('test');
    expect(typeof bridge.state.get).toBe('function');
    expect(typeof bridge.actions.invoke).toBe('function');
    expect(typeof bridge.actions.list).toBe('function');
  });

  test('ActionResult has ok flag and optional data or error', () => {
    const success: import('../src/core/types').ActionResult = { ok: true, data: { id: 1 } };
    const failure: import('../src/core/types').ActionResult = { ok: false, error: { code: 'ERROR', message: 'fail' } };
    expect(success.ok).toBe(true);
    expect(success.data).toEqual({ id: 1 });
    expect(failure.ok).toBe(false);
    expect(failure.error?.code).toBe('ERROR');
  });

  test('StateDescriptor has required fields', () => {
    const desc: import('../src/core/types').StateDescriptor = {
      key: 'test.key',
      type: 'string',
      serializable: true,
      updatedAt: 1000,
      version: 1,
    };
    expect(desc.key).toBe('test.key');
    expect(desc.version).toBe(1);
  });

  test('ActionDescriptor has required fields', () => {
    const desc: import('../src/core/types').ActionDescriptor = {
      name: 'test.action',
      idempotent: false,
      supportsDryRun: false,
      supportsRollback: false,
    };
    expect(desc.name).toBe('test.action');
  });

  test('InvokeOptions allows optional token', () => {
    const opts: import('../src/core/types').InvokeOptions = { token: 'abc', dryRun: true };
    expect(opts.token).toBe('abc');
    expect(opts.dryRun).toBe(true);
  });

  test('ProductionConfig has no gateReads', () => {
    const config: import('../src/core/types').ProductionConfig = {
      enabled: true,
      token: 'secret',
      allowlist: { actions: ['a'] },
    };
    expect(config.enabled).toBe(true);
    expect(config.token).toBe('secret');
    expect(config.allowlist?.actions).toEqual(['a']);
    expect((config as any).gateReads).toBeUndefined();
  });
});
