# Bugs

> `scratchpad/repro/*.mts` below were throwaway reproduction scripts from the debugging session and aren't in the
> repo. Each bug's committed test (named in its entry) reproduces the same behavior.

Work order: B1 → B2 → B3 → B5 → B6 → B7 → B15 → B8 → B16 → B9 → B10 → B11 → B12 → B13 → B14 → B17 → B4 (confirmed 2026-11-12)

## B1: Authenticated routes don't authenticate (ENFORCE_AUTH off by default)

- **Status:** Fixed ([PR #1](https://github.com/mconatser/interview-built-by-a-clanker/pull/1))
- **Source:** Spotted (security, breaks cart/favorites/checkout)
- **Symptom:** every cart, favorites, checkout and `/auth/me` call returns 500, and no route verifies the JWT
- **Reproduce:** the real route modules via Fastify `inject`, no server or port
  (`scratchpad/repro/b1.mts`, run with `npx tsx` from `apps/api`). Register alice, then GET `/cart` and `/auth/me`:
  - Default config (`ENFORCE_AUTH` unset): **valid token → 500**, no token → 500, bad token → 500
    ("Cannot destructure property 'id' of 'request.user'").
  - Expected (and what `ENFORCE_AUTH=true` gives): valid token → 200, no or bad token → 401.
- **Root cause:** `apps/api/src/middleware/auth.ts:3-10`: `authenticate` returns before `request.jwtVerify()` unless
  `ENFORCE_AUTH=true` (nothing in the repo sets it), so `request.user` is never populated and every protected handler
  dereferences undefined. Secondary: `:16` sends 401 without `return reply`. It didn't misbehave under inject, but
  Fastify's async-hook contract wants the reply returned.
- **Fix:** removed the `ENFORCE_AUTH` switch so `authenticate` always calls `request.jwtVerify()`, and the catch now
  `return`s the 401 reply. A switch that defaults to "auth off" is the bug itself, so it is removed, not flipped.
- **Test:** `apps/api/test/auth-enforced.test.ts` (new vitest suite, Fastify `inject` on the real route modules).
  A valid token gets 200 on `/auth/me` and `/cart`. A missing or forged token gets 401 on `/auth/me`, `/cart`,
  `/favorites` and `/checkout`. Before the fix: 9 failed (500), smoke passed. After: 10/10 pass, and also with
  `ENFORCE_AUTH=false` set.
- **Also in this PR (test setup):** vitest added to `apps/api` (`pnpm --filter @acme/api test`), with
  `test/helpers.ts` (`buildTestApp`, `registerUser`) and a smoke test.
- **Same pattern elsewhere?** `authenticate` is the only auth gate (cart, favorites and checkout via `addHook`; `/auth/me`
  via `preHandler`). No other env-gated checks: a grep for `process.env` in `apps/api/src` finds only this one.

## B2: Any user can delete another user's cart item

- **Status:** Fixed ([PR #3](https://github.com/mconatser/interview-built-by-a-clanker/pull/3); replaces PR #2, which merged into the already-merged `fix/enforce-auth` branch and never reached `main`)
- **Source:** Spotted (security, IDOR)
- **Symptom:** any logged-in user can remove items from another user's cart by guessing the sequential ID (`cart-1`, `cart-2`, …)
- **Reproduce:** `scratchpad/repro/b2.mts` (Fastify `inject` via `test/helpers.ts`). Alice adds p-001 and gets `cart-1`.
  Bob `PUT /cart/cart-1` → 404 (correct). Bob `DELETE /cart/cart-1` → **200**, and Alice's cart is now
  `{"items":[],"total":0}`. Expected: 404, with Alice's cart unchanged.
- **Root cause:** `apps/api/src/routes/cart.ts:77-79`: the DELETE handler checks `!item` but never `item.userId !== userId`
  before `db.cart.remove`. The PUT handler at `:63-64` has that check.
- **Fix:** the DELETE guard is now `if (!item || item.userId !== userId) → 404`, the same check and status as PUT.
  It returns 404, not 403, so it doesn't confirm that another user's item ID exists.
- **Test:** `apps/api/test/cart-ownership.test.ts`. Bob's PUT on Alice's item → 404. Bob's DELETE → 404, and Alice's
  cart is unchanged. Alice can still delete her own item → 200. Before the fix: 2 failed (Bob's DELETE got 200, and
  the owner-delete case then found the item gone). After: 13/13 API tests pass.
- **Same pattern elsewhere?** No. Grep of the routes: favorites are stored per user (`db.favorites.remove(userId, …)`),
  checkout filters by `userId`, and PUT `/cart/:itemId` checks the owner.

## B3: Logout leaves token and cached data

- **Status:** Fixed ([PR #4](https://github.com/mconatser/interview-built-by-a-clanker/pull/4))
- **Source:** Spotted (security on shared devices)
- **Symptom:** after "Sign out", reloading the page signs you back in. A different user who signs in next in the same tab
  sees the previous user's cart (and badge and favorites) until the cache goes stale (60s).
- **Reproduce:** Playwright `apps/web/e2e/b3-logout-clears-session.spec.ts` (fresh API and Vite started by `webServer`):
  1. Sign up alice → Sign out → reload. **Actual:** "Sign out" and the username are back. Expected: the "Sign in" link.
  2. Sign up alice, add p-001 through the API, open /cart (shows "Refactor Rex"), Sign out, sign up bob, click the cart icon.
     **Actual:** the header says "bob" but the cart lists "Refactor Rex x1 $49.99, Total $49.99". Expected: "Your cart is empty".
- **Root cause:** `apps/web/src/lib/auth.tsx:55-58`: `logout` only resets React state. It leaves `auth_token` in
  localStorage (so the provider's `/auth/me` effect restores the user on reload), and it leaves the app-wide React
  Query cache alone. That cache's keys (`["cart"]`, `["cart-count"]`, `["favorites"]`) aren't per-user, so the next
  user is served the previous user's cached data while it's fresh (`staleTime` 60s).
- **Fix:** `logout` now calls `localStorage.removeItem("auth_token")` and `queryClient.clear()` (via `useQueryClient()`;
  `AuthProvider` is inside `QueryClientProvider`) before resetting state.
- **Test:** `apps/web/e2e/b3-logout-clears-session.spec.ts`. Before the fix: 2 failed (back to signed in after reload;
  bob saw alice's "Refactor Rex"). After: 2/2 pass. API vitest 10/10, build 3/3. Web typecheck still fails only on B14.
- **Also in this PR (test setup):** Playwright in `apps/web` (`pnpm --filter @acme/web test:e2e`). `playwright.config.ts`
  starts a fresh in-memory API (:3001) and Vite (:5173) with `reuseExistingServer: false`, so it never runs against a dev
  server. Playwright output folders are added to `.gitignore`.
- **Same pattern elsewhere?** The `/auth/me` 401 branch (`auth.tsx:41-44`) clears the token, but user-scoped queries
  only run with a user set, so nothing user-specific is cached there. Login doesn't need its own clear once logout clears.

## B4: Weak password hash, colliding passwords log in

- **Status:** Open
- **Source:** Spotted (security)
- **Root cause:** `apps/api/src/routes/auth.ts:8-16` uses an unsalted 32-bit string hash (for example "Aa" and "BB" collide).

## B5: Checkout doesn't clear the cart, so repeat submits create duplicate orders

- **Status:** Fixed ([PR #5](https://github.com/mconatser/interview-built-by-a-clanker/pull/5))
- **Source:** Spotted (data/state, money)
- **Symptom:** after "Place order", the cart still holds the same items, so placing the order again charges the user twice.
  A double click on the button creates two orders.
- **Reproduce:** `scratchpad/repro/b5.mts` (Fastify `inject` via `test/helpers.ts`). Alice adds 2× p-001, then POSTs
  `/checkout` twice: **both 201** (order-1 and order-2, $99.98 each). Afterwards GET `/cart` still returns the 2× p-001,
  and 2 orders are stored. Expected: the first checkout empties the cart, and the second returns 400 "Cart is empty".
- **Root cause:** `apps/api/src/routes/checkout.ts:50-52`: the handler saves the order and returns 201 without calling
  `db.cart.clearForUser(userId)` (`db.ts:445`, which nothing calls). The checkout page (`checkout.tsx:30`) already
  assumes the server emptied the cart and only refetches `["cart"]`.
- **Fix:** `checkout.ts` calls `db.cart.clearForUser(userId)` right after `db.orders.create(order)`. Reading the cart,
  saving the order and clearing all happen synchronously with no `await` between them, so a concurrent second request
  sees an empty cart and gets the existing 400.
- **Test:** `apps/api/test/checkout-clears-cart.test.ts`. The cart is empty after checkout. A second checkout gets 400
  and no second order. Two concurrent checkouts give `[201, 400]` and 1 order. Another user's cart is untouched.
  Before the fix: 3 failed. After: API 17/17, e2e 2/2, build 3/3. Web typecheck still fails only on B14.
- **Same pattern elsewhere?** No other route turns the cart into something else. `clearForUser` was the only unused
  db helper for this. (`db.orders.getByUserId` is also unused, but only because there's no orders route; that's not a bug.)

## B6: Persona card price shown 100× too high

- **Status:** Fixed ([PR #6](https://github.com/mconatser/interview-built-by-a-clanker/pull/6))
- **Source:** Spotted (money display)
- **Symptom:** the browse grid shows every persona at 100× its price (Refactor Rex shows "$4999.00/mo"). The detail page,
  cart and checkout show $49.99.
- **Reproduce:** Playwright `apps/web/e2e/b6-card-price.spec.ts` reads the p-001 price from the API ($49.99) and opens
  `/`. **Actual** card text: `…(234)$4999.00/mo`. Expected: `$49.99/mo`, matching the detail page.
- **Root cause:** `apps/web/src/components/PersonaCard.tsx:63` renders `(persona.price * 100).toFixed(2)`. Prices are
  dollars throughout (seed `db.ts`, API, and `$personaId.tsx:125`, `CartItem.tsx`, `cart.tsx`, `checkout.tsx`, which all
  use `price.toFixed(2)`), so the ×100 shows a dollars-to-cents conversion with a `$` in front.
- **Fix:** `${persona.price.toFixed(2)}`, the same as every other price view.
- **Test:** `b6-card-price.spec.ts`. The card contains `$<API price>/mo`, and the detail page shows the same amount.
  Before: failed ($4999.00/mo). After: e2e 3/3, API 17/17, build 3/3. Web typecheck still fails only on B14.
- **Same pattern elsewhere?** No. Grep for `price` in `apps/web/src` finds `* 100` only here. The other price renders
  are `price.toFixed(2)` or `price * quantity`.

## B7: Browser DELETE calls blocked by CORS

- **Status:** Fixed ([PR #7](https://github.com/mconatser/interview-built-by-a-clanker/pull/7))
- **Source:** Spotted
- **Symptom:** the browser blocks every DELETE the web app sends (cart "Remove", and unfavorite on the favorites and
  detail pages), so those actions do nothing. The error isn't shown (no `onError`). This PR unblocks the request. The
  bodyless DELETEs then still get a 400 until **B15** is fixed.
- **Reproduce:** Playwright `apps/web/e2e/b7-cors-delete.spec.ts` runs `fetch(DELETE /favorites/p-001)` with a valid token
  from the app's page (origin :5173). **Actual:** `TypeError: Failed to fetch`. Expected: 200. Preflight check
  (`scratchpad/repro/b7.mts`, `@fastify/cors` with the `index.ts` options): an OPTIONS request with
  `Access-Control-Request-Method: DELETE` returns `allow-methods: GET, POST, PUT, OPTIONS`.
- **Root cause:** `apps/api/src/index.ts:15`: the CORS `methods` list leaves out DELETE, so the browser rejects the
  preflight for the three DELETE calls the web app makes (`cart.tsx:32`, `favorites.tsx:24`, `$personaId.tsx:43`).
- **Fix:** `methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]`. PATCH is left out because nothing uses it.
- **Test:** `b7-cors-delete.spec.ts` (plus a shared `e2e/helpers.ts` with `signUp`). Before: failed ("Failed to fetch").
  After: e2e 4/4, API 17/17, build 3/3. Web typecheck still fails only on B14.
- **Note:** clicking "Remove" still fails after this fix, because of a separate cause: see **B15**.
- **Same pattern elsewhere?** The CORS `methods` list is the only one. PUT is allowed and works (quantity +/-).

## B8: Favorite toggle on the detail page is inverted

- **Status:** Fixed ([PR #9](https://github.com/mconatser/interview-built-by-a-clanker/pull/9))
- **Source:** Spotted
- **Symptom:** clicking the heart on a persona that isn't a favorite does nothing (it sends DELETE, which gets 404 and is
  swallowed). On one that is a favorite, it sends POST again, so a favorite can never be removed from the detail page.
- **Reproduce:** Playwright `apps/web/e2e/b8-favorite-toggle.spec.ts`. Sign up, open `/personas/p-002`, click the heart.
  **Actual:** GET `/favorites` stays `[]`. Expected `["p-002"]`, and a second click removes it.
- **Root cause:** `apps/web/src/routes/personas/$personaId.tsx:42-44`: `toggleFavorite` tests `!isFavorited`, so it sends
  DELETE when the persona is not a favorite and POST when it is.
- **Fix:** test `isFavorited` (favorited → DELETE, otherwise POST).
- **Test:** `apps/web/e2e/b8-favorite-toggle.spec.ts`. The first click makes the API favorites `["p-002"]` and fills the heart. The
  second click makes them `[]` and empties the heart. Before: failed (stayed `[]`). After: e2e 7/7, API 17/17, build 3/3. Web
  typecheck still fails only on B14.
- **Same pattern elsewhere?** The favorites page only removes (always DELETE), so no toggle there. The cache shape clash
  that used to be listed under this entry has its own root cause and is now **B16**.

## B9: minPrice filter inverted

- **Status:** Fixed ([PR #11](https://github.com/mconatser/interview-built-by-a-clanker/pull/11))
- **Source:** Spotted
- **Symptom:** `GET /personas?minPrice=60` returns the personas priced **at or below** $60 (the same set as `maxPrice=60`), and
  a range like `minPrice=50&maxPrice=70` returns $34.99–$49.99. The web app passes `minPrice` from the URL (`index.tsx`).
- **Reproduce:** `scratchpad/repro/b9.mts` (Fastify `inject`). `minPrice=60` gives 9 results, $34.99–$59.99. Expected: the
  6 priced ≥ $60.
- **Root cause:** `apps/api/src/db.ts:365`: the `minPrice` filter keeps `p.price <= minPrice`. It's a copy of the `maxPrice`
  line with the comparison left unchanged.
- **Fix:** `p.price >= filters.minPrice!`.
- **Test:** `apps/api/test/price-filter.test.ts` compares against the unfiltered list. `minPrice=60` gives exactly the
  personas ≥ 60, `maxPrice=60` the personas ≤ 60, `50..70` the range, and `minPrice=99.99` includes the $99.99 persona.
  Before: 3 failed (maxPrice passed). After: API 21/21, e2e 9/9, build 3/3. Web typecheck still fails only on B14.
- **Same pattern elsewhere?** The other filters are equality checks (specialty, tier) or substring checks (q), and
  `maxPrice` is correct. A related but separate issue stays in Spotted: `personas.ts:11-12` uses truthiness, so
  `minPrice=0` and `maxPrice=0` are ignored.

## B10: Browse list doesn't refetch when filters change

- **Status:** Fixed ([PR #12](https://github.com/mconatser/interview-built-by-a-clanker/pull/12))
- **Source:** Spotted
- **Symptom:** clicking a filter (specialty, tier, sort) or searching updates the URL, but the grid keeps showing the
  previous list for up to 60s (`staleTime`).
- **Reproduce:** Playwright `apps/web/e2e/b10-filters-refetch.spec.ts`. Open `/` (15 cards), click "Security". The URL
  becomes `?specialty=Security`. **Actual:** still 15 cards. Expected: 2 (what the API returns for that filter).
- **Root cause:** `apps/web/src/routes/index.tsx:43`: the browse query's key is `["personas"]` with no filters, so every
  filter combination shares one cache entry. While it's fresh, React Query never calls `queryFn` with the new query string.
- **Fix:** compute `qs` once and use it in both the key (`["personas", qs]`) and the fetch.
- **Test:** `b10-filters-refetch.spec.ts`. After the click, the card count and the names match `GET /personas?specialty=Security`.
  Before: failed (15 vs 2). After: e2e 10/10, API 21/21, build 3/3. Web typecheck still fails only on B14.
- **Same pattern elsewhere?** `["persona", personaId]` includes its param. `["cart"]` and `["favorites"]` take no params
  (per-user data, cleared on logout since B3). `["cart-count"]` is B11.

## B11: Cart badge never updates

- **Status:** Fixed ([PR #13](https://github.com/mconatser/interview-built-by-a-clanker/pull/13))
- **Source:** Spotted
- **Symptom:** the header cart badge doesn't change after Add to Cart, quantity changes, Remove or checkout. It is only
  correct after a full page reload.
- **Reproduce:** Playwright `apps/web/e2e/b11-cart-badge.spec.ts`. Sign up (no badge), open `/personas/p-001`, click
  "Add to Cart". **Actual:** the badge stays empty. Expected: "1", and the badge disappears again after Remove.
- **Root cause:** `apps/web/src/routes/__root.tsx:16`: the badge reads the cart under its own key `["cart-count"]`,
  but all four cart mutations (`$personaId.tsx:35`, `cart.tsx:27,34`, `checkout.tsx:30`) invalidate only `["cart"]`, so
  the badge's cached cart is never refetched.
- **Fix:** the badge query uses `["cart"]`. It's the same `GET /cart` and the same `Cart` shape, so it shares the cart
  pages' cache entry and every existing invalidation refreshes it.
- **Test:** `b11-cart-badge.spec.ts`. The badge shows "1" after Add to Cart and is empty again after Remove.
  Before: failed (stayed empty). After: e2e 10/10, API 21/21, build 3/3. Web typecheck still fails only on B14.
- **Same pattern elsewhere?** No other key has been split off from a shared fetch. B16 fixed the `["favorites"]` shape
  clash, and `["cart"]` holds `Cart` everywhere it's used.

## B12: Login response missing username

- **Status:** Open
- **Source:** Spotted
- **Root cause:** `apps/api/src/routes/auth.ts:62-65` omits `username` (register at `:42` includes it).

## B13: Cart "−" at quantity 1 sends 0

- **Status:** Open
- **Source:** Spotted
- **Root cause:** `apps/web/src/components/CartItem.tsx:41` has no `disabled` prop, and the server's 400 is swallowed.

## B14: Web typecheck fails

- **Status:** Open
- **Source:** Spotted (found in the first `pnpm typecheck` run)
- **Root cause:** `apps/web/src/routeTree.gen.ts:20` TS4023, because `SearchParams` isn't exported from `routes/index.tsx`.

## B15: Bodyless DELETE sends Content-Type JSON, and Fastify rejects it with 400

- **Status:** Fixed ([PR #8](https://github.com/mconatser/interview-built-by-a-clanker/pull/8); found while fixing B7)
- **Source:** Spotted
- **Symptom:** even with CORS fixed, "Remove" in the cart (and unfavorite) leaves the item in place. The 400 is swallowed.
- **Reproduce:** `scratchpad/repro/b7b.mts` (Fastify `inject`, real cart route). DELETE `/cart/:id` with no body:
  with `content-type: application/json` → **400 `FST_ERR_CTP_EMPTY_JSON_BODY`**. Without it → 200, and the cart is empty.
  In the browser, the Playwright "Remove" test (moved from B7) still shows the item after clicking Remove.
- **Root cause:** `apps/web/src/lib/api.ts:22-25` sets `Content-Type: application/json` on every request, including
  `api.delete`, which has no body. Fastify 5 rejects an empty body declared as JSON.
- **Confirmed in the browser:** a Playwright response log during cart "Remove" showed
  `DELETE /cart/cart-1 → 400 FST_ERR_CTP_EMPTY_JSON_BODY`, with request `content-type: application/json`.
- **Fix:** `request()` adds `Content-Type: application/json` only when `options.body !== undefined`. POST and PUT with a
  body are unchanged. Caller-supplied headers still override.
- **Test:** `apps/web/e2e/b15-delete-without-body.spec.ts`. Cart "Remove" leads to "Your cart is empty" and the API cart
  is empty. "Remove from favorites" leads to the empty state and the API favorites are empty. Before: 2 failed. After:
  e2e 6/6, API 17/17, build 3/3. Web typecheck still fails only on B14.
- **Same pattern elsewhere?** `api.ts` is the only HTTP client in the web app. `api.post` and `api.put` with no body
  now also send no content type, which Fastify accepts.

## B16: Detail and favorites pages store different shapes under the same `["favorites"]` query key

- **Status:** Fixed ([PR #10](https://github.com/mconatser/interview-built-by-a-clanker/pull/10); split out of B8)
- **Source:** Spotted
- **Symptom:** going from the favorites page to a persona's page **crashes** ("favorites.includes is not a function").
  Going from a persona's page to the favorites page shows "You haven't favorited any personas yet." although favorites
  exist.
- **Reproduce:** Playwright `apps/web/e2e/b16-favorites-cache-shape.spec.ts`.
  Both orders fail as described above.
- **Root cause:** `apps/web/src/routes/personas/$personaId.tsx:22-28` caches `string[]` (ids) under `["favorites"]`, while
  `apps/web/src/routes/favorites.tsx:16-20` caches `{ favorites: Persona[] }` under the same key. Whichever page loads
  first fills the cache, and the other page reads data in the wrong shape.
- **Fix:** the detail page's query now caches the same raw `{ favorites: Persona[] }` response as the favorites page and
  derives ids with `select: (res) => res.favorites.map((p) => p.id)`. `select` changes what this page receives, not what
  is stored in the cache. Only `$personaId.tsx` changed.
- **Test:** `apps/web/e2e/b16-favorites-cache-shape.spec.ts`. Favorites page → persona page renders the h1 and "Add to
  Cart" (no crash). Persona page → favorites page lists the favorite. Navigation is in-app, so the cache is shared.
  Before: 2 failed. After: e2e 9/9, API 17/17, build 3/3. Web typecheck still fails only on B14.
- **Same pattern elsewhere?** No. `["cart"]` is `Cart` in both `cart.tsx` and `checkout.tsx`. Every other key has a single
  user (`["cart-count"]` and `["personas"]` are B11 and B10).

## B17: Email addresses are case-sensitive (duplicate accounts, login fails on different case)

- **Status:** Reproduced on `fix/email-case-insensitive`, awaiting OK to fix (from Spotted triage)
- **Source:** Spotted (account integrity)
- **Symptom:** `casey@example.com` and `Casey@Example.com` register as two separate accounts. Logging in as
  `CASEY@example.com` fails with 401 for the account registered as `casey@example.com`.
- **Reproduce:** `apps/api/test/email-case.test.ts` (Fastify `inject`, no server). Register `casey@example.com` (201), then:
  register `Casey@Example.com` → **201** (expected 409); log in as `CASEY@example.com` → **401** (expected 200).
- **Root cause:** emails are stored and compared exactly as typed. `registerSchema` and `loginSchema`
  (`packages/shared/src/schemas/auth.ts:5,12`) don't normalize them, and `db.users.getByEmail` (`apps/api/src/db.ts:398`)
  compares with `===`.
- **Proposed fix:** normalize in the shared schemas (`z.string().trim().toLowerCase().email()` for both register and
  login), so stored and looked-up emails are always lowercase. One place, and both routes get it.

## Spotted (not yet investigated)

- `apps/api/src/routes/personas.ts:11-12`: NaN price params silently return an empty list, and `personaFilterSchema` is unused
- `apps/api/src/routes/favorites.ts:26`: unvalidated body, so a missing body returns 500
- `apps/api/src/routes/*`: `error: parsed.error.flatten()` is an object, and `web/lib/api.ts:40` shows "[object Object]"
- `apps/api/src/index.ts:17`: hardcoded JWT secret, and `auth.ts:39,61` tokens have no expiry
- `apps/api/src/routes/checkout.ts:28`: missing personas are skipped silently, so an order can have 0 items
- `apps/web/src/routes/personas/$personaId.tsx:22`: favorites query not gated on `user`, so anonymous views get a 401
- `apps/web/src/routes/cart.tsx:93-95`: absolute quantity updates with no pending guard, so fast clicks are lost
- `apps/web/src/routes/index.tsx:23-24`: validateSearch drops `minPrice=0` and allows NaN
- `apps/web/src/components/SearchBar.tsx:22`: debounce effect depends on an inline `onChange`
- `apps/web/src/components/StarRating.tsx:17,23`: duplicate SVG gradient id `half` across instances
- `apps/web/src/routes/cart.tsx:38`, `favorites.tsx:30`, `checkout.tsx:34`: auth `isLoading` ignored, so a refresh flashes "Sign in"
- `apps/web/src/routes/*`: query errors render as empty states, and mutations have no onError
- `apps/web/src/lib/auth.tsx:40-45`: `/auth/me` errors other than 401 leave the token set but the user null
- (sweep) `apps/api/src/routes/personas.ts:11-12`: truthiness check drops `minPrice=0` / `maxPrice=0` (`maxPrice=0` returns everything)
- (sweep) `apps/api/src/db.ts:421`, `shared/schemas/cart.ts`: cart quantity has no `.max()`, and repeated adds grow without bound
- (sweep) `apps/api/src/routes/checkout.ts:23-44`: a second copy of the cart money math (drift risk); an empty `items` still creates a 201 order with total 0
- (sweep) `apps/api/src/routes/favorites.ts:26`: empty POST body returns 500 instead of 400
- (sweep) `apps/api/src/db.ts:372-386`: unknown `sort`/`tier`/`specialty` silently ignored or empty, with no 400
- (sweep) `apps/api/src/routes/auth.ts:27-33`: usernames not unique
- (sweep) `apps/web/src/routes/register.tsx:59-68`: no `maxLength` on username (the schema allows 30); a longer name gets a 400 shown as "[object Object]"
- (sweep) `apps/web/src/routes/personas/$personaId.tsx:17-48`: the component isn't remounted when `personaId` changes, so addToCart `isPending` carries over to the next persona
- (sweep) `apps/web/src/components/SearchBar.tsx:11-13`: syncing local state from the URL can drop keystrokes typed while the URL update is in flight
- (sweep) `apps/api/src/db.ts:161-163`: seed tier and price inconsistent (Enterprise p-007 $59.99 < Pro p-005 $69.99), possibly intended
