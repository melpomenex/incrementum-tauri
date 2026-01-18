# Change: Add Authentication UI

## Why
The backend authentication API (`/auth/login`, `/auth/register`, `/auth/verify`) and client functions (`login()`, `logout()`, `register()`) already exist, along with UI components (`LoginModal`, `SyncStatusIndicator`). However, these components are not integrated into the main application, making authentication inaccessible to users.

## What Changes
- Integrate `LoginModal` component into the main app layout
- Integrate `SyncStatusIndicator` with logout functionality into the main app layout
- Add authentication state management to the main app
- Enable login/logout UI in both web and Tauri desktop environments
- Add user menu with logout option when authenticated

## Impact
- Affected specs: New `authentication` capability
- Affected code:
  - `src/App.tsx` - Add auth state and modals
  - `src/components/layout/NewMainLayout.tsx` - Add sync status indicator
  - `src/lib/sync-client.ts` - Already implemented, will be used
  - `server/src/routes/auth.ts` - Already implemented, will be used
