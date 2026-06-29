import React, { useMemo, useEffect } from 'react';
import { AgentBridgeCtx } from './core/AgentBridgeContext';
import { createRegistry } from './core/registry';
import { attachWindow, detachWindow } from './global/attachWindow';
import { setCtx } from './hooks/createAgentStore';
import type { AgentBridgeConfig, ActionContext, ActionDescriptor } from './core/types';
import type { DefinedAgentAction } from './actions/defineAgentAction';

export interface AgentBridgeProviderProps {
  appId: string;
  enabled?: boolean;
  prefix?: string;
  production?: {
    enabled?: boolean;
    token?: string;
    allowlist?: { states?: string[]; actions?: string[] };
  };
  devtools?: {
    attachTo?: string;
    debounceMs?: number;
  };
  registerActions?: DefinedAgentAction<any, any>[];
  children: React.ReactNode;
}

export function AgentBridgeProvider({
  appId,
  enabled = true,
  prefix,
  production = {},
  devtools = {},
  registerActions,
  children,
}: AgentBridgeProviderProps) {
  const attachTo = devtools.attachTo || '__AGENT__';

  const handle = useMemo(() => {
    const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
    const config: AgentBridgeConfig = {
      appId,
      enabled,
      env: isProduction ? 'production' : 'development',
      production: {
        enabled: production.enabled ?? false,
        token: production.token,
        allowlist: production.allowlist,
      },
      devtools: {
        attachTo,
        debounceMs: devtools.debounceMs ?? 0,
      },
    };
    const registry = createRegistry(config);
    return registry;
  }, [appId, enabled, production, devtools, attachTo]);

  const ctxValue = useMemo(() => ({
    registerStateEntry: (key: string, initial: unknown, options: any) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key;
      return handle.registerStateEntry(prefixedKey, initial, options);
    },
    unregisterStateEntry: (key: string) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key;
      return handle.unregisterStateEntry(prefixedKey);
    },
    getStateValue: (key: string) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key;
      return handle.getStateValue(prefixedKey);
    },
    updateStateValue: (key: string, value: unknown) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key;
      handle.updateStateValue(prefixedKey, value);
    },
    registerActionEntry: handle.registerActionEntry,
    unregisterActionEntry: handle.unregisterActionEntry,
    invokeAction: handle.invokeAction,
    subscribe: (key: string, cb: any) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key;
      return handle.subscribe(prefixedKey, cb);
    },
    getSnapshot: handle.getSnapshot,
    getAllDescriptors: handle.getAllDescriptors,
    listAllActions: handle.listAllActions,
    getInternalRegistry: handle.getInternalRegistry,
  }), [handle, prefix]);

  useEffect(() => {
    const env = handle.getInternalRegistry().config.env;
    const shouldAttach = enableBridge(enabled, env === 'production', production.enabled ?? false);

    if (registerActions) {
      for (const action of registerActions) {
        handle.registerActionEntry(action.name, action.handler, action.descriptor);
      }
    }

    if (shouldAttach) {
      attachWindow(attachTo, '0.1.0', handle);
    }

    setCtx(ctxValue);

    return () => {
      detachWindow(attachTo);
      setCtx(null);
    };
  }, [attachTo, handle, ctxValue, enabled, production.enabled, registerActions]);

  return (
    <AgentBridgeCtx.Provider value={ctxValue}>
      {children}
    </AgentBridgeCtx.Provider>
  );
}

function enableBridge(enabled: boolean, isProduction: boolean, productionEnabled: boolean): boolean {
  if (!enabled) return false;
  if (isProduction && !productionEnabled) return false;
  return true;
}
