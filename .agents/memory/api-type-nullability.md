---
name: Orval-generated type nullability
description: Generated API types use string|null|undefined for nullable fields; component interfaces need optional syntax
---

Orval generates TypeScript types where DB-nullable fields come out as `string | null | undefined` (i.e. the property is both optional and nullable). Local component interfaces that define the same field as `string | null` (without `undefined`) will fail type-checking when receiving generated data.

**Why:** Orval marks optional OpenAPI properties as `?` in TS, which adds `undefined` to the union. Even `null`-only fields in the DB may come out as `string | null | undefined` depending on the schema.

**How to apply:** In component prop interfaces, use `?: string | null` (optional shorthand) instead of `: string | null` for any field that originates from a nullable DB column:

```ts
// Wrong — causes TS2322 when passed generated API data
primary_color: string | null;

// Correct
primary_color?: string | null;
```
