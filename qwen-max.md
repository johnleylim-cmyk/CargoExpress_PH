# CargoExpress PH — Full Frontend UI/UX Audit (Verified)

## System Overview

| Aspect | Details |
|--------|---------|
| **Framework** | React 18 + Vite + React Router v6 |
| **Styling** | Pure CSS with CSS Custom Properties (no Tailwind, no CSS-in-JS) |
| **CSS Files** | 22 files, layered architecture |
| **Total CSS Lines** | 11,860 lines |
| **Total @media Queries** | 54 across 14 files |
| **Pages** | 30+ routes (auth, customer, admin, public) |
| **Layouts** | AdminLayout (sidebar + topbar), CustomerLayout (navbar + bottom tabs) |
| **Theming** | Light + Dark mode via `[data-theme="dark"]` |
| **Icons** | Lucide React |
| **Fonts** | Inter (system fallback stack) |
| **Inline Styles in JSX** | 324 occurrences across 41 files |
| **Unique Breakpoints** | 15 |

### CSS File Architecture (Load Order)

```
1. tokens.css          — Design tokens (no output, only CSS variables)
2. base.css            — Reset, typography, scrollbar, skip-link
3. components.css      — Buttons, cards, forms, badges, theme toggle
4. data.css            — Tables, stat cards, grids, timelines, capacity
5. feedback.css        — Modals, toasts
6. loading-search.css  — Spinners, skeletons, empty states, search
7. tabs-steps.css      — Tabs, step progress, login split layout, chatbot FAB
8. chatbot.css         — Chat window, bubbles, typing, quick replies
9. charts.css          — Donut chart, bar chart, pagination, breadcrumb
10. layout-admin.css   — Admin sidebar, topbar, main content
11. layout-customer.css — Customer navbar, bottom tabs, dropdown, avatar
12. auth.css           — Login, register, forgot/reset password
13. pages.css          — About, contact, hero, 404, error boundary
14. tracking.css       — Tracking page, public about page (catch-all)
15. remaining.css      — Inbox, notifications, profile, reports, sales,
                         onboarding, lightbox, admin composition,
                         micro-interactions, mobile tables, print styles
16. animations-utils.css — Keyframes, animation classes, utilities
17. responsive.css     — Global responsive overrides
18. premium-refresh.css  — Shadow/surface overrides, stat card redesign,
                           booking success, layout hardening, bento grid
19. customer-mobile-refresh.css — Full customer theme (green brand),
                                  navbar, bottom tabs, all customer pages
20. admin-modern-refresh.css   — Full admin theme (green brand),
                                 sidebar, topbar, all admin components
21. viewport-hardening.css     — dvh support, notification badge sizing,
                                 topbar responsive, snapshot pills
```

---

## STRENGTHS

### 1. Design Token System (`tokens.css`)

Well-organized with 70+ CSS custom properties:

| Token Category | Values |
|---------------|--------|
| Brand palette | primary, primary-dark/light/lighter/bg/glow |
| Accent palette | accent, accent-dark/light/lighter |
| Semantic colors | success, warning, error, info (each with -dark, -bg, -glow) |
| Chart colors | purple, pink, slate, teal |
| Neutrals | bg, bg-secondary, surface, surface-raised, border (3 variants), text (4 variants) |
| Glass effects | glass-bg, glass-bg-heavy, glass-border, glass-blur |
| Sidebar | 7 sidebar-specific tokens |
| Shadows | 10 levels (xs → 2xl, glow, primary, primary-lg) |
| Radius | 7 steps (xs: 6px → full: 9999px) |
| Spacing | 8 steps (xxs: 4px → xxl: 48px) |
| Transitions | 4 curves (fast 0.15s, default 0.2s, slow 0.35s, spring 0.4s) |
| Z-index | 6 levels (base: 1 → toast: 9999) |

### 2. Dark Mode

Comprehensive dark theme via `[data-theme="dark"]`:
- Full token overrides for all semantic colors, neutrals, shadows, sidebar, glass effects
- Per-component dark mode rules: badges (8 variants), chat bubbles, tracking card, auth screens, public about page
- Smooth theme transition class (`.theme-transition`)
- `prefers-contrast: high` media query support

### 3. Accessibility

| Feature | Location | Status |
|---------|----------|--------|
| Skip link | `base.css:78-96` | Present, focus-reveal |
| `:focus-visible` outlines | `base.css:63-66` | All interactive elements |
| `sr-only` utility | `animations-utils.css:246`, `tabs-steps.css:89` | Present (duplicated) |
| `prefers-reduced-motion` | `remaining.css:1269-1278` | Disables all animations |
| `prefers-contrast: high` | `base.css:98-111` | Light + dark variants |
| 44px touch targets | Throughout | Buttons, links, inputs, tabs |
| ARIA attributes | JSX components | `role`, `aria-label`, `aria-expanded` |

### 4. Responsive Design

- Fluid typography with `clamp()` on h1-h4
- Mobile-first bottom tab bar with elevated FAB button
- Data tables transform to stacked card layout on mobile
- Sidebar converts to slide-in drawer on tablets (1024px)
- `env(safe-area-inset-bottom)` for iOS safe areas
- `100dvh` dynamic viewport support with `@supports` fallback
- Modals switch to bottom-sheet on mobile (640px)
- Report tables with print-optimized layout

### 5. Premium Micro-interactions

- Button ripple effects (radial-gradient on `:active`)
- Card hover lifts (`translateY(-1px)` to `translateY(-3px)`)
- Skeleton loaders with shimmer animation
- Scroll-reveal with staggered delays
- Page entrance animations
- Breathing/pulse on active timeline nodes
- Booking success screen with animated checkmark, particles, and ticket card
- Chat FAB with pulse ring animation
- Notification badge with pop animation
- Capacity bar with shimmer fill

### 6. Print Styles

Dedicated `@media print` block in `remaining.css`:
- Hides sidebar, navbar, bottom nav, modals
- Shows print-only header/footer elements
- Landscape orientation, 1cm margins
- `break-inside: avoid` for cards and tables
- Preserves stat card colors with `print-color-adjust: exact`
- Disables all animations

### 7. Code Splitting

Lazy-loaded routes via `React.lazy()` + `Suspense`:
- Auth pages: eagerly loaded (fast first paint)
- Customer/Admin pages: lazy-loaded per route
- Dedicated `PageLoader` spinner for in-layout suspense fallback

---

## CRITICAL ISSUES

### 1. Cascading Override Layers Create Confusion

The last 4 CSS files are "refresh" layers that redefine core tokens and component styles established in earlier files:

| File | What it Overrides |
|------|-------------------|
| `premium-refresh.css` | `:root` shadow tokens, dark mode bg/surface, cards, buttons, inputs, stat cards, hero, customer bottom nav, booking success screen, layout hardening, bento grid |
| `admin-modern-refresh.css` | **Everything** inside `.app-layout` — sidebar (rounded pill design), topbar, cards, buttons, forms, tables, badges, profile, tabs |
| `customer-mobile-refresh.css` | **Everything** inside `.customer-layout-v2` — navbar, cards, buttons, forms, bottom tabs, chat, hero, snapshot pills, trip cards, booking flow, profile, support chat |
| `viewport-hardening.css` | `dvh` heights, notification badge sizing, topbar sizing, snapshot pills |

**Specific example — shadow tokens redefined 3 times:**

```css
/* tokens.css:80 */
--shadow-md: 0 4px 8px -1px rgba(15,23,42,0.07), 0 2px 4px -2px rgba(15,23,42,0.04);

/* premium-refresh.css:9 — immediately overrides */
--shadow-md: 0 8px 20px rgba(15,23,42,0.08);

/* admin-modern-refresh.css:19 — scoped override */
--admin-shadow-soft: 0 10px 26px rgba(15,23,42,0.06);
```

The base `tokens.css` values are never the actual values used in practice. The tokens file is misleading as a design reference.

### 2. Three Brand Color Identities

The system has three distinct visual personalities:

| Context | Primary Action Color | Button Style | Source |
|---------|---------------------|--------------|--------|
| Auth / Public pages | `--primary: #E8722A` (orange) | Orange gradient | `tokens.css` + `components.css` |
| Admin (`.app-layout`) | `--admin-green: #128A5A` | Green gradient | `admin-modern-refresh.css` |
| Customer (`.customer-layout-v2`) | `--customer-green: #128A5A` | Green gradient | `customer-mobile-refresh.css` |

**Note**: `--admin-green` and `--customer-green` are the same hex value (`#128A5A` light, `#4ADE80` dark), just under different variable names in different scopes. This is a naming/maintenance issue, not a visual mismatch between admin and customer.

**Real issue**: The brand experience shifts abruptly when crossing from orange-themed auth pages to green-themed dashboards. Users see orange submit buttons on login, then green primary buttons on the dashboard.

### 3. Dark Mode Defined in 4 Separate Files

Dark mode overrides are scattered across:

| File | Scope |
|------|-------|
| `tokens.css:124-198` | Core token overrides (bg, surface, text, border, shadow, sidebar, glass) |
| `premium-refresh.css:16-28` | Additional `--bg`, `--surface`, `--border` tweaks |
| `admin-modern-refresh.css:28-43` | Admin-specific: `--admin-*` token overrides |
| `customer-mobile-refresh.css:27-42` | Customer-specific: `--customer-*` token overrides |

Plus per-component dark mode rules in:
- `components.css:353-363` — Badge dark variants
- `premium-refresh.css:95-154` — Chat window dark mode
- `premium-refresh.css:855-1095` — Auth/about dark mode (extensive)
- `remaining.css:298-307` — Capacity tracker dark mode
- `tracking.css:187-207` — Tracking card dark mode
- `chatbot.css:355-361` — Chat tracking card dark mode

A single dark mode change may need edits in 6+ files, and later files silently override earlier ones.

### 4. `remaining.css` is a 2,038-line Catch-All

This single file mixes styles for:
- Alert banners
- Typing indicator
- Notifications
- Support chat page
- Profile card + menu
- Section headers
- Inbox/chat panel layout
- Sales visual bars
- Reports page (premium styles + print)
- Micro-interactions (ripples, hover effects)
- Mobile data table transforms
- Onboarding modal
- Image lightbox
- Reduced motion
- Admin page composition (headers, toolbars, cards, filters, forms)
- Status timeline mobile
- Customer order detail mobile

This makes it the hardest file to maintain and the most likely source of unintended style conflicts.

---

## HIGH-SEVERITY ISSUES

### 5. Hardcoded Colors Bypass Token System

**Verified occurrences:**

| Location | Hardcoded Value | Should Use |
|----------|----------------|------------|
| `components.css:63` | `.btn-danger: #B91C1C` | `--error` or `--error-dark` |
| `components.css:66` | `.btn-success: #047857` | `--success` or `--success-dark` |
| `components.css:338-345` | Badge backgrounds (8 classes) | Semantic badge tokens |
| `feedback.css:231` | `.toast-message: #334155` | `--text` or `--text-secondary` |
| `feedback.css:237` | `.toast-close: #94a3b8` | `--text-tertiary` |
| `feedback.css:248` | `.toast-close:hover: #475569` | `--text-secondary` |
| `pages.css:63` | `.about-mission p: #92400E` | `--warning-dark` |
| `pages.css:73` | `.contact-card: white` | `var(--surface)` |
| `tracking.css:597` | `.public-about-header: #0B1929` | `--accent-darker` |
| `components.css:63-67` | Danger/success button shadows | Shadow tokens |

### 6. Duplicate Class Definitions

**Verified duplicates:**

| Class | Location 1 | Location 2 | Issue |
|-------|-----------|-----------|-------|
| `.sr-only` | `animations-utils.css:246` | `tabs-steps.css:89` | Identical definitions in 2 files |
| `.text-success` | `animations-utils.css:230` | `animations-utils.css:328` | Same file, defined twice |
| `.text-error` | `animations-utils.css:231` | `animations-utils.css:329` | Same file, defined twice |
| `.btn::after` | `components.css:19-35` | `remaining.css:776-794` | **Conflicting** ripple implementations |

The `.btn::after` conflict is the most problematic — `components.css` uses `scale(10)` with a fixed center, while `remaining.css` uses CSS variables `--ripple-x`/`--ripple-y` with `scale(0)→scale(2.5)`. The cascade means `remaining.css` wins, but `components.css` has dead CSS.

### 7. Legacy Tracking Styles — Confirmed Dead Code

**Classes defined in `tracking.css:394-585` but used in zero JSX files:**

- `.tracking-header`
- `.tracking-brand`
- `.tracking-subtitle`
- `.tracking-search-form`
- `.tracking-search-wrapper`
- `.tracking-search-icon`
- `.tracking-search-input`
- `.tracking-search-btn`
- `.tracking-error`
- `.tracking-empty`
- `.tracking-result`
- `.tracking-status-header`
- `.tracking-status-label`
- `.tracking-number-display`
- `.tracking-timeline`
- `.timeline-step` (and variants)
- `.tracking-info-grid`
- `.tracking-info-card`
- `.tracking-timestamps`
- `.tracking-footer`

The actual `TrackingPage.jsx` exclusively uses `.trk-*` classes. These ~200 lines are dead CSS.

Note: `chat-tracking-*` classes in `LoginPage.jsx` are a different component (chatbot tracking card inside chat bubbles), defined in `chatbot.css`.

### 8. `tracking.css` Mixes 3 Unrelated Page Domains

The 740-line file contains:
1. **Tracking page** (`.trk-*` classes, lines 1-391)
2. **Legacy tracking page** (`.tracking-*` classes, lines 394-585) — dead code
3. **Public About page** (`.public-about-*` classes, lines 589-738)
4. **Contact section** (`.about-*`, `.contact-*` from `pages.css` also referenced)

### 9. Mobile Table Transformation Defined Twice with Overlapping Ranges

```css
/* remaining.css:892 */
@media (max-width: 820px) {
  .data-table thead { display: none; }
  /* ... card-based table layout ... */
}

/* remaining.css:1738 */
@media (max-width: 900px) {
  .data-table thead, .report-table thead { display: none; }
  /* ... different card-based table layout ... */
}
```

Between 820-900px, both rules apply and compete. The second block (900px) adds `.report-table` but uses different `display` values (`block` vs `flex`) for table rows.

### 10. `.customer-main` Padding — 10 Competing Declarations

| # | File | Line | Value |
|---|------|------|-------|
| 1 | `layout-customer.css` | 239 | `padding: 24px 20px 120px` |
| 2 | `layout-customer.css` | 365 | `padding: 16px 16px calc(144px + env(...))` (mobile) |
| 3 | `layout-customer.css` | 377 | `padding-bottom: 40px` (desktop) |
| 4 | `customer-mobile-refresh.css` | 211 | `padding: 28px 22px calc(132px + ...)` |
| 5 | `customer-mobile-refresh.css` | 970 | `:has(.support-chat-page)` override |
| 6 | `customer-mobile-refresh.css` | 992 | `padding: 18px 18px calc(160px + ...)` (mobile) |
| 7 | `customer-mobile-refresh.css` | 1109 | `padding-inline: 14px !important` (tiny screens) |
| 8 | `premium-refresh.css` | 162 | `padding-bottom: calc(156px + ...)` |
| 9 | `premium-refresh.css` | 1109 | `padding-bottom: calc(168px + ...)` |
| 10 | `premium-refresh.css` | 1231-1236 | Two `!important` overrides |

---

## MEDIUM-SEVERITY ISSUES

### 11. 15 Unique Responsive Breakpoints

| Breakpoint | Used In |
|-----------|---------|
| `1024px` | responsive.css, admin-modern-refresh.css, viewport-hardening.css |
| `900px` | tabs-steps.css, remaining.css |
| `899.98px` | layout-customer.css, responsive.css, premium-refresh.css, customer-mobile-refresh.css |
| `820px` | components.css, remaining.css (x2) |
| `768px` | responsive.css, remaining.css (x3), admin-modern-refresh.css |
| `640px` | tracking.css (x2), remaining.css, viewport-hardening.css, premium-refresh.css |
| `600px` | charts.css |
| `540px` | auth.css |
| `520px` | customer-mobile-refresh.css |
| `480px` | auth.css, responsive.css, feedback.css, remaining.css, tabs-steps.css (x2), premium-refresh.css, admin-modern-refresh.css |
| `420px` | premium-refresh.css |
| `380px` | auth.css, tracking.css (x2), viewport-hardening.css |
| `374px` | customer-mobile-refresh.css |
| `360px` | remaining.css, viewport-hardening.css, premium-refresh.css |
| `340px` | viewport-hardening.css |

Note: `899.98px` and `900px` are functionally the same breakpoint defined differently.

### 12. Toast Has 3 Competing Entrance Animations

```css
/* feedback.css:257 */
@keyframes toastIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* remaining.css:881 */
@keyframes toastSlideIn {
  from { opacity: 0; transform: translateX(40px) scale(0.95); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}

/* feedback.css:309 (mobile override) */
@media (max-width: 480px) {
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}
```

The `.toast` element references `toastSlideIn` in `remaining.css:878`, overriding the original `toastIn` from `feedback.css:125`.

### 13. Z-Index Values Outside Token Scale

| Element | Hardcoded Value | Token Scale Max |
|---------|----------------|----------------|
| Skip link | `z-index: 99999` | `--z-toast: 9999` |
| Onboarding modal | `z-index: 10000` | `--z-modal: 1000` |
| Lightbox | `z-index: 10001` | `--z-modal: 1000` |

### 14. `color-mix()` Used Without Fallbacks — 57 Occurrences

Distributed across:
- `premium-refresh.css` — 23 uses
- `admin-modern-refresh.css` — 17 uses
- `customer-mobile-refresh.css` — 13 uses
- `layout-admin.css` — 2 uses
- `charts.css` — 1 use
- `pages.css` — 1 use

Browser support: Chrome 111+, Firefox 113+, Safari 16.2+. No fallback for older browsers.

### 15. Inline Styles — 324 Occurrences Across 41 Files

**Top offenders:**

| File | Count |
|------|-------|
| `SkeletonLoader.jsx` | 38 |
| `ReportsPage.jsx` | 31 |
| `OrderDetailPage.jsx` (admin) | 26 |
| `OrderDetailPage.jsx` (customer) | 24 |
| `AboutPage.jsx` | 22 |
| `HomePage.jsx` (customer) | 21 |
| `PickupModal.jsx` | 15 |
| `BookShipmentPage.jsx` | 14 |
| `TripAssignModal.jsx` | 12 |
| `InboxPage.jsx` | 12 |
| `CreateTripPage.jsx` | 11 |
| `ContactInquiriesPage.jsx` | 10 |
| `ProfilePage.jsx` (customer) | 9 |
| `TripDetailPage.jsx` | 7 |

Many of these are dynamic styles (chart colors, status-based colors, computed widths) that are reasonable as inline styles. But a significant portion could be moved to CSS classes.

### 16. Bento Grid System — Defined but Unused

`.bento-grid` with 12-column system defined in `premium-refresh.css:1432-1450`:
```css
.bento-grid { grid-template-columns: repeat(12, minmax(0, 1fr)); }
.bento-col-12, .bento-col-8, .bento-col-6, .bento-col-4 { ... }
```

**Zero usage** found in any JSX file. Dead CSS.

### 17. Utility Class Naming Duplication

Two parallel naming systems in `animations-utils.css`:

| Tailwind-style | Shorthand | Value |
|---------------|-----------|-------|
| `.gap-4` | `.gap-xs` | 4px |
| `.gap-8` | `.gap-sm` | 8px |
| `.gap-16` | `.gap-md` | 16px |
| `.gap-24` | `.gap-lg` | 24px |
| `.gap-32` | `.gap-xl` | 32px |
| `.mt-8` | `.mt-sm` | 8px |
| `.mt-16` | `.mt-md` | 16px |
| `.mt-24` | `.mt-lg` | 24px |
| `.mt-32` | `.mt-xl` | 32px |
| `.mb-8` | `.mb-sm` | 8px |
| `.mb-16` | `.mb-md` | 16px |
| `.mb-24` | `.mb-lg` | 24px |

---

## LOW-SEVERITY ISSUES

### 18. Notification Badge Sizing Defined in 3 Places

| File | Line | What |
|------|------|------|
| `layout-customer.css` | 116-136 | Original `.notification-badge` |
| `layout-customer.css` | 139-158 | `.notification-badge-sm` variant |
| `viewport-hardening.css` | 38-54 | Override for both classes |

### 19. `admin-modern-refresh.css` Introduces 12 New Scoped Tokens

```css
--admin-green, --admin-green-dark, --admin-green-soft, --admin-green-glow,
--admin-orange, --admin-orange-soft, --admin-ink, --admin-muted,
--admin-panel, --admin-panel-solid, --admin-line,
--admin-shadow, --admin-shadow-soft
```

These duplicate the purpose of base tokens (`--surface`, `--text`, `--border`, `--shadow-*`) within a scoped context. The customer layout introduces an equivalent 12 `--customer-*` tokens with identical values.

### 20. Card Hover Effect Defined Differently in 3 Places

```css
/* components.css:121-123 */
.card-interactive:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

/* remaining.css:820-823 */
.card-interactive:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

/* premium-refresh.css:51-53 */
.card-interactive:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

Three different `translateY` values (-1px, -2px, -3px) and two different shadow levels. The cascade winner depends on load order.

---

## PAGE-BY-PAGE FINDINGS

### Auth Pages

| Page | Classes Used | Notes |
|------|-------------|-------|
| Login | `.login-split-page` | Split layout: decorative left panel + form right panel. Route pills, feature list, trust badges. Chatbot FAB integrated. |
| Register | `.auth-page`, `.reg-*` | Multi-step with progress bar, password strength checklist, address note. Step labels hidden on mobile. |
| Forgot Password | `.auth-page`, `.fp-*` | Animated envelope icon, resend countdown with progress bar, tips list. |
| Reset Password | `.auth-page`, `.rp-*` | Token verification spinner, password requirements grid (2-col), match indicator. |

**Issue**: Auth pages use orange `--primary` while logged-in dashboards use green. The visual transition when users log in is jarring.

### Customer Pages

| Page | Classes Used | Notes |
|------|-------------|-------|
| Home | `.customer-home-page`, `.customer-home-hero` | Hero with track form, 3-column snapshot pills, trip cards |
| Orders | `.customer-orders-page` | Tab filtering (5 tabs), card list, search |
| Order Detail | `.customer-order-detail-page` | Status timeline, contact grid, payment summary, proof photos |
| Book Shipment | `.booking-page` | Multi-step with sticky progress, route cards, cost card, cinematic success |
| Trips | `.customer-trips-page` | List with date badges (day/month) |
| Notifications | `.customer-notifications-page` | Date-separated, unread states |
| Profile | `.profile-page` | Premium card, avatar, quick stats, menu |
| Personal Info | `.customer-personal-info-page` | Form with icon inputs |
| Support Chat | `.support-chat-page` | Full-page chat, message bubbles, typing |

**Issue**: Customer layout uses green for primary actions while auth pages use orange.

### Admin Pages

| Page | Classes Used | Notes |
|------|-------------|-------|
| Dashboard | `.admin-page-header`, stat cards | Stat grid, donut/bar charts, capacity tracker, recent orders |
| Orders | `.admin-toolbar`, `.admin-table-card` | Search + filters, data table, pagination |
| Order Detail | `.admin-detail-grid` | Detail items, timeline, action cards |
| Trips | `.admin-filter-row`, table | Filter buttons, trip cards |
| Create Trip | `.admin-route-options` | Route selection cards, form |
| Trip Detail | Detail grid | Assignment modal, pickup modal |
| Customers | Table | Search, pagination |
| Customer Detail | Detail grid | Profile, order history |
| Sales | Revenue bars | Payment method breakdown, monthly bars |
| Reports | `.report-*` | Period tabs, date range, financial grid, printable |
| Announcements | `.admin-announcement-*` | Card list, create form |
| Inbox | `.admin-inbox-page`, `.inbox-*` | Split-panel: conversation list + chat |
| Settings | Form | Standard form layout |
| Contact Inquiries | Table | Contact form submissions |

**Issue**: Admin green theme makes orange `--primary` elements (like some badges, links) look inconsistent.

### Public Pages

| Page | Classes Used | Notes |
|------|-------------|-------|
| Tracking | `.trk-page`, `.trk-*` | Animated orbs, pill search, result card with timeline + info grid |
| About | `.public-about-page` | Hero, feature grid, content grid, contact form |
| 404 | `.not-found-page` | Animated "404" with gradient text, pulse ring, suggestions |

**Issue**: Tracking page uses `.trk-*` classes but legacy `.tracking-*` classes (200+ lines) are dead code.

---

## SCORECARD

| Category | Score | Notes |
|----------|-------|-------|
| **Design System** | 8/10 | Excellent tokens, undermined by override layers that silently redefine them |
| **Visual Consistency** | 6/10 | Orange auth → green dashboard brand shift; card hovers have 3 different values |
| **Dark Mode** | 9/10 | Very thorough coverage, but scattered across 6+ files |
| **Responsive Design** | 8/10 | Covers 320px to 4K, but 15 breakpoints create maintenance burden |
| **Accessibility** | 9/10 | Focus states, skip link, reduced motion, high contrast, 44px targets |
| **Code Organization** | 5/10 | `remaining.css` is a 2,038-line dumping ground; 4 override layers fight base styles |
| **Mobile UX** | 9/10 | Premium bottom tabs, FAB, safe areas, card tables, bottom-sheet modals |
| **Animation Quality** | 9/10 | Premium feel with proper reduced-motion respect |
| **Performance** | 8/10 | Lazy routes, code splitting; 11,860 lines of CSS is large |
| **Maintainability** | 4/10 | Override layers, 324 inline styles, duplicate definitions, dead code |
| **Dead Code** | 5/10 | ~200 lines legacy tracking CSS, unused bento grid, duplicate utilities |

**Overall: 7.5/10** — The visual quality and user experience are premium-grade. The main debt is architectural: cascading override layers, scattered dark mode definitions, and a brand color identity split between orange and green.

---

## RECOMMENDATIONS

### High Priority

1. **Consolidate override layers** — Merge `premium-refresh.css`, `admin-modern-refresh.css`, and `customer-mobile-refresh.css` into the base files they override. If role-based theming is intentional, implement it via CSS custom property scoping (e.g., `.theme-admin { --primary: var(--admin-green); }`) rather than re-declaring every component style.

2. **Unify brand color** — Choose one primary brand color for the entire app. If green is the product direction, update `--primary` in `tokens.css` and remove `--admin-green` / `--customer-green` as redundant aliases. If orange stays for auth, add a deliberate `--auth-primary` token rather than having the override files fight the base.

3. **Delete dead CSS** — Remove the ~200 lines of legacy `.tracking-*` styles from `tracking.css` (lines 394-585). Remove `.bento-grid` / `.bento-col-*` from `premium-refresh.css` if unused.

4. **Fix `.btn::after` conflict** — Remove the ripple definition in `components.css:19-35` since `remaining.css:776-794` overrides it with a more sophisticated version.

5. **Move hardcoded colors to tokens** — Create `--danger: #B91C1C` and `--success-dark: #047857` tokens for button variants instead of hardcoding hex values.

### Medium Priority

6. **Consolidate breakpoints** — Reduce from 15 to 6 breakpoints: `1024`, `900` (merge `899.98`), `768`, `640`, `480`, `360`.

7. **Split `remaining.css`** — Break into logical files:
   - `inbox.css` — Inbox/chat panel layout
   - `notifications.css` — Notification cards
   - `profile.css` — Profile card, menu, stats
   - `reports.css` — Report controls, financial grid, print
   - `onboarding.css` — Onboarding modal
   - `lightbox.css` — Image lightbox
   - `admin-composition.css` — Admin page headers, toolbars, detail grids

8. **Split `tracking.css`** — Move public about page styles to a new `about.css`.

9. **Resolve `.customer-main` padding** — Define the padding value once in `layout-customer.css` and let the refresh files only override specific media queries, not the base declaration.

10. **Reduce inline styles** — Move the 324 `style={{}}` occurrences to CSS classes where possible. Priority: `SkeletonLoader.jsx` (38), `ReportsPage.jsx` (31), `OrderDetailPage.jsx` (26+24), `AboutPage.jsx` (22).

### Low Priority

11. **Remove duplicate utilities** — Choose one naming convention. Keep either `.gap-sm` / `.mt-sm` or `.gap-8` / `.mt-8`, not both.

12. **Standardize toast animation** — Keep one entrance animation. Remove the competing `toastIn` and `toastSlideIn`.

13. **Extend z-index token scale** — Add `--z-onboarding: 10000`, `--z-lightbox: 10001` to `tokens.css`.

14. **Consolidate dark mode** — Move all dark mode rules into a single `dark-mode.css` file, or co-locate them with each component's base styles (not in override files).

15. **Add `color-mix()` fallbacks** — For broader browser support, or accept the baseline (Chrome 111+, Firefox 113+, Safari 16.2+).

---

*Audit performed by scanning all 22 CSS files (11,860 lines) and 60+ JSX component/page files. Every finding was verified with grep against the actual source code. Last verified: 2026-06-14.*
