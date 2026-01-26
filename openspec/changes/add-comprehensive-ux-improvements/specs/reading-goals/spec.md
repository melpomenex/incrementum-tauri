# reading-goals Specification

## ADDED Requirements

### Requirement: Reading Goal Configuration
The system SHALL allow users to configure reading goals with different types and targets.

#### Scenario: Creating a daily time goal
- **WHEN** a user sets a reading goal of "30 minutes per day"
- **THEN** the goal is stored in the database with type "daily_minutes" and target 30
- **AND** progress is tracked against actual reading time

#### Scenario: Creating a daily pages goal
- **WHEN** a user sets a reading goal of "20 pages per day"
- **THEN** the goal is stored with type "daily_pages" and target 20
- **AND** progress is tracked against pages read (for paged content)

#### Scenario: Creating a weekly goal
- **WHEN** a user sets a reading goal of "3 hours per week"
- **THEN** the goal is stored with type "weekly_minutes" and target 180
- **AND** progress accumulates across the week (Monday to Sunday)

### Requirement: Reading Goal Progress Tracking
The system SHALL track reading sessions and calculate progress toward configured goals.

#### Scenario: Tracking a reading session
- **WHEN** a user opens and reads a document
- **THEN** a reading session is created with start time
- **AND** when the document is closed, end time and duration are recorded
- **AND** the session contributes to goal progress

#### Scenario: Progress calculation for time goals
- **WHEN** a user has a daily 30-minute goal and reads for 15 minutes
- **THEN** progress is displayed as 50% complete
- **AND** remaining time shows "15 min left"

#### Scenario: Progress calculation for page goals
- **WHEN** a user has a daily 20-page goal and reads 15 pages
- **THEN** progress is displayed as 75% complete
- **AND** remaining shows "5 pages left"

### Requirement: Goal Progress Display
The system SHALL display goal progress in the dashboard and a dedicated goals view.

#### Scenario: Dashboard goal widget
- **WHEN** a user views the dashboard
- **THEN** a goal progress widget shows current goals
- **AND** progress bars visualize completion percentage
- **AND** a message indicates status (e.g., "Almost there!", "Goal achieved!")

#### Scenario: Daily goal completion notification
- **WHEN** a user completes their daily reading goal
- **THEN** a congratulatory notification is displayed
- **AND** a streak counter is incremented
- **AND** the achievement is recorded in statistics

#### Scenario: Weekly goal summary
- **WHEN** a week ends (Sunday midnight)
- **THEN** a summary shows weekly goal achievement
- **AND** the summary indicates total time/pages read
- **AND** a comparison to previous week is displayed

### Requirement: Reading Streaks
The system SHALL track and display reading streaks to encourage consistent reading habits.

#### Scenario: Daily streak calculation
- **WHEN** a user completes any reading activity on consecutive days
- **THEN** the streak counter increments each day
- **AND** the streak is displayed prominently in the UI
- **AND** a fire emoji or icon indicates the current streak

#### Scenario: Streak reset after gap day
- **WHEN** a user misses a day of reading
- **THEN** the streak counter resets to 1 on the next reading day
- **AND** a message shows "Starting a new streak!"

#### Scenario: Streak milestone celebrations
- **WHEN** a user reaches a streak milestone (7, 30, 100 days)
- **THEN** a special notification celebrates the achievement
- **AND** the milestone is recorded in the user's statistics
- **AND** a visual badge is displayed on the user profile

### Requirement: Streak Visualization
The system SHALL provide a heatmap visualization of reading activity.

#### Scenario: Activity heatmap display
- **WHEN** a user views the analytics page
- **THEN** a heatmap shows the past 365 days of reading activity
- **AND** each day is colored by activity level (none, low, medium, high)
- **AND** hovering over a day shows details (time spent, documents read)

#### Scenario: Streak timeline
- **WHEN** a user views their profile
- **THEN** a timeline displays current and historical streaks
- **AND** the longest streak is highlighted
- **AND** streak-free gaps are visually indicated

### Requirement: Goal Statistics and Insights
The system SHALL provide statistics and insights about reading goal achievement.

#### Scenario: Monthly goal achievement rate
- **WHEN** a user views monthly statistics
- **THEN** the percentage of days that met the daily goal is displayed
- **AND** a comparison to previous months is shown
- **AND** trends are visualized in a chart

#### Scenario: Best reading days
- **WHEN** a user views insights
- **THEN** the system identifies the user's most productive reading days
- **AND** suggestions are provided for maintaining consistency

#### Scenario: Goal completion predictions
- **WHEN** a user has an active weekly goal
- **THEN** the system predicts likelihood of completion based on current pace
- **AND** a message shows "On track" or "Behind schedule - read X more to catch up"

### Requirement: Achievement System
The system SHALL provide achievements for reading goals and streaks.

#### Scenario: First achievement unlock
- **WHEN** a user completes their first daily goal
- **THEN** an achievement "First Step" is unlocked
- **AND** a notification celebrates the achievement
- **AND** the achievement is displayed in the user's profile

#### Scenario: Streak achievements
- **WHEN** a user reaches streak milestones
- **THEN** achievements are unlocked: "Week Warrior" (7 days), "Monthly Master" (30 days)
- **AND** each achievement has a unique icon and description

#### Scenario: Achievement gallery
- **WHEN** a user views their profile
- **THEN** all unlocked achievements are displayed
- **AND** locked achievements are shown with unlock criteria
- **AND** achievements are grouped by category (Goals, Streaks, Milestones)

### Requirement: Goal Reminders
The system SHALL provide optional reminders to help users meet their reading goals.

#### Scenario: Daily goal reminder
- **WHEN** a user has a daily goal and hasn't read by the configured time
- **THEN** a gentle reminder notification is displayed
- **AND** the notification shows remaining goal and a "Start Reading" action

#### Scenario: End-of-day summary
- **WHEN** a user's configured end-of-day time is reached
- **THEN** a summary shows goal progress for the day
- **AND** if the goal is incomplete, a prompt to continue reading is shown

#### Scenario: Reminder configuration
- **WHEN** a user configures goal reminders in settings
- **THEN** they can set reminder time, frequency, and tone (gentle vs. firm)
- **AND** reminders can be disabled entirely if preferred
