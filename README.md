# Rowdy's Den — Club Billing (React Frontend)

Production-style React + TypeScript frontend for the Rowdy's Den FastAPI
backend (`../backend`). Plain CSS design system (dark-first), Context API
state, `fetch` REST client, React Router.

## Stack

React 18 · TypeScript · Vite · React Router DOM · lucide-react · plain CSS ·
Context API (Theme → Toast → Auth → Club)

## Quick start (connected to the backend)

```bash
# terminal 1 — backend on :8000
cd backend && pip install -r requirements.txt && cp .env.example .env && python run.py

# terminal 2 — frontend on :5173
cd frontend && npm install && cp .env.example .env && npm run dev
```

Open http://localhost:5173. In dev, `VITE_API_URL=/api` and the Vite dev
server proxies `/api/*` to the FastAPI backend
(`vite.config.ts` → `server.proxy`), so no CORS setup is needed locally.
For production, point `VITE_API_URL` at the deployed backend
(`https://your-api.vercel.app/api`) and add the web origin to backend
`CORS_ORIGINS` + Google Authorized JavaScript Origins.

## Environment (`.env.example`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base ending in `/api` (default `/api`, proxied in dev) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth **Web** Client ID — must equal backend `GOOGLE_CLIENT_ID` |
| `VITE_AUTH_DEV_MODE` | Show the development email login form (false in production) |

## Authentication flow

1. Google Identity Services renders the official button; the credential is
   exchanged at `POST /api/auth/google` → `{ user, token }`.
2. JWT is stored in `localStorage` and attached as `Authorization: Bearer`.
3. Global 401s clear the session and return to the login screen.
4. Non-master users without an unexpired `trial`/`active` subscription see the
   plan-selection / pending-activation onboarding screen (HTTP 402 is enforced
   by the backend).
5. `AUTH_DEV_MODE` shows a dev email login next to Google sign-in.

## Screens (routes)

`/tables` (free → occupied timer → final bill with winner/2v2 teams, item
chips, premium/pass/old-due rows, due-limit warning, **quick actions
mid-session: +Advance with mode / Note / Move table**, **peak-rate badge**,
**receipt auto-opens on confirm**) · `/players` (cards with plan badges,
balances, payments, record modal) · `/due-desk` (**WhatsApp Remind → wa.me**
prefilled) · `/items` (chips with live stock counts + out-of-stock lock,
cost-per-piece, **reorder level per item**, restock modal that auto-records
the purchase as an expense, est. profit preview, **receipt on create** — plus
item chips right on the occupied table while the timer runs) · `/item-bills`
(mark-paid, delete reversal that also restores stock, **58mm print**) ·
`/expenses` (month-wise expense book with categories, add/delete, per-day
run-rate) · `/finance` (P&L sheet, balance sheet, stock sales & profit sheet,
daily cash sheet with running balance, **table utilisation & peak-hours
report**, CSV downloads) · `/day-close` (**rozana closing — mode/source
split, expenses, net-in-hand drawer line, top-5 items**) · `/frames`
(**month filter + totals**, winner correction modal, **58mm print**) · `/tournaments` (**two formats**: knockout bracket OR **league round-robin** with
live **points table** & auto-champion; players with phones & entry fees → auto
bracket/fixtures where each match can go "On Table" with a live ticking timer
and its own table rate — the loser pays the computed table charge; players
panel hides after start for a clean bracket-only, mobile-friendly view;
champion banner + prize payouts booked as expenses) · `/logs` · `/admin` (monthly revenue incl. tournament entries,
colored membership plan tags + CSV) · `/settings` (grid — logo & club
settings, table pricing incl. **peak/off-peak windows**, membership plans,
**data export & backup CSV/JSON**) · `/master` (Master Admin SaaS
panel; masters only). Members with dues show their name in red everywhere
(player pick, final bill chips, dropdowns); the final bill names exact wallet
amounts and shows frame-pass frames left.

Global chrome: **alerts bell** (low stock vs reorder level · due-limit ≥70% ·
plans expiring ≤7d · dropdown jumps) · **Ctrl+K global search** (pages,
members/phone, tables, items, bills — `?q=` deep links via `useSearchSeed`)
· **PWA** (manifest + service worker, static shell only — `/api/*` never
cached, PROD-only registration, on-brand icons). Receipt printing: shared
`ReceiptModal` (58mm thermal CSS, `body.do-print` + portal `#print-root`).

## ✨ AI Smart Insights (everywhere)

`components/InsightsCard.tsx` is a rule-based coach rendered on **every
operational screen** — Tables (compact strip: live tables + running estimate),
Items (stock-out / dead stock / top profit item), Expenses (top category
share + month run-rate), Finance (P&L verdict + expense concentration),
Tournaments (unpaid entries, running bracket + table charges, event recap),
Due Desk & Players (due risk, membership conversion, monthly-plan expiry,
wallet float) and Admin (the full card). Props: `month`, `scopes`
(`live|stock|finance|revenue|expenses|members|tournaments`), `compact`,
`max`, `title` — and pass-through data (`report` / `finance` / `tournaments`)
so screens that already loaded a report never refetch it. Pure rule-based
logic over live API data — no external AI keys.

The client only **estimates** bills — FastAPI computes the authoritative
result; every mutation toasts success/error and refreshes club data.

## ✦ den_app parity (Flutter companion → web)

This frontend now mirrors the Flutter app (`den_app`) design system and
feature set, while keeping the web's sidebar navigation.

**Design system** — `src/styles/global.css` tokens are a 1:1 port of
`den_app/lib/src/theme.dart` (AppColors) + `dimensions.dart` (Dimens):

| App token | Web variable |
|---|---|
| `AppColors.light` (bg `#FFFFFF`, muted `#F4F4F6`, border `#E9E9EE`, text `#131316`) | `:root` / `[data-theme='light']` |
| `AppColors.dark` (bg `#0C0C0E`, elevated `#141416`, text `#F5F5F7`) | `[data-theme='dark']` |
| `primary` `#1C9050` / `#2BAC65`, green/red/gold/blue accents | `--primary`, `--accent-*` |
| `Dimens.radiusCard 14` · `radiusField 10` · buttons `8` | `--radius-card`, `--radius-sm`, `--radius-btn` |
| `Dimens.buttonH/ctaH/fieldH/searchH`, `btnFont/controlFont/fieldFont` | `--h-btn*`, `--h-field`, `--font-*` |
| `fontFamily: 'Avenir Next'` | `--font` |

Light is the **product default** (as in the app); dark is one tap away.
Cards are borderless-ish with a soft floating shadow, StatTiles carry the
4px tone rail, segmented buttons fill with `--primary`, inputs focus with a
1.4px primary border — all exactly like the app.

**Screens ported from the app**

| den_app source | Web route / file |
|---|---|
| `workspace_hubs.dart` → `HomeOverview`, `_ClubStatusSwitch`, `_Action` | `/home` — `components/HomeScreen.tsx` (greeting, club OPEN/CLOSED switch, "Today's pulse" hero, 4 stat tiles, 8 quick actions) |
| `bookings_screen.dart` | `/bookings` — `components/BookingsScreen.tsx` (`GET/DELETE /clubs/{id}/bookings`) |
| `orders_screen.dart` | `/orders` — `components/OrdersScreen.tsx` (`GET /clubs/{id}/orders`, search + status filter) |
| `items_screen.dart` → `StockScreen` | `/stock` — `components/StockScreen.tsx` (item master w/ photo, restock→expense, reorder triage, stock valuation) |
| `onboarding_screen.dart` | `components/OnboardingScreen.tsx` — 6-slide first-run intro before login |
| `main.dart` → `BrandSplashScreen` | `components/SplashScreen.tsx` — black splash while the session restores |
| `workspace_hubs.dart` → `ClubWorkspace` / `RecordsWorkspace` tabs | `components/WorkspaceTabs.tsx` — Club (Games·Players·Dues·Frames·Bookings) & Records (Counter·Stock·Bills·Orders·Tournaments·Logs) strips above the page |
| `offline_queue.dart` | `lib/offlineQueue.ts` — counter sales queue in localStorage, `(N pending)` badge + auto-replay on `online` |
| `shell.dart` → `_showQrCode`, alerts sheet | Topbar **QR** button + `AlertsBell` (out-of-stock red / low-stock gold split) |
| `settings_screen.dart` → text size | Settings → **Appearance** (theme + text size 85–125%) |
| `rowdy_care.dart` chips | `SupportChat` quick topics (incl. "Plan / subscription", "Winner kaun pay karta hai") |

**New data fields** (already served by the shared FastAPI backend):
`Club.qrCode`, `ClubSettings.isOpen`, `MenuItem.image` — editable from
Settings (logo + payment QR + open/closed) and the item modals.

Not ported: Android/iOS-only pieces — `flutter_local_notifications`
(no background scheduler on the web) and on-device `pdf`/`printing`
share-sheets, which the web already covers with the 58mm `ReceiptModal`,
`PrintSheetModal` and `.xlsx`/JSON exports.

### Running without the backend (design review)

`mock-api/server.mjs` is a dependency-free fixture backend for local UI work:

```bash
node mock-api/server.mjs     # :8000 — clubs, data, bookings, orders, auth/dev
npm run dev                  # :5173 — vite proxies /api → :8000
```

Sign in with the dev email form (any address). Delete the folder if you
don't need it; nothing in `src/` imports it.

## Deploy

- React SPA: any static host (Vercel/Netlify). Set `VITE_API_URL` and
  `VITE_GOOGLE_CLIENT_ID` as build-time env vars.
- `npm run build` → `dist/`; `npm run preview` serves it locally.
- `npm run lint` — zero-warning ESLint gate.
