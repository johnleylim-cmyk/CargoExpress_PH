# CargoExpress PH — Full Frontend UI/UX Audit

---

## 1. Design System & Tokens

**Strengths:**
- Well-structured `tokens.css` with ~80 CSS custom properties covering colors, spacing, radii, shadows, transitions, and z-index layers
- Semantic color tokens (success, warning, error, info) with background variants
- Glass-morphism tokens (`--glass-bg`, `--glass-border`, `--glass-blur`) for modern surfaces
- 9 shadow levels provide good depth hierarchy
- Full dark mode token set via `[data-theme="dark"]`

**Issues:**
- **Color identity conflict**: `tokens.css` defines `--primary: #E8722A` (orange) as the brand color, but both `customer-mobile-refresh.css` and `admin-modern-refresh.css` override it with `--customer-green: #128A5A` and `--admin-green: #128A5A`. This creates a split personality — the brand is orange in tokens but renders green in most customer/admin screens. The orange still appears in some components (notification badges, `--primary-bg` tints) causing visual inconsistency.
- **Duplicate token definitions**: Green overrides redefine primary-derived tokens (`--primary-bg`, `--primary-glow`, etc.) rather than using a single source of truth, making future color changes fragile.
- **No spacing scale enforcement**: Spacing tokens exist (`--space-xxs` through `--space-xxl`, 7 values) but many CSS rules use raw `px` values (e.g., `padding: 14px 16px`, `gap: 12px`), bypassing the token system entirely.
- **Missing typography tokens**: Font sizes are hardcoded throughout (`0.875rem`, `0.8125rem`, etc.) with no `--font-size-*` tokens. The base typography in `base.css` uses `clamp()` for headings but body text sizes are scattered.

---

## 2. CSS Architecture

**Strengths:**
- 21-file modular structure with clear separation of concerns
- Layered import order in `main.css` follows a logical cascade: tokens → base → components → data → feedback → loading → charts → layouts → auth → pages → tracking → remaining → animations → responsive → premium-refresh → customer-mobile-refresh → admin-modern-refresh → viewport-hardening
- Each refresh layer (premium, customer-mobile, admin-modern) is isolated

**Issues:**
- **Override cascade is too deep**: The last 5 files (`responsive.css`, `premium-refresh.css`, `customer-mobile-refresh.css`, `admin-modern-refresh.css`, `viewport-hardening.css`) all override earlier rules. This creates specificity wars and makes it hard to predict which rule wins. A CSS custom media or container query approach would be cleaner.
- **`remaining.css` is a catch-all**: This file contains unrelated concerns — alert banners, typing indicators, notifications, chat, profiles, section headers, inbox, sales bars, reports, print styles, micro-interactions, onboarding modals, lightbox, reduced motion, and admin components. It should be split into 4-5 focused files.
- **No CSS modules or scoping**: All styles are global. Class name collisions are possible (e.g., `.card` is used across many contexts with different expectations).
- **Inline `<style>` blocks in JSX**: `AdminLayout.jsx:153-161` has a `<style>` tag for mobile menu toggle visibility. This bypasses the CSS architecture and is harder to maintain.
- **Duplicate responsive breakpoints**: `responsive.css` handles 1024/899.98/768/480px, but `customer-mobile-refresh.css` adds 899.98/520/374px, `viewport-hardening.css` adds 1024/640/380/340/360px, `remaining.css` has 820/768/640/900/360px, `auth.css` has 540/380/480px, `premium-refresh.css` has 899.98/480/640/420/360px, `tracking.css` has 640/380px, `tabs-steps.css` has 900/480px, `charts.css` has 600px, `components.css` has 820px, `feedback.css` has 480px, and `layout-customer.css` has 899.98px. That's **14 distinct breakpoints** (340, 360, 374, 380, 420, 480, 520, 540, 600, 640, 768, 820, 899.98/900, 1024px — 899.98 and 900 are functionally identical) with overlapping ranges — a maintenance burden.

---

## 3. Layout Systems

### Admin Layout
**Strengths:**
- Fixed sidebar with collapse (260px to 72px) persisted to localStorage, with smooth 0.3s width/transform transition and `will-change` hint
- Drawer mode on mobile (<1024px) with body scroll lock and Escape key dismissal
- Glass topbar with sticky positioning
- Skip link for accessibility
- Command palette (Ctrl+K) for quick navigation
- PageTransition wrapper with ErrorBoundary for graceful error handling

**Issues:**
- The inline `<style>` block at `AdminLayout.jsx:153` overrides `.mobile-menu-toggle` and `.topbar-title` visibility, which should live in the CSS files
- Topbar user avatar shows only first character of name — no fallback to initials like the customer layout does

### Customer Layout
**Strengths:**
- Sticky glass navbar with desktop nav links
- Floating pill bottom tab bar on mobile with center "Book" FAB button
- Real-time notification badge via Supabase real-time listener (INSERT/UPDATE events)
- Avatar dropdown with proper `aria-haspopup`, `aria-expanded`
- Click-outside-to-close dropdown handler
- Push notification permission request with session-based dedup

**Issues:**
- **Bottom nav has no desktop equivalent for Profile**: Desktop nav has 4 items (Place Order, Orders, Trips, Chat Support) but Profile is only accessible via the avatar dropdown — inconsistent with mobile where Profile is a bottom tab
- **No active indicator on bottom nav notifications**: The bottom nav doesn't include a notifications tab, so users on mobile have no quick access
- **`OnboardingModal` renders outside the layout div** (`<>` fragment at line 127), which could cause z-index or overlay conflicts

---

## 4. Responsive Design

**Strengths:**
- Comprehensive breakpoint coverage down to 340px
- Mobile-first patterns: card-based table transforms at 820px, drawer sidebar at 1024px
- Safe-area-inset support for notched devices (in `layout-customer.css`, `customer-mobile-refresh.css`, `premium-refresh.css`)
- `dvh` (dynamic viewport height) support in `viewport-hardening.css`
- Fluid typography with `clamp()` for headings

**Issues:**
- **14 breakpoints is excessive**: Consolidate to 5-6 (e.g., 1024, 768, 640, 480, 360). The micro-breakpoints (374, 380, 340, 420, 520, 540, 600) suggest pixel-chasing specific devices rather than using a fluid approach.
- **No container queries**: All responsive behavior relies on viewport-based media queries. Components like cards and tables can't adapt to their container width independently.
- **`prefers-reduced-motion` handled** in both `remaining.css` and `premium-refresh.css` but only disables animations/transitions — layout shifts from responsive breakpoints still apply, which can be disorienting.

---

## 5. Dark Mode

**Strengths:**
- Complete token override set in `tokens.css` via `[data-theme="dark"]`
- Theme persisted to localStorage with system preference detection
- Smooth transition via `.theme-transition` class (350ms CSS duration, 400ms JS timeout buffer to remove the class)
- `ThemeToggle` component available in both layouts
- `color-scheme` property set on `<html>` for native form control styling

**Issues:**
- **Dark mode coverage gaps**: `tracking.css` has explicit dark mode overrides, but many component styles in `remaining.css` (inbox, reports, profile cards) use hardcoded colors like `#065F46`, `#991B1B`, `#92400E` that don't adapt to dark mode
- **Alert banners** (`remaining.css:3-28`) use hardcoded light-mode colors (`#A7F3D0`, `#FECACA`) with no dark mode variants
- **Print styles** (`remaining.css:625-720`) force white background, which is correct, but the print-only elements use hardcoded `#E8722A` orange — this won't match if the green override is active
- **No `prefers-color-scheme` fallback in CSS**: The system relies entirely on JS (`ThemeContext.jsx`) to set `data-theme`. If JS fails to load, there's no CSS-only fallback via `@media (prefers-color-scheme: dark)`.

---

## 6. Accessibility

**Strengths:**
- Skip links in both layouts (`#admin-main-content`, `#customer-main-content`)
- ARIA attributes: `aria-label`, `aria-haspopup`, `aria-expanded`, `aria-controls` on interactive elements
- `prefers-reduced-motion` support disables animations
- `prefers-contrast` support in `base.css`
- `.sr-only` utility class for screen-reader-only content
- `focus-visible` outlines defined in `base.css` with per-component overrides in `auth.css`, `chatbot.css`, `components.css`
- Semantic HTML: `<header>`, `<nav>`, `<main>`, `<button>` with proper roles
- `role="alert"` properly used on toast notifications (`useToast.jsx`) and auth error banners (Login, Register, ForgotPassword, ResetPassword pages)

**Issues:**
- **No focus trap in modals/drawers**: The sidebar drawer and dropdown menus don't appear to trap focus, which means keyboard users can tab behind them
- **Color contrast**: Orange `#E8722A` on white is ~3.4:1 — **fails WCAG AA for normal text** (requires 4.5:1). Green `#128A5A` on white is ~5.0:1, which passes AA but fails AAA (7:1). Both colors fail AAA compliance.
- **Notification badge** uses only color (no text label or icon) to convey meaning — insufficient for colorblind users
- **Bottom nav "Book" FAB** has no `aria-label` on the floating button itself (only the text "Book" below it)

---

## 7. Animations & Interactions

**Strengths:**
- 17 keyframe animations in `animations-utils.css` covering common patterns
- Framer Motion available for component-level animations
- Page transitions via `PageTransition` component (Framer Motion spring physics, respects `useReducedMotion`)
- Micro-interactions: ripple effect, validation pulse, card hover lift, breathing notification dot
- Theme toggle has smooth 350ms CSS transition with `prefers-reduced-motion` support
- Booking success screen has confetti animation, expanding rings, and animated checkmark

**Issues:**
- **`will-change` hints used sparingly**: Only applied on the sidebar (`layout-admin.css`) and one element in `remaining.css`. Other frequently animated elements (modals, toasts) lack them — could cause layout thrashing on lower-end devices.
- **No CSS `contain` property** used anywhere — adding `contain: layout` or `contain: content` to isolated components (cards, sidebar) could improve rendering performance.

---

## 8. Component Library Assessment

### Buttons
- 7 variants (primary, secondary, outline, ghost, danger, success, warning) + 3 sizes — comprehensive
- Green gradient override in admin/customer refresh layers conflicts with the orange primary token

### Cards
- Standard, interactive, and glass variants
- `border-radius` inconsistency: base cards use `var(--radius-md)`, but admin-modern-refresh overrides to `24px`, customer-mobile-refresh uses `22-30px`

### Forms
- Input validation states (valid/invalid) with colored borders and glow
- Custom select dropdown implemented
- Icon positioning support for inputs with leading icons

### Data Tables
- Sticky headers, clickable rows, hover effects
- Mobile card transform at 820px — good pattern
- But the transform is defined in `remaining.css` rather than `data.css` where table styles live

### Stat Cards
- Gradient backgrounds with decorative circles — visually rich
- Icon layout defined in `premium-refresh.css` rather than `data.css`

---

## 9. Per-Screen Observations

### Auth Pages
| Screen | Status | Key Notes |
|--------|--------|-----------|
| **Login** | Good | Split layout (`login-split-page`): left branding panel with route pills and feature list, right form panel. Email/password with field-level and banner error placement. Password visibility toggle. Floating chatbot FAB with FAQ engine, quick questions, typing indicator, ARIA live region. Decorative background orbs. |
| **Register** | Good | 2-step wizard (Account → Address) with step progress bar. Password strength meter (Weak/Fair/Good/Strong) with 4-bar visual and rules checklist. Phone validation (09 prefix, 11 digits). Address uses province → city cascading CustomSelect. Success state with animated progress bar and auto-redirect. Decorative orbs. |
| **Forgot Password** | Good | Email input with hero icon section. "What happens next?" tips box with numbered steps. Sent state shows inbox icon with animated ring, resend countdown (60s) with progress bar. Error banner with `role="alert"`. |
| **Reset Password** | Good | Initial "Verifying your reset link…" spinner state (1.5s delay). Password strength meter and requirements checklist (8+ chars, uppercase, lowercase, number). Confirm password match indicator. Success state with animated bar and 3s redirect. |

### Admin Pages
| Screen | Status | Key Notes |
|--------|--------|-----------|
| **Dashboard** | Good | 4 stat cards with tone classes (primary/warning/info/success). Van capacity tracker. DonutChart for order status distribution. Recent orders data-table. No bar chart on this page. |
| **Orders** | Good | Filter tabs (9 statuses: All, Pending, Assigned, Picked Up, In Transit, Arrived at Hub, Out for Delivery, Delivered, Cancelled). Search box. ResponsiveFilterControls. Pagination (15/page). StatusBadge. Data-table with mobile card transform. |
| **Order Detail** | Good | Breadcrumb navigation. Status action bar (Assign to Trip, Advance Status, Cancel). TrackingTimeline component. Sender/receiver cards. Package details grid. Pickup proof photos with ImageLightbox. Payment & weight management form with live cost computation. Weight deviation warning. PickupModal and TripAssignModal. ErrorBoundarySection wrappers. |
| **Trips** | Good | Filter tabs (6 statuses). ResponsiveFilterControls. Trip cards with capacity display (getCapacityState helper). Create Trip button. StatusBadge per trip. |
| **Trip Detail** | Good | Breadcrumb. Status action buttons (Start Trip, Mark Arrived, Complete, Cancel) with ConfirmModal for each. CapacityTracker component. Assigned orders data-table. |
| **Create Trip** | Good | Route selection cards (from ROUTES constant). Schedule section with datetime-local inputs. Capacity and pricing inputs with live revenue preview calculation. Optional notes textarea. Form validation via toast. |
| **Customers** | Good | Data-table (Name, Email, Phone, Province, Joined). Search box. Pagination. Skeleton table loading. Linked customer names navigate to detail. |
| **Customer Detail** | Good | Breadcrumb. Profile card with banner, avatar initial, contact info. 4 gradient stat cards with AnimatedCounter (Total Orders, Completed, Pending, Total Spent). Order history data-table. |
| **Sales** | Good | 4 stat cards with inline gradient backgrounds. DonutChart for payment method distribution. MiniBarChart for monthly revenue. |
| **Reports** | Good | Period tabs (daily/weekly/monthly/yearly/custom). Custom date range with validation. CSV export button. Print functionality. DonutChart and MiniBarChart. |
| **Inbox** | Good | Conversation list with Supabase real-time INSERT listener. Chat area with message history and bubbles. Mark-as-read functionality. Split layout pattern. |
| **Announcements** | Good | Card list with create form (title max 100 chars, content max 1500 chars). Delete with ConfirmModal. SkeletonCard loading. EmptyState. Author attribution and date. |
| **Contact Inquiries** | Good | Data-table with status filters (new/read/resolved) via ResponsiveFilterControls. Clickable rows with keyboard support. Detail modal overlay. Avatar initials. Status badges. New inquiry count badge. Mark-as-resolved action. |
| **Settings** | Adequate | Tabs (Profile, Pricing). Profile tab uses AdminPersonalInfoPage component. Pricing tab has price_per_kilo input. Reuses standard admin form/card patterns — no dedicated settings-specific styling. |
| **Profile** | Adequate | Profile card with banner, avatar, Shield admin badge. Single menu item (Personal Information). Sign Out button. Minimal layout, `maxWidth: 520`. |
| **Personal Info** | Good | 4-section card layout: Basic Info (name, phone), Business Contact (Smart/Globe numbers), Social Media (Facebook URL with validation), Business Addresses (Manila/Bohol textareas). Phone validation (09 prefix, 11 digits). Facebook URL validation. |

### Customer Pages
| Screen | Status | Key Notes |
|--------|--------|-----------|
| **Home** | Good | Hero with dynamic greeting and tracking search form. Snapshot pills (total orders, active, delivered). Active trip card with capacity info and "Book Now" CTA. Recent orders list. |
| **Orders** | Good | Filter tabs (5 statuses: All, Pending, In Transit, Delivered, Cancelled). Search by tracking number. ResponsiveFilterControls. Order cards with StatusBadge. |
| **Order Detail** | Good | Back button. Header with tracking number, route, StatusBadge. Cancel button for Pending orders with ConfirmModal. TrackingTimeline (compact). Trip info card. Sender/receiver contact grid. Package details grid. Pickup proof photos with ImageLightbox. Payment summary (cost/paid/balance). Payment due date warning. |
| **Book Shipment** | Good | Multi-step wizard with step state. Route selection from ROUTES constant. Trip selection with date formatting. Sender/receiver address forms with province → city cascading selects. Phone validation (09 prefix, 11 digits). Optional "use registered" sender/receiver toggle. Price per kilo from getSettings. Success screen with confetti (in premium-refresh.css). |
| **Trips** | Good | Active trips list. Trip date formatting (month/day/full). StatusBadge. Capacity info per trip. EmptyState for no active trips. Skeleton loading. |
| **Notifications** | Good | Date grouping (Today/Yesterday/formatted date). Supabase real-time INSERT listener with duplicate prevention. Mark individual and mark-all-read. Icon map by notification type (order_update, trip_update, announcement, general). |
| **Profile** | Good | Premium card with banner and avatar initial. Quick stats grid (Total Orders, Active, Delivered). Menu items (Personal Information, Notifications, Support Chat) with icons and descriptions. Sign Out button. |
| **Personal Info** | Good | Form with name, Facebook name, phone, and full address fields (province, city, barangay, street, lot/block). Province → city cascading CustomSelect. Phone validation. Field-level errors. Supabase profile update with address normalization. |
| **Support Chat** | Good | Full-page chat layout. Supabase real-time INSERT listener for new messages. Message bubbles with timestamps and date separators. EmptyState for no messages. SkeletonChat loading. Auto-scroll to latest message. No typing indicator (that's only in the login chatbot). |

### Public Pages
| Screen | Status | Key Notes |
|--------|--------|-----------|
| **Tracking** | Good | Search form with auto-uppercase input. Status banner with per-status color tones (8 status variants). Progress bar with percentage. TrackingTimeline component. Info grid (route, package, sender, receiver, shipping cost, booked date). Empty state with tracking format tips. Footer with sign-in link. Uses `track_order_public` RPC. |
| **About** | Good | Header with brand and back-to-login link. Hero section. 4-card feature grid (Door-to-Door, Two Routes, Safe & Secure, Real-Time Tracking). About Us card with mission statement. Business Information card (pulled from admin profile via getAdminProfile). Contact form with name, phone, message. Toast notifications. |
| **404 Not Found** | Good | Decorative orbs. PackageX icon with animated pulse ring. Gradient "404" text with split spans. Suggestion links (Go Home, Track Shipment). Browser back button link. |

---

## 10. Critical Recommendations

### High Priority
1. **Resolve the orange vs green color conflict**: Decide on one brand color and remove the other. If green is the intended brand, update `tokens.css` and remove all orange references. The current split creates visual confusion.
2. **Fix color contrast failures**: `#E8722A` on white fails WCAG AA (3.4:1). Either darken the orange or ensure it's only used on dark backgrounds/large text.
3. **Add dark mode variants for hardcoded colors**: Alert banners, report elements, and some badges use hardcoded light-mode colors that break in dark mode.

### Medium Priority
4. **Consolidate breakpoints**: Reduce from 14 to 5-6 breakpoints using fluid sizing where possible.
5. **Split `remaining.css`**: Break into `alerts.css`, `inbox.css`, `reports.css`, `profiles.css`, `micro-interactions.css`.
6. **Add CSS custom property for typography**: Create `--font-size-xs` through `--font-size-2xl` tokens and replace hardcoded `rem` values.
7. **Move inline `<style>` blocks** from JSX to CSS files.
8. **Add focus trapping** to modals, drawers, and dropdown menus.

### Low Priority
9. **Add `will-change` hints** to frequently animated elements (modals, toasts, dropdown menus).
10. **Add CSS-only dark mode fallback** via `@media (prefers-color-scheme: dark)` for when JS fails.
11. **Consider CSS container queries** for card/table components that should adapt to their container, not just the viewport.
12. **Audit z-index usage**: With 6 z-index tokens defined, verify no component uses raw z-index values that could conflict.

---

## 11. File-by-File Summary

| File | Purpose | Quality |
|------|---------|---------|
| `tokens.css` | Design tokens (colors, spacing, shadows, radii, transitions, z-index) | Strong |
| `base.css` | Reset, fluid typography, scrollbars, skip-link, high-contrast | Strong |
| `components.css` | Buttons, cards, forms, badges, theme toggle, filter tabs, selects | Strong |
| `data.css` | Tables, stat cards, grids, status timeline, capacity tracker | Good |
| `feedback.css` | Modals, toast notifications (glass-morphism, semantic variants) | Good |
| `loading-search.css` | Spinners, loading screen, skeletons, empty states, search box | Good |
| `tabs-steps.css` | Tab nav, step progress, login split layout, chatbot FAB | Good |
| `chatbot.css` | Chatbot chatbox, bubbles, typing indicator, quick replies | Good |
| `charts.css` | Donut chart, bar chart, pagination, breadcrumbs, inline validation | Strong |
| `layout-admin.css` | Admin sidebar (fixed/collapsible/drawer), glass topbar | Strong |
| `layout-customer.css` | Customer navbar, bottom tab bar, avatar dropdown, notification badge | Strong |
| `auth.css` | Auth pages (orbs, card animation, password meter, register steps) | Good |
| `pages.css` | About, contact, hero, 404 page, error boundary | Good |
| `tracking.css` | Public tracking, about page, dark mode overrides | Good |
| `remaining.css` | Catch-all (alerts, chat, profiles, inbox, reports, print, admin) | Needs splitting |
| `animations-utils.css` | Keyframes, animation utilities, command palette, utility classes | Strong |
| `responsive.css` | Responsive overrides at 1024/899.98/768/480px | Adequate |
| `premium-refresh.css` | Premium overrides, booking success, bento grid, dark mode patches | Good |
| `customer-mobile-refresh.css` | Customer green theme, mobile-specific styles, booking flow | Good |
| `admin-modern-refresh.css` | Admin green theme, floating sidebar, refined topbar/cards | Good |
| `viewport-hardening.css` | dvh support, flex fixes, micro-breakpoint adjustments | Good |
| `main.css` | Import orchestrator for all 21 files | Clean |

---

## Summary

The CargoExpress PH frontend is **well-built and visually polished** with a comprehensive design system, dual-layout architecture, full dark mode support, and thoughtful responsive design down to very small screens. The CSS architecture is modular with a clear layering strategy.

The **biggest issue** is the unresolved orange-to-green color identity split — the design tokens say orange, but the customer and admin refresh layers override to green, creating inconsistency. The other major concerns are color contrast accessibility, hardcoded colors breaking dark mode, and an over-fragmented breakpoint strategy with 14 distinct values. The `remaining.css` catch-all file and inline styles in JSX are minor technical debt items.

**Overall quality: 7.5/10** — strong foundation with clear paths to improvement.
