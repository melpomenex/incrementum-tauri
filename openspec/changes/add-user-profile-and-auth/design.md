# Design: User Profile, Auth & Sync Policy

## Architecture

### 1. User Model & Subscription Status
We need to distinguish between Free and Paid users.
- **Database**: Add `subscription_tier` (ENUM: 'free', 'pro') to `users` table. Default to 'free'.
- **API**: `/auth/verify` and `/auth/login` responses will include `user.subscription_tier`.

### 2. Authentication Flow (Hybrid)
We support both Email/Password and OAuth (e.g., Google, GitHub).
- **Backend**:
    - Add `server/src/routes/oauth.ts` (or expand `auth.ts`).
    - Endpoints: `/auth/google`, `/auth/google/callback`.
    - OAuth Callback will find/create user, generate JWT, and redirect to Frontend with token (via URL param or Cookie).
- **Frontend**:
    - "Sign in with Google" button redirects to `API_URL/auth/google`.
    - Handle callback route `/auth/callback?token=...` to store token and update state.

### 3. Sync Policy Enforcement
The `SyncClient` needs to be aware of the user's tier.
- **Logic**:
    - `pushChanges()`:
        - If `Demo`: Do nothing (Local only).
        - If `Free`: Push `Settings`, `Extracts`? (Maybe just Settings). **Refined**: Prompt says "keep their files on server ... only if they are paid". Implies metadata/extracts might be fine, but *Files* (PDFs/EPUBs) are the heavy items.
        - **Decision**:
            - **Free**: Syncs `Documents` (Metadata), `Extracts`, `Settings`. **Blocks** `File` uploads (Binaries).
            - **Paid**: Syncs everything including `Files` (Binaries).
    - `uploadFile()`:
        - Check `user.subscription_tier`. If 'free', reject upload with "Upgrade required" error.

### 4. Data Migration (Demo -> Account)
When a user works in Demo mode, they accumulate local data (IndexedDB).
- **On Login/Signup**:
    - The `SyncClient` identifies existing local data.
    - It performs a "Merge" or "Initial Push" associating the local items with the new User ID.
    - **Conflict**: If the user logs into an *existing* account with data, prompt to "Merge" or "Replace". For MVP, "Merge" (Push local items to server) is safer.

## Database Changes
```sql
ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
-- potentially 'stripe_customer_id' later
```

## UI/UX
- **Demo Mode**: Default. Sync Icon shows "Local Only".
- **Settings**: New "Profile" tab.
    - Shows "Current Plan: Free/Pro".
    - "Upgrade" button (mocked or link to checkout).
- **Login Modal**: Add "Sign in with Google" button.

## Security
- OAuth tokens handled via server-side exchange.
- Frontend receives only the App JWT.
