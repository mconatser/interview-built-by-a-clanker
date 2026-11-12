# Debugging report: Agentic Personas Storefront

**Summary:** 17 bugs found, **12 fixed and merged** (PRs #1–#13), 5 open (1 of them reproduced with a failing test), plus
16 smaller items triaged but not reproduced. Tests: **0 at the start** (no test runner in any package; build 3/3 and
typecheck 1 error), **32 now**: 21 API tests (vitest + Fastify `inject`, 21/21 on `main`) and 11 Playwright e2e tests
(each passed on its fix branch). The combined e2e run on merged `main` was not repeated. Every fix had a test that
failed first.

## Fixed bugs

| Bug | Symptom | Root cause | Fix | Guarding test | PR |
| --- | --- | --- | --- | --- | --- |
| **B1** | Every logged-in page (cart, favorites, checkout, "me") returns 500, and no route checks the token | `authenticate` returned before `jwtVerify()` unless `ENFORCE_AUTH=true`, which nothing set, so `request.user` was undefined (`apps/api/src/middleware/auth.ts:3-10`) | Removed the switch so the token is always verified, and `return` the 401 reply | `apps/api/test/auth-enforced.test.ts` | [#1](https://github.com/mconatser/interview-built-by-a-clanker/pull/1) |
| **B2** | Any user can delete another user's cart items (IDs are `cart-1`, `cart-2`, …) | DELETE `/cart/:itemId` checked that the item existed but not who owned it; PUT did check (`apps/api/src/routes/cart.ts:77-79`) | Same owner check as PUT, returning 404 | `apps/api/test/cart-ownership.test.ts` | [#3](https://github.com/mconatser/interview-built-by-a-clanker/pull/3) (#2 merged into a stale base) |
| **B3** | After "Sign out", a reload signs you back in, and the next user sees the previous user's cart | `logout` reset React state only; it left `auth_token` and the shared query cache (`apps/web/src/lib/auth.tsx:55-58`) | Remove the token and `queryClient.clear()` | `apps/web/e2e/b3-logout-clears-session.spec.ts` | [#4](https://github.com/mconatser/interview-built-by-a-clanker/pull/4) |
| **B5** | Placing an order leaves the cart full, so it can be ordered again and a double click creates 2 orders | Checkout saved the order but never called `db.cart.clearForUser` (`apps/api/src/routes/checkout.ts:50-52`) | Clear the cart right after the order is saved (synchronous, so a concurrent second submit gets 400) | `apps/api/test/checkout-clears-cart.test.ts` | [#5](https://github.com/mconatser/interview-built-by-a-clanker/pull/5) |
| **B6** | Browse cards show $4999.00/mo for a $49.99 persona | `PersonaCard` rendered `price * 100` on a dollar price (`apps/web/src/components/PersonaCard.tsx:63`) | Format the price as is, like every other view | `apps/web/e2e/b6-card-price.spec.ts` | [#6](https://github.com/mconatser/interview-built-by-a-clanker/pull/6) |
| **B7** | Cart "Remove" and unfavorite do nothing; the browser blocks the request | CORS `methods` left out DELETE (`apps/api/src/index.ts:15`) | Add DELETE | `apps/web/e2e/b7-cors-delete.spec.ts` | [#7](https://github.com/mconatser/interview-built-by-a-clanker/pull/7) |
| **B15** | Even with CORS fixed, "Remove" and unfavorite still fail silently | The client sent `Content-Type: application/json` on bodyless DELETEs, and Fastify returns 400 `FST_ERR_CTP_EMPTY_JSON_BODY` (`apps/web/src/lib/api.ts:22-25`) | Send the JSON header only when there is a body | `apps/web/e2e/b15-delete-without-body.spec.ts` | [#8](https://github.com/mconatser/interview-built-by-a-clanker/pull/8) |
| **B8** | The heart on a persona page never adds a favorite | `toggleFavorite` tested `!isFavorited`, so it sent DELETE when not favorited and POST when favorited (`apps/web/src/routes/personas/$personaId.tsx:42-44`) | Test `isFavorited` | `apps/web/e2e/b8-favorite-toggle.spec.ts` | [#9](https://github.com/mconatser/interview-built-by-a-clanker/pull/9) |
| **B16** | Favorites → persona page **crashes** ("favorites.includes is not a function"); persona → favorites shows "no favorites" | The two pages cached different shapes (`string[]` vs `{favorites}`) under the same `["favorites"]` key (`$personaId.tsx:22-28` vs `favorites.tsx:16-20`) | Cache the raw response on both, and derive the ids with `select` | `apps/web/e2e/b16-favorites-cache-shape.spec.ts` | [#10](https://github.com/mconatser/interview-built-by-a-clanker/pull/10) |
| **B9** | `minPrice=60` returns the personas priced **under** $60 | The filter used `p.price <= minPrice`, copied from the maxPrice line (`apps/api/src/db.ts:365`) | `>=` | `apps/api/test/price-filter.test.ts` | [#11](https://github.com/mconatser/interview-built-by-a-clanker/pull/11) |
| **B10** | Clicking a filter changes the URL but not the list (15 cards instead of 2) | The browse query key `["personas"]` didn't include the filters, so the cached list stayed fresh for 60s (`apps/web/src/routes/index.tsx:43`) | Key the query on the same query string it fetches | `apps/web/e2e/b10-filters-refetch.spec.ts` | [#12](https://github.com/mconatser/interview-built-by-a-clanker/pull/12) |
| **B11** | The header cart badge never changes after add, remove or checkout | The badge read the cart under its own key `["cart-count"]`, but every mutation invalidates `["cart"]` (`apps/web/src/routes/__root.tsx:16`) | The badge uses `["cart"]` (same fetch and shape) | `apps/web/e2e/b11-cart-badge.spec.ts` | [#13](https://github.com/mconatser/interview-built-by-a-clanker/pull/13) |

## Found beyond the tickets

There was no ticket list; the README only says bugs are "scattered throughout". Everything above was found by mapping
the code (4 parallel mappers), a background sweep (one agent per area, working from a checklist of common bug types),
and three bugs that turned up while fixing others:

- **Security:** B1 (auth effectively off, and every protected route crashes), B2 (users can delete each other's cart items), B3 (shared device: the session and the previous user's cart survive logout).
- **Money and data:** B5 (the same cart can be ordered repeatedly, and a double submit creates two orders), B6 (prices shown 100× too high).
- **Found while fixing another bug:** B15 (a second cause behind B7: CORS was only half the problem), B16 (a second cause behind B8: the cache shape clash), B17 (from the Spotted triage).

## Left open and risks

| Bug | Status | Note |
| --- | --- | --- |
| **B17** Email is case-sensitive (`Casey@` and `casey@` are separate accounts, and login fails on different case) | **Reproduced**: `apps/api/test/email-case.test.ts` fails 2/2 on branch `fix/email-case-insensitive`, not fixed | Root cause: emails are not normalized in `packages/shared/src/schemas/auth.ts:5,12`, and `db.ts:398` compares with `===`. Fix: `z.string().trim().toLowerCase().email()` in both schemas. |
| **B12** Login response has no `username`, so the header name is blank after login | Not started | `apps/api/src/routes/auth.ts:62-65` (register includes it). |
| **B13** Cart "−" at quantity 1 sends 0 (400, swallowed) | Not started | `apps/web/src/components/CartItem.tsx:41`, no `disabled`. |
| **B14** Web typecheck fails (TS4023) | Not started | `SearchParams` isn't exported from `apps/web/src/routes/index.tsx`. One line. The build passes. |
| **B4** Weak password hash (unsalted 32-bit; "Aa" and "BB" collide, so a wrong password can log in) | Not started | `apps/api/src/routes/auth.ts:8-16`. Use `crypto.scrypt` with a salt. |

**Triaged but not reproduced (Spotted), ranked:**

| # | Priority | Item | Why it matters |
|---|---|---|---|
| S1 | **High** (security) | Hardcoded JWT secret, and tokens have no expiry (`apps/api/src/index.ts:17`, `auth.ts:39,61`) | Anyone with the source can sign a token for any `user-N`. Not reproduced: `index.ts` calls `listen()` when imported, so testing it needs a server or splitting out the app setup. |
| S2 | Medium (money) | Cart quantity has no upper limit (`shared/schemas/cart.ts`, `db.ts:421`) | `quantity: 1e9` checks out as a ~$50B order. |
| S3 | Medium (every user) | Validation errors are sent as an object, so the UI shows **"[object Object]"** (`routes/*` `flatten()`, `web/lib/api.ts:40`) | For example, registering with a 5-character password. |
| S4 | Medium | Query errors render as empty states, and mutations have no `onError` (`apps/web/src/routes/*`) | This is what hid B7, B8, B13 and B15 from users. |
| S5 | Medium | A `/auth/me` failure other than 401 leaves the token set and the user null (`web/lib/auth.tsx:40-45`) | The user looks signed out after an API blip. |
| S6 | Medium | Protected pages ignore auth `isLoading`, so a refresh flashes "Sign in" | `cart.tsx:38`, `favorites.tsx:30`, `checkout.tsx:34` |
| S7 | Low–Med | Quantity +/- has no pending guard, so fast clicks are lost (`cart.tsx:93-95`) | Same area as B13. |
| S8 | Low–Med | POST `/favorites` with no body returns 500, and the body isn't validated (`favorites.ts:26`) | Wrong status code. |
| S9 | Low–Med | Price params: `maxPrice=0` returns everything, NaN gives an empty 200, and `personaFilterSchema` is unused (`personas.ts:11-12`) | Wrong results with no error. |
| S10–S16 | Low | Anonymous 401 on `/favorites` from the detail page, StarRating gradient id collision, SearchBar debounce and dropped keystrokes, "Adding…" carries over between personas, duplicate usernames, duplicate checkout money math, seed tier vs price | Minor UX, code health, or product questions. |

**What I'd do next:** B17 (the fix is ready to write), then S1 (split `buildApp` out of `index.ts`, read
`JWT_SECRET` from the environment, add `expiresIn`), then B4, then S2, S3 and S4 together. S4 is the important one: it's
why most of these bugs were invisible to users. Also: run the full e2e suite once on merged `main`, and add CI for API
tests, e2e and typecheck.

**Risks:** the e2e suite runs against fixed ports (3001 and 5173, as the app hardcodes them) with
`reuseExistingServer: false`, so it fails rather than running against a dev server, but it can't run while `pnpm dev`
is up. The dependency changes (vitest, Playwright) were recorded by hand, because the local npm config has `save=false`.

## Mutation testing

There's no `reports/mutation/mutation.json`: the Stryker runs this session used only the clear-text reporter. One run,
on `apps/api/src/middleware/auth.ts` (the B1 fix), gave a **42.86%** mutation score: 3 killed, 2 survived, 2 no
coverage.

- **Top survivors:** the 401 response body (`{ error: "Unauthorized" }`, an ObjectLiteral and a StringLiteral mutant at
  `auth.ts:10`). `auth-enforced.test.ts` asserts the 401 status but not the body. A test that kills both:
  `expect(res.json()).toEqual({ error: "Unauthorized" })` in the missing-token and forged-token cases.
- **No coverage:** `registerAuthHook` (`auth.ts:14-15`), which nothing calls (dead code).
- **Setup note:** under pnpm, Stryker must be installed with pnpm, run with `pnpm --filter @acme/api exec stryker run`,
  and given `--plugins @stryker-mutator/vitest-runner`. Otherwise `npx` downloads the abandoned `stryker` 0.x package.

## How I worked

- **Mapped first:** four parallel read-only `code-mapper` subagents on Haiku (API, shared, web routes, web lib) built
  `CODEMAP.md` in a few minutes. I spot-checked their claims against the code before ranking anything.
- **Background sweep:** Sonnet `risk-sweeper` on the API (access, money, state) and Haiku on the web app, using a
  checklist of common bug types, while fixes went ahead. Findings went to `BUGS.md`.
- **One bug at a time:**
  - Reproduce it: Fastify `inject` scripts for the API, Playwright for anything in the browser.
  - State the root cause in one sentence, with `file:line`.
  - Write a failing test at the lowest layer that shows it, and show it failing.
  - Make the smallest fix that keeps the file's CRLF line endings, then run the whole suite.
- **Independent review:** every fix went to a `fix-reviewer` subagent on **Sonnet**, a different model from the one that
  wrote the fix (Opus). It stashed the fix and confirmed the test fails without it before approving.
- **One branch and PR per bug:** each PR description is that bug's `BUGS.md` entry. When a bug had two causes (B7 and
  B15, B8 and B16), I split it into two PRs so each has one root cause.
- **Test setup from nothing:** vitest for the API, with a `buildTestApp()` helper that registers the real routes, and
  Playwright for the web app, which starts a fresh in-memory API and Vite for each run. I checked the ports before and
  after every run.
