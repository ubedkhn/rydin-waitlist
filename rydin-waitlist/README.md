# Rydin — Waitlist Launch Page

**India's First True Peer-to-Peer Mobility Network**
_Share the Ride. Split the Cost. Travel Smarter._

Rydin is a cost-sharing commute network, not a taxi service. Everyone on it is
already making a trip — a student driving to DAVV, an engineer driving to Crystal
IT Park — and the empty seats are what get shared. Riders contribute toward the
_documented fuel cost_ of the distance travelled; drivers set no price and earn no
margin. Rydin takes a flat ₹4 (two-wheeler) or ₹8 (four-wheeler) per trip to keep
verification and matching running. No commission, no surge.

This repository is the **waitlist launch page**: a single, heavily-animated
marketing page whose centrepiece is an interactive "Queue Pass" — a torn-ticket
signup that issues a deterministic pass ID, a queue position, and a referral link,
all persisted in the browser.

---

## Two ways to view it

| Deliverable | What it is | How to run |
| --- | --- | --- |
| **`rydin-preview.html`** | A single, self-contained file — the whole page, hand-rolled animation, no build step. | **Double-click it.** Opens in any modern browser. |
| **`rydin-waitlist/`** | The real, modular Next.js App Router source (TypeScript + Tailwind + Framer Motion). | `npm install && npm run dev` |

Both are built from the same source of truth: the standalone preview's copy,
fare maths and validation are ported verbatim from `lib/rydin/*`, and its CSS is
compiled from the same `tailwind.config.ts` the app uses (see
[The standalone preview](#the-standalone-preview) below), so the two cannot drift
on tokens, type scale or economics.

---

## Quick start (Next.js app)

```bash
cd rydin-waitlist
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build (see note on SWC + network below)
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit — the strict-mode type gate
npm run lint         # next lint
```

Requirements: Node 18.18+ (or 20+), npm 9+.

---

## Project structure

```
rydin-waitlist/
├── app/
│   ├── layout.tsx            Root layout, metadata, fixed gradient floor, font <link>
│   ├── page.tsx              Full page assembly, wrapped in <WaitlistProvider>
│   └── globals.css           Base layer + the road / ticket-stub component classes
├── components/
│   ├── hero/
│   │   ├── Hero.tsx          Hero section (server component)
│   │   └── WaitlistCard.tsx  ⚠ SUPERSEDED — safe to delete (see notes)
│   ├── waitlist/
│   │   ├── WaitlistProvider.tsx   Shared "have you joined" state (Context)
│   │   ├── WaitlistCard.tsx       The interactive 3-step signup  ← the one in use
│   │   ├── QueuePass.tsx          The torn-ticket pass shown after joining
│   │   └── SpotLookupModal.tsx    "Check my spot" lookup
│   ├── bento/BentoGrid.tsx        "Why it's different" feature grid
│   ├── sections/
│   │   ├── TelemetryStrip.tsx     Live counters
│   │   ├── SavingsCalculator.tsx  Two-baseline savings calculator
│   │   ├── ReferralRewards.tsx    Reward ladder + leaderboard
│   │   └── FaqAccordion.tsx       FAQ
│   ├── site/
│   │   ├── Header.tsx             Sticky header + lookup trigger
│   │   ├── Footer.tsx             Closing CTA band + footer
│   │   └── StickyCta.tsx          Mobile sticky call-to-action
│   └── ui/
│       ├── motion.tsx             Framer Motion wrappers (Reveal, etc.)
│       └── primitives.tsx         Shared primitives (RoadDivider, orbs, badges…)
├── lib/
│   ├── rydin/
│   │   ├── constants.ts      Brand, hubs, queue economics, reward tiers, fare model, FAQs
│   │   ├── types.ts          Shared types
│   │   ├── calc.ts           Savings model, deterministic IDs, queue-position maths
│   │   ├── validate.ts       Per-step form validation
│   │   └── storage.ts        Versioned localStorage read/write
│   └── utils.ts              `cn()` class-name helper
├── tailwind.config.ts        Design tokens (colours, type ramp, keyframes)
├── tailwind.preview.config.ts  Same tokens, content repointed at the preview file
├── postcss.config.mjs
├── next.config.mjs
└── tsconfig.json
```

---

## How the savings model works

The calculator reports against **two baselines**, because they answer different
questions (`lib/rydin/calc.ts › computeSavings`):

- **vs a commercial cab** — the gap is huge (~80%), but most of it is the driver's
  labour, the vehicle's depreciation and the platform's ~25% cut. Real, but it
  flatters us, so it is _reported_ (the yearly-savings number) and not used for the
  headline claim. No surge multiplier is applied, which keeps the comparison honest
  rather than loud.
- **vs driving solo** — the honest car-owner comparison, and the only ratio that
  actually depends on how many seats fill. This is where the conservative
  "up to 50% cheaper" claim comes from. Across the full input grid the ceiling is
  ~73%, so 50% is a floor, not a boast.

Crucially, the model is honest about its own edges. On a short two-wheeler trip the
flat per-trip fee can exceed the fuel it splits, so **riding alone is genuinely
cheaper**. Rather than round that up to "0% savings", the UI switches to a
`costsMoreThanSolo` state and tells you the break-even distance (derived, not
configured, so it stays correct if mileage, fee or occupancy change).

Assumptions are stated on the page: ₹106.5/L petrol, 45 km/L (bike) / 16 km/L
(car), 2 trips/day, 22 (weekday) or 30 (all-week) commute days a month.

---

## Design system

- **Palette** — midnight `ink` ground (`#090A0F` → `#0F172A`), emerald accent for
  trust/action, amber reserved _only_ for wallet/referral economics so money always
  reads as a different material.
- **Type** — Geist for display and body; **Geist Mono for every number** (fares,
  queue positions, referral codes, route codes), the way Indian transit runs on
  printed numerals. Fluid `display-*` ramp clamps from a 360px phone up to 4K.
- **Road motif** — a dashed centreline (`.road-dash`) is the structural device:
  section dividers and the signup's progress track. Its travelling animation
  (`road-flow`) is tuned to the 34px gradient period so the loop never jumps.
- **Ticket stub** — the Queue Pass is not a success card, it's a torn ticket: two
  punched notches, a perforated tear line, mono numerals throughout.
- **Motion** — reveal-on-scroll, count-ups, ambient orb drift, a CTA sheen. All of
  it honours `prefers-reduced-motion` (in CSS, and via `useReducedMotion` in the
  app's Framer Motion layer).

---

## Notes & known constraints

**1. Fonts — swapping to `next/font/google` on Next 15+.**
`app/layout.tsx` loads Geist and Geist Mono with a plain `<link>` rather than
`next/font/google`. That's deliberate: Geist only landed in Next's bundled font
data in newer releases, and a hard `next/font` import breaks the build on older
ones. If you're on **Next 15+**, you can remove the render-blocking request by
switching to:

```tsx
import { Geist, Geist_Mono } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
// then add `${geist.variable} ${geistMono.variable}` to <html className=...>
// and point tailwind.config.ts fontFamily at the CSS variables.
```

Delete the three `<link>` tags in `<head>` once you do.

**2. `components/hero/WaitlistCard.tsx` is superseded — safe to delete.**
An earlier, static version of the card lives at `components/hero/WaitlistCard.tsx`.
The component actually in use is `components/waitlist/WaitlistCard.tsx` (that's what
`Hero.tsx` imports). The old file is not imported anywhere and can be removed; it
was left in place only because automated deletion was declined during development.

**3. `package.json` pins Next 14; the dev sandbox happened to have Next 16.**
The dependency set is pinned to a coherent **Next 14 / React 18** line
(`next ^14.2.5`, `react/react-dom ^18.3.1`, `framer-motion ^11`,
`lucide-react ^0.427`, `tailwindcss ^3.4`). Type-checking (`tsc --noEmit`) and the
Tailwind compile both pass against these. If your `node_modules` was seeded with a
different Next major, run a clean `npm install` to match the pins. Note that
`next-env.d.ts` is intentionally git-ignored — Next regenerates it on `dev`/`build`,
so don't be surprised if its exact contents differ per Next version.

**4. `next build` needs network access for the SWC binary.**
On first run in a fresh environment, Next downloads a platform-specific SWC
compiler binary from the npm registry. In a network-restricted environment that
download fails (and so does `next build`). `npm run dev` and `npm run typecheck`
work without it. This is an environment constraint, not a code issue.

**5. Persistence is browser-local.**
There is no backend. Queue passes, positions and referral counts are stored in
`localStorage` (versioned, `rydin.waitlist.v1`). A pass created in one browser
won't appear in another, and "Check my spot" only finds passes on the current
device. Pass IDs, referral codes and positions are deterministic (FNV-1a over
name + mobile), so a refresh never reissues a different pass.

---

## The standalone preview

`rydin-preview.html` is a faithful single-file port for quick sharing:

- **React 18 + Babel** are loaded from a CDN (unpkg), so the file stays a single
  artifact. This means the preview **needs internet** to boot the JavaScript.
- **Tailwind is _not_ the Play CDN.** The stylesheet is compiled from
  `tailwind.preview.config.ts` (which reuses the app's exact token layer) and
  inlined into the file, so styling is identical to production and renders even
  offline. To regenerate it after changing markup or tokens:

  ```bash
  cd rydin-waitlist
  npx tailwindcss -c tailwind.preview.config.ts -i app/globals.css -o preview.css --minify
  # then paste preview.css into the <style> block of rydin-preview.html
  ```

- **Animation is hand-rolled** (IntersectionObserver reveals, a
  `requestAnimationFrame` count-up, CSS keyframes) rather than Framer Motion, which
  isn't available without a bundler. Behaviour and easing mirror the app.

The preview is a preview: the leaderboard is illustrative, and there's no network
or real KYC. It exists so someone can _see and click_ the whole experience without
installing anything.

---

_Built in Madhya Pradesh._
