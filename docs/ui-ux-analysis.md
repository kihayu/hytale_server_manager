# Hytale Server Manager - UI/UX Analysis Report

**Document Version:** 1.0  
**Date:** January 30, 2026  
**Scope:** Frontend Application (`packages/frontend/`)

---

## Executive Summary

This document provides a comprehensive UI/UX analysis of the Hytale Server Manager frontend application. The analysis covers missing features, incomplete implementations, accessibility issues, user experience gaps, consistency issues, mobile responsiveness, performance concerns, and navigation/information architecture.

### Key Findings Overview

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Missing Features | 1 | 3 | 4 | 2 | 10 |
| Incomplete Implementations | 0 | 3 | 2 | 1 | 6 |
| Accessibility | 1 | 4 | 6 | 3 | 14 |
| UX Gaps | 0 | 2 | 5 | 3 | 10 |
| Consistency | 0 | 1 | 4 | 3 | 8 |
| Responsiveness | 0 | 2 | 3 | 2 | 7 |
| Performance | 0 | 1 | 3 | 2 | 6 |
| Navigation | 0 | 1 | 2 | 1 | 4 |
| **Total** | **2** | **17** | **29** | **17** | **65** |

---

## Table of Contents

1. [Missing Features](#1-missing-features)
2. [Incomplete Implementations](#2-incomplete-implementations)
3. [Accessibility Issues](#3-accessibility-issues)
4. [User Experience Gaps](#4-user-experience-gaps)
5. [Consistency Issues](#5-consistency-issues)
6. [Mobile Responsiveness](#6-mobile-responsiveness)
7. [Performance Concerns](#7-performance-concerns)
8. [Navigation & Information Architecture](#8-navigation--information-architecture)
9. [Quick Wins](#9-quick-wins)
10. [Long-Term Improvements](#10-long-term-improvements)
11. [Priority Recommendations](#11-priority-recommendations)

---

## 1. Missing Features

### 1.1 Player Inventory Viewer Not Implemented

| Attribute | Details |
|-----------|---------|
| **Category** | Missing Feature |
| **Severity** | High |
| **Current State** | Type definitions exist (`types/inventory.ts`) with comprehensive item stack, enchantment, and inventory slot types. Mock data exists (`data/mockInventories.ts`). However, no UI component implements inventory viewing. The `InventoryGrid` component exists in `components/features/` but is not integrated into player pages. |
| **Recommended Improvement** | Implement an `InventoryViewerModal` or tab within `PlayerDetailPage` that displays player inventory using the existing `InventoryGrid` component and mock data structure. |
| **Affected Files** | `pages/players/PlayerDetailPage.tsx`, `components/features/InventoryGrid.tsx`, `types/inventory.ts` |

### 1.2 Forgot Password Flow Not Implemented

| Attribute | Details |
|-----------|---------|
| **Category** | Missing Feature |
| **Severity** | Critical |
| **Current State** | Login page has a "Forgot Password?" button with `onClick={() => {/* TODO: Implement forgot password */}}` comment. No password reset functionality exists. |
| **Recommended Improvement** | Implement a password reset flow with email verification or admin-assisted reset mechanism. Add `ForgotPasswordModal` or dedicated `/forgot-password` route. |
| **Affected Files** | `pages/auth/LoginPage.tsx` |

### 1.3 Error Reporting Service Not Configured

| Attribute | Details |
|-----------|---------|
| **Category** | Missing Feature |
| **Severity** | Medium |
| **Current State** | Multiple `TODO` comments reference implementing error reporting (e.g., Sentry). Error boundary catches errors but only logs to console. |
| **Recommended Improvement** | Integrate an error tracking service (Sentry, LogRocket, etc.) for production error monitoring. Environment variable already exists for production detection. |
| **Affected Files** | `App.tsx`, `components/error/ErrorBoundary.tsx` |

### 1.4 Live Player Position Map Not Implemented

| Attribute | Details |
|-----------|---------|
| **Category** | Missing Feature |
| **Severity** | Medium |
| **Current State** | Type `LivePlayerPosition` defined in `types/advanced.ts` with x, y, z coordinates and world info. No UI component renders player positions on a map. |
| **Recommended Improvement** | Create a `WorldMapViewer` component for visualizing player positions in real-time. Could be integrated into `PlayerDetailPage` or as a standalone dashboard widget. |
| **Affected Files** | `types/advanced.ts`, `pages/players/` |

### 1.5 Server Report Generation UI Missing

| Attribute | Details |
|-----------|---------|
| **Category** | Missing Feature |
| **Severity** | High |
| **Current State** | `ServerReport` type defined with comprehensive metrics (TPS, players, performance, etc.) but no UI exists to generate or view reports. |
| **Recommended Improvement** | Add a "Generate Report" action to `ServerDetailPage` or create a dedicated reports section in Analytics page. |
| **Affected Files** | `pages/analytics/AnalyticsPage.tsx`, `pages/servers/ServerDetailPage.tsx`, `types/advanced.ts` |

### 1.6 Shop/Economy Features Partially Implemented

| Attribute | Details |
|-----------|---------|
| **Category** | Missing Feature |
| **Severity** | Medium |
| **Current State** | Economy page exists with mock shop data display and basic CRUD UI. However, shop item management, transaction history viewing, and player balance management are not fully functional (uses mock data only). |
| **Recommended Improvement** | Complete shop item editor modal, add transaction history table, implement player balance management interface. |
| **Affected Files** | `pages/economy/EconomyPage.tsx`, `types/advanced.ts` |

### 1.7 Advanced Cron Expression Helper Missing

| Attribute | Details |
|-----------|---------|
| **Category** | Missing Feature |
| **Severity** | Low |
| **Current State** | Automation modals accept raw cron expressions with placeholder `* * * * *` but provide no validation, preview, or helper UI for building expressions. |
| **Recommended Improvement** | Add a `CronExpressionBuilder` component with visual schedule picker and next-run preview. Similar to cron job UIs in cloud platforms. |
| **Affected Files** | `pages/automation/CreateTaskModal.tsx`, `pages/automation/TaskGroupModal.tsx` |

### 1.8 Bulk Mod/Modpack Management Not Implemented

| Attribute | Details |
|-----------|---------|
| **Category** | Missing Feature |
| **Severity** | High |
| **Current State** | Individual mod install/uninstall works, but no bulk selection, bulk enable/disable, or dependency-aware batch installation exists. |
| **Recommended Improvement** | Add checkbox selection to mod cards, implement bulk action toolbar (enable all, disable all, update all), and dependency conflict resolution UI. |
| **Affected Files** | `pages/mods/ModsPage.tsx`, `pages/modpacks/ModpacksPage.tsx` |

### 1.9 Network Proxy Configuration UI Incomplete

| Attribute | Details |
|-----------|---------|
| **Category** | Missing Feature |
| **Severity** | Medium |
| **Current State** | `ServerNetwork` type supports proxy mode with `proxyServerId` and `proxyConfig`, but network creation modal has limited proxy-specific configuration options. |
| **Recommended Improvement** | Enhance `CreateNetworkModal` with proxy-specific settings: start order, load balancing preferences, health check configuration. |
| **Affected Files** | `components/modals/CreateNetworkModal.tsx`, `types/index.ts` |

### 1.10 World Border Visualization Missing

| Attribute | Details |
|-----------|---------|
| **Category** | Missing Feature |
| **Severity** | Low |
| **Current State** | World type includes `border` configuration (center, size) but no visual representation exists in world management UI. |
| **Recommended Improvement** | Add a mini-map preview showing world border relative to spawn point in `ServerWorldsPage`. |
| **Affected Files** | `pages/servers/ServerWorldsPage.tsx`, `types/index.ts` |

---

## 2. Incomplete Implementations

### 2.1 Players Page - Coming Soon Placeholder

| Attribute | Details |
|-----------|---------|
| **Category** | Incomplete |
| **Severity** | High |
| **Current State** | `PlayersPage.tsx` displays only a "Coming Soon" message with no functional content. Type definitions exist for `Player`, `PlayerStatus`, `Warning`, etc. Mock data exists in `mockData.ts`. |
| **Recommended Improvement** | Implement players list with DataTable, search/filter capabilities, online status indicators, and links to player detail pages. |
| **Affected Files** | `pages/players/PlayersPage.tsx`, `pages/players/PlayerDetailPage.tsx` |

### 2.2 Player Detail Page - Coming Soon Placeholder

| Attribute | Details |
|-----------|---------|
| **Category** | Incomplete |
| **Severity** | High |
| **Current State** | `PlayerDetailPage.tsx` shows only "Coming Soon" with a back button. Should display player stats, inventory, session history, warnings, etc. |
| **Recommended Improvement** | Implement tabbed interface with Overview, Inventory, Sessions, Warnings, and Economy sections using existing type definitions. |
| **Affected Files** | `pages/players/PlayerDetailPage.tsx` |

### 2.3 Analytics Page - Coming Soon Placeholder

| Attribute | Details |
|-----------|---------|
| **Category** | Incomplete |
| **Severity** | High |
| **Current State** | `AnalyticsPage.tsx` is a placeholder. Types for `ServerReport` and `PlayerAnalytics` are defined with rich metrics. |
| **Recommended Improvement** | Implement analytics dashboard with time-series charts for TPS, player counts, performance metrics, and report generation/export functionality. |
| **Affected Files** | `pages/analytics/AnalyticsPage.tsx`, `types/advanced.ts` |

### 2.4 Bridge Page Feature Configuration Non-Functional

| Attribute | Details |
|-----------|---------|
| **Category** | Incomplete |
| **Severity** | Medium |
| **Current State** | Bridge page shows features with "Configure" buttons that have no functionality. Features show enabled/disabled status but cannot be toggled. |
| **Recommended Improvement** | Implement feature toggle functionality and configuration modals for configurable bridge features. |
| **Affected Files** | `pages/bridge/BridgePage.tsx` |

### 2.5 Economy Shop Creation Incomplete

| Attribute | Details |
|-----------|---------|
| **Category** | Incomplete |
| **Severity** | Medium |
| **Current State** | "Create Shop" modal has form fields but `handleCreateShop` only closes the modal without persisting data. Form state is not managed. |
| **Recommended Improvement** | Implement controlled form state, validation, API integration for shop creation, and success/error feedback. |
| **Affected Files** | `pages/economy/EconomyPage.tsx` |

### 2.6 Server Detail - Installed Mods Counter Shows Hardcoded Value

| Attribute | Details |
|-----------|---------|
| **Category** | Incomplete |
| **Severity** | Low |
| **Current State** | Server detail page shows mod count from server data, but installed mods section shows "Coming Soon" for mod details within server context. |
| **Recommended Improvement** | Fully integrate installed mods display with enable/disable toggle, version info, and quick links to mod details. |
| **Affected Files** | `pages/servers/ServerDetailPage.tsx` (lines 322, 448) |

---

## 3. Accessibility Issues

### 3.1 Missing Skip Navigation Link

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | High |
| **Current State** | No "Skip to main content" link exists for keyboard users to bypass navigation. |
| **Recommended Improvement** | Add a visually hidden skip link at the start of the page that becomes visible on focus and navigates to main content area. |
| **Affected Files** | `components/layout/DashboardLayout.tsx`, `App.tsx` |

### 3.2 Missing ARIA Labels on Interactive Elements

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | High |
| **Current State** | Many buttons have icons only without accessible labels. Only 8 `aria-label` usages found across the entire frontend. Most icon-only buttons lack descriptive labels. |
| **Recommended Improvement** | Add `aria-label` or `title` attributes to all icon-only buttons. Consider using `sr-only` spans for screen reader text. |
| **Affected Files** | All button components with icon-only display |

### 3.3 Color Contrast Issues in Badge Component

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | Medium |
| **Current State** | Some badge variants (warning, info) may have insufficient contrast ratios between text and background colors, especially in light mode. |
| **Recommended Improvement** | Audit badge color combinations with WCAG contrast checker. Ensure minimum 4.5:1 ratio for normal text, 3:1 for large text. |
| **Affected Files** | `components/ui/Badge.tsx`, `tailwind.config.js` |

### 3.4 Focus Management in Modals

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | High |
| **Current State** | Modal component handles Escape key but doesn't trap focus within the modal or return focus to trigger element on close. |
| **Recommended Improvement** | Implement focus trap using `focus-trap-react` or custom solution. Store and restore focus on modal open/close. |
| **Affected Files** | `components/ui/Modal.tsx` |

### 3.5 Missing Form Labels Association

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | High |
| **Current State** | Many form inputs use `<label>` elements but don't associate them with inputs using `htmlFor`/`id` attributes. Inputs in modals often have labels as sibling text without proper association. |
| **Recommended Improvement** | Ensure all `<label>` elements have corresponding `htmlFor` attributes matching unique input `id` values. |
| **Affected Files** | `pages/economy/EconomyPage.tsx`, `pages/automation/CreateTaskModal.tsx`, `pages/users/UsersPage.tsx`, `pages/settings/SettingsPage.tsx` |

### 3.6 Missing Landmark Roles

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | Medium |
| **Current State** | Page structure doesn't consistently use semantic landmarks (`<main>`, `<nav>`, `<aside>`, `<header>`) or ARIA roles. Sidebar uses `<aside>` but main content area lacks `<main>`. |
| **Recommended Improvement** | Wrap main content in `<main role="main">`, ensure proper landmark structure for screen reader navigation. |
| **Affected Files** | `components/layout/DashboardLayout.tsx` |

### 3.7 Missing Live Regions for Dynamic Content

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | Medium |
| **Current State** | Dynamic updates (server status changes, real-time metrics, toast notifications) don't announce to screen readers. No `aria-live` regions configured. |
| **Recommended Improvement** | Add `aria-live="polite"` to status update areas. Ensure toast container has `role="status"` or `role="alert"`. |
| **Affected Files** | `components/ui/Toast.tsx`, `pages/dashboard/DashboardPage.tsx` |

### 3.8 Table Accessibility Missing

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | Medium |
| **Current State** | DataTable component uses tables but may lack proper `<caption>`, `scope` attributes on headers, or `aria-describedby` for complex data relationships. |
| **Recommended Improvement** | Add optional caption prop, ensure `<th scope="col">` on column headers, add row headers where appropriate. |
| **Affected Files** | `components/ui/DataTable.tsx` |

### 3.9 Missing Keyboard Navigation for Custom Components

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | Medium |
| **Current State** | `SearchableSelect` and dropdown components may not be fully keyboard navigable. Tab order in modal forms may skip elements. |
| **Recommended Improvement** | Implement arrow key navigation for dropdowns, ensure logical tab order, add keyboard shortcuts documentation. |
| **Affected Files** | `components/ui/SearchableSelect.tsx`, `components/ui/CommandPalette.tsx` |

### 3.10 Loading States Not Announced

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | Low |
| **Current State** | Loading spinners provide visual feedback but no screen reader announcement that content is loading. |
| **Recommended Improvement** | Add `aria-busy="true"` to loading containers, use `aria-live` to announce "Loading..." and "Content loaded" states. |
| **Affected Files** | `App.tsx` (PageLoader), all pages with loading states |

### 3.11 Confirm Dialogs Use Browser Alert

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | Medium |
| **Current State** | Destructive actions use browser `confirm()` which is accessible but jarring. A custom `ConfirmDialog` component exists but isn't always used. |
| **Recommended Improvement** | Replace all `confirm()` calls with the custom `ConfirmDialog` component for consistent UX and better accessibility control. |
| **Affected Files** | `pages/economy/EconomyPage.tsx`, `pages/alerts/AlertsPage.tsx`, `pages/permissions/PermissionsPage.tsx` |

### 3.12 Toast Duration Not Configurable Per Toast

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | Low |
| **Current State** | Toast notifications auto-dismiss which may not give users enough time to read important messages. |
| **Recommended Improvement** | Allow longer durations for error toasts, add "pause on hover" functionality, include dismiss button (already implemented). |
| **Affected Files** | `components/ui/Toast.tsx`, `stores/toastStore.ts` |

### 3.13 Charts Not Accessible

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | Critical |
| **Current State** | Recharts charts provide visual data but no text alternative, data table, or screen reader description of trends. |
| **Recommended Improvement** | Add summary text describing key data points, provide optional data table view, add `aria-label` to chart containers with trend descriptions. |
| **Affected Files** | All chart components in `pages/dashboard/components/`, `pages/economy/EconomyPage.tsx` |

### 3.14 Color-Only Status Indicators

| Attribute | Details |
|-----------|---------|
| **Category** | Accessibility |
| **Severity** | Low |
| **Current State** | Server status and health indicators use color (green/red/yellow) without additional visual differentiation for color-blind users. |
| **Recommended Improvement** | Add icons, patterns, or text labels alongside color indicators. Use shape or pattern fills in charts. |
| **Affected Files** | `components/ui/StatusIndicator.tsx`, `components/ui/Badge.tsx` |

---

## 4. User Experience Gaps

### 4.1 No Onboarding or First-Run Experience

| Attribute | Details |
|-----------|---------|
| **Category** | UX Gap |
| **Severity** | Medium |
| **Current State** | New users are dropped directly into the dashboard with no guidance. No setup wizard, feature tour, or contextual help. |
| **Recommended Improvement** | Implement first-login detection with optional guided tour using a library like `react-joyride`. Add contextual help tooltips on complex features. |
| **Affected Files** | `pages/dashboard/DashboardPage.tsx`, new component needed |

### 4.2 Inconsistent Empty States

| Attribute | Details |
|-----------|---------|
| **Category** | UX Gap |
| **Severity** | Medium |
| **Current State** | Empty states vary in quality. Some pages have nice illustrations (Alerts), others have plain text ("No data found"). Some lack clear call-to-action. |
| **Recommended Improvement** | Create a reusable `EmptyState` component with illustration, message, description, and optional action button. Use consistently across all pages. |
| **Affected Files** | All pages with empty states |

### 4.3 Missing Confirmation for Destructive Actions

| Attribute | Details |
|-----------|---------|
| **Category** | UX Gap |
| **Severity** | High |
| **Current State** | Some destructive actions (delete server, delete backup) use browser confirm(), others have no confirmation. Inconsistent protection against accidental data loss. |
| **Recommended Improvement** | Use `ConfirmDialog` component consistently for all destructive actions. Add "type to confirm" for critical deletions. |
| **Affected Files** | Various pages with delete actions |

### 4.4 No Undo Functionality

| Attribute | Details |
|-----------|---------|
| **Category** | UX Gap |
| **Severity** | Medium |
| **Current State** | Most actions are immediately committed with no way to undo. No trash/recycle bin for deleted items. |
| **Recommended Improvement** | For non-critical deletions, implement soft-delete with undo toast. Consider "Recently Deleted" section for backups and configurations. |
| **Affected Files** | Various pages |

### 4.5 Insufficient Form Validation Feedback

| Attribute | Details |
|-----------|---------|
| **Category** | UX Gap |
| **Severity** | Medium |
| **Current State** | Some forms lack inline validation. Errors only shown after submission attempt. No field-level error messages in some modals. |
| **Recommended Improvement** | Implement real-time validation with `react-hook-form` or similar. Show inline error messages below fields. Add success indicators for valid fields. |
| **Affected Files** | `pages/auth/LoginPage.tsx`, modal components |

### 4.6 Missing Breadcrumb Navigation

| Attribute | Details |
|-----------|---------|
| **Category** | UX Gap |
| **Severity** | Medium |
| **Current State** | Nested pages (Server > Settings, Server > Worlds) lack breadcrumb navigation. Users rely on browser back button or sidebar navigation. |
| **Recommended Improvement** | Add `Breadcrumbs` component to nested pages showing navigation path with clickable links. |
| **Affected Files** | `pages/servers/ServerDetailPage.tsx`, `pages/servers/ServerSettingsPage.tsx`, `pages/servers/ServerWorldsPage.tsx` |

### 4.7 No Keyboard Shortcuts Help

| Attribute | Details |
|-----------|---------|
| **Category** | UX Gap |
| **Severity** | Low |
| **Current State** | Command Palette exists (Ctrl/Cmd+K) but no help modal documenting available keyboard shortcuts. |
| **Recommended Improvement** | Add "Keyboard Shortcuts" option to user menu or settings. Show hint about Ctrl+K in header search placeholder. |
| **Affected Files** | `components/ui/CommandPalette.tsx`, `components/layout/Header.tsx` |

### 4.8 Missing Progress Indication for Long Operations

| Attribute | Details |
|-----------|---------|
| **Category** | UX Gap |
| **Severity** | High |
| **Current State** | Long operations (backup creation, mod installation, server updates) show loading spinners but no progress percentage or estimated time. Update process has progress, but other operations don't. |
| **Recommended Improvement** | Add progress bars with percentage for operations that support it. Show indeterminate progress with stage labels for others. |
| **Affected Files** | `pages/backups/BackupsPage.tsx`, `pages/mods/ModsPage.tsx` |

### 4.9 Session Timeout Not Graceful

| Attribute | Details |
|-----------|---------|
| **Category** | UX Gap |
| **Severity** | Medium |
| **Current State** | JWT expiry leads to failed API requests. No pre-emptive warning before session expires. User loses unsaved work. |
| **Recommended Improvement** | Show warning 5 minutes before session expiry. Implement silent refresh where possible. Prompt for re-authentication with option to save work. |
| **Affected Files** | `stores/authStore.ts`, `services/api.ts` |

### 4.10 Missing Recent Actions/Quick Access

| Attribute | Details |
|-----------|---------|
| **Category** | UX Gap |
| **Severity** | Low |
| **Current State** | No quick access to recently viewed servers, recently used mods, or frequent actions. Users must navigate from scratch each time. |
| **Recommended Improvement** | Add "Recent" section to sidebar or dashboard. Store recent items in localStorage and display shortcuts. |
| **Affected Files** | `components/layout/Sidebar.tsx`, `pages/dashboard/DashboardPage.tsx` |

---

## 5. Consistency Issues

### 5.1 Inconsistent Page Header Styling

| Attribute | Details |
|-----------|---------|
| **Category** | Consistency |
| **Severity** | Medium |
| **Current State** | Most pages use `text-3xl font-heading font-bold` for h1, but some pages (Dashboard) use `text-2xl sm:text-3xl`. Some have flexbox headers with buttons, others don't. |
| **Recommended Improvement** | Create a `PageHeader` component that standardizes layout with title, description, and optional action buttons. Use consistently across all pages. |
| **Affected Files** | All page components |

### 5.2 Button Variant Usage Inconsistent

| Attribute | Details |
|-----------|---------|
| **Category** | Consistency |
| **Severity** | Medium |
| **Current State** | Primary actions sometimes use `variant="primary"`, other times use no variant (default). "Refresh" actions use `secondary`, but so do "Cancel" actions. |
| **Recommended Improvement** | Document button variant guidelines: primary for main CTA, secondary for secondary actions, ghost for toolbar buttons, danger for destructive actions. |
| **Affected Files** | All pages with buttons |

### 5.3 Inconsistent Spacing Between Cards

| Attribute | Details |
|-----------|---------|
| **Category** | Consistency |
| **Severity** | Low |
| **Current State** | Grid gaps vary: `gap-4`, `gap-6`, `gap-3`. Some use `space-y-6`, others use `space-y-4`. No consistent spacing scale. |
| **Recommended Improvement** | Establish spacing scale in design tokens. Use consistent gap values: `gap-4` for tight layouts, `gap-6` for standard, `gap-8` for loose. |
| **Affected Files** | All pages |

### 5.4 Mixed Icon Sizes

| Attribute | Details |
|-----------|---------|
| **Category** | Consistency |
| **Severity** | Low |
| **Current State** | Icons vary between `size={14}`, `size={16}`, `size={18}`, `size={20}`, `size={24}` without clear pattern. Header icons differ from sidebar icons differ from button icons. |
| **Recommended Improvement** | Establish icon size guidelines: 14-16px for inline/button icons, 18-20px for nav items, 24-32px for feature icons, 40-48px for empty state illustrations. |
| **Affected Files** | All components using icons |

### 5.5 Card Variant Usage

| Attribute | Details |
|-----------|---------|
| **Category** | Consistency |
| **Severity** | Medium |
| **Current State** | Most pages use `variant="glass"` for cards, but some cards don't specify variant. Not clear when to use glass vs default vs elevated. |
| **Recommended Improvement** | Use `glass` for primary content cards, `default` for nested/secondary cards. Document in component documentation. |
| **Affected Files** | All pages using Card component |

### 5.6 Confirm Dialog vs Browser Confirm

| Attribute | Details |
|-----------|---------|
| **Category** | Consistency |
| **Severity** | High |
| **Current State** | A `ConfirmDialog` UI component exists but many pages use browser `confirm()` for destructive actions. |
| **Recommended Improvement** | Replace all `confirm()` calls with `ConfirmDialog` component for consistent styling and accessibility. |
| **Affected Files** | `pages/economy/EconomyPage.tsx`, `pages/alerts/AlertsPage.tsx`, `pages/permissions/PermissionsPage.tsx` |

### 5.7 Date Formatting Inconsistency

| Attribute | Details |
|-----------|---------|
| **Category** | Consistency |
| **Severity** | Low |
| **Current State** | Dates shown using `toLocaleString()`, `toLocaleTimeString()`, `formatDistanceToNow()`, and custom formats. No standardized date display. |
| **Recommended Improvement** | Create utility functions: `formatDate`, `formatDateTime`, `formatRelative`. Use date-fns consistently with standardized formats. |
| **Affected Files** | All pages displaying dates |

### 5.8 Modal Size Variations

| Attribute | Details |
|-----------|---------|
| **Category** | Consistency |
| **Severity** | Low |
| **Current State** | Modal sizes aren't consistently chosen based on content. Some simple forms use `lg`, some complex forms use `md`. |
| **Recommended Improvement** | Guidelines: `sm` for confirmations, `md` for simple forms, `lg` for complex forms, `xl` for data-heavy content like file browsers. |
| **Affected Files** | All modal usages |

---

## 6. Mobile Responsiveness

### 6.1 Table Horizontal Scroll on Mobile

| Attribute | Details |
|-----------|---------|
| **Category** | Responsive |
| **Severity** | High |
| **Current State** | DataTable component wraps in `overflow-x-auto` but complex tables (Alerts, Activity) are difficult to use on mobile. Important actions may be off-screen. |
| **Recommended Improvement** | Implement responsive table patterns: stack cells vertically on mobile, use card-based layout for small screens, or prioritize visible columns with expandable row details. |
| **Affected Files** | `components/ui/DataTable.tsx`, pages using DataTable |

### 6.2 Server Selector Buttons Overflow

| Attribute | Details |
|-----------|---------|
| **Category** | Responsive |
| **Severity** | Medium |
| **Current State** | Alerts page server selector uses horizontal button group that wraps awkwardly on mobile. With many servers, selection becomes cluttered. |
| **Recommended Improvement** | Replace button group with `SearchableSelect` dropdown on mobile. Use horizontal pills on desktop if space permits. |
| **Affected Files** | `pages/alerts/AlertsPage.tsx` |

### 6.3 Modal Full-Width on Mobile

| Attribute | Details |
|-----------|---------|
| **Category** | Responsive |
| **Severity** | Medium |
| **Current State** | Modals correctly go full-screen on mobile but close button is small and in corner. Some modal content overflows. |
| **Recommended Improvement** | Increase touch target size for close button on mobile. Ensure modal content scrolls independently. Add swipe-to-close gesture. |
| **Affected Files** | `components/ui/Modal.tsx` |

### 6.4 Chart Tooltips Unusable on Touch

| Attribute | Details |
|-----------|---------|
| **Category** | Responsive |
| **Severity** | High |
| **Current State** | Recharts tooltips require hover which doesn't translate well to touch. Touch interaction shows tooltip briefly then disappears. |
| **Recommended Improvement** | On touch devices, show tooltip on tap and keep visible until next tap. Consider showing key data points as labels directly on chart. |
| **Affected Files** | All chart components |

### 6.5 Sidebar Overlay Touch Target

| Attribute | Details |
|-----------|---------|
| **Category** | Responsive |
| **Severity** | Medium |
| **Current State** | Mobile sidebar opens correctly but the backdrop overlay area to close could be better indicated. Users may not realize tapping outside closes menu. |
| **Recommended Improvement** | Add visual indicator or semi-transparent close hint on backdrop. Ensure close button in sidebar header is prominent. |
| **Affected Files** | `components/layout/Sidebar.tsx` |

### 6.6 Toast Container Position on Mobile

| Attribute | Details |
|-----------|---------|
| **Category** | Responsive |
| **Severity** | Low |
| **Current State** | Toasts appear at `top-4 right-4` which is fine on desktop but may overlap with mobile browser chrome or be dismissed accidentally. |
| **Recommended Improvement** | Position toasts at bottom on mobile to avoid system UI overlap. Increase padding from edges. |
| **Affected Files** | `components/ui/Toast.tsx` |

### 6.7 Dense Action Buttons on Mobile

| Attribute | Details |
|-----------|---------|
| **Category** | Responsive |
| **Severity** | Low |
| **Current State** | Some rows have multiple small icon buttons (Alerts actions) that are difficult to tap accurately on mobile. |
| **Recommended Improvement** | On mobile, consolidate actions into overflow menu (kebab icon) or make buttons larger with more spacing. |
| **Affected Files** | `pages/alerts/AlertsPage.tsx`, `components/ui/DataTable.tsx` |

---

## 7. Performance Concerns

### 7.1 Missing Skeleton Loaders

| Attribute | Details |
|-----------|---------|
| **Category** | Performance |
| **Severity** | High |
| **Current State** | Most pages show a simple "Loading..." text or spinner. Dashboard shows text "Loading dashboard...". No skeleton screens that match content layout. |
| **Recommended Improvement** | Create skeleton components that match final layout (e.g., `CardSkeleton`, `TableRowSkeleton`). Reduces perceived loading time and layout shift. |
| **Affected Files** | All pages with loading states, new `components/ui/Skeleton.tsx` |

### 7.2 Large List Rendering Without Virtualization

| Attribute | Details |
|-----------|---------|
| **Category** | Performance |
| **Severity** | Medium |
| **Current State** | Mod list, modpack list, and alert list render all items. With hundreds of mods, this could cause performance issues. DataTable implements pagination which helps. |
| **Recommended Improvement** | For very large lists, consider `react-virtual` or similar virtualization. For now, pagination is adequate but monitor performance. |
| **Affected Files** | `pages/mods/ModsPage.tsx`, `pages/modpacks/ModpacksPage.tsx` |

### 7.3 Chart Rendering on Initial Load

| Attribute | Details |
|-----------|---------|
| **Category** | Performance |
| **Severity** | Medium |
| **Current State** | Dashboard renders multiple charts immediately on load. Chart libraries can be heavy and cause layout shifts. |
| **Recommended Improvement** | Lazy load charts below the fold. Use placeholder during initial data fetch. Consider using lighter chart alternatives for simple metrics. |
| **Affected Files** | `pages/dashboard/DashboardPage.tsx`, chart components |

### 7.4 No Optimistic Updates

| Attribute | Details |
|-----------|---------|
| **Category** | Performance |
| **Severity** | Medium |
| **Current State** | Actions like marking alert as read, toggling mods, or deleting items wait for server response before updating UI. |
| **Recommended Improvement** | Implement optimistic updates for non-critical operations. Update UI immediately, rollback on error. TanStack Query supports this pattern. |
| **Affected Files** | `pages/alerts/AlertsPage.tsx`, various stores |

### 7.5 Bundle Size Not Optimized

| Attribute | Details |
|-----------|---------|
| **Category** | Performance |
| **Severity** | Low |
| **Current State** | Lazy loading is implemented for pages, but icon library (Lucide) and chart library (Recharts) may add significant bundle size. |
| **Recommended Improvement** | Analyze bundle with `vite-plugin-visualizer`. Tree-shake unused icons by using specific imports. Consider lighter chart alternatives for simple metrics. |
| **Affected Files** | `vite.config.ts`, all files importing icons |

### 7.6 Console Logs in Production

| Attribute | Details |
|-----------|---------|
| **Category** | Performance |
| **Severity** | Low |
| **Current State** | Logger utility exists but `console.log` and `console.error` are used directly in some places. May affect production performance minimally but clutters console. |
| **Recommended Improvement** | Replace all direct console calls with logger utility. Configure logger to be silent in production for non-error logs. |
| **Affected Files** | Various files with console statements |

---

## 8. Navigation & Information Architecture

### 8.1 Coming Soon Section in Navigation

| Attribute | Details |
|-----------|---------|
| **Category** | Navigation |
| **Severity** | Medium |
| **Current State** | Sidebar shows "Coming Soon" section with Players and Analytics links. These navigate to placeholder pages, which may confuse users expecting functionality. |
| **Recommended Improvement** | Either hide unimplemented features from navigation entirely, or add clear "(Coming Soon)" suffix to nav labels and show informative landing page. Consider release notes or roadmap link. |
| **Affected Files** | `components/layout/Sidebar.tsx` |

### 8.2 No 404 Page

| Attribute | Details |
|-----------|---------|
| **Category** | Navigation |
| **Severity** | High |
| **Current State** | Catch-all route redirects to dashboard: `<Route path="*" element={<Navigate to="/dashboard" replace />} />`. Users navigating to invalid URLs get silently redirected without explanation. |
| **Recommended Improvement** | Create a proper 404 Not Found page with helpful navigation options and search. Only redirect obvious typos (e.g., `/dashbaord`). |
| **Affected Files** | `App.tsx`, new `pages/NotFoundPage.tsx` |

### 8.3 Deep Linking Not User-Friendly

| Attribute | Details |
|-----------|---------|
| **Category** | Navigation |
| **Severity** | Medium |
| **Current State** | Routes like `/servers/:id/settings` work but don't show context. If linked directly, users may not know which server they're viewing without checking. |
| **Recommended Improvement** | Ensure page titles and breadcrumbs always show full context. Update document title dynamically to include server/resource name. |
| **Affected Files** | Nested page components |

### 8.4 Search Limited Scope

| Attribute | Details |
|-----------|---------|
| **Category** | Navigation |
| **Severity** | Low |
| **Current State** | Header search and Command Palette search across limited scope. Placeholder says "Search servers, mods, players..." but players aren't searchable with current implementation. |
| **Recommended Improvement** | Expand search to include all indexed content. Show categorized results (Servers, Mods, Pages, Settings). Add recent searches. |
| **Affected Files** | `components/ui/CommandPalette.tsx`, `components/layout/Header.tsx` |

---

## 9. Quick Wins

These improvements can be implemented quickly with minimal effort:

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Add `aria-label` to all icon-only buttons | Low | High |
| 2 | Replace `confirm()` with `ConfirmDialog` component | Low | Medium |
| 3 | Add skip navigation link | Low | High |
| 4 | Create consistent `PageHeader` component | Low | Medium |
| 5 | Add `role="main"` to main content wrapper | Low | Medium |
| 6 | Fix form label associations with `htmlFor` | Low | High |
| 7 | Add document title updates for nested pages | Low | Low |
| 8 | Add loading announcement with `aria-live` | Low | Medium |
| 9 | Standardize spacing with design tokens | Medium | Low |
| 10 | Add "Forgot Password" TODO to actual feature | Low | Critical |

---

## 10. Long-Term Improvements

These improvements require significant development effort:

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 1 | Implement Players page with full functionality | High | High |
| 2 | Implement Analytics page with charts and reports | High | High |
| 3 | Add comprehensive keyboard navigation | High | High |
| 4 | Create skeleton loader system | Medium | High |
| 5 | Implement first-run onboarding experience | High | Medium |
| 6 | Add virtualization for large lists | Medium | Medium |
| 7 | Create accessible chart alternatives | High | High |
| 8 | Implement optimistic updates across app | Medium | Medium |
| 9 | Build cron expression builder component | Medium | Low |
| 10 | Add player inventory viewer | Medium | Medium |

---

## 11. Priority Recommendations

### Immediate (This Sprint)
1. **Fix Forgot Password** - Critical missing feature for user management
2. **Add Skip Navigation** - Essential accessibility for keyboard users
3. **Add ARIA Labels** - Quick accessibility win with broad impact
4. **Fix Form Label Associations** - Accessibility compliance requirement

### Short-Term (Next 2-4 Weeks)
1. **Implement Players Page** - High-visibility feature with defined types
2. **Create Skeleton Loaders** - Improves perceived performance significantly
3. **Focus Trap for Modals** - Critical accessibility improvement
4. **Responsive Table Improvements** - Mobile usability enhancement

### Medium-Term (1-3 Months)
1. **Implement Analytics Page** - Valuable feature with types defined
2. **Add Onboarding Flow** - Improves new user experience
3. **Chart Accessibility** - Important for inclusive design
4. **Optimistic Updates** - Performance perception improvement

### Long-Term (3-6 Months)
1. **Full Keyboard Navigation** - Power user feature
2. **List Virtualization** - Scalability improvement
3. **Advanced Error Tracking** - Production stability
4. **Inventory Viewer** - Complete player management feature set

---

## Appendix: Files Analyzed

### Pages
- `pages/activity/ActivityLogPage.tsx`
- `pages/alerts/AlertsPage.tsx`
- `pages/analytics/AnalyticsPage.tsx`
- `pages/auth/LoginPage.tsx`
- `pages/automation/AutomationPage.tsx`
- `pages/automation/CreateTaskModal.tsx`
- `pages/automation/TaskGroupModal.tsx`
- `pages/backups/BackupsPage.tsx`
- `pages/bridge/BridgePage.tsx`
- `pages/console/ConsolePage.tsx`
- `pages/dashboard/DashboardPage.tsx`
- `pages/economy/EconomyPage.tsx`
- `pages/files/FileManagerPage.tsx`
- `pages/modpacks/ModpacksPage.tsx`
- `pages/mods/ModsPage.tsx`
- `pages/permissions/PermissionsPage.tsx`
- `pages/players/PlayerDetailPage.tsx`
- `pages/players/PlayersPage.tsx`
- `pages/servers/ServerDetailPage.tsx`
- `pages/servers/ServerSettingsPage.tsx`
- `pages/servers/ServerWorldsPage.tsx`
- `pages/servers/ServersPage.tsx`
- `pages/settings/SettingsPage.tsx`
- `pages/users/UsersPage.tsx`

### Components
- `components/auth/RequirePermission.tsx`
- `components/error/ErrorBoundary.tsx`
- `components/layout/DashboardLayout.tsx`
- `components/layout/Header.tsx`
- `components/layout/MobileHeader.tsx`
- `components/layout/Sidebar.tsx`
- `components/modals/CreateNetworkModal.tsx`
- `components/modals/CreateServerModal.tsx`
- `components/ui/Button.tsx`
- `components/ui/Card.tsx`
- `components/ui/CommandPalette.tsx`
- `components/ui/ConfirmDialog.tsx`
- `components/ui/DataTable.tsx`
- `components/ui/Input.tsx`
- `components/ui/Modal.tsx`
- `components/ui/SearchableSelect.tsx`
- `components/ui/Toast.tsx`

### Types
- `types/index.ts`
- `types/advanced.ts`
- `types/inventory.ts`

### Data
- `data/mockAdvanced.ts`
- `data/mockData.ts`
- `data/mockInventories.ts`

---

*Report generated as part of comprehensive frontend UI/UX analysis for the Hytale Server Manager project.*
