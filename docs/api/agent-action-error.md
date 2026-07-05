# AgentActionError

A structured error class for throwing actionable errors from action handlers.

## Import

```tsx
import { AgentActionError } from 'react-agent-bridge';
```

## Signature

```ts
class AgentActionError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  );
}
```

## Usage

```tsx
useAgentAction('transfer', async (input) => {
  const account = await db.getAccount(input?.accountId);
  if (!account) {
    throw new AgentActionError('NOT_FOUND', `Account ${input?.accountId} not found`);
  }
  if (account.balance < input?.amount) {
    throw new AgentActionError('INSUFFICIENT_FUNDS', 'Balance too low', {
      balance: account.balance,
      requested: input?.amount,
    });
  }
  // ...
});
```

## Agent receives

```js
// On success:
{ ok: true, data: { txId: 'tx_123' } }

// On AgentActionError:
{ ok: false, error: { code: 'INSUFFICIENT_FUNDS', message: 'Balance too low', details: { balance: 50, requested: 100 } } }

// On generic Error:
{ ok: false, error: { code: 'INTERNAL', message: 'Unexpected error' } }
```

## Error codes

| Code | Meaning |
|------|---------|
| `DISABLED` | Bridge is disabled |
| `UNAUTHORIZED` | Missing or invalid token |
| `NOT_FOUND` | Action or resource not found |
| `VALIDATION` | Input failed schema validation |
| `INTERNAL` | Unhandled runtime error |

Custom codes from `AgentActionError` are passed through as-is.
