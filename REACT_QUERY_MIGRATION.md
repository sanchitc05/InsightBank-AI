# React Query Migration Guide

## Quick Start

### Step 1: Use Query Hooks
Replace `useAsync` with React Query hooks from `useQueries.js`:

**Before (useAsync):**
```javascript
import { useAsync } from '../hooks/useAsync';
import * as api from '../services/api';

const Dashboard = () => {
  const result = useAsync(() => api.getStatements(), []);
  
  if (result.loading) return <Spinner />;
  if (result.error) return <Error />;
  return <Content data={result.data} />;
};
```

**After (React Query):**
```javascript
import { useStatementsQuery } from '../hooks/useQueries';

const Dashboard = () => {
  const { data, isLoading, error, isError } = useStatementsQuery();
  
  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorBanner error={error} />;
  return <Content data={data} />;
};
```

### Step 2: Handle Mutations
Use mutation hooks for create/update/delete operations:

```javascript
import { useGenerateInsightsMutation } from '../hooks/useQueries';

const Insights = () => {
  const mutation = useGenerateInsightsMutation();
  
  const handleGenerate = async () => {
    await mutation.mutateAsync(statementId);
  };
  
  return (
    <button disabled={mutation.isPending} onClick={handleGenerate}>
      {mutation.isPending ? 'Generating...' : 'Generate'}
    </button>
  );
};
```

### Step 3: Conditional Queries
Enable queries only when ready:

```javascript
// Don't fetch until selectedId is set
const query = useAnalyticsSummaryQuery(selectedId, !!selectedId);
                                                    ^^^^^^ enable flag
```

## Available Hooks

| Hook | Usage | Auto-cancel |
|------|-------|------------|
| `useStatementsQuery()` | Get all statements | ✅ |
| `useStatementQuery(id)` | Get single statement | ✅ |
| `useTransactionsQuery(params)` | Get transactions with filters | ✅ |
| `useAnalyticsSummaryQuery(id)` | Get summary metrics | ✅ |
| `useCategoriesQuery(id)` | Get category breakdown | ✅ |
| `useTrendQuery()` | Get income/expense trends | ✅ |
| `useCompareQuery(id1, id2)` | Compare two statements | ✅ |
| `useInsightsQuery(id)` | Get insights | ✅ |
| `useGenerateInsightsMutation()` | Generate new insights | ✅ |
| `useDeleteStatementMutation()` | Delete statement | ✅ |

## Prop Names

React Query uses different prop names than `useAsync`:

| useAsync | React Query | Notes |
|----------|-----------|-------|
| `loading` | `isLoading` | Now boolean |
| `error` | `error` + `isError` | Error object needed |
| `data` | `data` | Same |
| `retry()` | `refetch()` | Manual refetch |

## Loading States

```javascript
// For individual queries
if (query.isLoading) return <SkeletonCard />;
if (summaryQuery.isLoading && !summaryQuery.data) return null;

// For mutations  
if (mutation.isPending) return <Spinner />;
```

## Error Handling

```javascript
// Show error only if not loading
{query.isError && !query.isLoading && <ErrorBanner error={query.error} />}

// With retry
{query.isError && <ErrorBanner error={query.error} onRetry={query.refetch} />}
```

## Caching Strategy

React Query automatically caches responses:

| Resource | Stale Time | Cache Time |
|----------|-----------|-----------|
| Statements | Immediate | 10 min |
| Transactions | 2 min | 10 min |
| Analytics | 5 min | 10 min |
| Trends | 10 min | 10 min |

Adjust in `lib/queryClient.js` if needed.

## Auto-cancellation Examples

### Example 1: Search with Debounce
```javascript
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 400);

// Old request cancelled when user types
const { data: results } = useTransactionsQuery({ search: debouncedSearch });

return <input value={search} onChange={e => setSearch(e.target.value)} />;
```

### Example 2: Statement Selection
```javascript
const [selectedId, setSelectedId] = useState(null);

// Old analytics cancelled when user selects new statement
const summaryQuery = useAnalyticsSummaryQuery(selectedId);

// Component unmount also cancels
```

## Common Mistakes

❌ **Mistake**: Forgetting enable flag
```javascript
// Wrong - fetches even when id is null
const query = useAnalyticsSummaryQuery(selectedId);

// Right - only fetch when ready
const query = useAnalyticsSummaryQuery(selectedId, !!selectedId);
```

❌ **Mistake**: Not checking isError before using data
```javascript
// Could crash if error but showing data
if (query.isLoading) return <Spinner />;
return <Content data={query.data} />; // data could be undefined if error

// Right
if (query.isLoading) return <Spinner />;
if (query.isError) return <ErrorBanner />;
return <Content data={query.data} />;
```

❌ **Mistake**: Treating `error` object as string
```javascript
// Wrong
<div>{query.error}</div>

// Right
<div>{query.error?.message || 'Unknown error'}</div>
```

## Testing

With React Query DevTools:

```bash
npm install @tanstack/react-query-devtools --save-dev
```

Add to App.jsx:
```javascript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        {/* ... */}
        <ReactQueryDevtools initialIsOpen={false} />
      </ToastProvider>
    </ErrorBoundary>
  );
}
```

Then open DevTools panel to inspect:
- Query cache
- Request history  
- Timings
- Status

## Debugging Tips

1. **Check query key matches**: Query keys in DevTools must match your hook
   ```javascript
   // Key: ['statements']
   useStatementsQuery()
   
   // Key: ['insights', 123]
   useInsightsQuery(123)
   ```

2. **Verify enabled flag**: Disabled queries show `idle` status
   ```javascript
   // Disabled (won't fetch)
   useAnalyticsSummaryQuery(null, false)
   
   // Enabled
   useAnalyticsSummaryQuery(123, true)
   ```

3. **Check stale time**: Recently fetched queries won't refetch
   - Use DevTools to see "age" of cached data
   - Force refetch with `refetch()` button

## Next Steps

1. ✅ Use React Query for all data fetching
2. ✅ Remove old `useAsync` calls
3. ✅ Add error boundaries around pages
4. ✅ Test with React Query DevTools
5. ⏳ Implement optimistic updates
6. ⏳ Add retry UI feedback

---

**Version**: 1.0 (Phase 8)  
**Last Updated**: April 8, 2026
