# Story 11.1: Foundation — design tokens, Tailwind config, vendored UI primitives, theme provider, header

**Epic:** 11 — UI Polish + Theming
**Story Key:** 11-1-foundation-tokens-and-theme
**Status:** ready-for-dev

## Story

As the developer landing the design system spec authored in `_bmad-output/planning-artifacts/ux-design.md`,
I want the design tokens (color/typography/spacing/radius/shadow/motion) installed in `globals.css`, the Tailwind config extending those tokens, the foundation Radix wrappers vendored at `src/components/ui/*` per the shadcn-pattern, the `<ThemeProvider>` + `<ThemeToggle>` (light/dark/auto with no-flicker SSR), the `<Header>` with logo slot reading from `public/brand/`, and the lucide-react icon library vendored,
So that every subsequent Epic 11 story (11.2–11.7) AND every visual integration in Epic 5-10 stories has a working design-system foundation to build against — with one place to evolve the visual language.

**Sequencing:** This story lands BEFORE any other Epic 11 story AND before any Epic 5+ story that produces visible UI. Dev-order locked: 10.1 + 10.1b → **11.1** → 11.2/11.3 → Epic 5 → 11.4/11.5 → Epic 6 → 11.6 → Epics 7a/7b/8 → 11.7 → Epic 9 → 10.2.

## Acceptance Criteria

**AC1 — Design tokens in `src/app/globals.css`**
- File: `src/app/globals.css` (already exists from create-next-app scaffold; extended).
- Tokens lifted verbatim from `ux-design.md` §"Visual Design Foundation → Color System":
  - **Light mode** scoped under `:root[data-theme="light"]` with all 21 color tokens (`--bg`, `--surface`, `--surface-elevated`, `--surface-sunken`, `--border`, `--border-strong`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-foreground`, `--accent-subtle`, `--success`, `--success-foreground`, `--warning`, `--warning-foreground`, `--error`, `--error-foreground`, `--info`, `--info-foreground`, `--focus-ring`).
  - **Dark mode** scoped under `:root[data-theme="dark"]` with the same 21 tokens at dark-mode HSL values per the spec.
  - HSL channel triples (e.g., `--accent: 220 80% 50%;`) so Tailwind utilities can apply opacity (`bg-accent/50`).
- Motion tokens (per `ux-design.md` §"Animation Guidelines → Motion Tokens"):
  - `--duration-fast: 100ms`, `--duration-base: 200ms`, `--duration-slow: 400ms`, `--duration-extended: 600ms`
  - `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)`, `--ease-spring: cubic-bezier(0.5, 1.5, 0.5, 1)`
- Shadow tokens (light mode):
  - `--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);`
  - `--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);`
  - `--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);`
- Dark mode override (per spec — shadows are functionally invisible on dark; use border-strength shifts instead):
  - Dark-mode shadow custom properties resolve to `0 0 0 1px hsl(var(--border) / 0.4)` etc. so existing `box-shadow` utility classes still produce a visible elevation cue without a literal shadow.
- Reduced-motion global rule:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
  ```
- Keyframes for the cross-app animation library (`slide-in`, `fade-in`, `pulse-once`, `draw-check`, `toast-in`, `page-enter`) lifted from the visualizer.
- Body element gets `transition-colors duration-base ease-in-out` so theme flips animate smoothly.

**AC2 — Tailwind config extends from CSS custom properties**
- File: `tailwind.config.ts`.
- `theme.extend.colors` consumes every color token via `'hsl(var(--<token>) / <alpha-value>)'` per the spec's example (`ux-design.md` §"Visual Design Foundation → Color System → Tailwind config").
- `theme.extend.transitionDuration` adds `fast`, `base`, `slow`, `extended` mapping to the CSS custom properties.
- `theme.extend.transitionTimingFunction` adds `out`, `in-out`, `spring` per the spec.
- `theme.extend.fontFamily` adds `sans` (Inter via `next/font` reference) and `mono` (JetBrains Mono) — the actual font loading happens via `next/font/local` in `src/app/layout.tsx` (AC8).
- The default Tailwind spacing/radius scales are NOT overridden — they match the spec exactly per `ux-design.md` §"Spacing Scale" + §"Radius".
- A Vitest unit test (`src/lib/markdown/pipeline.test.ts`-style — colocated under `tests/unit/tailwind.test.ts`) reads `tailwind.config.ts`'s exports and asserts every documented token is present in the colors map.

**AC3 — Foundation Radix wrappers vendored at `src/components/ui/*`**
- 14 component files, ~30-80 lines each, following the shadcn-pattern (Tailwind classes + Radix primitive + `className` override via `cn()`):
  - `button.tsx` — variants per `ux-design.md` §"UX Consistency Patterns → Button Hierarchy": `primary`, `secondary`, `ghost`, `destructive`. Sizes: `default`, `sm`, `lg`, `icon`. Polymorphic via Radix `<Slot>` for `asChild`.
  - `card.tsx` — `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardContent>`, `<CardFooter>` subcomponents. Default `bg-surface border border-border rounded-lg`.
  - `dialog.tsx` — wraps `@radix-ui/react-dialog`. `<Dialog>`, `<DialogTrigger>`, `<DialogContent>`, `<DialogHeader>`, `<DialogTitle>`, `<DialogDescription>`, `<DialogFooter>`, `<DialogClose>`. Backdrop animates with `fade-in`; content with `fade-in + scale-95-to-100`.
  - `dropdown-menu.tsx` — wraps `@radix-ui/react-dropdown-menu`. `<DropdownMenu>`, `<DropdownMenuTrigger>`, `<DropdownMenuContent>`, `<DropdownMenuItem>`, `<DropdownMenuSeparator>`, `<DropdownMenuLabel>`.
  - `tabs.tsx` — wraps `@radix-ui/react-tabs`. `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`. Trigger active state uses `bg-surface text-text-primary shadow-sm` (matches the theme-toggle pill pattern).
  - `tooltip.tsx` — wraps `@radix-ui/react-tooltip`. `<TooltipProvider>` (mounted at app root in `layout.tsx`), `<Tooltip>`, `<TooltipTrigger>`, `<TooltipContent>`. 200ms open delay; instant close.
  - `collapsible.tsx` — wraps `@radix-ui/react-collapsible`. `<Collapsible>`, `<CollapsibleTrigger>`, `<CollapsibleContent>`. Height transition via `--radix-collapsible-content-height` CSS variable.
  - `checkbox.tsx` — wraps `@radix-ui/react-checkbox`. Visible focus ring; checkmark icon from lucide-react.
  - `radio-group.tsx` — wraps `@radix-ui/react-radio-group`. `<RadioGroup>`, `<RadioGroupItem>`. Dot indicator visible at center of selected item.
  - `progress.tsx` — wraps `@radix-ui/react-progress`. `<Progress>` with `value` prop. Indicator transitions width with `duration-base ease-out`.
  - `separator.tsx` — wraps `@radix-ui/react-separator`. Horizontal default; vertical via `orientation="vertical"` prop.
  - `badge.tsx` — variants: `default`, `success`, `warning`, `error`, `info`, `outline`. Each uses the corresponding semantic color token + foreground.
  - `input.tsx` — text input with focus-ring + error state (via `aria-invalid="true"` selector). Includes a `<FormError>` slot pattern: when an `<Input>` is followed by a sibling `<p data-form-error>`, the input's border switches to `border-error`.
  - `textarea.tsx` — multi-line input with autosize via JS (small inline script using `field-sizing: content` where supported, fallback to JS height adjustment). Char counter slot (`<TextareaCounter>`) for char-cap displays.
- All 14 components export their root + sub-components named (no default exports; no barrel `index.ts` per `ux-design.md` §"Component Implementation Strategy").
- All accept a `className?: string` prop forwarded via `cn()`.
- All forward `ref` properly (use `React.forwardRef`).

**AC4 — `cn()` utility at `src/lib/utils.ts`**
- File: `src/lib/utils.ts`.
- Single export: `cn(...inputs: ClassValue[]): string` — composes `clsx` + `tailwind-merge`.
- Direct deps added to `package.json`: `clsx@^2.1.0`, `tailwind-merge@^2.5.0`.
- Vitest case at `src/lib/utils.test.ts`: `cn('p-2', 'p-4')` returns `'p-4'` (tailwind-merge dedupes); `cn('text-sm', undefined, 'font-medium', false && 'hidden')` returns `'text-sm font-medium'`.

**AC5 — `<ThemeProvider>` SSR-safe with no first-paint flicker**
- File: `src/components/theme-provider.tsx`.
- Client Component (`'use client'`).
- Reads from `localStorage.theme` (`'light' | 'dark' | 'auto'`); defaults to `'auto'` on first load.
- For `auto`: reads `window.matchMedia('(prefers-color-scheme: dark)').matches` to determine the resolved theme.
- Sets `document.documentElement.setAttribute('data-theme', <resolved>)` — `'light'` or `'dark'`.
- Listens for `matchMedia` change events when in auto mode; re-resolves and updates `data-theme`.
- Exports a `useTheme()` hook returning `{ theme: 'light' | 'dark' | 'auto', resolvedTheme: 'light' | 'dark', setTheme: (t) => void }`.
- **No-flicker contract:** an inline `<script>` is injected at the top of `<head>` in `src/app/layout.tsx` BEFORE any rendered content. The script (~10-15 lines, runs synchronously) reads `localStorage.theme`, resolves auto-mode via `prefers-color-scheme`, and sets `data-theme` on `<html>` — all before the body paints. This is the pattern Vercel's docs use; it eliminates the FOUC of light mode briefly showing on a dark-mode page load.
- Vitest case at `src/components/theme-provider.test.tsx`: hook returns expected `resolvedTheme` for each of light/dark/auto inputs (mocking `window.matchMedia`).

**AC6 — `<ThemeToggle>` segmented control with sliding pill**
- File: `src/components/theme-toggle.tsx`.
- Client Component. Three buttons: `Light` / `Dark` / `Auto`. Each has an icon (`Sun`, `Moon`, `Monitor` from lucide-react) + label.
- Wraps `<DropdownMenu>` for narrow viewports (<768px) — surfaces the three options as menu items. On wide viewports (≥768px), renders inline as the segmented control with the sliding pill behind the active option.
- Sliding-pill positioning per `ux-design.md` §"Per-Component Animation Contracts → `<ThemeToggle>`": absolute-positioned `<span class="pill">` whose `transform: translateX(...)` and `width` are computed from the active button's `offsetLeft` + `offsetWidth`, animated with `transition: transform var(--duration-base) var(--ease-in-out)`.
- Pill repositions on resize (via `window.addEventListener('resize', ...)` in a `useEffect`).
- Reduced-motion: pill snaps to position; tokens still transition (theme value changes the CSS variables; the var-change is a value change, not a property transition, so reduced-motion doesn't suppress it).
- Vitest case: clicking a button calls `setTheme()`; pill's `transform` style is updated; `aria-pressed` flips on the buttons.
- Playwright case in `tests/e2e/theme-toggle.spec.ts`: clicks each toggle option; asserts the resolved `data-theme` attribute on `<html>`; asserts `localStorage.theme` is updated; reloads the page and asserts the choice persists.

**AC7 — `<Header>` component with logo slot**
- File: `src/components/header.tsx`.
- Server Component (default).
- Layout per `ux-design.md` §"Visual Design Foundation" + the visualizer's `<header>` markup:
  - Sticky top, `backdrop-blur`, `bg-bg/85`, border-bottom.
  - Inner: max-w-7xl, flex justify-between, gap-6.
  - Left: `<a href="/">` containing `<img src="/brand/logo.svg" alt="<COMPANY_NAME>" class="logo-img" />` + a thin vertical `<span class="logo-divider" aria-hidden="true">` + `<span class="logo-text">bmad_demo — training portal</span>`.
  - Right: nav links (Home, Lessons, Labs, Capstone) + `<ThemeToggle>`.
- Logo source path is `/brand/logo.svg` (relative to `public/`). If the file is absent (fork hasn't dropped a logo yet), the `<img>` `onError` swaps to a placeholder text mark `bd` styled as a small accent-colored chip — purely a defensive fallback.
- Dark-mode handling: per spec, an inline CSS rule inverts the logo via `[data-theme="dark"] .logo-img { filter: invert(1) hue-rotate(180deg); }` UNLESS a `/brand/logo-dark.svg` file exists (in which case Next.js Image fallback / a `<picture>` element loads the dark variant directly). v1 implementation uses the filter approach; v1.1 may upgrade to `<picture>` if the production logo set ships separate light/dark assets.
- Vitest case at `src/components/header.test.tsx`: renders the header; asserts logo `<img>` src is `/brand/logo.svg`; asserts nav links are present; asserts the `<ThemeToggle>` is rendered.

**AC8 — Vendored fonts via `next/font/local`**
- Files: `public/fonts/inter/Inter-Variable.woff2`, `public/fonts/jetbrains-mono/JetBrainsMono-Variable.woff2`. Downloaded at story-implementation time from official sources (Inter: rsms.me/inter; JetBrains Mono: jetbrains.com/lp/mono).
- `src/app/layout.tsx` imports via `next/font/local`:
  ```ts
  import localFont from 'next/font/local';
  const inter = localFont({ src: '../../public/fonts/inter/Inter-Variable.woff2', variable: '--font-sans', display: 'block' /* prevents FOUT */ });
  const jetbrainsMono = localFont({ src: '../../public/fonts/jetbrains-mono/JetBrainsMono-Variable.woff2', variable: '--font-mono', display: 'block' });
  ```
- The `<html>` element gets `inter.variable` and `jetbrainsMono.variable` className so Tailwind's `font-sans` and `font-mono` utilities resolve to the vendored fonts.
- License files (`public/fonts/inter/LICENSE`, `public/fonts/jetbrains-mono/LICENSE`) committed alongside the font files (Inter is OFL; JetBrains Mono is OFL).

**AC9 — `lucide-react` icon library vendored**
- Direct dep added: `lucide-react@^0.450.0`.
- Tree-shakeable — only the icons used in the app land in the bundle. v1 imports needed: `Sun`, `Moon`, `Monitor` (theme toggle), `Check` (checkbox + success badges), `X` (close buttons + dialog dismiss), `ChevronDown` / `ChevronRight` (collapsibles + nav), `AlertCircle` (error states), `AlertTriangle` (warning states), `Info` (info badges), `ArrowRight` (audience-card CTA), `Loader2` (loading spinners).
- All other icons land as needed in their owning stories; no upfront mass-import.

**AC10 — `layout.tsx` updates**
- File: `src/app/layout.tsx`.
- Inline theme-init script in `<head>` (per AC5).
- Font className applied to `<html>`.
- `<TooltipProvider>` wraps `{children}` so any descendant `<Tooltip>` works without per-page wiring.
- `<ThemeProvider>` (no JS state at v1; the inline script does the theme work — `<ThemeProvider>` is a thin React-context wrapper that reads the resolved theme and exposes `useTheme()`).
- `<Toaster>` mounted at the bottom of the body for toast surfacing (Story 11.4 builds the actual `<Toaster>` component; Story 11.1 leaves a placeholder element with id `toaster-root` that 11.4 hydrates).

**AC11 — Vitest unit coverage**
- `src/lib/utils.test.ts` — `cn()` cases (AC4).
- `src/components/theme-provider.test.tsx` — `useTheme()` resolution + setTheme + matchMedia listener (AC5).
- `src/components/theme-toggle.test.tsx` — button click → setTheme; pill positioning (AC6).
- `src/components/header.test.tsx` — render + logo + nav + theme toggle (AC7).
- `src/components/ui/button.test.tsx` — variants + sizes + asChild polymorphism (AC3).
- `src/components/ui/badge.test.tsx` — variants render with correct color classes (AC3).
- `tests/unit/tailwind.test.ts` — config introspection: every color token in CSS variables is also in Tailwind's colors map (AC2).
- All other vendored Radix wrappers from AC3 get a single smoke test verifying default render + className pass-through (no exhaustive state coverage at this story; later stories that consume each component add the relevant cases).

**AC12 — Playwright E2E**
- `tests/e2e/theme-toggle.spec.ts` — 3-mode toggle works; persists in localStorage; auto-mode follows OS preference change.
- `tests/e2e/theme-flicker.spec.ts` — set `localStorage.theme = 'dark'` BEFORE navigation; reload; assert the page renders dark from first paint (no white flash). Implementation: Playwright captures a screenshot at `domcontentloaded` (before any JS hydration) and asserts the average pixel luminance is below the dark-mode threshold.
- `tests/e2e/keyboard.spec.ts` — Tab through every header element; assert focus visible; Enter/Space activates buttons; Esc dismisses dropdowns.
- `tests/e2e/reduced-motion.spec.ts` — set `prefers-reduced-motion: reduce` via Playwright `emulateMedia`; assert that animations don't run (compare DOM state at t=0 and t=200ms; should be identical for animation-bearing elements).

**AC13 — Lint, typecheck, quad gate**
- `npm run lint` clean.
- `tsc --noEmit` clean (strict mode).
- `npm run test:unit` 100% green (existing tests + new Story-11.1 cases).
- `npm run test:e2e` 100% green (new specs added).
- `npm run lint:links` clean (no markdown changes that affect link integrity).
- Manual VoiceOver smoke (per spec's Testing Strategy): walk through home page; verify logo alt is announced; theme toggle's three options are announced; nav links are reachable.

## Tasks/Subtasks

- [ ] **Task 1 — Install direct deps** — `npm install clsx tailwind-merge lucide-react @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-collapsible @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-progress @radix-ui/react-separator @radix-ui/react-slot`. Commit `package.json` + `package-lock.json` first; downstream tasks build on the deps.
- [ ] **Task 2 — Vendor fonts (AC8)** — download Inter-Variable.woff2 + JetBrainsMono-Variable.woff2; commit alongside their LICENSE files. Update `layout.tsx` font wiring.
- [ ] **Task 3 — Tokens in `globals.css` (AC1)** — full CSS custom-property block (light + dark) + motion tokens + shadow tokens + reduced-motion media query + 6 keyframes + body transition.
- [ ] **Task 4 — Tailwind config extension (AC2)** — `theme.extend.colors` (21 token mapping), `transitionDuration`, `transitionTimingFunction`, `fontFamily`. Vitest config introspection test.
- [ ] **Task 5 — `cn()` utility (AC4)** — `src/lib/utils.ts` + tests.
- [ ] **Task 6 — Foundation Radix wrappers (AC3)** — 14 component files at `src/components/ui/*.tsx`, each with a smoke test. Recommended sub-order: `button` → `card` → `badge` → `input` / `textarea` → `checkbox` / `radio-group` → `tooltip` (needs `<TooltipProvider>` for tests) → `dialog` / `dropdown-menu` / `tabs` / `collapsible` → `progress` / `separator`.
- [ ] **Task 7 — `<ThemeProvider>` + inline theme-init script (AC5, AC10)** — `src/components/theme-provider.tsx` Client Component + the `<head>`-level inline script in `layout.tsx`. Tests cover `useTheme()` hook + matchMedia listener.
- [ ] **Task 8 — `<ThemeToggle>` (AC6)** — `src/components/theme-toggle.tsx` with sliding pill + responsive collapse to dropdown <768px. Tests + Playwright spec.
- [ ] **Task 9 — `<Header>` (AC7)** — `src/components/header.tsx` Server Component with logo slot reading from `public/brand/`; defensive fallback for missing logo file. Mounted in `layout.tsx`.
- [ ] **Task 10 — Layout updates (AC10)** — `<TooltipProvider>` wrap, `<ThemeProvider>` wrap, `<Toaster>` placeholder slot, font-className on `<html>`.
- [ ] **Task 11 — Playwright E2E specs (AC12)** — 4 new specs (theme-toggle, theme-flicker, keyboard, reduced-motion).
- [ ] **Task 12 — Quad gate clean (AC13)** — run all five gates. If theme-flicker test is flaky, the root cause is the inline script not running early enough; fix by hoisting the `<script>` BEFORE any other `<head>` content (including `<title>`).

### Review Findings

_To be populated by code review after implementation._

## Dev Notes

**Architecture references:**
- §"Frontend Architecture → UI primitives" line 247 — Tailwind + Radix lock.
- §"Frontend Architecture → Fonts and assets" line 248 — vendored fonts; no remote.
- §"Folder Layout" lines 388-389 — `src/components/` for shared components.

**PRD references:**
- NFR-A1 line 620 — WCAG 2.x AA, release gate.
- NFR-A2 line 621 — automated a11y in E2E.
- NFR-S1 line 626 — no remote assets at runtime; fonts must be local.

**Design spec references** (`_bmad-output/planning-artifacts/ux-design.md`):
- §"Visual Design Foundation → Color System" — token values verbatim (AC1).
- §"Visual Design Foundation → Typography System" — font stack + scale (AC8).
- §"Animation Guidelines → Motion Tokens" — duration + easing (AC1).
- §"Component Strategy → Implementation Strategy" — vendored shadcn-pattern (AC3).
- §"Per-Component Animation Contracts → `<ThemeToggle>`" — pill positioning (AC6).
- §"UX Consistency Patterns → Button Hierarchy" — button variants (AC3).

**Why the inline theme-init script (rather than a React useEffect):**

`useEffect` runs AFTER first paint. If first paint shows light mode and the user has dark mode set, they see a flash of light before React hydrates and applies dark. That's the FOUC failure mode the spec explicitly forbids. The inline script in `<head>` runs synchronously before the body element renders; `data-theme` is set on `<html>` BEFORE first paint. Vercel's docs and shadcn-ui both use this pattern.

**Why no `<ThemeProvider>` JS state at v1:**

The inline script handles theme resolution; the React `<ThemeProvider>` is a thin context wrapper that exposes `useTheme()` for components that want to read the current theme. JS state would create a sync issue with the inline script (which runs before React); avoiding JS state means the script is the single source of truth.

**Why the segmented-control responsive collapse to `<DropdownMenu>` <768px:**

The spec locks ≥1024px primary; segmented control fits comfortably. <1024px is best-effort; <768px the segmented control gets cramped. Collapsing to a dropdown menu preserves the three-mode functionality while saving horizontal space. Dropdown is a standard pattern for nav-collapsing on narrow viewports.

**Defensible deviations:**
- The dark-mode logo treatment uses a CSS filter trick (`invert(1) hue-rotate(180deg)`) at v1 because we have one logo asset. Production should ship `public/brand/logo-dark.svg` for explicit-variant fidelity. Story 11.7 OR a v1.1 follow-up swaps to `<picture>` with separate variants if/when assets ship.
- Inter is loaded with `display: block` (NOT `display: swap`) to prevent FOUT. The trade-off: trainees may briefly see no text (~50-100ms) on a fresh page load before the font finishes loading. We accept the brief silence over the flash-of-unstyled-text. Counter-argument: per-FOUT-bias guidance, `display: swap` is the modern default. Reason for our choice: typography is load-bearing for the design system; FOUT would briefly break visual hierarchy.

**Test approach:**

- Vitest unit tests for everything except theme-flicker (which requires real-browser timing). Total expected test count: ~40 cases.
- Playwright for theme-flicker, keyboard nav, reduced-motion — these need real browser context.
- No real-binary dep tests in this story.

**No-egress / runtime-fs sanity:**

- Fonts vendored locally per AC8 → NFR-S1 holds.
- All Radix primitives are NPM packages with no remote-asset fetches at runtime → NFR-S1 holds.
- The `<ThemeProvider>`'s inline script touches only `localStorage` and `document.documentElement`; no network.
- Logo loads from `public/brand/` (same-origin) → NFR-S1 holds.

**Architecture-doc drift check:**

Story 10.1b absorbed all architecture-doc drifts from Stories 5.1, 5.2, 5.7, 6.1, 6.5. Story 11.1 introduces NO new drift. The architecture's §"Frontend Architecture" lines 247-248 already lock Tailwind + Radix + vendored fonts; this story implements that lock without changing the architectural surface.

## Dev Agent Record

### Implementation Plan

_To be filled in by the dev agent at implementation time._

### Debug Log

_To be filled in by the dev agent during implementation._

### Completion Notes

_To be filled in by the dev agent after the quad gate is clean._

## File List

**Expected new files:**
- `src/app/globals.css` (extended; existing file from create-next-app scaffold)
- `tailwind.config.ts` (extended; existing file)
- `src/lib/utils.ts`
- `src/lib/utils.test.ts`
- `src/components/theme-provider.tsx`
- `src/components/theme-provider.test.tsx`
- `src/components/theme-toggle.tsx`
- `src/components/theme-toggle.test.tsx`
- `src/components/header.tsx`
- `src/components/header.test.tsx`
- `src/components/ui/button.tsx` + `.test.tsx`
- `src/components/ui/card.tsx` + `.test.tsx`
- `src/components/ui/dialog.tsx` + `.test.tsx`
- `src/components/ui/dropdown-menu.tsx` + `.test.tsx`
- `src/components/ui/tabs.tsx` + `.test.tsx`
- `src/components/ui/tooltip.tsx` + `.test.tsx`
- `src/components/ui/collapsible.tsx` + `.test.tsx`
- `src/components/ui/checkbox.tsx` + `.test.tsx`
- `src/components/ui/radio-group.tsx` + `.test.tsx`
- `src/components/ui/progress.tsx` + `.test.tsx`
- `src/components/ui/separator.tsx` + `.test.tsx`
- `src/components/ui/badge.tsx` + `.test.tsx`
- `src/components/ui/input.tsx` + `.test.tsx`
- `src/components/ui/textarea.tsx` + `.test.tsx`
- `tests/unit/tailwind.test.ts`
- `tests/e2e/theme-toggle.spec.ts`
- `tests/e2e/theme-flicker.spec.ts`
- `tests/e2e/keyboard.spec.ts`
- `tests/e2e/reduced-motion.spec.ts`
- `public/fonts/inter/Inter-Variable.woff2` + `LICENSE`
- `public/fonts/jetbrains-mono/JetBrainsMono-Variable.woff2` + `LICENSE`
- `_bmad-output/implementation-artifacts/11-1-foundation-tokens-and-theme.md` (this file)

**Expected modified files:**
- `package.json` (15 new deps)
- `src/app/layout.tsx` (font wiring + inline theme-init script + `<TooltipProvider>` + `<Toaster>` placeholder + `<Header>` mount)

## Change Log

- 2026-05-08 — Story file authored from `ux-design.md` §"Component Implementation Strategy → Phase 1 Foundation" + Sally's handoff brief.
