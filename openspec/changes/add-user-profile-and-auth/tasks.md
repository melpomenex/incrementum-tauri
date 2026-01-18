# Tasks: Add User Profile, Auth & Sync Policy

## 1. Backend: Database & Auth
- [ ] 1.1 Add `subscription_tier` column to `users` table in `server`.
- [ ] 1.2 Update `server/src/routes/auth.ts` to return `subscription_tier` in login/register/verify.
- [ ] 1.3 Create `server/src/routes/oauth.ts` skeleton (endpoints for Google/Github).
- [ ] 1.4 Implement "Paid" check middleware for `/files` routes (block uploads if Free).

## 2. Frontend: Sync Client & Logic
- [ ] 2.1 Update `src/lib/sync-client.ts`:
    - [ ] Add `subscriptionTier` to user state.
    - [ ] Update `uploadFile` to check tier before attempting upload.
    - [ ] Update `pushChanges` to handle potential restrictions (if any, besides files).
- [ ] 2.2 Implement `mergeLocalDataOnLogin` logic in `sync-client.ts`.

## 3. Frontend: User Interface
- [ ] 3.1 Create `src/components/settings/UserProfilePanel.tsx`:
    - [ ] Display Email, Tier.
    - [ ] "Upgrade" button (stub).
    - [ ] Logout button.
- [ ] 3.2 Update `src/components/auth/LoginModal.tsx`:
    - [ ] Add "Continue as Guest" (if forced).
    - [ ] Add "Sign in with Google" button (links to backend).
- [ ] 3.3 Update `NewMainLayout.tsx` or `Settings` to include the Profile panel.
- [ ] 3.4 Add "Demo Mode" indicator in `SyncStatusIndicator`.

## 4. Integration & Verification
- [ ] 4.1 Verify "Demo Mode" allows local usage without nags.
- [ ] 4.2 Verify "Free User" can login but fails file upload with message.
- [ ] 4.3 Verify "Paid User" can upload files.
- [ ] 4.4 Verify Settings are preserved after login.
