# CargoExpress PH — Full Frontend UI/UX Audit

> Complete audit of every screen, component, style, and design pattern in the CargoExpress PH system.
> This document covers: Design System Architecture, Screen-by-Screen Audit (32 pages/components),
> Shared UI Components (25), Layouts (3), Cross-Cutting Patterns, and prioritized issue list.

---

## 1. Design System Architecture

The CSS system is a **layered cascade** across 22 files, imported in strict order through `src/styles/main.css`.
Later files purposefully override earlier ones — import order is load-bearing.

### 1.1 Import Cascade Order

| Order | File | Purpose |
|-------|------|---------|
| 1 | `tokens.css` | Design tokens: colors, shadows, spacing, transitions, z-index, radii |
| 2 | `base.css` | Reset, typography (Inter), focus rings, custom scrollbar |
| 3 | `components.css` | Buttons, cards, forms, badges, theme toggle |
| 4 | `data.css` | Tables, stat cards, grids, timeline, capacity tracker |
| 5 | `feedback.css` | Modals, confirm dialogs, toasts |
| 6 | `loading-search.css` | Skeletons (9 variants), spinners, loading screen, search box |
| 7 | `tabs-steps.css` | Tabs, step progress, login split layout, floating chatbot |
| 8 | `chatbot.css` | Legacy chatbox, chat bubbles, FAB, typing indicator |
| 9 | `charts.css` | Donut chart, bar chart, pagination, breadcrumb, validation |
| 10 | `layout-admin.css` | Admin shell: sidebar (260px/72px), topbar (64px) |
| 11 | `layout-customer.css` | Customer shell: navbar (60px), bottom nav, FAB book tab |
| 12 | `auth.css` | Login/register/forgot/reset with orbs and animations |
| 13 | `pages.css` | About page, 404, error boundaries |
| 14 | `tracking.css` | Public tracking (modern `.trk-*` + legacy `.tracking-*`) |
| 15 | `remaining.css` | Catch-all: alerts, notifications, profile, reports, inbox, lightbox, onboarding, print styles (2038 lines) |
| 16 | `animations-utils.css` | 14+ keyframes + utility classes (`.animate-*`, `.text-*`, `.p-*`, `.m-*`) |
| 17 | `responsive.css` | Global responsive: sidebar drawer at 1024px, grid collapse at 768px |
| 18 | `premium-refresh.css` | Global premium re-skin: richer shadows, stat-card redesign, glass cards, booking success confetti |
| 19 | `customer-mobile-refresh.css` | Green re-skin for customer area (scoped to `.customer-layout-v2`) |
| 20 | `admin-modern-refresh.css` | Green re-skin for admin area (scoped to `.app-layout`) |
| 21 | `viewport-hardening.css` | Final fixes: `100dvh` support, badge sizing, flex-shrink, ultra-small viewports |

### 1.2 Color System

**Two brand systems coexist — this is the single biggest source of visual drift.**

| System | Primary | Accent | Scope |
|--------|---------|--------|-------|
| Original (`tokens.css`) | Orange `#E8722A` | Navy `#1B3A5C` | Default everywhere |
| Refresh (customer) | Green `#128A5A` | Orange `#F0792E` | `.customer-layout-v2` |
| Refresh (admin) | Green `#128A5A` | Orange `#F0792E` | `.app-layout` |

Any screen not inside these wrapper classes renders in the legacy orange palette.

**Semantic colors** (unified across all):
- Success: `#10B981` (green)
- Warning: `#F59E0B` (amber)
- Error: `#EF4444` (red)
- Info: `#3B82F6` (blue)
- Each with `-bg`, `-light`, `-dark` shade variants

**Glass tokens**: `--glass-bg`, `--glass-bg-heavy`, `--glass-border`, `--glass-shadow` for frosted-glass effects.

### 1.3 Typography

- **Font**: Inter via Google Fonts with system stack fallback
- **Headings**: Fluid via `clamp()` (e.g., h1: `clamp(1.5rem, 2.5vw + 0.5rem, 2.25rem)`)
- **Body**: Browser default sizing (not fluid)
- **Antialiasing**: `-webkit-font-smoothing: antialiased` on body

### 1.4 Spacing Scale

8-step scale from `--space-xxs: 4px` to `--space-xxl: 48px`:
`4, 8, 12, 16, 20, 24, 32, 48`

### 1.5 Shadow System

6 levels: `--shadow-xs` through `--shadow-2xl`, plus:
- `--shadow-primary` / `--shadow-primary-hover` (brand-colored)
- `--shadow-glow` (glow effect)
- Premium refresh layer adds richer multi-layer shadows

### 1.6 Border Radii

6 levels: `--radius-xs: 6px` to `--radius-2xl: 24px`, plus `--radius-full: 9999px`.
Refresh files use 20-28px radii where original used 12-16px (softer, more "premium").

### 1.7 Transitions & Animations

- **Standard**: `--transition-base: 200ms`, `--transition-fast: 150ms`, `--transition-slow: 350ms`
- **Spring**: `cubic-bezier(0.34, 1.56, 0.64, 1)` used for bouncy effects
- **Keyframes** (14+): `fadeIn`, `slideUp`, `slideDown`, `slideIn`, `scaleIn`, `spin`, `pulse`, `shimmer`, `shimmerBar`, `float`, `bounceIn`, `countUp`, `toastProgress`, `ripple`, `shake`, `breathe`, `fabPulse`, `typingDot`, `chatOpen`, `chatClose`, `statusPulse`, `nfPulse`, `authCardIn`, `sentEnvelope`, `sentRingPulse`, `bookingConfetti`, `nodePulse`, `cmdPaletteIn`, `onboardIconPulse`, `capacityFillIn`, `capacityShimmer`, `badgePop`, `fabPulseRing`

**Framer-motion** used only in `PageTransition`/`StaggerItem`/`SharedElement`. Everything else uses CSS transitions, `requestAnimationFrame`, or `IntersectionObserver`.

**`prefers-reduced-motion`** honored in `premium-refresh.css` and `remaining.css` — but NOT in `AnimatedCounter`, `DonutChart`, `MiniBarChart`, `OnboardingModal`, or `ImageLightbox`.

### 1.8 Z-Index Ladder

Defined in tokens: `1, 100, 200, 500, 1000, 9999`
Bypassed by: Onboarding overlay (`10000`), ImageLightbox (`10001`) — should be added to the ladder.

### 1.9 Dark Mode

- Centralized through `[data-theme="dark"]` on `<html>`
- `tokens.css` defines foundation dark overrides
- `premium-refresh.css` adds polish
- `customer-mobile-refresh.css` has scoped dark overrides inside customer scope
- FOUC prevention: pre-paint script in `index.html` reads `localStorage.cargoexpress_theme` or `prefers-color-scheme`
- 400ms `.theme-transition` class enables cross-fade on toggle
- **Gap**: Admin refresh dark mode not fully verified for parity with customer

### 1.10 Responsive Breakpoints

15+ unique breakpoints used across files:
`1024px` (sidebar drawer), `900px`/`899.98px` (mobile/desktop split), `820px` (filter tab/select switch),
`768px` (grid collapse), `640px`, `540px`, `520px`, `480px`, `380px`, `374px` (iPhone SE), `360px`, `340px`

Inconsistent style: `899.98px` vs `900px` across files. No published breakpoint scale.

---

## 2. Entry Points & App Shell

### 2.1 `main.jsx`
- Single root render: `<ThemeProvider><ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider></ThemeProvider>`
- **No `<React.StrictMode>`** wrapper
- **No top-level `<ErrorBoundary>`** wrapping `<App />` — uncaught render errors crash to blank white screen
- Imports `./styles/main.css` as the single design-system entry

### 2.2 `index.html`
- Pre-paint script prevents FOUC (reads theme from localStorage, sets `data-theme` + `colorScheme`)
- `<meta name="theme-color">` for both schemes: orange `#E8722A` (light), navy `#0F172A` (dark)
- PWA manifest linked, Inter font preloaded
- Service worker registration with dev-mode skip + `sw-update-available` event detection

### 2.3 `App.jsx`
- Provider order: `BrowserRouter > ThemeProvider > ToastProvider > AuthProvider > Suspense`
- Layouts eager-loaded, all pages lazy-loaded with code splitting
- `LoadingScreen` uses `.loading-brand.animate-scale-in` + `.spinner`
- `PageLoader` uses inline-styled centered spinner (inconsistent: doesn't reuse `LoadingScreen`'s primitives)
- Route guards: `ProtectedRoute` (role-based), `AuthRoute` (auth pages only), `RootRedirect` (role-based `/` redirect)

---

## 3. Contexts & Hooks

### 3.1 `ThemeContext.jsx`
- Two themes: `light` | `dark`
- Storage key: `cargoexpress_theme`
- Follows system `prefers-color-scheme` only when no stored value
- `applyTheme` toggles `data-theme` on `<html>` and adds `.theme-transition` class (400ms)
- Uses `useLayoutEffect` to avoid flash; `hasMounted` ref skips animation on first paint
- Sets `colorScheme` style so native widgets (scrollbars, inputs) adapt

### 3.2 `AuthContext.jsx`
- Exposes: `user`, `userProfile`, `loading`, `isAdmin`, `isCustomer`, `login`, `register`, `logout`, `resetPassword`, `changePassword`, `refreshProfile`
- `isRegistering` ref guard prevents premature profile fetch on first `SIGNED_IN` event
- Placeholder profile fallback so app never hangs on profile fetch failure
- Password reset uses `supabase.auth.resetPasswordForEmail` with `redirectTo`

### 3.3 `useToast.jsx`
- Queue cap: 4 toasts (oldest sliced)
- Duration: 4s default, 5s for errors
- Hover pauses dismissal timer; re-entering resumes remaining time
- Types: `success | error | warning | info` with Lucide icons
- A11y: container is `role="region" aria-live="polite"`, each toast `role="alert" aria-atomic="true"`
- **Inconsistency**: toasts use `role="alert"` (assertive) inside `aria-live="polite"` region — mixed politeness
- No framer-motion — toast enter/exit relies on CSS classes

---

## 4. Layout Components

### 4.1 `AdminLayout.jsx`

**Structure:**
- Grid layout with sidebar + main content area
- Persistent collapsed state via `sidebar_collapsed` localStorage key
- Drawer breakpoint at 1024px — locks `body.overflow` while open, Escape closes

**Topbar (64px, glass-bg-heavy):**
- Hamburger (mobile only), brand wordmark (`CARGO` + `EXPRESS`), ThemeToggle, Cmd+K button (inline-styled), user avatar
- Skip link to `#admin-main-content`

**Routing:**
- `<PageTransition as="main">` wraps `<ErrorBoundary>` around `<Outlet/>`
- Global Ctrl/Cmd+K toggles `CommandPalette`

**Mobile:**
- Inline `<style>` block forces `.mobile-menu-toggle` and `.topbar-title` visibility at <=1024px
- Hides collapse button on mobile

**Issues:**
- Cmd-K button heavily inline-styled (font sizes, padding, border) rather than CSS class
- Inline `<style>` block mixes JSX with global CSS

### 4.2 `CustomerLayout.jsx`

**Structure:**
- Top navbar (60px) with logo + desktop nav + theme/bell/avatar
- Bottom tab bar (mobile only, controlled by CSS) with central FAB-style "Book" tab

**Navbar:**
- Profile dropdown: click-outside via `mousedown` listener; `aria-haspopup="menu"` + `aria-expanded`
- Notification badge via Supabase realtime channel `notif_badge_${user.id}`

**Bottom Nav:**
- Items include special `book-tab` with elevated icon (50x50 FAB, `margin-top: -26px`, `fabPulseRing` animation)
- `bottomNavItems` includes `hasBadge` checks but **no item sets `hasBadge: true`** — badge code path is dead

**Other:**
- Renders `<OnboardingModal/>` unconditionally (modal self-gates)
- `PageTransition` keyed by `location.pathname`
- FCM permission request delayed 3s; once-per-session via `sessionStorage.fcm_asked`
- **Issue**: Support page not reachable from bottom tabs

### 4.3 `Sidebar.jsx`

**Structure:**
- Three sections: Main, Management, System
- Each link supports `badgeKey` for live counts (inbox, inquiries)
- Realtime via `admin_sidebar_badges` channel (chat_messages + contact_inquiries)

**Features:**
- Collapse button (`ChevronsLeft`) hidden on mobile
- Drawer close button (`ArrowLeft`) for mobile
- `data-tooltip` on each link — CSS shows label tooltip when collapsed
- Backdrop for drawer mode

**A11y:**
- `aria-label="Admin navigation"`, badge count `aria-label`, icons `aria-hidden`

**Footer:**
- User info card + logout (`sidebar-link danger`)

**Badge inconsistency:** Caps at `99+` here vs `9+` in CustomerLayout

---

## 5. Shared UI Components (25 Components)

### 5.1 `AnimatedCounter.jsx`
- Pure `requestAnimationFrame` with `easeOutExpo` easing
- Animates from previous value (ref) to current
- `toLocaleString` with configurable `minimumFractionDigits/maximumFractionDigits`
- Props: `value, duration=1000, prefix, suffix, decimals=0, className`
- **Issue**: No `prefers-reduced-motion` respect — runs RAF unconditionally

### 5.2 `Breadcrumb.jsx`
- Semantic `<nav aria-label="Breadcrumb"><ol>` with `ChevronRight` separators
- `Home` icon on first item only; last item gets `aria-current="page"`
- Props: `items=[{label, to?}]`; renders `null` for empty array
- No animations — relies on CSS tokens

### 5.3 `CapacityTracker.jsx`
- Bar tracker with 5 thresholds: SAFE (<=50%), MEDIUM (51-75%), HIGH (76-90%), CRITICAL (91-100%), OVER (>100%)
- CSS vars `--capacity-{safe|medium|high|critical}-{text|bar}`
- Bar capped at 100% visually but raw percent shown in label
- Bar transitions `width 0.5s ease-out, background-color 0.5s ease-out`
- Props: `currentWeight=0, maxCapacity=1000, tripNumber='', showLabel=true`
- **Issue**: No `role="progressbar"` / `aria-valuenow`; mixes inline styles with class-based styling

### 5.4 `CommandPalette.jsx`
- Modal with search input + grouped results + footer hints
- Sections: Navigation, Management, System
- Keyboard: ArrowDown/Up navigate, Enter select, Escape close
- Mouse hover sets highlight; active descendant id pattern: `cmd-palette-option-${idx}`
- Uses `FocusTrap`; input `role="combobox"`, listbox `role="listbox"`, items `role="option"`
- Filters by `label.toLowerCase().includes(q) || cmd.keywords.includes(q)`
- Auto-focuses input after 50ms timeout

### 5.5 `ConfirmModal.jsx`
- Variants: `danger | warning | info | success` (drives icon + confirm button class)
- Icons: danger/warning -> `AlertTriangle`, info -> `Info`, success -> `CheckCircle`
- Document-level Escape listener; auto-focuses modal container (`tabIndex={-1}`)
- Uses `FocusTrap`; overlay click dismisses
- Confirm button shows spinner via `<Loader className="animate-spin" />` when `loading=true`
- A11y: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` + `aria-describedby`

### 5.6 `CustomSelect.jsx`
- Custom listbox mirroring native `<option>` children API
- Keyboard: ArrowUp/Down (skips disabled, wraps), Enter/Space toggle open, Escape close
- Smart placement: calculates space below/above, flips to `open-up` if needed
- Recomputes on resize and scroll; closes on outside `pointerdown`
- A11y: trigger `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`; options `role="option"` + `aria-selected`
- Checked option shows `<Check size={15}/>`
- **Issue**: Uses `useId` for listbox id but no associated label element — relies on `aria-label` from caller

### 5.7 `DonutChart.jsx`
- SVG donut using `stroke-dasharray/dashoffset` technique
- Each arc rotates `-90deg` so segments start at top
- Mount animation: arcs draw via `stroke-dashoffset` transition (0.8s cubic-bezier, 0.1s stagger)
- Hover bumps `strokeWidth` by 4 and shows hovered segment value in center
- Props: `segments=[{label, value, color}], size=180, thickness=28, centerLabel, centerSub, showLegend=true, animate=true`
- Empty state: `<div className="donut-chart-empty">` when total is 0
- **Issue**: No `prefers-reduced-motion` respect

### 5.8 `EmptyState.jsx`
- Premium placeholder: icon (default `Package`, size 48, stroke 1.5), title, optional description, optional CTA
- Props: `icon, title, description, actionLabel, onAction, className`
- Uses class `.empty-state-premium`; button is `btn btn-primary`

### 5.9 `ErrorBoundary.jsx`
- Class component; logs in dev only
- Shows: warning icon, "Something went wrong", reload + retry buttons
- Shows error message in `<pre>` in dev mode
- Used by both layouts to wrap `<Outlet/>`

### 5.10 `ErrorBoundarySection.jsx` + `ErrorFallback.jsx`
- Section-level error boundary delegating to `ErrorFallback`
- `ErrorFallback`: compact horizontal banner with `AlertTriangle`, message, optional Retry button
- Default message: "This section failed to load."
- **Issue**: Defined but **never used** — no consumer in the codebase

### 5.11 `FocusTrap.jsx`
- Saves previously focused element; focuses first focusable inside
- Cycles Tab/Shift+Tab
- Selector: `a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])`
- Restores focus on cleanup
- **Issue**: When `active=false`, returns children directly (no wrapper); when active, wraps in `<div>` — DOM shape changes can affect CSS specificity/layout

### 5.12 `ImageLightbox.jsx`
- Full-screen viewer with zoom (wheel + buttons + keyboard `+/-`), rotate 90 degrees, double-click toggle (1x <-> 2.5x), mouse drag pan when zoomed, touch pinch + swipe
- Keyboard: Escape close, ArrowLeft/Right navigate, `+/=/-` zoom
- Locks body scroll on mount
- Thumbnail strip when `images.length > 1`; counter `"i / N"` with `aria-live="polite"`
- A11y: `role="dialog" aria-modal aria-labelledby`, nav buttons labeled, thumbs use `aria-current`
- Uses `FocusTrap`
- Image transition: `transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)` (disabled while dragging)
- **Issue**: `onWheel` uses `e.preventDefault()` — React 17+ attaches wheel as passive, so Chrome may log warning

### 5.13 `MiniBarChart.jsx`
- Vertical bar chart with gridlines at 25/50/75/100%
- Mount animation: bars grow from 0 to % height with `i * 0.05s` stagger
- Hover shows tooltip with value + label; `showValues` shows static labels (k-suffix when >=1000)
- Bar width auto-sized: `Math.min(40, Math.max(14, Math.floor(280/bars.length)))`
- Empty state included
- Container `role="img" aria-label="Bar chart"`
- **Issue**: No `prefers-reduced-motion` respect

### 5.14 `OnboardingModal.jsx`
- 4-step welcome tour gated by `localStorage.cargoexpress_onboarding_done`
- Delayed 800ms show
- Steps: Welcome (primary gradient), Booking (info), Track (success), Notifications (accent)
- Enter/exit via class swaps `.onboarding-enter` / `.onboarding-exit` (300ms exit)
- Dots clickable to jump; Skip hidden on last step; Final: "Get Started" with `CheckCircle`
- A11y: `role="dialog" aria-modal aria-label="Welcome tour"`
- **Issue**: **No FocusTrap** — inconsistent with other modals

### 5.15 `PageTransition.jsx`
- Only framer-motion-heavy component besides `ScrollReveal`
- Uses `useReducedMotion` to swap variants
- Default: hidden `{opacity:0, y:10}` -> visible spring (`stiffness:260, damping:30, mass:0.9`) -> exit `{opacity:0, y:-6, duration:0.12}`
- Reduced-motion: all opacity 1, no transform
- Exports `StaggerItem` (per-index 0.05s delay) and `SharedElement` (`layoutId`)
- `as` prop maps to `motion[as] || motion.div`

### 5.16 `Pagination.jsx`
- Ellipsis logic: when `totalPages > 7`, shows `1 ... current-1 current current+1 ... last`
- Hooks into `CustomSelect` for per-page picker; `perPageOptions` default `[10,15,25,50]`
- A11y: `role="navigation" aria-label="Pagination"`, per-page button, prev/next labeled

### 5.17 `PickupModal.jsx`
- Large admin pickup-processing modal (560px max)
- Three-stage flow: form -> upload photos -> optional GCash QR polling
- GCash: creates source via PayMongo, shows QR (250x250 via api.qrserver.com), polls every 3s
- Segmented buttons for payment method (cash/gcash/paylater) and payer (sender/receiver) with `aria-pressed`
- Pay Later block uses warning theme; photo upload max 3 (5 MB each)
- A11y: `role="dialog"`, `aria-labelledby`, status `aria-live="polite"` on QR poll, error `role="alert"`
- Uses `FocusTrap`
- **Issue**: Heavy inline-style usage (photo upload, summary card, QR container) — diverges from CSS class patterns

### 5.18 `ResponsiveFilterControls.jsx`
- Dual UI: desktop `tabs` row + mobile select dropdown (CSS toggles visibility)
- Props: `options=[{value, label, icon, count, style, buttonClassName}], value, onChange, ariaLabel`
- Keyboard: ArrowUp/Down (with wrap), Enter/Space toggles, Escape closes
- A11y: desktop `role="tablist"`/`role="tab"`/`aria-selected`; mobile `aria-haspopup="listbox"` + listbox/option
- **Issue**: Desktop uses tab semantics but acts like a button (no tabpanel association)

### 5.19 `ScrollReveal.jsx`
- IntersectionObserver-based class toggler; adds `.revealed` when intersecting
- Props: `delay` (0-4), `threshold=0.15`, `once=true`, `as='div'`
- Graceful fallback: if no IntersectionObserver, immediately reveals
- `rootMargin: 0px 0px -40px 0px` (triggers slightly before fully visible)

### 5.20 `SkeletonLoader.jsx`
- Composite export: `{ Text, Avatar, Card, TableRow, StatCard, OrderCard, Donut, BarChart, Chat }`
- Each variant has staggered `animationDelay` per index (60-80ms)
- All use base `.skeleton` class
- Chat variant uses mixed inline-style + classes for asymmetric bubble shapes
- **Issue**: `SkeletonChat` mixes inline flex layouts; other variants are pure-class

### 5.21 `StatusBadge.jsx`
- Maps statuses: Pending, Assigned, Picked Up, In Transit, Arrived at Hub, Out for Delivery, Delivered, Cancelled
- Also maps lifecycle: scheduled, in_progress, arrived, completed, cancelled
- Also maps payment: paid, partial, unpaid
- Active statuses (`In Transit`, `Out for Delivery`, `in_progress`) get `.animated` dot (CSS pulse)
- Props: `status, size='default'`; `size==='sm'` adds `text-xs`
- A11y: `aria-label="Status: ${label}"`
- **Issue**: Payment "paid" maps to `badge-delivered` (green) — semantically reusing delivery class for payment

### 5.22 `ThemeToggle.jsx`
- Simple icon button: `Sun` when dark, `Moon` when light
- Props: `size=18, className=''`
- Dynamic `aria-label` and `title`
- Class `.theme-toggle-btn`

### 5.23 `TrackingTimeline.jsx`
- Horizontal timeline using `STATUS_TIMELINE` constant
- Steps: `completed | active | cancelled` classes
- Per-step icons: `ClipboardCheck/Package/Truck/Building2/Bike/CheckCircle`; completed show `Check`
- Active step icon: size 16 + stroke 2.5; non-active: 13 + stroke 2
- Connector line for all but last step
- Compact mode via `compact` prop adds `.status-timeline-compact`
- **Issue**: No ARIA attributes beyond visible labels

### 5.24 `TripAssignModal.jsx`
- Loads `getTrips('active')`, filters by origin/destination match
- Each trip rendered as selectable card with mini capacity bar
- Detects overload: warning row with `AlertTriangle` if weight exceeds remaining capacity
- Card style is inline (border swaps to `var(--primary)` when selected)
- A11y: each card has detailed `aria-label`; `aria-pressed` on selection
- Uses `FocusTrap`
- **Issue**: Card styles inline rather than a `.trip-assign-card` class

### 5.25 Summary of FocusTrap Coverage

| Component | Has FocusTrap |
|-----------|---------------|
| CommandPalette | Yes |
| ConfirmModal | Yes |
| ImageLightbox | Yes |
| PickupModal | Yes |
| TripAssignModal | Yes |
| OnboardingModal | **No** |
| Login chat dialog | **No** |
| Customer profile dropdown | **No** |

---

## 6. Screen-by-Screen Audit — Auth Pages

### 6.1 LoginPage.jsx

**Layout:** Split-screen `.login-split-page`
- Left: branding panel (logo, gradient tagline, 2 route pills Bohol<->Manila, 4 feature bullets, copyright)
- Right: form panel (mobile brand row, heading, error banner, form, divider, Create-account CTA, footer links)
- Floating chatbot FAB

**UI Elements:**
- Email + password inputs with icon-left wrappers
- Password show/hide toggle (`aria-pressed`)
- Sign-in submit button
- Alert banner for login errors
- Decorative background orbs
- Chatbot: intro screen (name input + quick-question buttons), active chat (bubbles, typing indicator, quick-reply chips), FAB with pulse + badge + tooltip

**Loading:** Sign-in button toggles to `Signing in...` with `aria-busy`; chat typing indicator with 700-1100ms delay

**Error Handling:** Comprehensive `getFriendlyError` + `getLoginErrorPlacement` mapper; handles invalid credentials, unconfirmed email, rate-limit, network errors; auto-clears after 5s; inline field errors

**Accessibility:** `sr-only` live region (`aria-live="polite"`), icons `aria-hidden`, password toggle `aria-label` + `aria-pressed`, chat dialog `role="dialog"` + `aria-modal`, messages `role="log"`, typing indicator `role="status"`, inputs `aria-required`/`aria-invalid`/`aria-describedby`

**Issues:**
- Chat has `aria-modal="true"` but **no focus trap or ESC handler** — keyboard users trapped
- Floating tooltip permanently visible instead of hover/focus reveal
- Chat header/footer rendered twice (intro + active)
- `liveRegionRef.current.textContent` mutated outside React state

### 6.2 RegisterPage.jsx

**Layout:** Two-step wizard inside `.auth-card` with decorative orbs, brand block, step progress bar, error banner

**UI Elements:**
- Step indicator (circle + check icon + connector)
- Step 1: Account (name, email, password with strength meter + rules checklist, confirm password)
- Step 2: Address (province/city `CustomSelect`s, barangay, street, lot/block, phone with digit sanitization + char counter)
- Success state: `auth-success-card` with check icon, progress bar, 1.4s redirect

**Loading:** Submit shows spinner + "Creating..." with `aria-busy`

**Error Handling:** Top error banner (`role="alert"`, focusable with `tabIndex={-1}`); inline confirm-password mismatch; phone error inline; `showError` scrolls and focuses banner

**Accessibility:** `progressbar` role with `aria-valuenow/min/max`; password strength `aria-live="polite"`; password rules `.met` class; error banner focusable

**Issues:**
- **Step 2 (address) entirely optional** — submit works with blank address
- Password rules don't include special character that affects strength meter
- `CustomSelect` may not propagate `autoComplete`/`aria-required`
- Success redirect has no skip option (fixed 1.4s)

### 6.3 ForgotPasswordPage.jsx

**Layout:** Single `.auth-card` with two states: (a) entry form with hero icon + email + tips list, (b) sent state with animated envelope + resend + countdown

**UI Elements:** Email input, send button (icon + label change), tips card with numbered dots, error banner, resend (60s countdown), "Try again" link

**Loading:** Buttons swap to `Loader` + "Sending..."; resend shows countdown

**Accessibility:** `aria-live="polite"` on resend, `aria-required`, alert role for errors

**Issues:**
- No email format validation before sending
- Tips use `<div>` not `<ol>` — screen readers don't recognize as ordered list
- `CheckCircle2` imported but never used

### 6.4 ResetPasswordPage.jsx

**Layout:** Three states: (1) verifying token (1.5s artificial wait), (2) success with auto-redirect, (3) main reset form

**UI Elements:** Brand block, hero icon, password + confirm inputs with toggle, 4-bar strength meter, requirements card, match-confirmation row, submit button

**Loading:** `rp-loading-card` with spinner + "Verifying your reset link..."; submit toggles to "Updating..."

**Accessibility:** Requirements `role="list"/listitem"` + `aria-label`; strength bar `aria-live="polite"`; `aria-required` on inputs

**Issues:**
- 1.5s "verifying" delay is cosmetic — no actual token verification
- Password rules don't match strength meter scoring
- No timer cleanup if user closes during success redirect

---

## 7. Screen-by-Screen Audit — Public Pages

### 7.1 TrackingPage.jsx

**Layout:** `.trk-page` with decorative orbs, header, search form, result card (status banner, progress bar, timeline, info grid), empty state, footer

**UI Elements:**
- Search box with magnifying-glass icon, clear button, submit (spinner during loading)
- Status banner with icon/color tokens from `TRACKING_STATUS_TONES`
- Progress bar (`trk-progress-fill` width = percentage)
- `TrackingTimeline` component
- 2x3 info grid (Route, Package, Sender, Receiver, Shipping Cost, Booked)
- Footer timestamps

**Loading:** Search box gets `trk-search-box--loading` modifier; submit button shows `Loader`

**Error/Empty:** `.trk-not-found` with AlertTriangle + "Try Another" retry; `.trk-empty` with tips when no search

**Accessibility:** `role="search"` form, `aria-label` on input, `role="alert"` on error, `role="main"` on results, `aria-busy` on submit

**Issues:**
- Brand link navigates to `/login` not `/` — confusing for guests
- Cancelled orders show 0% progress (jarring mid-transit)
- Clear button uses raw `x` character not icon
- URL pre-fill via `?q=` auto-searches on mount

### 7.2 AboutPage.jsx

**Layout:** Header, hero, 4-feature card grid, two-column content (About + Business Info left, Contact form sticky right), footer

**UI Elements:** Feature cards with stagger animation, mission quote, business info from `getAdminProfile` (owner, FB link, Smart/Globe numbers, addresses), contact form (name/phone/message + Send)

**Loading:** Loader + "Loading details..." while fetching; submit spinner

**Error:** Warning banner when `adminProfile` null; toast errors for invalid form

**Issues:**
- Toast-only validation (no inline errors)
- "Back to Login" assumes user came from login
- Phone validation only via toast — no inline hint

### 7.3 NotFoundPage.jsx

**Layout:** Centered `.not-found-card` with orbs, animated package icon, "404" code, suggestions label, action buttons, history-back

**UI Elements:** `PackageX` icon, gradient code (3 colored spans), Home + Track Shipment links, history back button

**Accessibility:** Orbs `aria-hidden`; **404 code lacks `aria-label`** (screen readers read letter-by-letter)

**Issues:**
- "Here's where you can go:" label followed by empty suggestions block
- Go-home link uses `/` which may double-redirect through `RootRedirect`

---

## 8. Screen-by-Screen Audit — Customer Pages

### 8.1 HomePage.jsx

**Layout:** Hero (greeting + name + tracking search), snapshot pills (Total/Active/Delivered), nearest trip card, active shipments (max 3 + "View All"), announcements (max 3), empty state

**UI Elements:**
- Hero card with translucent tracking input
- 3 snapshot pills
- Gradient trip card (badge, route, 3-metric grid, per-kg price, "Book Cargo" CTA)
- Shipment cards as `Link` to order detail
- Announcement cards
- Empty state with action

**Loading:** `SkeletonStatCard` + 3x `SkeletonOrderCard` in `StaggerItem`s

**Issues:**
- **Silent error swallowing** (`catch {}`) — user can't distinguish "no orders" from "load failed"
- Hardcoded announcement filter list (`['hey', 'test', 'mic', 'mic check']`)
- Hero tracking input uses inline styles inconsistent with `.search-box`

### 8.2 OrdersPage.jsx (Customer)

**Layout:** Heading with subtitle + count badge, search box, status filter tabs, order card list

**UI Elements:** `ResponsiveFilterControls`, search, `customer-order-list-card` (Link) with tracking #, status badge, route line, recipient, price

**Loading:** 3x `SkeletonOrderCard` with `StaggerItem`

**Error/Empty:** Error card with retry; `EmptyState` with conditional "Book Shipment" action

**Issues:**
- Filter taxonomy limited (no Picked Up/Assigned/Arrived tabs)
- Same `EmptyState` for "no matches" vs "no orders" (minor)

### 8.3 OrderDetailPage.jsx (Customer)

**Layout:** Back button, header (tracking + route + status), Cancel button, timeline card, Cancelled banner, trip info card, sender/receiver grid, package details, pickup proof photos, payment summary, timestamps footer

**UI Elements:** `TrackingTimeline` (compact), `ConfirmModal` for cancel, `ImageLightbox` for photos, payment summary (Shipping cost/Paid/Balance), method/status badges, due date alert

**Loading:** Skeleton block (text + card + 4 lines)

**Issues:**
- **No `alt` on photos** — CSS `background-image` only, screen readers see "Photo 1" via fallback span but no actual alt
- Cancel only allowed when status === "Pending" with no indication of allowed statuses
- Fire-and-forget notification after cancel

### 8.4 BookShipmentPage.jsx

**Layout:** 5-step wizard (Route -> Sender -> Receiver -> Package -> Review) with step progress and success state

**UI Elements:**
- Step progress with circled numbers and connectors
- Route option cards with `aria-pressed`
- Trip dropdown with selected-trip preview
- Shared `renderAddressFields` (Name, Phone, FB, province/city, barangay, street, lot/block, landmark)
- "Use my registered address" checkbox
- Package step (weight, description, payer, cost preview)
- Review summary + confirm button
- Success: animated ring with 3 concentric rings + check

**Loading:** Initial trip+settings prefetch (background); submit shows spinner

**Error:** Inline `field-error-inline` per field with `AlertTriangle`; toasts for global errors; scroll-to-top on submit error

**Accessibility:** Step progress `role="list"` + `role="listitem"` + `aria-current="step"`; "Step X of Y" `aria-live="polite"`; address fields with proper `autoComplete`

**Issues:**
- **Step 5 (Review) has no Back button** — wizard rhythm broken
- **`address_landmark` referenced but doesn't exist** in profile schema — "Use registered address" silently fails
- Auto-title-casing may mangle addresses like "P-1" or unusual casing
- Validation shows both inline errors AND toast (duplicative)
- "Use my registered address" unchecks silently when fields edited (no visible feedback)

### 8.5 TripsPage.jsx (Customer)

**Layout:** Heading + active count badge, trip card list

**UI Elements:** Per card: date badge (MONTH + day), status badge, route, trip number, full date, chevron

**Issues:**
- No filter UI
- Retry re-inlines the same `getTrips('active')` call

### 8.6 NotificationsPage.jsx

**Layout:** Header with title + unread count + "Mark all read", grouped by date (Today / Yesterday / specific dates)

**UI Elements:** Group separator, icon per type (`order_update`/`trip_update`/`announcement`/`general`), card with optional unread dot, title, body, timestamp

**Loading:** 4x skeleton cards with avatar + 2-line text

**Interactive:** Click unread marks as read (`button` when unread, `article` when read); "Mark all read" with spinner

**Issues:**
- **Silent error handling** — no retry UI
- Date grouping computed each render (not memoized)

### 8.7 ProfilePage.jsx (Customer)

**Layout:** Profile card (banner + avatar initial + name + email), quick stats (Total/Active/Delivered), menu items, Sign Out button

**UI Elements:** Avatar circle, stat tiles with colored icon backgrounds, menu rows with icon/title/desc/chevron, danger-tinted sign-out

**Issues:**
- **Sign Out has no confirmation modal** — accidental tap logs out immediately
- Avatar initial doesn't handle emoji/full-width names safely

### 8.8 PersonalInfoPage.jsx (Customer)

**Layout:** Back button, heading, form card (Name, FB Name, Mobile, Province, City, Barangay, Street, Lot/Block), sticky Save button

**UI Elements:** Icon-left inputs/selects, inline `form-error` and `form-helper`, Save Changes button

**Issues:**
- **Dead `saveStatus`/`saveMessage` state** — set but never rendered (toast replaced them)
- `CheckCircle`/`AlertCircle` imported but unused
- No `aria-required` on fields

### 8.9 SupportChatPage.jsx

**Layout:** Header, message list, input row

**UI Elements:** Bot avatar for admin messages, bubble for customer (right) vs admin (left), inline date+time separator when >5-min gap, send button with spinner

**Loading:** `SkeletonChat` with sr-only "Loading support chat..."

**Error/Empty:** `EmptyState` "No Messages Yet"; toasts on send/receive failures (input restored if send fails)

**Accessibility:** Message log `role="log"` + `aria-live="polite"` + `aria-label`; loading `role="status"` + `aria-busy="true"`

**Issues:**
- No typing indicator from admin side
- Send failure restores text but not caret position
- Empty state rendered inside scrolling container

---

## 9. Screen-by-Screen Audit — Admin Pages

### 9.1 DashboardPage.jsx

**Layout:** Admin page header, 4-stat grid, 2-column row (Van Capacity + Order Distribution Donut), Recent Orders table

**UI Elements:** `StaggerItem` stat cards with icon + `AnimatedCounter`, `CapacityTracker` for active trip, `DonutChart` (Pending/Picked Up/In Transit/Delivered/Other), recent orders table (tracking #, customer, status, date)

**Loading:** 4x `SkeletonStatCard` + capacity skeleton + `SkeletonDonut` + 4x `SkeletonTableRow`

**Issues:**
- Mixed error strategy (global vs per-section)
- "Other Orders" donut segment may confuse non-technical admin

### 9.2 OrdersPage.jsx (Admin)

**Layout:** Header with meta badges (shown/total), toolbar search, `ResponsiveFilterControls` with 9 tabs, data table (7 columns), `Pagination`

**UI Elements:** Search input, tab filters with counts, framer-motion row entry (`motion.tr` with spring), `Pagination` (per-page togglable)

**Loading:** Skeleton table with `aria-busy="true"` and 6 rows

**Issues:**
- `EmptyState` inside table cell breaks mobile `data-label` stacking
- 9 status tabs overwhelming on smaller desktops

### 9.3 OrderDetailPage.jsx (Admin)

**Layout:** Breadcrumb, header (tracking + status badge), action bar (Assign/Advance/Cancel), trip warning, status timeline, sender/receiver grid, package details, pickup photos, Payment & Details editor card, timestamps

**UI Elements:**
- Action buttons gated by status
- `TrackingTimeline` (compact), `PickupModal`, `TripAssignModal`, `ConfirmModal`, `ImageLightbox`
- Payment summary with overpaid handling (`+X.XX` highlighted)
- Badge row for payment method/payer/status/due-date
- Weight deviation warning (`actualWeight > estimated * 2` or `< 0.25`)
- Notes textarea, Save Details button

**Issues:**
- Weight warning thresholds hardcoded
- `PAYMENT_STATUSES` CSS class on `<option>` has no effect in some browsers
- No batch operations

### 9.4 TripsPage.jsx (Admin)

**Layout:** Header with meta badges + "Create Trip" button, `ResponsiveFilterControls`, trip card list

**UI Elements:** Per card: trip number, status badge, route, departure date, vehicle, capacity bar with danger/warning colors

**Issues:**
- Tab values use `in_progress` underscore then replace for display

### 9.5 CreateTripPage.jsx

**Layout:** Back button, header, four card sections (Route, Schedule, Capacity & Pricing, Notes), submit footer

**UI Elements:** Route option cards with `aria-pressed`, `datetime-local` inputs, capacity/price inputs with helper text, live max-revenue preview, notes textarea

**Issues:**
- **Toast-only validation** — no inline field errors; no feedback until submit
- Currency icon inline-positioned (not using `form-input-wrapper` pattern)
- Hardcoded defaults (1000kg, 70/kg)
- No vehicle/driver fields

### 9.6 TripDetailPage.jsx

**Layout:** Breadcrumb, header (trip # + route + status), action bar (Start/Arrived/Complete/Cancel), `CapacityTracker` card, assigned orders table

**Issues:**
- No edit-trip flow
- Status display literals inconsistently capitalized

### 9.7 CustomersPage.jsx

**Layout:** Header with meta badges, search, data table (Name, Email, Phone, Province, Joined), pagination

**Issues:**
- `EmptyState` inside table cell breaks mobile stacking
- No province filter

### 9.8 CustomerDetailPage.jsx

**Layout:** Breadcrumb, profile card (banner + avatar + name + email + phone + address), 4 stat cards (Total/Completed/Pending/Spent), order history table

**Issues:**
- Dead config flag (`isNum` set but never read)
- No quick action (email customer, view support chat)

### 9.9 SalesPage.jsx

**Layout:** Header, 4 colored stat cards (Revenue/Collected/Outstanding/Unpaid), 2-column (Payment Methods donut, Monthly Revenue bar chart)

**UI Elements:** `AnimatedCounter` with `P` prefix, `DonutChart` (Cash/GCash/Pay Later), `MiniBarChart` (last 8 months)

**Issues:**
- `paymentMethods` array computed but unused
- No date-range filter
- `P` prefix collapses 999 to `0k` (looks broken)

### 9.10 ReportsPage.jsx

**Layout:** Screen-only controls (Refresh/Export CSV/Print), period tabs (Daily/Weekly/Monthly/Yearly/Custom), custom date pickers, printable report

**Print Report:** Print-header (SVG logo + meta), summary cards, status breakdown + donut, financial summary, route performance chart + table, detailed order list, print footer

**UI Elements:** `ResponsiveFilterControls`, `<input type="date">`, summary stat cards, report tables, `DonutChart`, `MiniBarChart`, CSV export builder

**Issues:**
- Custom tab shows previous period's data until "Generate" clicked
- Inline SVG logo duplicates branding (drift risk)

### 9.11 AnnouncementsPage.jsx

**Layout:** Header + "New" button, conditional create form, announcement list

**UI Elements:** Inline form (title max 100, content max 1500, Publish/Cancel); list cards (title, content, "by Admin - date", delete icon); `ConfirmModal` for delete

**Issues:**
- **No edit flow** — only create + delete
- Toast-only validation; no character counters shown
- After publish, new announcement not highlighted at top

### 9.12 InboxPage.jsx

**Layout:** Two-column (`.inbox-layout`): conversations sidebar (left) + chat area (right)

**UI Elements:** Sidebar (conversation buttons with avatar + name + date), chat (header with avatar/name/email, messages with admin-right/customer-left, input + Reply button)

**Loading:** Loader in sidebar; loader in chat area; sending spinner

**Issues:**
- **Enter sends regardless of Shift** — no multi-line replies
- No unread indicator on conversation items
- Customer messages auto-marked-read on load
- No mobile back-to-list pattern
- Realtime triggers full `loadConvs()` (heavier than splice insert)

### 9.13 SettingsPage.jsx

**Layout:** Header, tab bar (Profile/Pricing), conditional content

**UI Elements:** Tabs with icons; Profile tab embeds `AdminPersonalInfoPage`; Pricing tab (number input + icon + helper + Save)

**Issues:**
- `role="tab"` without `role="tabpanel"` — incomplete ARIA tab semantics
- Pricing doesn't validate negative on client side

### 9.14 ContactInquiriesPage.jsx

**Layout:** Header with title + new-count + Refresh, `ResponsiveFilterControls`, table, detail modal

**UI Elements:** Table (avatar/name/phone/truncated message/status/date/actions); Eye (view) + CheckCircle (mark resolved); detail modal (name, phone, status badge, message, timestamp, Mark Resolved)

**Issues:**
- Resolved can't be revived back to "read"
- Truncation inconsistent across viewports
- Implicit `new -> read` on view (no user feedback)

### 9.15 PersonalInfoPage.jsx (Admin)

**Layout:** Four cards (Basic Info, Business Contact Numbers, Social Media, Business Addresses), sticky Save button

**UI Elements:** Icon-left inputs, Facebook link with external-link preview, Manila/Bohol address textareas with auto-title-case

**Issues:**
- **Dead `saveStatus`/`saveMessage` state**
- Facebook requires `https://` prefix (paste fails)
- No `aria-required`
- **Bypasses `blockedFields` helper** — direct `supabase.from('profiles').update()` instead of `updateProfile()`

### 9.16 ProfilePage.jsx (Admin)

**Layout:** Heading, profile card (banner + avatar + name + email + Administrator badge), menu row (Personal Information), Sign Out

**Issues:**
- **No route registered** — `/admin/profile` and `/admin/personal-info` lead to 404
- Sign Out has no confirmation
- No back button to dashboard

---

## 10. CSS-Specific Findings

### 10.1 Duplicate Implementations

| Component | Files |
|-----------|-------|
| Tracking page | `.trk-*` (modern) + `.tracking-*` (legacy) in `tracking.css` |
| Chat system | `.chatbox` legacy + floating FAB + `.chat-window` in `chatbot.css` + `tabs-steps.css` |
| Stat card | Original (decorative orbs in `data.css`) + redesigned (grid layout in `premium-refresh.css`) |
| Profile card | `charts.css` (60px avatar) + `customer-mobile-refresh.css` (82px avatar) |
| Ripple keyframe | `components.css` + `animations-utils.css` |
| Chat keyframes | `chatbot.css` + `tabs-steps.css` (`fabPulse`, `typingDot`, `chatOpen/Close`) |

### 10.2 Hardcoded Colors in Refresh Files

The refresh files define scoped CSS variables but hex literals (`#128A5A`, `#F0792E`) appear in multiple places. These should be promoted to `:root` in `tokens.css` so the token system stays authoritative.

### 10.3 Override Depth

`.btn-primary` is defined 3 times in the cascade:
1. `components.css` — gradient (original orange)
2. `premium-refresh.css` — solid background
3. `customer/admin-mobile-refresh.css` — green gradient

Cascade is correct only because `main.css` import order is exact. Document this dependency.

### 10.4 Catch-All `remaining.css`

At 2038 lines, mixes: alerts, notifications, support chat, profile, inbox, payment bars, revenue bars, reports, print styles, button ripple, onboarding overlay, image lightbox, admin mobile composition. Should be split by concern.

### 10.5 Scrollbar Interactions

Custom 6px scrollbar in `base.css` plus `responsive.css` hiding scrollbar for auth/tracking pages — verify they don't fight elsewhere.

### 10.6 `color-mix(in srgb, ...)` Usage

Used in `premium-refresh.css`. Well-supported now, but older browsers may not support it.

---

## 11. Cross-Cutting UX Patterns

### 11.1 Inconsistent Feedback Paradigm

| Area | Pattern |
|------|---------|
| Auth pages | Inline error banners + per-field errors |
| Book Shipment | Inline errors + toasts (duplicative) |
| Create Trip | Toast-only (no inline feedback) |
| Admin Personal Info | Inline errors + toasts |
| Announcements | Toast-only |
| Contact Inquiries | Toast-only |

### 11.2 Silent Error Swallowing

These pages silently catch errors (`catch {}` or `/* silently handled */`):
- Customer `HomePage.jsx`
- Customer `NotificationsPage.jsx`
- Customer `ProfilePage.jsx`
- Admin `InboxPage.jsx` (send/message-load failures)

User cannot distinguish "no data" from "load failed."

### 11.3 Sign Out — No Confirmation

Both customer and admin `ProfilePage.jsx` log out immediately on tap with no confirmation modal. Destructive action without guard.

### 11.4 Validation Placement Inconsistency

- `RegisterPage`: focusable top banner + per-field errors
- `BookShipmentPage`: inline + toast (both)
- `CreateTripPage`: toast-only
- `AboutPage`: toast-only
- Mixed within the same app creates cognitive inconsistency

### 11.5 Auto-Title-Casing

Applied aggressively on user input: names, addresses, Facebook names, barangay, street, lot/block. May mangle valid inputs with punctuation, abbreviations, or unusual casing (e.g., "Apt 12B", "P-1", "McDonald's").

### 11.6 Stagger Delays

Hand-coded per page: `(i + 2) * 60ms`, `120ms`, `180ms`, `240ms`, `300ms`. Small drift in cadence reduces visual consistency. No shared stagger constant.

### 11.7 EmptyState Inside Table Cells

`AdminOrdersPage`, `CustomersPage` render `EmptyState` inside `<td colSpan>` — breaks mobile `data-label` stacking pattern.

### 11.8 Missing Mobile Patterns

- InboxPage: no back-to-list button on mobile (split layout breaks)
- Support page: not reachable from customer bottom nav tabs

### 11.9 Realtime Without Connection Indicator

Notifications, chat, orders, inquiries all have Supabase realtime subscriptions with proper channel cleanup — but no UI indicator for connection status or offline state.

### 11.10 `prefers-reduced-motion` Coverage

| Component | Honors Reduced Motion |
|-----------|----------------------|
| PageTransition/StaggerItem | Yes (`useReducedMotion`) |
| AnimatedCounter | **No** |
| DonutChart | **No** |
| MiniBarChart | **No** |
| OnboardingModal | **No** |
| ImageLightbox | **No** |
| CapacityTracker | **No** |
| SkeletonLoader | **No** |

---

## 12. Accessibility Summary

### 12.1 Strengths

- Skip links on both layouts (`#admin-main-content`, `#customer-main-content`)
- FocusTrap on 5 of 8 dialog-like components
- ARIA roles/states on most interactive elements (`aria-live`, `aria-pressed`, `aria-expanded`, `aria-selected`, `aria-current`, `aria-busy`)
- `role="log"` on chat messages, `role="search"` on tracking form
- `sr-only` labels throughout (command palette title, lightbox title, support chat loading)
- Keyboard navigation: Arrow keys in CommandPalette/CustomSelect, Escape closes modals, Enter/Space triggers
- `prefers-contrast: high` honored in `base.css`
- Custom scrollbar (6px)
- 46-48px minimum button heights in refresh files (meets 44x44 tap target)
- Fluid headings via `clamp()`

### 12.2 Gaps

| Gap | Location |
|-----|----------|
| No top-level ErrorBoundary | `main.jsx` |
| Login chat: `aria-modal` but no focus trap or ESC | `LoginPage.jsx` |
| OnboardingModal: no FocusTrap | `OnboardingModal.jsx` |
| Settings: `role="tab"` without `role="tabpanel"` | `SettingsPage.jsx` |
| CapacityTracker: no `role="progressbar"` | `CapacityTracker.jsx` |
| TrackingTimeline: no ARIA attributes | `TrackingTimeline.jsx` |
| Photos: CSS `background-image` only, no `alt` | `OrderDetailPage.jsx` (customer) |
| 404 code: no `aria-label` | `NotFoundPage.jsx` |
| `aria-required` missing on many form fields | `PersonalInfoPage.jsx` (both) |
| `prefers-reduced-motion` not honored in 8 components | Various |
| Toast: `role="alert"` inside `aria-live="polite"` — mixed politeness | `useToast.jsx` |

---

## 13. Prioritized Issue List

### CRITICAL — Must Fix Before Launch

| # | Issue | Location |
|---|-------|----------|
| 1 | **Two brand color systems** — Orange tokens vs green refresh; any page outside wrapper classes renders in legacy orange | `tokens.css` vs refresh files |
| 2 | **Admin Profile/PersonalInfo routes missing** — nav links lead to 404 | `App.jsx`, `AdminLayout.jsx`, `ProfilePage.jsx` |
| 3 | **No top-level ErrorBoundary** — render crash = blank white screen | `main.jsx` |
| 4 | **Login chat: `aria-modal` but no focus trap or ESC** — keyboard users trapped | `LoginPage.jsx` chat dialog |

### HIGH — Should Fix Before Launch

| # | Issue | Location |
|---|-------|----------|
| 5 | `address_landmark` referenced but doesn't exist — "Use registered address" silently fails | `BookShipmentPage.jsx:132,152` |
| 6 | Register Step 2 (address) entirely optional — submit with blank address | `RegisterPage.jsx` |
| 7 | Silent error swallowing on 4 pages — user can't distinguish "no data" from "load failed" | HomePage, Notifications, Profile, Inbox |
| 8 | Sign Out has no confirmation on both profiles — accidental tap logs out | `ProfilePage.jsx` (both) |
| 9 | `ErrorBoundarySection` / `ErrorFallback` defined but never used | Components |
| 10 | Admin `PersonalInfoPage` bypasses `blockedFields` — direct Supabase call | `admin/PersonalInfoPage.jsx:103` |

### MEDIUM — Should Fix

| # | Issue |
|---|-------|
| 11 | Inconsistent validation paradigm across pages (inline vs toast vs both vs none) |
| 12 | Book Shipment Step 5 has no Back button — wizard rhythm broken |
| 13 | Admin Inbox: Enter sends regardless of Shift — no multi-line replies |
| 14 | InboxPage: no mobile back-to-list pattern — split layout breaks on narrow screens |
| 15 | Mobile bottom nav notification badge never shows — `hasBadge` never set |
| 16 | `prefers-reduced-motion` not honored in 8 components |
| 17 | FocusTrap missing on OnboardingModal |
| 18 | Announcements: no edit flow — only create + delete |
| 19 | Trip Detail: no edit flow — can't modify after creation |
| 20 | Settings tabs: incomplete ARIA (`role="tab"` without `role="tabpanel"`) |
| 21 | Duplicate keyframes (`ripple`, chat keyframes) across CSS files |
| 22 | Tracking page has two CSS implementations (`.trk-*` + `.tracking-*`) |
| 23 | Stat-card has two designs (original + premium-refresh) |
| 24 | `remaining.css` is 2038 lines — should be split |
| 25 | `CapacityTracker` has no `role="progressbar"` / `aria-valuenow` |
| 26 | Photos use CSS `background-image` only — no `alt` for screen readers |
| 27 | Customer Support page not reachable from bottom nav tabs |
| 28 | Dead state: `saveStatus`/`saveMessage` in both PersonalInfoPages |
| 29 | Dead imports: `CheckCircle`/`AlertCircle` in customer PersonalInfo; `CheckCircle2` in ForgotPassword |
| 30 | No connection-status indicator for realtime subscriptions |
| 31 | `EmptyState` inside table cells breaks mobile `data-label` stacking |

### LOW — Nice to Have

| # | Issue |
|---|-------|
| 32 | Auto-title-casing may mangle valid names/addresses |
| 33 | Stagger delays hand-coded per page — no shared cadence constant |
| 34 | Inline styles in PickupModal, TripAssignModal, AdminLayout Cmd-K button |
| 35 | Badge cap: `99+` in Sidebar vs `9+` in CustomerLayout |
| 36 | 404 "suggestions" label followed by empty block |
| 37 | Forgot password tips use `<div>` not `<ol>` |
| 38 | ImageLightbox `onWheel` passive listener Chrome warning |
| 39 | `validateFB` allows `http://` but error says `https://` |
| 40 | Floating chatbot only on Login page — not on Tracking/About |
| 41 | Dead config flag `isNum` in CustomerDetail stats |
| 42 | Z-index ladder capped at 9999 in tokens but onboarding=10000, lightbox=10001 |
| 43 | `color-mix(in srgb)` in newer CSS — older browser concern |
| 44 | `PageLoader` inconsistent with `LoadingScreen` primitives |
| 45 | Toast mixed politeness (`role="alert"` inside `aria-live="polite"`) |
| 46 | No `<React.StrictMode>` — double-invocation issues hidden |
| 47 | Hardcoded announcement filter list in HomePage |
| 48 | `FocusTrap` changes DOM shape when `active=false` vs `active=true` |
| 49 | `StatusBadge` reuses delivery class for payment state |
| 50 | Breakpoint inconsistency: `899.98px` vs `900px` across files |

---

## 14. What's Working Well

- **Comprehensive skeleton loaders** on every data page (9 variants: Text, Avatar, Card, TableRow, StatCard, OrderCard, Donut, BarChart, Chat)
- **Retry buttons** on every data page with error states
- **Strong accessibility foundation** — skip links, FocusTrap, ARIA roles/states, `aria-live` regions, `sr-only` labels, `prefers-contrast: high`
- **Responsive design** — 57 media-query blocks across 14 CSS files, `data-label` mobile stacking, drawer sidebar, bottom nav with FAB-style book tab
- **Real-time everywhere** — notifications, chat, orders, inquiries via Supabase channels with proper cleanup
- **PWA support** — service worker, offline fallback, install prompt, manifest with shortcuts
- **Consistent brand wordmark** — `CARGO` + `EXPRESS` across all layouts
- **Token-driven theming** — components consuming CSS vars get dark mode for free
- **5-step booking wizard** with route validation, province filtering, auto-cost preview, success rings animation
- **Print-optimized reports** — `@media print`, landscape orientation, inline SVG logo, print-only header/footer
- **Two-tier photo storage** with client-side compression and Firestore fallback
- **Code-split lazy routes** with Suspense boundaries and PageLoader fallback
- **FOUC prevention** — pre-paint theme script in `index.html` + `useLayoutEffect` in ThemeContext
- **No `console.log`/`warn` in production code** — only `ErrorBoundary.componentDidCatch` gated by `import.meta.env.DEV`
- **No native `alert`/`confirm`/`prompt`** — replaced by `ConfirmModal` and `useToast`
- **Custom Select component** with smart viewport placement, keyboard navigation, and full ARIA

---

## 15. Summary Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Design Consistency** | ~75% | Token system solid, but two parallel brand systems (orange vs green) cause drift |
| **UX Completeness** | ~85% | Most flows well-designed with loading/error/empty states; gaps in confirmations, wizard navigation, error surfaces |
| **Accessibility** | ~80% | Strong foundation; gaps in FocusTrap coverage, tab ARIA, reduced-motion, and photo alt text |
| **Responsive Design** | ~90% | Comprehensive breakpoint coverage; a few missing mobile patterns (Inbox split layout) |
| **Code Quality** | ~85% | Clean component architecture; some dead code, inline-style inconsistency, and CSS duplication |
| **Polish Readiness** | Yes | Architecture is healthy; fixes are targeted rather than structural rewrites |

**Biggest architectural fix needed**: Unify the two brand color systems into a single authoritative palette in `tokens.css`.

**Most impactful single fix**: Add top-level `<ErrorBoundary>` in `main.jsx` and register the missing admin routes in `App.jsx`.
