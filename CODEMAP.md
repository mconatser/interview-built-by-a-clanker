# Code map

**Architecture:** pnpm + Turborepo monorepo with three packages. `packages/shared` holds the Zod schemas and TS
types; it builds with tsc to `dist/`, and both apps import that build. `apps/api` is a Fastify 5 JSON API on
:3001. It keeps all state in in-memory Maps in `db.ts` (15 seeded personas, prices are dollar floats), authenticates
with a JWT in a preHandler, and validates request bodies with the shared Zod schemas. `apps/web` is a React 19 SPA
on :5173 (TanStack Router file routes, TanStack Query). It calls the API directly at `http://localhost:3001`, with
no Vite proxy, which works because of CORS. The token is kept in localStorage under `auth_token`.

**Request flow:** route component (`useQuery`/`useMutation`) → `lib/api.ts` (adds the Bearer token) → Fastify route
(`authenticate` preHandler → Zod `safeParse`) → `db.ts` Map helpers → enriched JSON (cart total computed server-side).

| Area | Key files | What it does |
| --- | --- | --- |
| API bootstrap | `apps/api/src/index.ts`, `middleware/auth.ts` | CORS, JWT plugin, route registration, `authenticate` hook (gated by `ENFORCE_AUTH`) |
| API routes | `routes/personas.ts`, `auth.ts`, `cart.ts`, `favorites.ts`, `checkout.ts` | Catalog list/detail (public); register/login/me; cart CRUD; favorites; checkout → order |
| Data layer + seed | `apps/api/src/db.ts` | Maps for personas/users/cart/favorites/orders; `personas.list` filters and sorts; sequential IDs `cart-N`, `user-N` |
| Shared | `packages/shared/src/schemas/*.ts`, `index.ts` | Zod schemas (`register`, `login`, `addToCart`, `updateCartItem`, `checkout`) and types (`Persona`, `Cart`, `Order`, `AuthResponse`) |
| Web lib | `apps/web/src/lib/api.ts`, `auth.tsx`, `queryClient.ts` | fetch wrapper + ApiError; AuthProvider (token → `/auth/me`); QueryClient (staleTime 60s, retry 1) |
| Web routes | `src/routes/__root.tsx`, `index.tsx`, `personas/$personaId.tsx`, `cart.tsx`, `checkout.tsx`, `favorites.tsx`, `login.tsx`, `register.tsx` | Browse with URL search params → detail → cart → checkout; favorites; auth pages; header cart badge |
| Web components | `src/components/PersonaCard.tsx`, `CartItem.tsx`, `SearchBar.tsx`, `FilterPanel.tsx`, `StarRating.tsx` | Presentational components; SearchBar debounces 300ms |

**Invariants the code relies on:**

- Prices are **dollars as floats**, and totals are rounded to 2dp server-side (`cart.ts:25`, `checkout.ts:44`). The web
  shows `price.toFixed(2)` with no cents conversion.
- Every cart and favorites read or write is scoped to `request.user.id`, which exists only after `jwtVerify()`.
- JWT payload is `{ id, email }`. `AuthResponse.user` = `{ id, username, email }`.
- Cart quantity is an integer ≥ 1. POST `/cart` accumulates into an existing line, and PUT sets an absolute value.
- Route gating in the web app is UI-only. The API is the real gate.
- React Query keys: `["personas"]`, `["persona", id]`, `["cart"]`, `["cart-count"]`, `["favorites"]`. Mutations must
  invalidate every key that shows the changed data.

**Tests (at the start of the session):** **none**. (Now: vitest API tests in `apps/api/test`, Playwright e2e in `apps/web/e2e`; see REPORT.md.) No test runner or test files in any package. At the start: `pnpm build` passes 3/3, and
`pnpm typecheck` fails 1 (web: `routeTree.gen.ts:20` TS4023, `SearchParams` not exported from `routes/index.tsx`).
Ports 3001/5173 were free. Test setup is still to do (vitest + Fastify `inject` for the API, Playwright for the UI).

**Suspicious** (spot-checked items marked ✔):

- ✔ `apps/api/src/middleware/auth.ts:3-10`: auth is skipped unless `ENFORCE_AUTH=true`, which nothing sets. `request.user` is then
  undefined, so every cart, favorites and checkout handler and `/auth/me` destructures undefined and returns 500. Also `:16` sends 401 without
  `return reply`.
- ✔ `apps/api/src/routes/cart.ts:77-79`: DELETE `/cart/:itemId` has no `item.userId === userId` check (PUT has one). IDs are sequential
  `cart-N`, so this is an IDOR.
- ✔ `apps/api/src/routes/checkout.ts:50-52`: the cart is never cleared after an order (`db.cart.clearForUser` is unused), so a repeat
  submit creates duplicate orders.
- ✔ `apps/api/src/routes/auth.ts:8-16,57`: password "hash" is an unsalted 32-bit string hash, and colliding passwords log in.
- ✔ `apps/api/src/index.ts:15`: CORS `methods` omits DELETE, so browser deletes (cart remove, unfavorite) fail preflight.
- ✔ `apps/api/src/db.ts:365`: minPrice filter uses `<=` where it should be `>=`.
- ✔ `apps/api/src/routes/auth.ts:62-65`: the login response omits `username`, so the header shows a blank name after login.
- `apps/api/src/routes/personas.ts:11-12`: `Number("abc")` gives NaN, which silently returns an empty list. `personaFilterSchema` is unused.
- `apps/api/src/routes/favorites.ts:26`: unvalidated `request.body as {...}`, so a missing body returns 500.
- `apps/api/src/routes/*` `error: parsed.error.flatten()` is an object, and `web/lib/api.ts:40` turns it into "[object Object]".
- `apps/api/src/db.ts:398`: email lookup is case-sensitive, so duplicate accounts are possible.
- `apps/api/src/index.ts:17`: hardcoded JWT secret, and `auth.ts:39,61` tokens have no expiry.
- ✔ `apps/web/src/components/PersonaCard.tsx:63`: `persona.price * 100` shows $4999.00 for $49.99.
- ✔ `apps/web/src/routes/personas/$personaId.tsx:42-44`: favorite toggle is inverted (DELETE when not favorited).
- ✔ `apps/web/src/routes/personas/$personaId.tsx:23` vs `favorites.tsx:17`: the same `["favorites"]` key caches `string[]` in one place and
  `{favorites}` in the other, so each page breaks the other's cache.
- `apps/web/src/routes/personas/$personaId.tsx:22`: favorites query has no `enabled: !!user`, so anonymous views get a 401.
- ✔ `apps/web/src/routes/index.tsx:43`: queryKey `["personas"]` omits the filters, so changing a filter shows the stale list.
- ✔ `apps/web/src/routes/__root.tsx:16`: badge uses `["cart-count"]`, but mutations invalidate only `["cart"]`, so the badge goes stale.
- ✔ `apps/web/src/lib/auth.tsx:55-58`: logout doesn't remove `auth_token` (a reload logs back in) or clear the query cache (the next user
  sees the old cart).
- `apps/web/src/components/CartItem.tsx:41`: "−" at qty 1 sends 0 (no `disabled` prop), and the server's 400 is ignored.
- `apps/web/src/routes/cart.tsx:93-95`: quantity ± sends absolute values with no pending guard, so fast clicks are lost.
- `apps/web/src/routes/index.tsx:23-24`: validateSearch drops `minPrice=0` (falsy) and can produce NaN.
- `apps/web/src/components/SearchBar.tsx:22`: effect depends on an inline `onChange`, so the debounce restarts every render.
- `apps/web/src/components/StarRating.tsx:17,23`: every instance uses the same SVG gradient id `half`, so half-stars use the wrong fill.
- `apps/web/src/routes/cart.tsx:38`, `favorites.tsx:30`, `checkout.tsx:34`: they ignore auth `isLoading`, so a refresh flashes "Sign in".
- `apps/web/src/routes/*`: query errors render as empty states ("No personas found", "Persona not found"), and mutations have no onError.
- ✔ `apps/web/src/routeTree.gen.ts:20`: typecheck TS4023 because `SearchParams` isn't exported from `routes/index.tsx`.
