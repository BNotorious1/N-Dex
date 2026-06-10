---
name: API client hook queryKey requirement
description: useGet* hooks from @workspace/api-client-react require queryKey in query options
---

The Orval-generated hooks (e.g. `useGetLeagueSummary`, `useGetLeagueStandings`) wrap TanStack Query with a required `queryKey` field in the `query` options object.

**Why:** The generated `UseQueryOptions` type marks `queryKey` as required (not optional), so passing `{ enabled: boolean }` alone causes TS2741.

**How to apply:** Always import and use the matching `getGet*QueryKey(id)` helper alongside each hook:

```tsx
import { useGetLeagueSummary, getGetLeagueSummaryQueryKey } from "@workspace/api-client-react";

useGetLeagueSummary(id, {
  query: { enabled: !!id, queryKey: getGetLeagueSummaryQueryKey(id) },
});
```
