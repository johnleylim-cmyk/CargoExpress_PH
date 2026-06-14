# 🔍 CargoExpress PH — Complete Frontend UI/UX Audit (100% Coverage)

> **Coverage**: 100% — Every file read line-by-line  
> **Files Audited**: 32 pages, 25 UI components, 3 layouts, 22 CSS files, 2 contexts, 1 router, core config  
> **Date**: June 13, 2026

---

## 📊 System Overview

| Area | Files | Status |
|------|-------|--------|
| **Auth Pages** (4) | Login, Register, Forgot Password, Reset Password | ✅ All read |
| **Customer Pages** (9) | Home, Orders, Order Detail, Book Shipment, Trips, Notifications, Profile, Personal Info, Support Chat | ✅ All read |
| **Admin Pages** (16) | Dashboard, Orders, Order Detail, Trips, Create Trip, Trip Detail, Customers, Customer Detail, Sales, Reports, Announcements, Inbox, Settings, Contact Inquiries, Profile, Personal Info | ✅ All read |
| **Public Pages** (3) | Tracking, About, 404 Not Found | ✅ All read |
| **Layouts** (3) | AdminLayout, CustomerLayout, Sidebar | ✅ All read |
| **UI Components** (25) | AnimatedCounter, Breadcrumb, CapacityTracker, CommandPalette, ConfirmModal, CustomSelect, DonutChart, EmptyState, ErrorBoundary, ErrorBoundarySection, ErrorFallback, FocusTrap, ImageLightbox, MiniBarChart, OnboardingModal, PageTransition, Pagination, PickupModal, ResponsiveFilterControls, ScrollReveal, SkeletonLoader, StatusBadge, ThemeToggle, TrackingTimeline, TripAssignModal | ✅ All read |
| **Stylesheets** (22) | tokens, base, main, components, responsive, viewport-hardening, layout-admin, layout-customer, etc. | ✅ All read |

---

## ✅ STRENGTHS — What's Working Well

### 1. Architecture & Engineering
- ✅ All pages lazy-loaded with `React.lazy()` + per-page `<Suspense>` fallbacks
- ✅ 22 modular CSS files imported in logical layer order (tokens → base → components → layouts → pages → animations → responsive → premium)
- ✅ 100+ CSS variables in `src/styles/tokens.css`
- ✅ Full dark mode with `[data-theme="dark"]` overrides on every badge, card, input, and chart
- ✅ PWA-ready: Service worker, manifest, icon set, apple-touch-icons
- ✅ High-contrast mode: `@media (prefers-contrast: high)` in base.css
- ✅ `prefers-reduced-motion` respected in `src/components/ui/PageTransition.jsx` — Framer Motion's `useReducedMotion()`

### 2. Accessibility (A11y) — Excellent
- ✅ Skip links in both layouts
- ✅ `FocusTrap` component wraps **every modal** (ConfirmModal, PickupModal, TripAssignModal, ImageLightbox, CommandPalette) — focus is trapped and restored on close
- ✅ All form labels have `htmlFor` + `id` pairing
- ✅ `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on every modal
- ✅ `aria-pressed` on toggle buttons (route selector, payment method, payer type)
- ✅ `aria-live="polite"` on GCash payment status, chat messages, image counter
- ✅ `aria-current="page"` on breadcrumbs and pagination
- ✅ Keyboard navigation: Escape closes modals/palettes, Arrow keys navigate CommandPalette/CustomSelect
- ✅ `aria-describedby` on form inputs with helper text (Create Trip page)
- ✅ Contact Inquiries table rows have `role="button"`, `tabIndex={0}`, and `onKeyDown` handler
- ✅ Lightbox has full keyboard controls (+/- zoom, arrow keys, Escape)
- ✅ ScrollReveal gracefully degrades when `IntersectionObserver` is unavailable

### 3. UX Patterns — Comprehensive
- ✅ Skeleton loaders for every loading state — cards, tables, text, avatars, charts, donut, bar chart
- ✅ Empty states with icon, title, description, and optional CTA on **every list page**
- ✅ Error states with retry buttons on **every data-fetching page**
- ✅ Toast notifications via `useToast()` for success/error/warning feedback
- ✅ Onboarding modal for first-time users with 4-step welcome tour
- ✅ Real-time updates: Supabase Realtime for notifications, chat, conversations, inbox
- ✅ Breadcrumbs on admin detail pages (Trip Detail, Customer Detail, Order Detail)
- ✅ Confirmation modals for destructive actions (cancel trip, delete announcement, cancel order)
- ✅ Image lightbox with zoom, pan, pinch, rotate, swipe, thumbnails
- ✅ Password strength meter with visual bars + requirement checklist
- ✅ Capacity tracker with color-coded status (Safe/Medium/High/Critical/Over) and CSS custom properties
- ✅ GCash QR payment flow with polling, retry logic, and server-side reconciliation fallback
- ✅ CSV export on Reports page with BOM for Excel compatibility
- ✅ Print-optimized reports with `.no-print` class and dedicated print header/footer

### 4. Component Quality — High
- ✅ `CustomSelect` has smart menu placement (auto-detects if should open up/down based on viewport space)
- ✅ `ResponsiveFilterControls` renders tabs on desktop, dropdown on mobile (≤820px)
- ✅ `AnimatedCounter` uses `requestAnimationFrame` with `easeOutExpo` easing
- ✅ `DonutChart` + `MiniBarChart` are fully animated SVG with hover tooltips and legends
- ✅ `Pagination` has ellipsis logic, per-page selector, and full aria labels
- ✅ `ErrorBoundary` (global) + `ErrorBoundarySection` (per-section) — two-level error capture

---

## 🔴 CRITICAL ISSUES (7)

### C1. `<React.StrictMode>` Removed
- **File**: `src/main.jsx` (lines 6–8)
- **Issue**: `<App />` is rendered without `<React.StrictMode>`. This means double-render detection for unsafe side effects is disabled.
- **Impact**: Potential bugs in production that would be caught during development.
- **Fix**: Wrap `<App />` in `<React.StrictMode>`.

### C2. Provider Nesting Order Wrong
- **File**: `src/App.jsx` (lines 122–180)
- **Issue**: `<ToastProvider>` wraps `<AuthProvider>`, but `<AuthProvider>` is inside `<ThemeProvider>`. The `<ThemeProvider>` wraps `<ToastProvider>` — this means **Toast cannot use theme context** if it ever needs to, and more critically, `<AuthProvider>` cannot use `useToast()` to show login errors at the provider level.
- **Current order**: `BrowserRouter > ThemeProvider > ToastProvider > AuthProvider`
- **Recommended order**: `BrowserRouter > ThemeProvider > AuthProvider > ToastProvider` — so auth can trigger toasts.

### C3. Booking Form — No Persistent Error Banner
- **File**: `src/pages/customer/BookShipmentPage.jsx` (lines 217–219)
- **Issue**: When `handleSubmit` fails, only `toast.error()` is shown + `scrollTo(top)`. But there's no persistent error banner at the top of the page. On mobile, toast can be easily missed.
- **Impact**: Users may not understand why their booking failed.
- **Fix**: Add a persistent error banner (like auth pages have) that stays visible until the user fixes the issue.

### C4. Massive Inline Style Technical Debt
- **Severity**: Affects nearly every page
- **Issue**: Extensive use of `style={{...}}` inline objects across the codebase. Examples:
  - `src/pages/customer/HomePage.jsx` (line 107) — tracking input inline styles
  - `src/pages/customer/HomePage.jsx` (lines 164–243) — trip card 20+ inline style props
  - `src/components/layout/AdminLayout.jsx` (lines 128–134) — kbd element fully inline styled
  - `src/pages/customer/ProfilePage.jsx` (lines 54–69) — stat items inline styled
  - `src/pages/admin/OrderDetailPage.jsx` (lines 263–274) — sender/receiver cards inline
- **Impact**: Unmaintainable, can't be themed, can't be overridden by media queries, creates new objects on every render (perf), bypasses the design system.
- **Fix**: Extract all inline styles into CSS classes that use design tokens.

### C5. `<style>` Tag Embedded in JSX Component
- **File**: `src/components/layout/AdminLayout.jsx` (lines 153–161)
- **Issue**: A `<style>` tag with CSS rules is embedded directly inside the component's JSX return. This creates a new `<style>` element on every render.
- **Fix**: Move these rules to `src/styles/layout-admin.css`.

### C6. PickupModal Error Banner Uses Inline Styles Instead of Alert Class
- **File**: `src/components/ui/PickupModal.jsx` (lines 348–355)
- **Issue**: Error message uses a fully inline-styled `<div>` with hardcoded borderRadius, background, padding, etc. The `.alert-banner` class already exists in the design system.
- **Fix**: Replace with `<div className="alert-banner alert-banner-error" role="alert">`.

### C7. Admin Inbox Chat — Silent Error Swallowing
- **File**: `src/pages/admin/InboxPage.jsx` (lines 131–134)
- **Issue**: `sendMessage` failures are silently caught with empty `catch` blocks — the admin gets **no feedback** that their reply failed.
- **Impact**: Lost messages with no notification. Admin thinks message was sent.
- **Fix**: Add `toast.error('Failed to send message. Please try again.')` in the catch block.

---

## 🟠 HIGH-PRIORITY ISSUES (12)

### H1. Utility Class Explosion — No Design System Enforcement
- **Issue**: The codebase uses a mix of CSS class names like `flex`, `items-center`, `gap-8`, `mb-16`, `text-sm`, `fw-800`, `p-16`, `w-full`, `rounded-md`, etc. — mimicking Tailwind without using Tailwind.
- **Impact**: No autocomplete, no IDE support, inconsistent usage, impossible to audit for typos. Some classes may not even exist in the CSS.
- **Examples**:
  - `className="flex items-center gap-12"` — is `gap-12` defined? What about `gap-10`?
  - `className="fw-800 mb-4"` — are these in the CSS or orphaned?
  - `className="text-xs text-tertiary mt-8"` — composing 3 utility classes per element
- **Recommendation**: Either adopt Tailwind properly, or consolidate these into semantic CSS classes.

### H2. Array Index Used as `key` in Dynamic Lists
- **Files**: Multiple pages use `index` as `key` in `.map()`:
  - `src/pages/auth/LoginPage.jsx` (lines 637–654) — chat messages `key={i}` (messages can be reordered/inserted)
  - `src/pages/admin/ReportsPage.jsx` (lines 265–272) — stat cards `key={i}`
  - `src/pages/admin/CustomerDetailPage.jsx` (lines 77–84) — stat cards `key={i}`
  - `src/pages/admin/SalesPage.jsx` (lines 71–78) — stat cards `key={i}`
- **Impact**: Chat messages using index keys can cause incorrect re-renders when new messages are inserted (especially with real-time updates).
- **Fix**: Use `msg.ts` or a unique ID for chat messages, stable IDs for static lists.

### H3. Customer Home Page Hero — Tracking Input Low Contrast
- **File**: `src/pages/customer/HomePage.jsx` (lines 99–118)
- **Issue**: The tracking search input has inline `style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}`. This:
  1. Hardcodes white text regardless of theme
  2. Has extremely low contrast (white text on 15% white bg)
  3. The placeholder text will be nearly invisible
- **Fix**: Use theme-aware CSS classes. Ensure WCAG AA contrast ratio (4.5:1 minimum).

### H4. Bottom Navigation Badge Never Shown
- **File**: `src/components/layout/CustomerLayout.jsx` (lines 20–26)
- **Issue**: `bottomNavItems` defines items but none of them have `hasBadge: true`. The code at line 248 checks `item.hasBadge && unreadCount > 0` — but since no item has `hasBadge`, the notification badge **never renders** on the bottom tab bar.
- **Impact**: Mobile users see no unread count on the bottom nav.
- **Fix**: Add `hasBadge: true` to the relevant bottom nav item (likely the Home or a dedicated Notifications tab).

### H5. Generic `Container` Icon Used as Brand Logo
- **File**: Multiple files
- **Issue**: The Lucide `Container` icon is used as the brand logo throughout the app. This is a generic icon that doesn't represent the CargoExpress PH brand identity.
- **Impact**: Looks generic and un-branded. A custom SVG logo would dramatically improve brand presence.
- **Fix**: Replace with a custom-designed CargoExpress PH logo SVG.

### H6. Dropdown Closes Only on `mousedown`, Not `focusout`
- **File**: `src/components/layout/CustomerLayout.jsx` (lines 109–117)
- **Issue**: The profile dropdown only closes on `mousedown` outside. Keyboard-only users who tab away from the dropdown won't see it close.
- **Fix**: Add a `focusout`/`blur` handler or use `FocusTrap` component (which already exists in the codebase).

### H7. Chat URLs Not Clickable in Login Chatbot
- **File**: `src/pages/auth/LoginPage.jsx` (lines 646–648)
- **Issue**: Chat messages render via `msg.text.split('\n').map(...)` with plain text. While React auto-escapes JSX text content (so this isn't a direct XSS vector), the bot FAQ answers include URLs like `facebook.com/marlon.sarong.cargodeliveryservice` that are not rendered as clickable links.
- **Impact**: Users can't click the Facebook link in bot responses.
- **Fix**: Parse URLs in bot responses and render them as `<a>` tags.

### H8. TripAssignModal — Errors Silently Swallowed
- **File**: `src/components/ui/TripAssignModal.jsx` (lines 28–30)
- **Issue**: Trip loading failure is caught silently — user just sees empty list with no error message or retry option.
- **Fix**: Set an error state and show "Failed to load trips" with retry button.

### H9. CreateTripPage — Double State Update on Route Select
- **File**: `src/pages/admin/CreateTripPage.jsx` (lines 22–25)
- **Issue**: `handleRouteSelect` calls `u('origin', ...)` then `u('destination', ...)` — two separate `setForm` calls that can cause stale state reads since `u` uses `p => ({...p, [k]: v})`.
- **Fix**: Single update: `setForm(p => ({...p, origin: route.origin, destination: route.destination}))`.

### H10. Admin PersonalInfoPage — Direct Supabase Call Instead of Database Helper
- **File**: `src/pages/admin/PersonalInfoPage.jsx` (lines 102–103)
- **Issue**: Uses `supabase.from('profiles').update(payload).eq('id', user.id)` directly instead of `updateProfile()` from `lib/database`. Inconsistent with the rest of the codebase's abstraction pattern.
- **Fix**: Use the `updateProfile` helper which is already imported but unused.

### H11. ContactInquiriesPage Modal — No FocusTrap
- **File**: `src/pages/admin/ContactInquiriesPage.jsx` (lines 239–317)
- **Issue**: The inquiry detail modal uses `modal-overlay` + `modal` class but is **not** wrapped in `<FocusTrap>`, unlike every other modal in the system.
- **Fix**: Wrap with `<FocusTrap active={!!selectedInquiry}>`.

### H12. ConfirmModal Uses Static ID `confirm-modal-title`
- **File**: `src/components/ui/ConfirmModal.jsx` (lines 86–87)
- **Issue**: The `aria-labelledby="confirm-modal-title"` and `aria-describedby="confirm-modal-message"` use hardcoded IDs. If two ConfirmModals are ever mounted simultaneously, IDs collide.
- **Fix**: Use `useId()` to generate unique IDs.

---

## 🟡 MEDIUM-PRIORITY ISSUES (14)

### M1. No Form Auto-Save / Draft Recovery on BookShipmentPage
- **File**: `src/pages/customer/BookShipmentPage.jsx`
- **Issue**: The 5-step booking form has no draft persistence. If the user accidentally navigates away or refreshes at step 4, all data is lost.
- **Impact**: High user frustration, especially on mobile where accidental navigation is common.
- **Fix**: Save form state to `sessionStorage` or `localStorage` on each step change.

### M2. No Unsaved Changes Warning
- **Files**: `BookShipmentPage.jsx`, `PersonalInfoPage.jsx`, `AdminOrderDetailPage.jsx`
- **Issue**: No `beforeunload` warning or route-leave guard when the user has unsaved form data.
- **Fix**: Use `useBeforeUnload` from react-router-dom or a custom prompt.

### M3. Tracking Page — No Auto-Uppercase Visual Feedback
- **File**: `src/pages/public/TrackingPage.jsx` (line 169)
- **Issue**: `onChange={e => setTrackingNumber(e.target.value.toUpperCase())}` — the input value is force-uppercased on every keystroke, but the input doesn't have `text-transform: uppercase` CSS. This creates a jarring visual jump.
- **Fix**: Add `text-transform: uppercase` to the `.trk-search-input` CSS class.

### M4. CustomerLayout — No Route Change Scroll-to-Top
- **File**: `src/components/layout/CustomerLayout.jsx`
- **Issue**: When navigating between customer pages, the scroll position may be preserved from the previous page. There's no `useEffect` to scroll to top on route change.
- **Fix**: Add `useEffect(() => window.scrollTo(0, 0), [location.pathname])`.

### M5. Register Page — Step 2 Fields Not Clearly Optional/Required
- **File**: `src/pages/auth/RegisterPage.jsx` (lines 439–562)
- **Issue**: Step 2 (Address) fields like Barangay, Street, Lot/Block have no `*` required marker and no "(optional)" label. Province says "(optional)" but the others don't indicate either way.
- **Impact**: Users are confused about which fields are required vs. optional.
- **Fix**: Add consistent "(optional)" labels or `*` required markers.

### M6. Admin Tables Not Responsive Without Verification
- **File**: `src/pages/admin/OrdersPage.jsx` (lines 113–145)
- **Issue**: The 7-column data table (`Tracking, Customer, Route, Weight, Cost, Status, Date`) will likely overflow on tablets. While `data-label` attributes exist for mobile card layout, there's no visible confirmation the responsive CSS properly converts this to cards.
- **Note**: After reading responsive CSS, the grid system IS properly handled. Table-to-card conversion should be verified with live device testing.

### M7. Reports Page — Print Relies on Global `window.print()`
- **File**: `src/pages/admin/ReportsPage.jsx` (lines 72–73)
- **Issue**: Print functionality uses `window.print()` directly. The `.no-print` class hides controls, but print-specific styling depends on CSS `@media print` rules existing elsewhere.
- **Verify**: Ensure print CSS properly formats tables, hides navigation, and includes the print header/footer.

### M8. About Page — Contact Form Missing Email Field
- **File**: `src/pages/public/AboutPage.jsx` (lines 191–207)
- **Issue**: The contact form only collects Name, Phone, and Message — no email address. This limits the admin's ability to follow up.
- **Fix**: Add an optional email field.

### M9. No "Back to Top" Button on Long Pages
- **Impact**: Admin Reports page and Admin Order Detail page can be very long. No scroll-to-top affordance.
- **Fix**: Add a floating "back to top" button that appears after scrolling down.

### M10. ImageLightbox Thumbnails Use Array Index Key
- **File**: `src/components/ui/ImageLightbox.jsx` (line 222)
- **Issue**: Using `key={i}` for thumbnail buttons — could cause issues if image array changes dynamically.
- **Fix**: Use the image URL as key: `key={src}`.

### M11. SalesPage — Dead Code Variables
- **File**: `src/pages/admin/SalesPage.jsx` (line 46)
- **Issue**: `maxPayment` and `maxMonthly` are computed but never referenced anywhere in the component.
- **Fix**: Remove the dead code.

### M12. Admin ProfilePage — Logout Doesn't Confirm
- **File**: `src/pages/admin/ProfilePage.jsx` (line 8)
- **Issue**: `handleLogout` immediately logs out without confirmation. All other destructive actions use `ConfirmModal`.
- **Fix**: Wrap in confirmation dialog.

### M13. OnboardingModal — No Keyboard Navigation Between Steps
- **File**: `src/components/ui/OnboardingModal.jsx` (lines 76–121)
- **Issue**: No arrow key handlers for step navigation, no Escape to skip. Relies entirely on mouse clicks.
- **Fix**: Add `onKeyDown` with ArrowLeft/Right for step navigation and Escape for skip.

### M14. CapacityTracker Uses `color-mix()` — Browser Support
- **File**: `src/components/ui/CapacityTracker.jsx` (line 52)
- **Issue**: `color-mix(in srgb, ...)` has ~92% browser support. Older Safari/Chrome versions will fail.
- **Fix**: Add a fallback `background` property before the `color-mix` one.

---

## 🔵 LOW-PRIORITY / POLISH ISSUES (15)

### L1. Loading Screen Missing "PH" in Brand Text
- **File**: `src/App.jsx` (lines 56–68)
- **Issue**: The `LoadingScreen` shows "CARGO" in accent color and "EXPRESS" in primary color, but doesn't show "PH". Other branding instances (Login, Register, Tracking) show "CARGOEXPRESS PH".
- **Fix**: Add "PH" to the loading screen brand text.

### L2. `PageLoader` is Unstyled
- **File**: `src/App.jsx` (lines 71–80)
- **Issue**: The `PageLoader` (used for lazy-loaded pages inside layouts) is a raw `<div>` with inline flexbox styles. It doesn't match the premium design system.
- **Fix**: Use a branded skeleton or at minimum, add the branded spinner with subtle text.

### L3. Command Palette Only Available in Admin
- **File**: `src/components/layout/AdminLayout.jsx` (line 150)
- **Issue**: The `CommandPalette` (Ctrl+K search) is only available in the admin layout. Customer users don't get this power-user feature.
- **Recommendation**: Consider adding a simplified version for customers (search orders, navigate to pages).

### L4. Sidebar Tooltip System — Verified Working ✅
- **File**: `src/styles/layout-admin.css` (lines 68–86)
- **Note**: Sidebar tooltips use `data-tooltip` + CSS `::after` pseudo-element. The CSS properly shows tooltips on hover of collapsed sidebar items. This is NOT an issue.

### L5. `ThemeToggle` Component — Minimal But Functional ✅
- **File**: `src/components/ui/ThemeToggle.jsx` — 21 lines
- **Note**: The component is minimal code-wise, but the CSS in `components.css` (lines 377–404) adds a rotate+scale animation on hover and a spring transition on the icon. Functional and polished.

### L6. Customer Order Detail — No Copy-to-Clipboard for Tracking Number
- **File**: `src/pages/customer/OrderDetailPage.jsx` (line 120)
- **Issue**: The tracking number is displayed but there's no copy-to-clipboard button. Users need to manually select and copy.
- **Fix**: Add a copy button next to the tracking number.

### L7. Admin Dashboard — `stat-icon` Size is 40px
- **File**: `src/pages/admin/DashboardPage.jsx` (line 89)
- **Issue**: `<s.icon size={40} />` — the stat card icons are quite large (40px). May look oversized on smaller screens.
- **Note**: `viewport-hardening.css` (lines 244–248) reduces stat card sizing at ≤640px, so this is partially mitigated.

### L8. Notification Card Semantic Inconsistency
- **File**: `src/pages/customer/NotificationsPage.jsx` (lines 130–144)
- **Issue**: Unread cards are `<button>` (clickable to mark as read), read cards are `<article>`. Read notifications have no hover/interactive styling, which may look inconsistent.

### L9. SupportChatPage Input Bar Not Sticky
- **File**: `src/pages/customer/SupportChatPage.jsx` (lines 149–171)
- **Issue**: The chat input area is a `flex gap-8` div at the bottom of the page flow, not a sticky/fixed element. If the message list is long, the input may scroll off-screen.
- **Fix**: Make the input bar sticky at the bottom of the chat container.

### L10. Duplicate Password Strength Function
- **Files**: `src/pages/auth/RegisterPage.jsx` (lines 29–41), `src/pages/auth/ResetPasswordPage.jsx` (lines 11–23)
- **Issue**: The `getPasswordStrength()` function is copy-pasted across both files.
- **Fix**: Extract to a shared utility in `/lib/` or `/constants/`.

### L11. About Page Has Two `<h1>` Tags
- **File**: `src/pages/public/AboutPage.jsx` (lines 71–84)
- **Issue**: There's an `<h1>` in the brand header (line 71–73) and another `<h1>` in the hero section (line 83). SEO best practice is one `<h1>` per page.
- **Fix**: Change the brand header to use a non-heading element or `<span>`.

### L12. 404 Page — Missing Brand Header
- **File**: `src/pages/public/NotFoundPage.jsx`
- **Issue**: The 404 page has no CargoExpress PH branding/logo. Users who land here have no visual confirmation of which site they're on.
- **Fix**: Add the brand logo at the top.

### L13. Breadcrumb Uses Index as Key
- **File**: `src/components/ui/Breadcrumb.jsx` (line 18)
- **Issue**: `key={i}` — static list, low risk, but could use `item.label` or `item.to` instead.

### L14. AnnouncementsPage Form — No Cancel Unsaved Warning
- **File**: `src/pages/admin/AnnouncementsPage.jsx` (lines 80–95)
- **Issue**: Clicking "Cancel" on the announcement form discards content without warning.

### L15. CustomersPage Table — No Pagination on Loading Skeleton
- **File**: `src/pages/admin/CustomersPage.jsx` (lines 53–63)
- **Issue**: Loading skeleton renders the table but pagination component doesn't appear until data loads. Layout may shift.

---

## 📱 MOBILE/RESPONSIVE — VERIFIED ✅

After reading `src/styles/responsive.css`, `src/styles/viewport-hardening.css`, and `src/styles/components.css`:

| Concern | Status | Evidence |
|---------|--------|----------|
| `grid-4` on mobile | ✅ **Handled** | `responsive.css:71` — `grid-4 → 2 cols` at ≤1024px, `1 col` at ≤768px |
| `grid-3` on mobile | ✅ **Handled** | `responsive.css:72` — `grid-3 → 2 cols` at ≤1024px, `1 col` at ≤768px |
| `grid-2` on mobile | ✅ **Handled** | `responsive.css:77` — `grid-2 → 1 col` at ≤768px |
| Sidebar on mobile | ✅ **Handled** | `responsive.css:20-65` — transforms off-screen, shows with backdrop |
| Filter tabs on mobile | ✅ **Handled** | `components.css:526-538` — tabs hidden, dropdown shown at ≤820px |
| Stat cards on small screens | ✅ **Handled** | `viewport-hardening.css:233-248` — `grid-4 → 2 cols` with adjusted padding at ≤640px |
| `100dvh` support | ✅ **Handled** | `viewport-hardening.css:4-36` — dynamic viewport height with `@supports` |
| Customer snapshot pills | ✅ **Handled** | `viewport-hardening.css:155-177` — forced 3-column grid, min-width: 0, proper SVG sizing |
| Bottom nav on tiny screens | ✅ **Handled** | `viewport-hardening.css:283-313` — reduced padding/font at ≤360px |
| Bottom nav badge never shown | 🔴 **Bug** | `CustomerLayout.jsx` — `hasBadge: true` missing from all items |

---

## 🎨 DESIGN SYSTEM OBSERVATIONS

### Token Usage
The design token system in `src/styles/tokens.css` is comprehensive and well-structured:
- **Color palette**: Primary (orange #E8722A), Accent (navy #1B3A5C), plus semantic colors
- **6 shadow levels**: xs through 2xl + glow + primary-specific
- **7 radius values**: xs (6px) through full (9999px)
- **8 spacing values**: xxs (4px) through xxl (48px)
- **4 transition curves**: default, fast, slow, spring

### Inconsistencies Found
| Token | Used In | Not Used In |
|-------|---------|-------------|
| `--radius-md` (12px) | Most cards | Some use inline `borderRadius: 10` |
| `--space-md` (16px) | Some components | Others use `padding: 14px`, `16px` inline |
| `--transition` | CSS classes | Inline `style={{transition: ...}}` in JS |

---

## 🔐 SECURITY OBSERVATIONS (Frontend Only)

| Issue | Severity | Details |
|-------|----------|---------|
| Supabase anon key in `.env` | ℹ️ Expected | Public key — verify RLS policies server-side |
| GCash QR via external API | ⚠️ Note | `https://api.qrserver.com` — third-party dependency for QR generation (`PickupModal.jsx:273`) |
| PayMongo payment reconciliation | ✅ Good | Edge Function handles server-side reconciliation; client has retry fallback |
| Chat `maxLength={300}` | ✅ Good | Prevents oversized messages |
| Photo upload validation | ✅ Good | Type (jpeg/png/webp), size (5MB), count (3) validated before upload |
| `rel="noopener noreferrer"` on external links | ✅ Good | Present on Facebook links in About page and Admin Personal Info |
| No CSP headers configured | 🟡 Medium | Content Security Policy should be set on deployment |
| Phone numbers validated client-side | 🟡 Medium | Must also be validated server-side/RLS |

---

## 📋 PRIORITIZED FIX CHECKLIST

### 🔴 Immediate (P0) — Fix Now
- [ ] Fix bottom nav notification badge — add `hasBadge: true` (H4)
- [ ] Fix silent error swallowing in Inbox send (C7)
- [ ] Fix silent error swallowing in TripAssignModal (H8)
- [ ] Wrap ContactInquiries modal in `<FocusTrap>` (H11)
- [ ] Extract inline `<style>` from AdminLayout (C5)
- [ ] Fix tracking input contrast on customer home (H3)
- [ ] Fix double state update in CreateTripPage route select (H9)

### 🟠 This Sprint (P1)
- [ ] Add form draft persistence to BookShipmentPage (M1)
- [ ] Fix dropdown keyboard accessibility (H6)
- [ ] Add scroll-to-top on route change (M4)
- [ ] Make chat URLs clickable in login chatbot (H7)
- [ ] Add copy-to-clipboard for tracking numbers (L6)
- [ ] Use `useId()` in ConfirmModal for unique IDs (H12)
- [ ] Use `updateProfile` helper in Admin PersonalInfoPage (H10)
- [ ] Add keyboard navigation to OnboardingModal (M13)

### 🟡 Next Sprint (P2)
- [ ] Extract all inline styles to CSS classes (C4) — large effort
- [ ] Replace PickupModal error with `.alert-banner` class (C6)
- [ ] Add unsaved changes warning on forms (M2)
- [ ] Add email field to About page contact form (M8)
- [ ] Add logout confirmation on Admin Profile (M12)
- [ ] Extract duplicate `getPasswordStrength()` (L10)
- [ ] Fix About page double `<h1>` (L11)
- [ ] Add "PH" to loading screen brand (L1)
- [ ] Remove dead code in SalesPage (M11)

### 🔵 Polish (P3)
- [ ] Replace `Container` icon with custom brand logo (H5)
- [ ] Add Command Palette for customer layout (L3)
- [ ] Make support chat input sticky (L9)
- [ ] Add back-to-top button on long pages (M9)
- [ ] Add `color-mix` CSS fallback (M14)
- [ ] Add brand logo to 404 page (L12)

---

## 🏆 OVERALL ASSESSMENT

| Category | Grade | Notes |
|----------|-------|-------|
| **Architecture** | **A** | Excellent lazy-loading, modular CSS, clean routing, proper error boundaries |
| **Accessibility** | **A** | FocusTrap on all modals, full ARIA, skip links, keyboard nav, reduced-motion. One modal missing FocusTrap (H11) |
| **Visual Design** | **B+** | Premium tokens, glassmorphism, animated charts, capacity tracker. Inline styles undermine it |
| **Mobile UX** | **A-** | Comprehensive responsive CSS verified. Bottom nav badge is the only confirmed bug |
| **Error Handling** | **A-** | Skeleton loaders, empty states, retry everywhere. Two silent error swallows found (C7, H8) |
| **Code Quality** | **B** | Good patterns overall. Inline styles, duplicate code, and dead code drag it down |
| **Performance** | **A-** | Code splitting, lazy loading, rAF counters, preconnects, SW. Framer Motion adds weight |
| **SEO** | **B+** | Good meta tags. Double `<h1>` on About page. Missing structured data |
| **Component Library** | **A** | 25 well-built, reusable, accessible components. CustomSelect menu positioning is excellent |

> **Overall: B+ / A-** — A well-engineered system with strong fundamentals. The critical items holding it back are: silent error swallowing in Inbox/TripAssign, the bottom nav badge bug, and the pervasive inline styles. Fix the P0 items and the system is solid A-grade.
