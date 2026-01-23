# Tasks: Add Demo Mode with Onboarding Flow

## 1. Fix Browser Mode Persistence (Critical)

- [ ] 1.1 Fix `src/api/documents.ts` - Use `browserInvoke` for web mode instead of HTTP API
  - [ ] Update `getDocumentAuto` to use `browserInvoke` in web mode
  - [ ] Update `updateDocumentProgressAuto` to use `browserInvoke` in web mode
  - [ ] Remove misleading HTTP API fallback code
- [ ] 1.2 Verify YouTube position tracking works in browser mode
  - [ ] Test video position saves to IndexedDB
  - [ ] Test video position restores on page reload
  - [ ] Test progress persists across browser sessions

## 2. Demo Mode Implementation

- [ ] 2.1 Update `src/App.tsx` with auth state management
  - [ ] Add `isAuthenticated` state from `sync-client`
  - [ ] Set default to demo mode (unauthenticated)
  - [ ] Add `showOnboarding` state for first-time users
- [ ] 2.2 Create demo mode detection logic
  - [ ] Check `localStorage` for `hasSeenOnboarding` flag
  - [ ] Store first-visit timestamp for onboarding triggers
- [ ] 2.3 Update `src/components/sync/SyncStatusIndicator.tsx`
  - [ ] Show "Demo Mode" / "Local Only" when unauthenticated
  - [ ] Add "Sign In" button click handler
  - [ ] Show "Synced" status when authenticated

## 3. Onboarding Flow

- [ ] 3.1 Create `src/components/onboarding/WelcomeScreen.tsx`
  - [ ] Hero section with app description
  - [ ] Feature highlights (documents, extracts, spaced repetition)
  - [ ] "Get Started" button
- [ ] 3.2 Create `src/components/onboarding/FeatureTour.tsx`
  - [ ] Step-by-step guide to key features
  - [ ] Screenshots/animations for each feature
  - [ ] Skip/Continue options
- [ ] 3.3 Create `src/components/onboarding/SignupPrompt.tsx`
  - [ ] "Continue with Demo" vs "Create Account" choice
  - [ ] Benefits list for signing up
  - [ ] Integrate `LoginModal` component
- [ ] 3.4 Add onboarding completion logic
  - [ ] Set `hasSeenOnboarding` flag in `localStorage`
  - [ ] Optional: "Show tour again" in settings

## 4. Auth UI Integration

- [ ] 4.1 Integrate `LoginModal` into main app
  - [ ] Add login button to header when unauthenticated
  - [ ] Add user menu dropdown when authenticated
  - [ ] Handle login success callback
- [ ] 4.2 Create `src/components/auth/UserMenu.tsx`
  - [ ] Show user email
  - [ ] Logout button
  - [ ] Link to settings/profile
- [ ] 4.3 Update `src/components/layout/NewMainLayout.tsx`
  - [ ] Add sync status indicator to header
  - [ ] Add login button or user menu
  - [ ] Responsive mobile menu integration

## 5. Data Migration (Demo → Account)

- [ ] 5.1 Update `src/lib/sync-client.ts`
  - [ ] Add `migrateDemoDataToAccount()` function
  - [ ] Detect existing IndexedDB data on login
  - [ ] Push local data to server after successful authentication
- [ ] 5.2 Handle merge conflicts
  - [ ] MVP: Always prefer local data (demo user has been using app)
  - [ ] Future: Prompt user for merge strategy

## 6. Testing & Verification

- [ ] 6.1 Test demo mode functionality
  - [ ] Create document in demo mode
  - [ ] Create extract/learning item
  - [ ] Watch YouTube video, check position saves
  - [ ] Refresh page - verify all data persists
- [ ] 6.2 Test onboarding flow
  - [ ] Fresh user sees welcome screen
  - [ ] Can complete tour or skip
  - [ ] Can continue to demo or sign up
- [ ] 6.3 Test demo → account migration
  - [ ] Create data in demo mode
  - [ ] Sign up/new account
  - [ ] Verify local data syncs to server
  - [ ] Verify data persists after logout/login
- [ ] 6.4 Test auth flows
  - [ ] Login with existing account
  - [ ] Register new account
  - [ ] Logout - verify local demo mode returns
