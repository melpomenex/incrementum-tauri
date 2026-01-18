# Change: Add User Profile, Auth, and Sync Policy

## Why
Users need a way to create accounts, log in (via Email or OAuth), and manage their profile. The application requires a "Demo Mode" for potential users to try features locally. Furthermore, a distinction between Paid and Free users is needed to control server-side file storage, ensuring only paid users consume server storage resources while ensuring a smooth transition from Demo to Paid.

## What Changes
1.  **Authentication UI & Logic**:
    *   Integrate Login/Register UI (Email/Password).
    *   Add OAuth Login support (spec and foundational code).
    *   Implement "Demo Mode" (unauthenticated state) as the default.
2.  **User Profile**:
    *   Add a User Profile Settings page.
    *   Display User Status (Free/Paid).
3.  **Sync Policy Enforcement**:
    *   **Demo (Unauthenticated):** Local storage only.
    *   **Free Account:** Sync Settings (Preferences, Theme) only. No file sync.
    *   **Paid Account:** Full Sync (Settings + Files).
4.  **Data Migration**:
    *   Logic to preserve local settings/files when transitioning from Demo -> Account.

## Impact
- **New UI**: User Profile Page, Login/Signup Modals with OAuth buttons.
- **Backend**: Update `server/src/routes/auth.ts` (OAuth), `server/src/routes/sync.ts` (Quota/Paid check).
- **Client**: Update `sync-client.ts` to handle Paid/Free states and selective sync.
- **Database**: Add `is_paid` or `subscription_status` to `users` table.

## Key Constraints
- Default to Demo (no auth required to start).
- Paid users only for file sync.
- "Keep settings intact" upon login.
