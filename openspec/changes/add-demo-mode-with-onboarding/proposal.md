# Change: Add Demo Mode with Onboarding Flow

## Why

Users currently cannot use Incrementum effectively in web/browser mode because:
1. **No persistent storage**: YouTube video positions, document progress, and other user data is lost on page refresh
2. **No clear path to authentication**: Existing auth components exist but are not integrated
3. **No onboarding**: New users don't understand the value proposition or how to get started

Users need a functional "demo mode" that works immediately in the browser, with a smooth onboarding flow that guides them toward creating an account for cloud sync benefits.

## What Changes

1. **Demo Mode (Default State)**
   - App starts in unauthenticated "demo mode" using IndexedDB for persistence
   - All core features work locally: documents, extracts, learning items, YouTube position tracking
   - Clear visual indicators showing "Local Mode" with gentle prompts to sign up

2. **Onboarding Flow**
   - First-time user welcome screen explaining the app
   - Guided tour of key features
   - Clear value prop for signing up (sync across devices, backup, etc.)
   - "Continue with Demo" vs "Create Account" choice

3. **Auth Integration**
   - Login/Register modal accessible from header
   - Sync status indicator showing current state
   - User menu when authenticated
   - Seamless data migration from demo → account (preserves local data)

4. **Browser Mode Persistence Fix**
   - Fix `getDocumentAuto`/`updateDocumentProgressAuto` to use IndexedDB instead of non-existent HTTP API
   - Ensure YouTube position tracking works in browser mode

## Impact

- **Affected specs**: New `demo-mode`, `onboarding`, and `authentication` capabilities
- **Affected code**:
  - `src/api/documents.ts` - Fix browser mode persistence
  - `src/App.tsx` - Add auth state and onboarding flow
  - `src/components/layout/NewMainLayout.tsx` - Add sync indicator and user menu
  - `src/components/onboarding/` - New onboarding components
  - `src/lib/sync-client.ts` - Handle demo → account data migration

## Related Changes

- Builds upon existing `add-user-profile-and-auth` proposal (broader auth/sync policy work)
- Complements `add-auth-ui` proposal (auth component integration)
- Fixes issue identified in YouTube position tracking investigation
