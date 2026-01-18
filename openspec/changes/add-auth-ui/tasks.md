## 1. Prepare Authentication State Management
- [x] 1.1 Create auth store or add auth state to App.tsx
- [x] 1.2 Add `isAuthenticated` state to track login status
- [x] 1.3 Add `user` state to store user info (email, id)
- [x] 1.4 Add `showLoginModal` state to control modal visibility
- [x] 1.5 Add `handleLogin` function to call sync-client.login()
- [x] 1.6 Add `handleRegister` function to call sync-client.register()
- [x] 1.7 Add `handleLogout` function to call sync-client.logout()
- [x] 1.8 Add effect to check authentication status on app load

## 2. Integrate Login Modal into App
- [x] 2.1 Import LoginModal component in App.tsx
- [x] 2.2 Add LoginModal to App component with proper props
- [x] 2.3 Wire up onAuthenticated callback to update auth state
- [x] 2.4 Wire up onClose callback to close modal
- [x] 2.5 Test login modal open/close functionality

## 3. Integrate Sync Status Indicator into Layout
- [x] 3.1 Import SyncStatusIndicator in NewMainLayout.tsx
- [x] 3.2 Add SyncStatusIndicator to layout header or toolbar
- [x] 3.3 Pass authentication state as props if needed
- [x] 3.4 Test sync status indicator display for unauthenticated state
- [x] 3.5 Test sync status indicator display for authenticated state

## 4. Add Login Trigger Button
- [x] 4.1 Add "Sign in" button in layout when user is not authenticated
- [x] 4.2 Wire up button click to open login modal
- [x] 4.3 Style button to match app design system
- [x] 4.4 Position button in accessible location (header/toolbar)

## 5. Implement User Menu for Authenticated Users
- [x] 5.1 Add user avatar display when authenticated
- [x] 5.2 Add dropdown menu on avatar hover/click
- [x] 5.3 Display user email in menu
- [x] 5.4 Add "Sign out" button in menu
- [x] 5.5 Wire up logout button to handleLogout function
- [x] 5.6 Style menu to match app design system

## 6. Enable Authentication in Tauri Desktop
- [x] 6.1 Remove or modify isTauri() check in SyncStatusIndicator
- [x] 6.2 Test authentication flow in Tauri environment
- [x] 6.3 Verify localStorage persistence works in Tauri
- [x] 6.4 Ensure API requests work from Tauri client

## 7. Add Error Handling
- [x] 7.1 Display error messages from login/register failures
- [x] 7.2 Handle network errors gracefully
- [x] 7.3 Show loading states during authentication
- [x] 7.4 Clear errors when modal closes or user retries

## 8. Testing
- [ ] 8.1 Test login flow with valid credentials
- [ ] 8.2 Test login flow with invalid credentials
- [ ] 8.3 Test registration flow with valid data
- [ ] 8.4 Test registration flow with mismatched passwords
- [ ] 8.5 Test logout functionality
- [ ] 8.6 Test auth state persistence across page reload
- [ ] 8.7 Test sync status indicator in all states
- [ ] 8.8 Test in both web and Tauri environments
