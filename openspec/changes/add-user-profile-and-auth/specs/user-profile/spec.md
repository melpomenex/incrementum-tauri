# Spec: User Profile

## ADDED Requirements

### Requirement: Profile Management
The system SHALL provide a dedicated interface for managing the user profile.

#### Scenario: Accessing Profile
- **GIVEN** the user is authenticated
- **WHEN** they navigate to Settings > Profile
- **THEN** they SHALL see their email address and current subscription tier

#### Scenario: Subscription Status Display
- **GIVEN** the user is on the "Free" tier
- **THEN** the profile SHALL display "Free Plan"
- **AND** an "Upgrade" option SHALL be visible (linking to payment flow or placeholder)

- **GIVEN** the user is on the "Paid" tier
- **THEN** the profile SHALL display "Pro Plan" (or equivalent)

### Requirement: Account Actions
The system SHALL provide account-level actions.

#### Scenario: Logout
- **WHEN** the user clicks the "Log out" button in the profile settings
- **THEN** the system SHALL execute the logout flow (see `auth-flow/spec.md`)
