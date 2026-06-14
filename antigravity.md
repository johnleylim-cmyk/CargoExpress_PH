# CargoExpress PH — Verified Frontend UI/UX Audit

> **Audited**: June 14, 2026  
> **Verified**: Every finding cross-referenced against actual source code  
> **Scope**: All JSX pages, components, CSS files, layouts, tokens, contexts, hooks  
> **Files Scanned**: 32 pages · 25 UI components · 3 layout components · 22 stylesheets · 2 contexts · 1 hook

---

## 1. Architecture Overview

### Tech Stack (Verified from `package.json`)
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React + Vite | 19.1.0 / 6.3.0 |
| Routing | react-router-dom | 7.14.2 |
| Styling | Vanilla CSS (22 modular files) | — |
| Animation | framer-motion + CSS keyframes | 12.40.0 |
| Icons | lucide-react | 1.11.0 |
| Backend Client | @supabase/supabase-js | 2.104.1 |
| Push Notifications | firebase | 11.7.1 |
| Font | Google Fonts — Inter (variable, 100–900) | — |

### CSS Architecture — Import Order (from `main.css`)
```
1. tokens.css          → Design tokens (CSS variables only)
2. base.css            → Reset + typography
3. components.css      → Buttons, cards, forms, badges
4. data.css            → Tables, stat cards, grids, timelines
5. feedback.css        → Modals, toasts
6. loading-search.css  → Loaders, search boxes
7. tabs-steps.css      → Tab bars, step wizards
8. chatbot.css         → Floating chatbot widget
9. charts.css          → Chart styling
10. layout-admin.css   → Admin sidebar, topbar, page shell
11. layout-customer.css → Customer navbar, bottom nav, main area
12. auth.css           → Login, register, forgot/reset password
13. pages.css          → About, 404, hero, error boundary
14. tracking.css       → Public tracking page
15. remaining.css      → Notifications, chat, alerts, admin sections (45,942 bytes — largest file)
16. animations-utils.css → Keyframes + utility classes
17. responsive.css     → Responsive breakpoints
18. premium-refresh.css → Override layer #1 (36,937 bytes)
19. customer-mobile-refresh.css → Override layer #2 (24,674 bytes)
20. admin-modern-refresh.css → Override layer #3 (16,226 bytes)
21. viewport-hardening.css → Override layer #4 (5,545 bytes)
```

**Total CSS: 311 KB** across 22 files.

> The last 4 files (layers #18–21) are **cascade-override layers** that re-declare values from earlier files. This creates a fragile multi-source-of-truth pattern.

---

## 2. Design System — Token Audit

### 2.1 Design Tokens (`tokens.css` — 206 lines)

**What's Defined:**
- Brand palette: `--primary` (#E8722A), `--accent` (#1B3A5C), + light/dark/lighter/glow variants
- Semantic colors: success, warning, error, info — each with base/dark/bg/glow
- Chart colors: purple, pink, slate, teal
- Neutrals: bg, surface, border (3 tiers each), text (4 tiers)
- Glass effects: `--glass-bg`, `--glass-bg-heavy`, `--glass-border`, `--glass-blur`
- Sidebar: 7 dedicated tokens
- Shadows: 7 levels (xs → 2xl) + glow + primary + primary-lg
- Border radius: 7 levels (xs → full)
- Spacing: 7 levels (xxs → xxl)
- Transitions: 4 variants (default, fast, slow, spring)
- Z-index: 6 levels (base → toast)

**Full dark mode** via `[data-theme="dark"]` (lines 124–198) with every token re-mapped.

### 2.2 Verified Token Conflicts

| Token | `tokens.css` Dark Value | `premium-refresh.css` Dark Value | Winner |
|-------|-------------------------|----------------------------------|--------|
| `--bg` | `#0A1628` (L163) | `#07111F` (L17) | premium-refresh ✅ |
| `--bg-secondary` | `#111E33` (L164) | `#0D1A2B` (L18) | premium-refresh ✅ |
| `--surface` | `#152238` (L165) | `#132033` (L19) | premium-refresh ✅ |
| `--surface-raised` | `#1C2D45` (L166) | `#17263B` (L20) | premium-refresh ✅ |
| `--border` | `#1E334A` (L167) | `#253850` (L21) | premium-refresh ✅ |
| `--border-light` | `#162840` (L168) | `#1B2B42` (L22) | premium-refresh ✅ |
| `--border-hover` | `#2A4A6A` (L169) | `#344B66` (L23) | premium-refresh ✅ |
| `--text` | `#E8EDF2` (L171) | `#F2F6FA` (L24) | premium-refresh ✅ |
| `--text-secondary` | `#CBD5E1` (L172) | `#C7D2E0` (L25) | premium-refresh ✅ |
| `--text-tertiary` | `#94A3B8` (L173) | `#9AA9BA` (L26) | premium-refresh ✅ |

**Light mode shadows** also conflict:

| Token | `tokens.css` Value | `premium-refresh.css` Value |
|-------|-------------------|----------------------------|
| `--shadow-xs` | `0 1px 2px rgba(15,23,42,0.04)` (L78) | `0 1px 2px rgba(15,23,42,0.04)` (L7) — same |
| `--shadow-sm` | 2-layer composite (L79) | Different 2-layer composite (L8) |
| `--shadow-md` | `0 4px 8px...` (L80) | `0 8px 20px...` (L9) — **different** |
| `--shadow-lg` | `0 10px 25px...` (L81) | `0 16px 36px...` (L10) — **different** |
| `--shadow-xl` | `0 20px 50px...` (L82) | `0 24px 52px...` (L11) — **different** |

| Token | `layout-admin.css` Value | `admin-modern-refresh.css` Value |
|-------|-------------------------|--------------------------------|
| `--sidebar-width` | `260px` (L7) | `280px` (L20) |
| `--sidebar-collapsed-width` | `72px` (L8) | `88px` (L21) |

---

## 3. Screen-by-Screen Audit

### 3.1 Auth Screens

#### Login Page (`LoginPage.jsx` — 964 lines)
**Strengths:** Split-screen layout on desktop · Floating AI chatbot with quick questions, link parsing, typing indicator · User-friendly error mapping · Animated entrance with spring easing · Theme toggle accessible

**Issues:**
| Issue | Severity | Evidence |
|-------|----------|---------|
| **964 lines in one component** — handles both auth form AND a full chatbot with localStorage, state, link parsing | 🔴 High | `LoginPage.jsx` line count: 964 |
| 2 inline `style={{}}` objects | 🟢 Low | Lines 465, 803 |

#### Register Page (`RegisterPage.jsx` — 24,858 bytes)
**Strengths:** Multi-step wizard with progress bar (step circles + connectors) · Password strength meter · Password rules checklist · Address auto-detection · Success card with animated check + auto-redirect

**Issues:**
| Issue | Severity | Evidence |
|-------|----------|---------|
| Step labels hidden below 540px (`auth.css` L324: `.reg-step-label { display: none; }`) but step numbers remain | 🟡 Medium | Mobile users see circles without labels |

#### Forgot Password & Reset Password
**Strengths:** Animated envelope icon + pulse ring on sent state · Countdown progress bar for resend cooldown · Password requirements checklist · Live "Passwords match" indicator

---

### 3.2 Customer Screens

#### Customer Layout (`CustomerLayout.jsx` — 265 lines)
**Strengths:** Top navbar (desktop) + floating pill bottom tab bar (mobile) with glassmorphism · Elevated FAB for "Book" tab with pulse ring · Real-time unread notification count via Supabase channel · Push notification permission request (3s delay) · Profile dropdown · Skip-link · Onboarding modal

**Issues:**
| Issue | Severity | Evidence |
|-------|----------|---------|
| `hasBadge` checked on L248 but **never defined** on any `bottomNavItems` entry (L20-26) — dead code path | 🟡 Medium | `item.hasBadge && unreadCount > 0` never evaluates to true |
| Bottom tab `font-size` set to `0.5625rem` in `layout-customer.css` L270, overridden to `0.7rem` in `viewport-hardening.css` L58 | 🟡 Medium | Cascade conflict across files |
| `customer-main` padding defined in **3 files**: `layout-customer.css` L239, `premium-refresh.css` L162, `customer-mobile-refresh.css` L211 | 🟡 Medium | Triple override creates maintenance confusion |

#### Home Page (`HomePage.jsx` — 324 lines)
**Strengths:** Time-based greeting · Hero with gradient + parallax orbs + tracking search · 3-column snapshot pills · Rich trip card with gradient, route, dates, capacity · Active shipments list with StatusBadge · Announcements filtered to exclude test entries · Skeleton loaders with stagger · EmptyState for no-data

**Issues:**
| Issue | Severity | Evidence |
|-------|----------|---------|
| **21 inline `style={{}}` objects** — most concentrated inline style usage in the codebase | 🟡 Medium | Lines 107, 114, 164, 170, 178, 185, 191, 192, 199, 200, 203, 205, 207, 210, 212, 214, 217, 219, 227, 239, 264 |
| Error during data fetch silently swallowed (empty catch block L44-46) — user gets empty UI with no error feedback | 🟡 Medium | `catch (err) { }` on L44 |

#### Book Shipment Page (`BookShipmentPage.jsx` — 654 lines)
**Strengths:** Multi-step booking wizard (5 steps) · Framer Motion transitions with custom `luxeEase` · Pre-selection from trip card · Title-case auto-formatting · PH phone validation (09XXXXXXXXX) · Route-aware province validation · "Use registered address" toggle · Price calculation preview · Success state with copy button · `useReducedMotion` from Framer Motion

**Issues:**
| Issue | Severity | Evidence |
|-------|----------|---------|
| 654 lines — heavy single component; wizard steps should be subcomponents | 🟡 Medium | Maintainability concern |

#### Other Customer Pages
Orders, Order Detail, Trips, Notifications, Profile, Personal Info, Support Chat — all follow consistent card-based patterns with StatusBadge, Pagination, SkeletonLoader, StaggerItem.

---

### 3.3 Admin Screens

#### Admin Layout (`AdminLayout.jsx` — 167 lines)
**Strengths:** Collapsible sidebar with localStorage persistence · Tooltip labels on collapsed hover · Command palette (Ctrl+K) · Glass-effect topbar · Responsive drawer mode ≤1024px · Escape closes drawer + body scroll lock · Skip-link

#### Sidebar (`Sidebar.jsx` — 176 lines)
**Strengths:** 3-section grouping (Main, Management, System) · Real-time badge counts via Supabase channels · Active link indicator with left accent bar · User avatar with initial · Smooth collapse/expand animation · Drawer close button only on mobile

**Issues:**
| Issue | Severity | Evidence |
|-------|----------|---------|
| Sidebar brand color: `layout-admin.css` L140 sets `color: var(--primary)` (orange), overridden in `admin-modern-refresh.css` L85 to `color: var(--admin-green)` (green #128A5A) | 🟡 Medium | Brand color changes between base and refresh layer |
| Floating sidebar (`top: 16px; left: 16px; border-radius: 28px` in `admin-modern-refresh.css` L46-51) leaves gap at viewport edges on narrow desktops (1025–1100px) | 🟡 Medium | Edge case visual gap |

#### Dashboard (`DashboardPage.jsx` — 187 lines)
**Strengths:** 4 stat cards with gradient backgrounds · AnimatedCounter · DonutChart · CapacityTracker with shimmer · Recent orders table · ErrorBoundarySection per section · Full skeleton state · 5 inline styles

#### Other Admin Pages
Reports (26KB, multi-period filtering, MiniBarChart), Orders/Trips (data tables, status badges), Customers (list + detail), Announcements (CRUD), Inbox (real-time chat), Contact Inquiries (status management), Settings, Profile — all consistent with the design system.

---

### 3.4 Public Screens

#### Tracking Page (`TrackingPage.jsx` — 388 lines)
**Strengths:** Standalone public tracking (no login) · Full status timeline · Theme-aware status color tokens (`--trk-status-*`) · Responsive search hero

#### About Page (`AboutPage.jsx` — 11,820 bytes)
**Strengths:** Feature cards in 2-column grid · Mission statement with branded accent · Gradient hero

#### 404 Not Found (`NotFoundPage.jsx` — 1,829 bytes)
**Strengths:** Animated "404" with gradient text per digit · Icon with pulse ring · Background orbs

---

## 4. Component Library Audit (25 Components)

| Component | Size | Quality | Notes |
|-----------|------|---------|-------|
| AnimatedCounter | 2,375 B | ✅ Excellent | requestAnimationFrame count-up |
| Breadcrumb | 1,399 B | ✅ Good | Clean navigation breadcrumb |
| CapacityTracker | 3,273 B | ✅ Excellent | Progress bar + shimmer + warning states |
| CommandPalette | 6,796 B | ✅ Excellent | Keyboard nav, search, sections |
| ConfirmModal | 3,880 B | ✅ Good | 4 semantic variants |
| CustomSelect | 5,713 B | ✅ Good | Accessible custom dropdown |
| DonutChart | 4,952 B | ✅ Excellent | SVG donut with animated segments |
| EmptyState | 1,217 B | ✅ Good | Reusable with optional CTA |
| ErrorBoundary | 1,814 B | ✅ Good | App-level error catching |
| ErrorBoundarySection | 654 B | ✅ Good | Section-level error isolation |
| ErrorFallback | 530 B | ✅ Good | Minimal fallback UI |
| FocusTrap | 2,624 B | ✅ Excellent | Modal keyboard trapping |
| ImageLightbox | 8,148 B | ✅ Good | Full-screen image viewer |
| MiniBarChart | 3,801 B | ✅ Good | Custom SVG bar chart |
| OnboardingModal | 3,678 B | ✅ Good | First-time user onboarding |
| PageTransition | 2,655 B | ✅ Excellent | Framer Motion + `useReducedMotion` |
| Pagination | 3,523 B | ✅ Good | Numbered with ellipsis |
| PickupModal | 22,210 B | ⚠️ Large | Should be decomposed into subcomponents |
| ResponsiveFilterControls | 5,318 B | ✅ Good | Desktop tabs → mobile dropdown |
| ScrollReveal | 1,852 B | ✅ Good | IntersectionObserver animation |
| SkeletonLoader | 7,315 B | ✅ Excellent | Multiple skeleton variants |
| StatusBadge | 1,251 B | ✅ Good | Consistent status badges |
| ThemeToggle | 595 B | ✅ Good | Sun/Moon icon toggle |
| TrackingTimeline | 1,817 B | ✅ Good | Horizontal status timeline |
| TripAssignModal | 6,883 B | ✅ Good | Trip assignment interface |

---

## 5. Responsiveness Audit

### Verified Breakpoint System
| Breakpoint | Target | Source File |
|------------|--------|-------------|
| `≤ 1024px` | Admin sidebar → drawer mode | `responsive.css` L19 |
| `≤ 899.98px` | Customer bottom nav appears, desktop nav hides | `layout-customer.css` L360 |
| `≤ 820px` | Filter tabs → mobile dropdown select | `components.css` L526 |
| `≤ 768px` | Grid collapses to 1-column, topbar shrinks | `responsive.css` L74 |
| `≤ 640px` | Admin topbar actions compressed | `viewport-hardening.css` L192 |
| `≤ 540px` | Auth card padding reduced, step labels hidden | `auth.css` L320 |
| `≤ 480px` | Further mobile optimizations | `responsive.css` L90 |
| `≤ 420px` | Booking success padding reduced | `premium-refresh.css` L758 |
| `≤ 380px` | Narrow phone admin topbar | `viewport-hardening.css` L251 |
| `≤ 360px` | Bottom tab labels shrink | `viewport-hardening.css` L283 |
| `≤ 340px` | Brand "EXPRESS" text hidden in admin topbar | `viewport-hardening.css` L272 |

**Strengths:**
- `dvh` viewport units via `@supports` fallback (`viewport-hardening.css` L4-36)
- `env(safe-area-inset-bottom)` for notched devices
- Touch targets consistently ≥ 44px (`min-height: 44px` on buttons, inputs, links)
- `clamp()` fluid typography on h1–h4 (`base.css` L26-48)
- Scrollbar hiding on mobile auth/public pages (`responsive.css` L3-17)

**Issues:**
| Issue | Severity | Evidence |
|-------|----------|---------|
| No tablet-specific layouts between 900px–1024px for customer views | 🟡 Medium | Customer shows desktop nav but grid isn't optimized |
| `customer-main` has `max-width: 860px` (`layout-customer.css` L239) — on wide desktop, content looks narrow | 🟡 Medium | Could benefit from wider max-width |

---

## 6. Dark Mode Audit

### Implementation
- **Method**: `data-theme="dark"` attribute on `<html>`
- **Storage**: `localStorage` key `cargoexpress_theme` (`ThemeContext.jsx` L5)
- **Flash prevention**: Inline `<script>` in `index.html` L20-36 reads stored theme before React hydrates
- **System detection**: `prefers-color-scheme: dark` media query with live listener (`ThemeContext.jsx` L66-85)
- **Transition**: `.theme-transition` class with 350ms ease, auto-removed after 400ms (`ThemeContext.jsx` L31-53)
- **Toggle**: `ThemeToggle.jsx` component available in both admin topbar and customer navbar

**Strengths:**
- Flash of unstyled theme eliminated
- Live OS theme change listener
- `color-scheme` CSS property set for native control theming
- All semantic colors re-mapped in dark mode
- Chart colors adjusted for dark legibility
- Customer layout has dedicated dark tokens scoped to `.customer-layout-v2` (`customer-mobile-refresh.css` L27-43)
- Admin layout has dedicated dark tokens scoped to `.app-layout` (`admin-modern-refresh.css` L28-44)

### Verified Dark Mode Issues

| Issue | Severity | File:Line | Evidence |
|-------|----------|-----------|---------|
| **Toast backgrounds hardcoded white** — all 4 variants use `rgba(255,255,255,0.98)` with NO `[data-theme="dark"]` override anywhere | 🔴 High | `feedback.css` L148, L161, L174, L187 | Grep for `dark.*toast` across all CSS: 0 results |
| **`.toast-message` hardcodes `color: #334155`** instead of `var(--text)` | 🔴 High | `feedback.css` L230 | Comment says "Slate 700" — dark unreadable |
| **`.contact-card` uses `background: white`** instead of `var(--surface)` | 🟡 Medium | `pages.css` L73 | Hardcoded keyword "white" |
| **`.about-mission p` hardcodes `color: #92400E`** — unreadable in dark mode | 🟡 Medium | `pages.css` L64 | Dark amber on dark background |
| **`.about-mission` background uses hardcoded `#FFF3E8`** in gradient | 🟡 Medium | `pages.css` L57 | `linear-gradient(135deg, var(--primary-bg), #FFF3E8)` |
| **`.timeline-dot` uses `background: white`** instead of `var(--surface)` | 🟡 Medium | `data.css` L101 | Hardcoded keyword "white" |
| **Alert banners use hardcoded hex colors** with NO `[data-theme="dark"]` override | 🟡 Medium | `remaining.css` L13-28 | `#065F46`, `#991B1B`, `#92400E`, `#1E40AF` — grep for `dark.*alert-banner`: 0 results |
| **`.facebook-card` border uses hardcoded `#BFDBFE`** | 🟢 Low | `pages.css` L85 | No dark override |
| Dark mode token values defined in **3 separate locations** with different values (see Section 2.2 table) | 🔴 High | `tokens.css`, `premium-refresh.css` | Conflicting `--bg`, `--surface`, `--text`, etc. |

---

## 7. Accessibility Audit

### Verified Strengths
- **Skip links** on both layouts: `AdminLayout.jsx` L88, `CustomerLayout.jsx` L129
- **Focus-visible** styling: `base.css` L63-66 using `:focus-visible` with `outline: 2px solid var(--primary)`
- **ARIA attributes** used: `aria-label`, `aria-expanded`, `aria-controls`, `aria-haspopup`, `aria-hidden` (verified across Sidebar, AdminLayout, CustomerLayout)
- **`sr-only`** utility class defined: `animations-utils.css` L246-250
- **FocusTrap** component: `FocusTrap.jsx` (2,624 bytes) for modal keyboard trapping
- **`prefers-contrast: high`** media query: `base.css` L98-111 adjusts borders and text
- **Touch targets** ≥ 44px: buttons (`components.css` L5-6 `min-height: 44px`), inputs (`components.css` L169 `min-height: 44px`), nav links (`layout-customer.css` L40 `min-height: 44px`)
- **Semantic HTML**: `<header>`, `<nav>`, `<main>`, `<aside>` used in all layouts
- **`prefers-reduced-motion: reduce`** — **IMPLEMENTED** globally in `remaining.css` L1269-1278 (kills all animations/transitions) + specific booking success in `premium-refresh.css` L748-755 + Framer Motion `useReducedMotion` in `PageTransition.jsx` and `BookShipmentPage.jsx`

### Verified Issues
| Issue | Severity | Evidence |
|-------|----------|---------|
| Customer dropdown menu has no `role="menu"` / `role="menuitem"` | 🟡 Medium | Grep for `role="menu"` across all JSX: 0 results |
| No `alt` text strategy for images — proof photo components lack alt text | 🟡 Medium | `ImageLightbox.jsx`, `PickupModal.jsx` |
| No per-page `<title>` updates — all routes show same static title | 🟡 Medium | Grep for `document.title` across all JSX: 0 results |

---

## 8. Performance Audit

### Verified Strengths
- **Code splitting** via `React.lazy()`: 22 lazy-loaded pages in `App.jsx` L23-52
- **Eagerly loaded**: Auth pages (LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage) + layout shells
- **Suspense boundaries**: App-level (L127) + per-page (L144-174)
- **PageLoader**: Lightweight spinner (L71-80) vs full LoadingScreen (L56-68)
- **Font preloading**: `<link rel="preload" as="style">` in `index.html` L72
- **DNS prefetch**: `index.html` L70-71 for Google Fonts
- **Service Worker**: Production only (`index.html` L80-125), auto-unregistered in dev
- **PWA manifest** with icons and theme colors
- **Skeleton loaders**: `SkeletonLoader.jsx` provides StatCard, OrderCard, TableRow, Donut variants
- **Real-time subscriptions** properly cleaned up in `useEffect` returns (verified in `Sidebar.jsx` L76-78, `CustomerLayout.jsx` L81)

### Verified Issues
| Issue | Severity | Evidence |
|-------|----------|---------|
| `remaining.css` is **45,942 bytes** — single largest stylesheet | 🟡 Medium | Contains notifications, chat, alerts, admin sections, booking success, login chatbot, and more |
| No CSS purging — utility classes (100+ gap/padding/margin helpers in `animations-utils.css` L260-392) shipped regardless of usage | 🟡 Medium | ~132 utility lines potentially partially unused |
| `React.StrictMode` removed from `main.jsx` | 🟢 Low | `main.jsx` L6-8: renders `<App />` directly without StrictMode wrapper |
| **41 files** use inline `style={{}}` objects | 🟡 Medium | Grep across all JSX: 41 files contain `style={{` |

---

## 9. UX Patterns Audit

### 9.1 Micro-Interactions — ✅ Excellent
- Button ripple effect (`components.css` L18-36: radial gradient on `:active`)
- Card hover lift (`components.css` L122-127: `translateY(-2px)` with spring)
- Sidebar link icon scale (`layout-admin.css` L173: `scale(1.08)`)
- Theme toggle icon rotation (`components.css` L402-403: `rotate(15deg) scale(1.1)`)
- Bottom tab active glow (`layout-customer.css` L294-306: `tabGlowIn` keyframe)
- FAB pulse ring (`layout-customer.css` L327-339: `fabPulseRing` keyframe)
- Toast slide-in (`feedback.css` L257-266: `toastIn` keyframe)
- Capacity bar shimmer (`data.css` L329-338: `capacityShimmer` keyframe)
- Notification badge pop (`layout-customer.css` L160-164: `badgePop` keyframe)
- Stat card circle scale (`data.css` L60-63: `::before` scale on hover)
- Status timeline active node breathing (`data.css` L184: `breathe` animation)

### 9.2 Loading States — ✅ Excellent
- Multiple skeleton variants: `SkeletonStatCard`, `SkeletonOrderCard`, `SkeletonTableRow`, `SkeletonDonut`
- Shimmer animation on skeletons (`animations-utils.css` L30-33)
- Staggered appearance with `StaggerItem` delays
- Page-level `Suspense` fallbacks for lazy routes
- Inline spinners on form submissions (`btn .animate-spin`)

### 9.3 Error Handling — ✅ Good
- `ErrorBoundary` at app level + `ErrorBoundarySection` per dashboard section
- Auth error mapper with specific messages (`LoginPage.jsx` L22-37)
- Shake animation on auth errors (`animations-utils.css` L89-95)
- Alert banners with 4 semantic variants (`remaining.css` L3-34)
- Toast notifications for async operation results

### 9.4 Empty States — ✅ Good
- `EmptyState` component with icon + title + description + optional CTA
- Used across orders, trips, notifications, home page

### 9.5 Navigation — ✅ Excellent
- Admin: Sidebar (3-tier grouping) + Command Palette (Ctrl+K)
- Customer: Top navbar + bottom tab bar (mobile) with FAB
- Active link indicators (admin: left accent bar `layout-admin.css` L211-218, customer: bottom underline `layout-customer.css` L51-57)
- Breadcrumb component available
- Profile dropdown with account settings + logout

---

## 10. SEO & Meta Audit

### Verified from `index.html`
- ✅ `<title>` tag with brand + description (L8)
- ✅ `<meta name="description">` with comprehensive keywords (L9)
- ✅ `<meta name="keywords">` (L10)
- ✅ Open Graph meta tags: og:title, og:description, og:image, og:type, og:site_name (L61-65)
- ✅ Apple PWA meta tags (L51-54)
- ✅ Microsoft tile meta tags (L57-58)
- ✅ Theme color meta with dark mode variant (L15-16)
- ✅ `lang="en"` on `<html>` (L2)
- ✅ PWA manifest link (L39)

### Issues
| Issue | Severity | Evidence |
|-------|----------|---------|
| **No per-page `<title>` updates** — SPA uses single static title for all routes | 🟡 Medium | Grep for `document.title` across all JSX: 0 results |
| No canonical URL meta tag | 🟢 Low | No `<link rel="canonical">` found |
| No structured data (JSON-LD) | 🟢 Low | No `<script type="application/ld+json">` found |

---

## 11. Inline Styles Audit

**41 out of 55 JSX files** contain inline `style={{}}` objects. The heaviest offenders:

| File | Inline Count | Severity |
|------|-------------|----------|
| `HomePage.jsx` (customer) | 21 | 🟡 |
| `DashboardPage.jsx` (admin) | 5 | 🟢 |
| `AdminLayout.jsx` | 3 | 🟢 |
| `LoginPage.jsx` | 2 | 🟢 |

These inline styles bypass the design token system, are harder to maintain, cannot be overridden by media queries, and increase re-render cost.

---

## 12. Summary Scorecard

| Category | Score | Grade | Key Finding |
|----------|-------|-------|-------------|
| Design System & Tokens | 7.5/10 | B+ | Comprehensive but conflicting multi-file overrides |
| Visual Design Quality | 9.0/10 | A | Premium glassmorphism, gradients, depth |
| Responsiveness | 8.5/10 | A | 11 breakpoints, dvh, safe-area, 44px touch targets |
| Dark Mode | 6.5/10 | C+ | Implemented but toasts broken, hardcoded colors |
| Accessibility | 8.0/10 | A- | Skip links, ARIA, focus, reduced motion — missing menu roles |
| Animation & Micro-interactions | 9.5/10 | A+ | 11+ micro-interactions, reduced motion respected |
| Loading States | 9.0/10 | A | Skeleton variants, stagger, suspense boundaries |
| Error Handling | 8.0/10 | A- | ErrorBoundary, error mapper, toasts — some silent catches |
| Code Maintainability | 6.0/10 | C+ | 41 files with inline styles, 4 cascade override layers |
| SEO | 7.0/10 | B | Good meta but no per-page titles |
| Performance (Perceived) | 8.5/10 | A | Code splitting, preloading, skeletons |
| Component Architecture | 7.5/10 | B+ | 25 reusable components, some oversized |

### **Overall: 7.9 / 10 (B+)**

---

## 13. Prioritized Fix Recommendations

### 🔴 Critical (3 items)

**1. Fix toast dark mode**
- File: `feedback.css` L147-197
- All 4 toast variants use hardcoded `rgba(255,255,255,0.98)` backgrounds
- `.toast-message` hardcodes `color: #334155`
- Add `[data-theme="dark"] .toast-success/error/warning/info` overrides

**2. Consolidate dark mode tokens**
- `tokens.css` dark mode declares `--bg: #0A1628`
- `premium-refresh.css` overrides to `--bg: #07111F`
- Choose one source of truth and remove the other
- Same for `--surface`, `--border`, `--text` and 7 other tokens

**3. Decompose oversized components**
- `LoginPage.jsx` (964 lines): Split into `LoginForm` + `LoginChatbot`
- `PickupModal.jsx` (22,210 bytes): Split into subcomponents
- `BookShipmentPage.jsx` (654 lines): Extract wizard steps

### 🟡 Important (7 items)

**4. Fix hardcoded colors in dark mode**
| Selector | File:Line | Fix |
|----------|-----------|-----|
| `.contact-card` | `pages.css` L73 | `background: white` → `background: var(--surface)` |
| `.about-mission p` | `pages.css` L64 | `color: #92400E` → `color: var(--warning-dark)` |
| `.about-mission` bg | `pages.css` L57 | `#FFF3E8` → use token |
| `.timeline-dot` | `data.css` L101 | `background: white` → `background: var(--surface)` |
| Alert banners | `remaining.css` L13-28 | Use tokens + add dark override |

**5. Remove dead code**
- `CustomerLayout.jsx` L248: `item.hasBadge` is never set on any `bottomNavItems` entry

**6. Reduce inline styles**
- 41 files contain inline `style={{}}`, especially `HomePage.jsx` (21 instances)
- Move to CSS classes using design tokens

**7. Add per-page `<title>`**
- No `document.title` usage found — all routes show the same static title
- Add `useEffect(() => { document.title = '...' }, [])` per page or use a shared hook

**8. Add `role="menu"` to dropdown menus**
- Customer dropdown (`CustomerLayout.jsx` L189-211) has no menu ARIA role
- Command palette results could use `role="listbox"` / `role="option"`

**9. Consolidate sidebar width tokens**
- `layout-admin.css` L7: `--sidebar-width: 260px`
- `admin-modern-refresh.css` L20: `--sidebar-width: 280px`
- Pick one and remove the other

**10. Add error feedback on customer data load failure**
- `HomePage.jsx` L44-46: empty `catch` block swallows errors silently

### 🟢 Nice-to-Have (4 items)

**11. Split `remaining.css` (45,942 bytes)**
- Largest single file — contains styles for ~10 different feature areas
- Could be split into notification.css, support-chat.css, admin-sections.css, etc.

**12. Add `alt` text strategy for images**
- Proof photos and uploaded images lack descriptive alt text

**13. Add canonical URL and structured data**
- `<link rel="canonical">` for SEO
- JSON-LD Organization schema

**14. Consider reducing CSS override layers**
- 4 cascade-override files (`premium-refresh`, `customer-mobile-refresh`, `admin-modern-refresh`, `viewport-hardening`) total 83,382 bytes
- Could be merged into the base files they override

---

*End of verified audit — every finding confirmed against source code with exact file paths and line numbers.*
