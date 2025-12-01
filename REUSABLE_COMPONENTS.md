# Reusable Components (November 2025)

The previous "composites" library had drifted from reality—most of those files were never rendered after the feature-folder migration. During the latest cleanup we deleted the dead code and colocated the only domain-specific piece (the worker row) with the workers screens. This document reflects the components that are actually used today so new contributors do not chase ghosts.

## Active shared building blocks

| Area | File | Why it exists |
| --- | --- | --- |
| Layout | `src/components/layout/AppHeader.tsx` | Consistent header with optional back/close/transparent states. |
| Layout | `src/components/layout/Screen.tsx` | Safe-area + keyboard aware wrapper that also shows the offline indicator. |
| Primitives | `src/components/primitives/Button.tsx` | The only button implementation (solid/outline/destructive). |
| Primitives | `src/components/primitives/Card.tsx` | Shared card container with padding, radius, and elevation. |
| Primitives | `src/components/primitives/TextField.tsx` | Themed text input with label, helper text, and error styles. |
| Feedback | `src/components/feedback/StatusPill.tsx` | Short badge used to highlight DUE / OVERDUE states. |
| System | `src/components/system/OfflineIndicator.tsx` | Surfaces connectivity + SyncProvider state globally. |
| System | `src/components/system/NotificationDaemon.tsx` | Background subscription feeding salary alerts. |
| Workers feature | `src/screens/workers/components/WorkerListItem.tsx` | Domain-specific row that renders avatar, pill, and salary summary. |

## Removed / archived files

The following files were removed because nothing imported them anymore:

- `src/components/composites/{ResetPasswordButton, SettingRow, StatCard}`
- `src/components/feedback/{EmptyState, LoadingState}`
- `src/components/layout/SectionHeader.tsx`
- `src/components/primitives/FAB.tsx`
- `src/components/dashboard/{DashboardKPIs, KPICard}`
- `src/utils/{date, validation}.ts`
- `src/services/stats.ts`
- `src/screens/SettingsScreen.tsx` (legacy duplicate)

If a future feature needs any of those UX patterns again, build the component next to the feature that owns it. Only promote something into `src/components` after it is shared by multiple parts of the app.

## Folder snapshot

```
src/
├── components/
│   ├── admin/AdminGate.tsx
│   ├── feedback/StatusPill.tsx
│   ├── layout/{AppHeader,Screen}.tsx
│   ├── primitives/{Button,Card,TextField}.tsx
│   └── system/{NotificationDaemon,OfflineIndicator}.tsx
├── screens/
│   ├── workers/
│   │   ├── components/WorkerListItem.tsx
│   │   └── *.tsx (feature screens)
│   └── other feature folders…
└── context/, navigation/, services/, theme/, utils/
```

## Guidance going forward

1. **Co-locate feature UI.** Domain-specific pieces (like WorkerListItem) belong inside `screens/<feature>/components`. Shared folders should only host components that are rendered across features.
2. **Delete unused code quickly.** If a file has no imports, remove it instead of leaving "maybe" components around.
3. **Keep docs in sync.** When you add or delete a reusable component, update this markdown so the tree stays trustworthy.
