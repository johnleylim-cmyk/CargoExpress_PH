# 🎨 CargoExpress PH — Full Frontend UI/UX Audit

**Date:** 2026-06-12  
**Scope:** Every screen, page, component, and stylesheet  
**Methodology:** Line-by-line reading of all 72 source files (17 CSS, 34 pages, 28 components, 3 context/hooks)

---

## 📊 Executive Summary

| Category | Rating | Details |
|----------|--------|---------|
| Design System Foundation | ⭐⭐⭐⭐⭐ | Excellent CSS variable system with full dark mode |
| CSS Architecture | ⭐⭐⭐⭐ | Well-organized modular CSS, premium overlays |
| Component Consistency | ⭐⭐⭐ | Good patterns but three different animation approaches |
| Accessibility (WCAG) | ⭐⭐⭐ | Strong on auth/forms, gaps in charts and error states |
| Dark Mode Coverage | ⭐⭐⭐⭐ | Comprehensive token-level support, ~8 gap areas |
| Mobile Responsiveness | ⭐⭐⭐⭐ | Excellent bottom-nav pattern, some overflow risks |
| Code Health | ⭐⭐⭐ | ~12 unused imports, ~50+ inline style blocks to convert |

---

## 1. DESIGN SYSTEM & TOKEN HEALTH

### ✅ Strengths

The design system in `tokens.css` is **world-class**:
- 120+ CSS custom properties covering colors, shadows, radii, spacing, transitions, z-index
- Full dark mode via `[data-theme="dark"]` with matched semantic tokens
- `prefers-contrast: high` support in `base.css`
- `prefers-reduced-motion` support in `remaining.css` (line 1269-1278)
- Fluid typography using `clamp()` in `base.css` (lines 26-47)
- Proper viewport-aware `100dvh` fallback in `viewport-hardening.css`

### ⚠️ Issues

1. **Three competing style overrides**: `premium-refresh.css`, `customer-mobile-refresh.css`, and `admin-modern-refresh.css` each define their own color variables (`--customer-green`, `--admin-green`) that override the base tokens. This creates **parallel design systems** — the admin sidebar has green accents while the customer sidebar stays orange, but both draw from the same `tokens.css`. Maintenance risk: changes in one refresh file may not propagate to the other.

2. **`!important` pollution**: `customer-mobile-refresh.css` and `premium-refresh.css` use `!important` to override inline styles from JSX. This creates a brittle cascade where CSS fights JSX. Fix: remove the inline styles so `!important` isn't needed.

3. **Box-shadow inconsistencies**: `tokens.css` defines 11 shadow variables, but `premium-refresh.css` (lines 6-14) redefines `--shadow-xs` through `--shadow-primary-lg` with slightly different values. Same for `customer-mobile-refresh.css` which defines `--customer-shadow` and `--customer-shadow-soft` outside the token system.

---

## 2. CSS ARCHITECTURE

### ✅ Strengths

- **Modular organization**: 17 CSS files organized by layer (tokens → base → components → layouts → pages → responsive → refresh → hardening)
- **Fluid responsive typography**: `base.css` lines 26-47 use `clamp()` for h1–h4
- **Print stylesheet**: `remaining.css` lines 625-737 has complete `@media print` support
- **Mobile table cards**: `remaining.css` lines 820-994 transforms data tables into stacked cards on mobile — excellent UX
- **Scroll-reveal animation**: `animations-utils.css` lines 74-87 with `IntersectionObserver` via `ScrollReveal.jsx`

### ⚠️ Issues

1. **Duplicate CSS classes across files**: `.sr-only` is defined in BOTH `animations-utils.css` (line 245) and `tabs-steps.css` (line 88). `.loading-screen` animation patterns appear in both `loading-search.css` and `remaining.css`.

2. **Conflicting booking-success styles**: `premium-refresh.css` defines `.booking-success-shell` TWICE — first with border/card styling (lines 409-419), then overrides it with borderless/minimal styling (lines 905-918). Only one set applies; the other is dead CSS.

3. **`customer-layout-v2` CSS class specificity wars**: This single class on the body triggers an entire parallel design system in `customer-mobile-refresh.css` (1154 lines). Everything is scoped under `.customer-layout-v2` which creates problems when components are shared between customer and admin layouts.

4. **Hardcoded hex values in CSS** (not in JSX):
   - `feedback.css` toast colors: `#0f172a`, `#10B981`, `#DC2626`, etc. (lines 147-197) — no dark mode overrides
   - `chatbot.css` line 12: `background: linear-gradient(135deg, #152E4A, #2D5A8A)` — hardcoded
   - `tabs-steps.css` line 98: login left panel background uses hardcoded hex
   - `pages.css` line 6: `.about-hero` hardcoded hex gradient
   - `charts.css`: Donut chart inline validation colors `#EF4444` etc.

---

## 3. ADMIN PAGES AUDIT (16 pages)

### DashboardPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| Donut chart segment colors are raw hex (`#F59E0B`, `#8B5CF6`, `#3B82F6`, `#10B981`, `#64748B`) | 🔴 High | Lines 57-65 |
| `TrendingUp` imported but unused | 🟡 Low | Line 11 |
| Error container lacks `role="alert"` | 🟠 Medium | Line 39-47 |
| `style={{ padding: 40 }}` should be CSS class `p-40` | 🟡 Low | Lines 41, 174 |
| No visual indicator for partial/stale data | 🟡 Low | Stats section |

### OrdersPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| Uses `<motion.tr>` Framer Motion — **only page to do so**; all other list pages use CSS stagger | 🟠 Medium | Line 117 |
| `aria-busy="true"` on loading table — excellent pattern | ✅ Good | Line 96 |

### OrderDetailPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| `style={{ color: '#D97706', ... }}` overrides `text-warning` class — dark mode broken | 🔴 High | Line 361 |
| Highest inline style density in admin section (~15 instances) | 🟠 Medium | Throughout |
| Photo buttons lack `aria-disabled` text | 🟡 Low | Lines 221-228 |
| No `role="alert"` on error container | 🟠 Medium | Line 165-172 |

### TripsPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| `ResponsiveFilterControls` with `ariaLabel` — good accessibility | ✅ Good | Line 70-77 |

### CreateTripPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| Route button inline styles with `borderRadius: 12`, conditional backgrounds | 🟠 Medium | Lines 83-86 |
| DollarSign icon absolutely positioned via inline styles | 🟡 Low | Lines 133-134 |
| Revenue preview banner uses inline instead of CSS class | 🟡 Low | Line 142 |

### TripDetailPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| "Trip not found" uses bare `<h3>` instead of `EmptyState` component | 🟡 Low | Line 73 |
| "No orders assigned" uses plain text instead of `EmptyState` | 🟡 Low | Line 116 |

### CustomersPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| `stagger-item` applied to `<tr>` — inconsistent with OrdersPage's Framer Motion | 🟡 Low | Line 77 |

### CustomerDetailPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| "Customer not found" uses bare `<h3>` instead of `EmptyState` | 🟡 Low | Line 52 |
| Profile initial avatar lacks `aria-label` and `role="img"` | 🟠 Medium | Line 93 |
| "No orders" table cell uses plain text | 🟡 Low | Line 97 |

### SalesPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| `color: 'white'` on stat cards — **hardcoded, dark-mode-unfriendly** | 🔴 High | Line 72 |
| `BarChart3`, `TrendingUp`, `CreditCard` imported but **unused** | 🟡 Low | Line 7 |
| CSS variable fallback hexes (`#059669`, `#dc2626`) — dead code if variables always defined | 🟡 Low | Lines 68-70 |

### ReportsPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| Donut chart segments are all raw hex — **6 hardcoded colors** | 🔴 High | Lines 328-334 |
| Route bar chart uses raw hex `#8B5CF6`, `#EC4899`, `#64748B` | 🔴 High | Line 408 |
| Most style-heavy page — 30+ inline styles | 🟠 Medium | Throughout |
| Print header/footer with extensive inline styles | 🟡 Low | Lines 224-236, 510-520 |

### SettingsPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| Proper `role="tablist"` / `role="tab"` / `aria-selected` — **best practice** | ✅ Good | Lines 57-69 |
| `AlertTriangle` and `CheckCircle` imported but **unused** | 🟡 Low | Line 4 |
| No `aria-controls` on tabs | 🟡 Low | — |

### InboxPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| **Send failure swallowed silently** — user gets NO feedback | 🔴 High | Lines 132-134 |
| Message bubbles have extensive inline styles (borderRadius, background, boxShadow) | 🟠 Medium | Lines 218-243 |
| `boxShadow: '0 1px 2px rgba(0,0,0,0.05)'` — hardcoded, not tokenized | 🟡 Low | Line 227 |
| Chat header avatar lacks `aria-label` / `role="img"` | 🟠 Medium | Line 196 |
| No `aria-live` on new messages | 🟠 Medium | — |

### ContactInquiriesPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| Table rows with `role="button"`, `tabIndex={0}`, keyboard handler — excellent | ✅ Good | Lines 161-168 |
| No `aria-modal="true"` or `role="dialog"` on modal | 🟠 Medium | Line 240 |

---

## 4. CUSTOMER PAGES AUDIT (9 pages)

### HomePage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| **Error state MISSING** — `catch` block silently swallows errors | 🔴 High | Lines 44-46 |
| Trip card inline styles with hardcoded `#2D5A8A`, `rgba(232,114,42,0.35)` — dark mode broken | 🔴 High | Lines 165-243 |
| Tracking input has `!important`-overridden inline styles — **dead code** | 🟡 Low | Line 107 |
| Track button `borderRadius: 10` overridden by CSS `14px !important` — dead code | 🟡 Low | Line 114 |
| Trip metric grid `gridTemplateColumns: '1fr 1fr 1fr'` cramped on <360px | 🟡 Low | Line 199 |

### OrdersPage.jsx (Customer)
| Issue | Severity | Location |
|-------|----------|----------|
| Clean implementation — no hardcoded colors, good state handling | ✅ Good | — |
| Order card `<Link>` lacks descriptive `aria-label` | 🟡 Low | Line 107 |

### OrderDetailPage.jsx (Customer)
| Issue | Severity | Location |
|-------|----------|----------|
| "Order not found" uses bare `<h3>` — no icon, no action button | 🟡 Low | Line 105 |
| `color: 'white'` should be `var(--text-inverse)` | 🟠 Medium | Line 171 |
| Inconsistent class names: `customer-order-detail-page` vs `customer-order-detail-screen` | 🟡 Low | Lines 84, 112 |

### BookShipmentPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| Route buttons' inline `style` is **dead code** — CSS `!important` overrides it | 🟡 Low | Line 323 |
| No visual loading indicator for initial `initialLoading` state | 🟠 Medium | Lines 80-86 |
| Step connectors lack `aria-hidden="true"` | 🟡 Low | Line 297-307 |
| `validatePhone` and `toTitleCase` duplicated in PersonalInfoPage | 🟠 Medium | Lines 12-21 |
| No focus management when switching steps | 🟠 Medium | — |

### NotificationsPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| **Error state MISSING** — `catch` block silently swallowed, shows misleading "all caught up" | 🔴 High | Line 39 |
| Read notifications render as `<article>` — no `tabindex`, no keyboard access | 🟠 Medium | Lines 129-137 |
| Notification icon lacks `aria-hidden="true"` | 🟡 Low | Line 147 |

### ProfilePage.jsx (Customer)
| Issue | Severity | Location |
|-------|----------|----------|
| **Error state MISSING** — `.catch(() => {})` silently fails | 🔴 High | Line 23 |
| Loading state is bare em-dash `'—'` — no skeleton | 🟠 Medium | Line 57 |
| `marginTop: -40` for avatar overlap — fragile hardcoded magic number | 🟡 Low | Line 40 |
| Menu items lack `aria-label` | 🟡 Low | Lines 81-98 |
| Profile avatar lacks `aria-label` and `role="img"` | 🟠 Medium | Line 41 |

### PersonalInfoPage.jsx (Customer)
| Issue | Severity | Location |
|-------|----------|----------|
| `saveStatus` and `saveMessage` state set but **never rendered** — dead code | 🟡 Low | Lines 42-44 |
| No `aria-required` on required fields | 🟡 Low | — |
| Form icons lack `aria-hidden="true"` | 🟡 Low | — |

### SupportChatPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| **Best accessibility** of all pages: `role="log"`, `aria-live="polite"`, `role="status"` | ✅ Good | Lines 82-92, 106 |
| Timestamp elements should be `role="separator"` or `aria-hidden` | 🟡 Low | Line 122 |

---

## 5. AUTH & PUBLIC PAGES AUDIT (7 pages)

### LoginPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| Left panel gradient has **no dark mode override** | 🟠 Medium | `tabs-steps.css:98` |
| `color="white"` on Container icons — hardcoded, bypasses dark mode | 🟡 Low | Lines 323, 381 |
| Chat window border `rgba(226,232,240,0.8)` — no dark mode override | 🟡 Low | `tabs-steps.css:577` |
| Chat status dot uses `#34D399` instead of `var(--success)` | 🟡 Low | `tabs-steps.css:617` |

### RegisterPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| `.reg-address-note` text `#92400E` — **no dark mode override, contrast fails** | 🔴 High | `auth.css:209` |
| No focus movement when switching between Step 1 and Step 2 | 🟠 Medium | — |
| Password rules use pill/chip layout — inconsistent with ResetPasswordPage grid | 🟡 Low | Lines 378-390 |
| No "Passwords match" indicator (ResetPasswordPage has one) | 🟡 Low | — |

### ForgotPasswordPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| `CheckCircle2` imported but **unused** | 🟡 Low | Line 6 |
| `handleResend` doesn't clear previous error before retrying | 🟡 Low | Line 52 |

### ResetPasswordPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| Requirements checklist with `role="list"` / `role="listitem"` / `aria-label` — **excellent** | ✅ Good | Lines 222-242 |
| No `aria-busy="true"` on verifying state | 🟡 Low | Lines 77-102 |

### TrackingPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| `role="search"` on form, `aria-label` on input — good accessibility | ✅ Good | Lines 160, 163 |
| Brand link goes to `/login` instead of home — confusing for public users | 🟡 Low | Line 146 |
| No distinction between "not found" and "network error" in UI | 🟡 Low | Lines 109-110 |

### AboutPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| **~22 inline styles** — worst offender among all pages | 🔴 High | Lines 91-214 |
| Contact form lacks `aria-required` on inputs | 🟠 Medium | Lines 193-203 |
| Facebook link `target="_blank"` lacks "opens in new tab" warning | 🟡 Low | Line 146 |
| Uses utility classes `fw-700`, `fw-800` that appear **nowhere else** in the codebase | 🟡 Low | Throughout |

### NotFoundPage.jsx
| Issue | Severity | Location |
|-------|----------|----------|
| Zero inline styles — **cleanest page in the app** | ✅ Good | — |
| Back button silently fails when `window.history.length <= 1` | 🟡 Low | Line 50 |

---

## 6. UI COMPONENTS AUDIT (28 components)

### Components with excessive inline styles

| Component | Inline Style Count | Severity |
|-----------|-------------------|----------|
| **PickupModal.jsx** | 20+ | 🔴 High |
| **TripAssignModal.jsx** | 15+ | 🔴 High |
| **SkeletonLoader.jsx (Chat)** | 12+ | 🟠 Medium |
| **AdminLayout.jsx (kbd element)** | 6 | 🟡 Low |
| **CapacityTracker.jsx** | 5 | 🟡 Low |

### Critical Component Issues

| Component | Issue | Severity |
|-----------|-------|----------|
| **OnboardingModal.jsx** | No `FocusTrap` — users tab out of modal. Also: `localStorage` without try/catch crashes in Safari private browsing | 🔴 High |
| **PickupModal.jsx** | 20+ inline styles. `maxWidth` lacks `100vw` fallback | 🔴 High |
| **TripAssignModal.jsx** | 15+ inline styles. Crashes if `order` is undefined | 🔴 High |
| **DonutChart.jsx** | No data accessible to screen readers — chart is **invisible to assistive tech** | 🔴 High |
| **MiniBarChart.jsx** | No data accessible to screen readers. Mouse-only hover | 🔴 High |
| **StatusBadge.jsx** | `STATUS_COLORS` imported but **never used** | 🟡 Low |
| **Pagination.jsx** | Ellipsis spans lack `aria-hidden="true"` | 🟡 Low |
| **TrackingTimeline.jsx** | No ARIA attributes — purely visual status progression | 🟠 Medium |
| **ErrorBoundary.jsx** | No `role="alert"` — screen readers miss errors | 🟠 Medium |
| **ErrorFallback.jsx** | Icon lacks `aria-hidden="true"` | 🟡 Low |
| **EmptyState.jsx** | Icon lacks `aria-hidden="true"` | 🟡 Low |
| **CustomerLayout.jsx** | `X` imported from lucide-react but **never used** | 🟡 Low |

---

## 7. ACCESSIBILITY GAPS (Cross-Cutting)

### Critical
1. **Charts are invisible to screen readers**: `DonutChart` and `MiniBarChart` have zero data conveyed via ARIA. Chart data is purely visual.
2. **OnboardingModal** has no `FocusTrap` — keyboard users escape the overlay.
3. **`localStorage` without try/catch** in OnboardingModal crashes in Safari private browsing.

### High Priority
4. **No `role="alert"`** on error containers in 8+ pages (DashboardPage, OrderDetailPage, TripDetailPage, SettingsPage, ContactInquiriesPage, ErrorBoundary, ErrorBoundarySection, ErrorFallback).
5. **Silent error swallowing** in 4 pages (HomePage catch block, NotificationsPage catch block, ProfilePage catch block, InboxPage send failure).
6. **`aria-hidden` missing** on decorative icons in 7+ components (OnboardingModal, ErrorFallback, StatusBadge, EmptyState, TrackingTimeline, all notification icons).
7. **No `aria-label`** on profile avatars in 2 pages (CustomerDetailPage, ProfilePage).

### Medium Priority
8. **No `aria-required`** on AboutPage contact form inputs (other auth pages have it).
9. **No focus management** in multi-step forms (RegisterPage, BookShipmentPage).
10. **No `aria-live`** on real-time chat messages (InboxPage).
11. **`CustomerLayout.jsx`** — bottom nav not `aria-hidden` on desktop viewports.

---

## 8. DARK MODE GAPS (Cross-Cutting)

### High Priority
1. **SalesPage line 72**: `color: 'white'` — text stays white in dark mode.
2. **OrderDetailPage line 361**: `color: '#D97706'` — overrides `var(--warning)`, won't adapt.
3. **DashboardPage lines 57-65**: Donut chart hex colors won't switch in dark mode.
4. **ReportsPage lines 328-334, 408**: Hardcoded chart colors.
5. **HomePage lines 165-243**: Trip card uses `rgba(255,255,255,0.08)` for metric backgrounds — white tint on green cards looks wrong in dark mode.

### Medium Priority
6. **RegisterPage**: `.reg-address-note` text `#92400E` has no dark mode override.
7. **LoginPage**: Left panel gradient has no `[data-theme="dark"]` override.
8. **Toast notifications**: Hardcoded background colors (`#0f172a`, etc.) in `feedback.css` — no dark mode variants exist for toast.
9. **Chat status dot**: `#34D399` in `tabs-steps.css` — should use `var(--success)`.

---

## 9. RESPONSIVE ISSUES

### High Priority
1. **Modal `maxWidth` without `100vw` guard**: PickupModal (400px), TripAssignModal (480px), ContactInquiriesPage modal (520px) — all overflow on screens narrower than their maxWidth.
2. **Pagination `maxVisible = 5`**: On 320px screens, 5 page buttons may overflow.

### Medium Priority
3. **CustomerLayout bottom nav**: No mechanism to hide from screen readers on desktop (needs `aria-hidden` or DOM removal).
4. **AdminLayout breakpoint `1024px` duplicated**: In JS `<style>` block AND `DRAWER_QUERY` constant — single source of truth needed.
5. **Profile avatar `marginTop: -40`**: Magic number breaks if banner height changes.
6. **Trip metric grid**: `gridTemplateColumns: '1fr 1fr 1fr'` cramped on <360px.

---

## 10. CODE QUALITY & DEAD CODE

### Unused Imports (12 total)

| File | Unused Import(s) |
|------|------------------|
| `DashboardPage.jsx` | `TrendingUp` |
| `SalesPage.jsx` | `BarChart3`, `TrendingUp`, `CreditCard` |
| `SettingsPage.jsx` | `AlertTriangle`, `CheckCircle` |
| `PersonalInfoPage.jsx` (admin) | `CheckCircle`, `AlertCircle`, `ArrowLeft` |
| `ForgotPasswordPage.jsx` | `CheckCircle2` |
| `StatusBadge.jsx` | `STATUS_COLORS` |
| `CustomerLayout.jsx` | `X` |

### Dead Code
1. **BookShipmentPage.jsx line 323**: Route button `style` prop entirely overridden by CSS `!important`.
2. **HomePage.jsx line 107**: Tracking input `style` prop entirely overridden by CSS `!important`.
3. **HomePage.jsx line 114**: Track button `borderRadius: 10` overridden by CSS `14px !important`.
4. **PersonalInfoPage.jsx lines 42-44**: `saveStatus` / `saveMessage` state set but never rendered.
5. **SalesPage.jsx lines 68-70**: Hex fallbacks in `var(--success-dark, #059669)` — dead if variable always defined.
6. **AboutPage.jsx**: Uses `fw-700`, `fw-800` utility classes that don't exist anywhere else.

### Duplicated Logic
1. **`validatePhone`**: Exists in both `BookShipmentPage.jsx` and `PersonalInfoPage.jsx` (customer).
2. **`toTitleCase`**: Duplicated across same two files.
3. **Three animation patterns**: `<StaggerItem>` component, CSS `stagger-item` class + inline `animationDelay`, and Framer Motion `<motion.tr>`. This should be ONE pattern.
4. **`premium-refresh.css`**: `.booking-success-shell` defined twice with conflicting styles (lines 409-419 and 905-918).

---

## 11. MISSING STATES & ERROR HANDLING

### Silent Error Swallowing (User-Facing Bugs)

| Page | What happens | Impact |
|------|-------------|--------|
| **HomePage.jsx** lines 44-46 | Data fetch error silently caught, user sees empty UI | Critical — user thinks data simply doesn't exist |
| **NotificationsPage.jsx** line 39 | Error caught, notifications stays `[]`, shows "All caught up!" | Critical — misleading during network failures |
| **ProfilePage.jsx** line 23 | `.catch(() => {})` — stats silently fail to load | High — user sees zeros with no explanation |
| **InboxPage.jsx** lines 132-134 | Send fails silently, message disappears from input | Critical — message lost with zero feedback |

### Weak "Not Found" States
TripDetailPage, CustomerDetailPage, and OrderDetailPage use bare `<div className="empty-state"><h3>...</h3></div>` instead of the `EmptyState` component with icons and action buttons. Five instances across admin pages.

### Missing Loading Indicators
- BookShipmentPage: No skeleton for initial trip/settings load (lines 80-86).
- ProfilePage: Stats loading shows bare `'—'` em-dash instead of skeleton.

---

## 12. INLINE STYLE INVENTORY

Approximately **150+ inline `style={{}}` blocks** across the codebase.

### Worst Offenders (by count)

| File | Inline Style Blocks |
|------|--------------------|
| ReportsPage.jsx | 30+ |
| AboutPage.jsx | 22 |
| PickupModal.jsx | 20+ |
| OrderDetailPage.jsx | 15+ |
| TripAssignModal.jsx | 15+ |
| HomePage.jsx | 12+ |
| SkeletonLoader.jsx (Chat) | 12+ |
| InboxPage.jsx | 10+ |
| BookShipmentPage.jsx | 8+ |
| CreateTripPage.jsx | 6+ |

### Most Common Inline Style Patterns

1. `style={{ animationDelay: '...' }}` — 25+ occurrences across 12 pages
2. `style={{ padding: 40 }}` — 10+ occurrences
3. `style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--error-bg)' }}` — 5+ occurrences
4. `style={{ color: 'var(--error-dark)' }}` — 4+ occurrences
5. Various micro-spacing (`marginBottom: 10`, `marginTop: 2`, etc.)

---

## 13. WHAT'S WORKING WELL ✅

1. **Design system tokens**: The CSS variable system in `tokens.css` is comprehensive and well-organized.
2. **Dark mode architecture**: `[data-theme="dark"]` approach with semantic token overrides is the gold standard.
3. **Mobile bottom navigation**: The floating pill tab bar with elevated FAB for "Book" is excellent mobile UX.
4. **Auth flow**: Login split-panel, multi-step registration, forgot/reset password — complete and polished.
5. **Tracking page**: Well-designed with status tones, progress bar, timeline, info tiles, and result card.
6. **SupportChatPage accessibility**: `role="log"`, `aria-live="polite"`, `role="status"`, `aria-busy` — best accessibility in the app.
7. **SettingsPage tabs**: Proper `role="tablist"` / `role="tab"` / `aria-selected` implementation.
8. **ContactInquiriesPage**: Table rows with `role="button"`, `tabIndex`, keyboard handlers.
9. **ResetPasswordPage**: Requirements checklist with per-item `aria-label` updates.
10. **ScrollReveal**: IntersectionObserver fallback for older browsers.
11. **Print stylesheet**: Complete `@media print` support in `remaining.css`.
12. **Reduced motion**: `@media (prefers-reduced-motion)` respected globally.
13. **`viewport-hardening.css`**: Final layer fixing `100dvh` support and SVG alignment.
14. **PWA setup**: Manifest, service worker, icons, meta tags in `index.html`.
15. **Code splitting**: Lazy-loaded routes with Suspense fallbacks in `App.jsx`.

---

## 14. PRIORITY ACTION ITEMS

### 🔴 Critical (Fix Immediately)

1. **Fix silent error swallowing** in HomePage, NotificationsPage, ProfilePage, InboxPage — show error banners/toasts.
2. **Fix hardcoded `color: 'white'`** on stat cards (SalesPage line 72) — use `var(--text-inverse)`.
3. **Fix `color: '#D97706'`** override (OrderDetailPage line 361) — remove inline style, use CSS class.
4. **Add `FocusTrap`** to OnboardingModal — keyboard users can currently escape.
5. **Wrap `localStorage`** in try/catch for OnboardingModal — Safari private browsing crash.
6. **Fix donut/bar chart hardcoded hex colors** in DashboardPage and ReportsPage — use CSS variables.

### 🟠 High Priority (Fix This Sprint)

7. **Refactor PickupModal and TripAssignModal** — extract 35+ inline styles to CSS classes.
8. **Refactor AboutPage** — extract 22 inline styles to CSS classes.
9. **Standardize on ONE animation pattern** (recommend `<StaggerItem>` component) — remove inline `animationDelay` from 12 pages.
10. **Add `role="alert"`** to error containers in 8+ pages.
11. **Add `aria-hidden="true"`** to decorative icons in 7+ components.
12. **Extract duplicated `validatePhone` and `toTitleCase`** to shared utilities.
13. **Remove `!important` CSS rules** that fight dead inline styles — remove the inline styles instead.
14. **Add dark mode overrides** for toast notification colors, address note, and chat status dot.
15. **Fix missing `EmptyState`** usage in TripDetailPage, CustomerDetailPage, OrderDetailPage.

### 🟡 Medium Priority (Next Sprint)

16. **Remove 12 unused imports** across 7 files.
17. **Remove dead CSS** — conflicting `.booking-success-shell` definitions in `premium-refresh.css`.
18. **Add `aria-required`** to AboutPage contact form inputs.
19. **Add `aria-hidden`** to Pagination ellipsis spans.
20. **Add ARIA to TrackingTimeline and charts** (DonutChart, MiniBarChart).
21. **Add `aria-busy`** to unmarked loading states.
22. **Fix modal `maxWidth`** to respect `100vw` on narrow viewports.
23. **Consolidate the 1024px breakpoint** — single source of truth.
24. **Remove dead inline styles** overridden by CSS `!important` (HomePage, BookShipmentPage).
25. **Add focus management** to multi-step forms (RegisterPage, BookShipmentPage).

### 🟢 Low Priority (Backlog)

26. **Standardize avatar implementations** — all should have `aria-label` and `role="img"`.
27. **Add new-tab indicators** to all `target="_blank"` links.
28. **Fix NotFoundPage back button** — disable or fallback when no history.
29. **Consolidate `sr-only`** — remove duplicate definition in `tabs-steps.css`.
30. **Add TypeScript or PropTypes** — currently zero prop validation project-wide.

---

## 15. FILE-BY-FILE INLINE STYLE SCORECARD

| File | Inline Styles | Hardcoded Colors | A11y Score | Dark Mode | Overall |
|------|:---:|:---:|:---:|:---:|:---:|
| **NotFoundPage.jsx** | 0 ✅ | 0 ✅ | A | A | ⭐⭐⭐⭐⭐ |
| **TrackingPage.jsx** | 6 (dynamic, ok) | 0 ✅ | A- | A | ⭐⭐⭐⭐ |
| **OrdersPage.jsx (customer)** | 1 | 0 ✅ | B+ | A | ⭐⭐⭐⭐ |
| **TripsPage.jsx (customer)** | 3 | 0 ✅ | B+ | A | ⭐⭐⭐⭐ |
| **SupportChatPage.jsx** | 3 | 0 ✅ | A | A | ⭐⭐⭐⭐ |
| **SettingsPage.jsx** | 1 | 0 ✅ | A (tabs) | A | ⭐⭐⭐⭐ |
| **AnnouncementsPage.jsx** | 2 | 0 ✅ | B+ | A | ⭐⭐⭐⭐ |
| **PersonalInfoPage.jsx (customer)** | 1 | 0 ✅ | B+ | A | ⭐⭐⭐ |
| **OrdersPage.jsx (admin)** | 0 ✅ | 0 ✅ | A- | A | ⭐⭐⭐⭐ |
| **LoginPage.jsx** | 2 | 0 ✅ | B+ | B | ⭐⭐⭐ |
| **RegisterPage.jsx** | 2 | 0 ✅ | A- | B | ⭐⭐⭐ |
| **ForgotPasswordPage.jsx** | 2 | 0 ✅ | B+ | A | ⭐⭐⭐ |
| **ResetPasswordPage.jsx** | 3 | 0 ✅ | A | A | ⭐⭐⭐⭐ |
| **DashboardPage.jsx** | 4 | 6 (hex) | B- | C | ⭐⭐⭐ |
| **OrderDetailPage.jsx** | 15+ | 1 (hex) | B | C | ⭐⭐ |
| **TripsPage.jsx (admin)** | 2 | 0 ✅ | B+ | A | ⭐⭐⭐ |
| **CreateTripPage.jsx** | 6+ | 0 ✅ | B+ | A | ⭐⭐⭐ |
| **TripDetailPage.jsx** | 4 | 0 ✅ | B+ | A | ⭐⭐⭐ |
| **CustomersPage.jsx** | 1 | 0 ✅ | B | A | ⭐⭐⭐ |
| **CustomerDetailPage.jsx** | 3 | 0 ✅ | B- | A | ⭐⭐⭐ |
| **SalesPage.jsx** | 4 | 3 | C+ | C | ⭐⭐ |
| **ReportsPage.jsx** | 30+ | 9 (hex) | B+ | C | ⭐⭐ |
| **ContactInquiriesPage.jsx** | 8 | 0 ✅ | A- | A | ⭐⭐⭐ |
| **InboxPage.jsx** | 10+ | 1 (shadow) | B | A | ⭐⭐⭐ |
| **ProfilePage.jsx (admin)** | 2 | 0 ✅ | B- | A | ⭐⭐⭐ |
| **PersonalInfoPage.jsx (admin)** | 1 | 0 ✅ | A- | A | ⭐⭐⭐ |
| **HomePage.jsx** | 12+ | 5 (hex/rgba) | B- | C | ⭐⭐ |
| **BookShipmentPage.jsx** | 8+ | 0 ✅ | B+ | A | ⭐⭐⭐ |
| **NotificationsPage.jsx** | 2 | 0 ✅ | B- | A | ⭐⭐⭐ |
| **ProfilePage.jsx (customer)** | 5 | 0 ✅ | B- | A | ⭐⭐ |
| **AboutPage.jsx** | 22 | 0 ✅ | C+ | B+ | ⭐⭐ |
| **PickupModal.jsx** | 20+ | 0 ✅ | A- (ARIA) | A | ⭐⭐ |
| **TripAssignModal.jsx** | 15+ | 0 ✅ | A- (ARIA) | A | ⭐⭐ |
| **SkeletonLoader.jsx** | 12+ | 0 ✅ | C (no aria) | A | ⭐⭐ |

---

**Report generated by scanning:** 17 CSS files, 34 page components, 28 UI components, 3 context/hook files — **72 source files total** — each read line-by-line for this audit.
