# Design: Demo Mode with Onboarding Flow

## Context

Incrementum needs to work in three environments:
1. **Tauri Desktop**: Native app with local SQLite database
2. **Browser (Demo Mode)**: Web app with IndexedDB, unauthenticated
3. **Browser (Authenticated)**: Web app with cloud sync via backend API

The current code has auth components (`LoginModal`, `SyncStatusIndicator`) but they are not integrated. Additionally, the browser mode has a critical bug where `getDocumentAuto` and `updateDocumentProgressAuto` try to call a non-existent HTTP API instead of using the IndexedDB backend.

## Goals / Non-Goals

**Goals:**
- Make the app fully functional in browser demo mode using IndexedDB
- Provide clear onboarding for new users
- Integrate existing auth components
- Enable seamless demo → account transition with data preservation

**Non-Goals:**
- OAuth implementation (covered in `add-user-profile-and-auth`)
- Subscription tiers (free vs paid) - not needed for MVP
- Backend API changes - use existing endpoints

## Decisions

### 1. Persistence Layer Architecture

**Decision**: Use `browserInvoke` for all browser mode data operations

Currently, `getDocumentAuto` and `updateDocumentProgressAuto` have this flow:
```typescript
// Current (broken) flow in web mode
getDocumentAuto(id) {
  if (isWebMode()) {
    return getDocumentHttp(id);  // ❌ No server running!
  }
  return invokeCommand("get_document", { id });
}
```

**New flow**:
```typescript
// Fixed flow
getDocumentAuto(id) {
  if (isWebMode()) {
    return browserInvoke("get_document", { id });  // ✅ Uses IndexedDB
  }
  return invokeCommand("get_document", { id });
}
```

**Alternatives considered**:
1. Run a backend server in development → Adds complexity, doesn't work in production deployment
2. Use localStorage instead of IndexedDB → Not suitable for large data (PDFs, many documents)
3. Require auth for all web usage → Blocks users from trying the app

### 2. Onboarding Trigger Strategy

**Decision**: Use `localStorage` flag + first-visit detection

```typescript
const hasSeenOnboarding = localStorage.getItem('incrementum_onboarding_complete');
const isFirstVisit = !localStorage.getItem('incrementum_first_visit');
```

**Alternatives considered**:
1. Server-side tracking → Requires auth/beacon, not privacy-friendly
2. Always show onboarding → Annoying for return visitors
3. URL parameter trigger → Easy to miss, not automatic

### 3. Auth State Management

**Decision**: Keep auth state in `sync-client.ts`, expose via React context

The `sync-client` already has:
- `isAuthenticated()`
- `login()`, `logout()`, `register()`
- `subscribeAuthState()` callback

We'll create a React context in `App.tsx` that subscribes to sync-client's auth state and provides it to the tree.

### 4. Data Migration Strategy

**Decision**: "Local Wins" for demo → account migration

When a demo user creates an account:
1. Complete registration/login
2. On success, scan IndexedDB for any local data
3. Push all local data to server with new user ID
4. Clear "local" flag, now synced

**Conflict handling**: For MVP, always prefer local data since the demo user has been actively using the app.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| IndexedDB cleared by browser/user | Add "Export Data" feature for backup |
| Demo users never convert to accounts | Limit demo with gentle prompts, not hard blocks |
| Data migration conflicts | Use local data as source of truth for MVP |
| Onboarding perceived as annoying | Make it skippable, don't show it twice |

## Migration Plan

### Phase 1: Fix Persistence (Critical)
1. Update `src/api/documents.ts` to use `browserInvoke` in web mode
2. Test YouTube position tracking
3. Test document progress saves/loads

### Phase 2: Demo Mode
1. Update `App.tsx` with auth state
2. Update `SyncStatusIndicator` to show demo mode
3. Test all features work unauthenticated

### Phase 3: Onboarding
1. Create welcome screen components
2. Create tour components
3. Create signup prompt
4. Integrate with App.tsx

### Phase 4: Auth Integration
1. Add login button to header
2. Add user menu dropdown
3. Test login/logout flows
4. Test data migration

### Rollback Plan
- Each phase is independently reversible
- Old behavior can be restored by toggling `isWebMode()` checks
- Onboarding can be disabled via `localStorage` flag

## Open Questions

1. **Should we limit demo mode duration or features?**
   - Recommendation: No hard limits for MVP. Gentle prompts only.

2. **Should onboarding include interactive tasks?**
   - Recommendation: Keep it observational for MVP. Interactive tasks add complexity.

3. **How do we handle "logout" - return to demo or clear data?**
   - Recommendation: Return to demo mode, preserve local data.

4. **Should we show onboarding to users who signed up immediately?**
   - Recommendation: Show abbreviated onboarding (skip "why sign up" section).
