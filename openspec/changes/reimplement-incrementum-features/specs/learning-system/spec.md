# Learning System Specification

## MODIFIED Requirements

### Requirement: Spaced Repetition Algorithms
The application MUST implement three spaced repetition algorithms (FSRS 5.2, SM2, SuperMemo) with full parameter configuration.

#### Scenario: Select FSRS algorithm
**Given** the user is in Algorithm settings
**When** they select FSRS as the active algorithm
**Then** all new learning items should use FSRS 5.2 for scheduling
**And** FSRS-specific parameters should be displayed
**And** existing items should continue with their current algorithm

#### Scenario: Configure FSRS parameters
**Given** FSRS is the active algorithm
**When** the user adjusts desired retention or weight parameters
**Then** new reviews should calculate intervals using the new parameters
**And** the parameters should persist across sessions

#### Scenario: Use FSRS for learning items
**Given** FSRS is the active algorithm
**When** a learning item (flashcard or cloze) is scheduled
**Then** the next review interval should be computed using FSRS 5.2 parameters

#### Scenario: Select SM2 algorithm
**Given** the user is in Algorithm settings
**When** they select SM2 as the active algorithm
**Then** all new learning items should use SuperMemo 2 scheduling
**And** SM2 parameters (easiness, interval modifier) should be configurable

#### Scenario: Use SuperMemo algorithm
**Given** the user selects the SuperMemo algorithm
**When** they configure the forgetting index
**Then** items should be scheduled based on the configured forgetting index
**And** category-specific forgetting indexes should be supported

## ADDED Requirements

### Requirement: Learning Queue Management
The application MUST provide comprehensive queue management with filtering, sorting, and prioritization.

#### Scenario: View learning queue
**Given** the user opens the Learning tab
**When** the queue loads
**Then** it should display all due learning items
**And** show item type (flashcard/cloze), difficulty, and due date
**And** sort by due date by default

#### Scenario: Filter queue by category
**Given** the learning queue is displayed
**When** the user selects a category filter
**Then** only items from that category should be shown
**And** the filter should persist

#### Scenario: Sort queue by priority
**Given** the learning queue is displayed
**When** the user sorts by priority
**Then** items should be reordered by priority rating
**And** higher priority items should appear first

#### Scenario: Search queue
**Given** the learning queue is displayed
**When** the user enters a search term
**Then** items matching the term should be shown
**And** search should check question, answer, and tags

### Requirement: Document Queue Priority Scoring
The application MUST compute a document queue priority score for the Document View queue as the average of the priority slider value (0-100) and a normalized rating value, where rating 1-4 maps linearly to 0-100.

#### Scenario: Rate document affects priority score
**Given** a document is in the queue with a priority slider value
**When** the user rates the document from 1 to 4
**Then** the queue priority score should update using the rating and slider values
**And** higher ratings should increase the priority score

#### Scenario: Adjust priority slider affects priority score
**Given** a document is in the queue with a rating value
**When** the user sets the priority slider to a higher value
**Then** the queue priority score should increase
**And** the queue ordering should update to reflect the new score

### Requirement: Document Queue Ordering
The application MUST order the Document View queue by the combined priority score.

#### Scenario: Order queue by combined score
**Given** multiple documents have priority scores
**When** the queue is displayed
**Then** items with higher combined scores should appear before lower scores

### Requirement: Review Session
The application MUST provide an interactive review interface with rating buttons and session statistics.

#### Scenario: Start review session
**Given** there are due items in the queue
**When** the user clicks "Start Review"
**Then** a review session should begin with the first due item
**And** show session progress (X of Y items)

#### Scenario: Rate flashcard review
**Given** a flashcard is displayed in review
**When** the user clicks a rating button (Again/Hard/Good/Easy)
**Then** the item should be scheduled based on the rating
**And** the algorithm should update the item's parameters
**And** the next card should be displayed

#### Scenario: Show card answer
**Given** a flashcard question is displayed
**When** the user clicks "Show Answer" or presses Space
**Then** the answer should be revealed with animation
**And** rating buttons should become available
**And** response time should be tracked

#### Scenario: Complete review session
**Given** a review session is in progress
**When** all due items have been reviewed
**Then** a session summary should be displayed
**And** show statistics (cards reviewed, average time, breakdown by rating)
**And** offer to continue with more cards or close

#### Scenario: Handle cloze deletion review
**Given** a cloze card is displayed
**When** the user types their answer
**Then** the system should check against the hidden answer
**And** reveal the correct answer on submission
**And** allow rating as with flashcards

### Requirement: SMART Priority Scoring
The application MUST implement ML-based priority scoring for queue optimization.

#### Scenario: Enable SMART scoring
**Given** the user enables SMART priority scoring in settings
**When** they configure learning style and weights
**Then** the queue should reorder based on predicted learning value
**And** use the configured weight factors (behavior, learning, content, freshness, pattern)

#### Scenario: Train SMART model
**Given** the user has completed review sessions
**When** sufficient review data is collected
**Then** the SMART model should train on the data
**And** improve prediction accuracy over time
**And** show model confidence scores

#### Scenario: Use adaptive weights
**Given** adaptive weights are enabled
**When** the model detects patterns in user behavior
**Then** it should automatically adjust weight factors
**And** optimize for user's learning patterns

### Requirement: Interleaved Queue Mode
The application MUST support interleaved new and review cards.

#### Scenario: Enable interleaved mode
**Given** the user enables interleaved queue mode
**When** they set the ratio to 20% new items
**Then** the queue should show 20% new cards and 80% review cards
**And** maintain this ratio throughout the session

#### Scenario: Adjust interleaved ratio
**Given** interleaved mode is enabled
**When** the user changes the ratio to 50%
**Then** the queue should rebalance to 50% new, 50% review
**And** persist the new ratio

### Requirement: Statistics and Analytics
The application MUST provide comprehensive learning statistics and visualizations.

#### Scenario: View dashboard statistics
**Given** the user opens the dashboard
**When** the dashboard loads
**Then** it should show stat cards with key metrics
**And** display total cards, cards due, retention rate
**And** show progress charts for the last 30 days

#### Scenario: View retention chart
**Given** the user opens the statistics view
**When** they view the retention chart
**Then** it should display retention rate over time
**And** show trend lines for different algorithms
**And** allow filtering by category or time period

#### Scenario: View upcoming reviews
**Given** the user opens the upcoming view
**When** the view loads
**Then** it should show a calendar of due items
**And** highlight days with heavy review load
**And** show count of items due each day

#### Scenario: View flashcard statistics
**Given** the user opens flashcard stats
**When** the view loads
**Then** it should show card-specific statistics
**And** display total reviews, average interval, ease factor
**And** allow sorting and filtering

### Requirement: Custom Intervals and Scheduling
The application MUST support custom scheduling options.

#### Scenario: Set custom interval
**Given** a learning item exists
**When** the user selects "Custom Interval"
**And** specifies N days
**Then** the item should be due in N days
**And** skip algorithm calculation

#### Scenario: Set priority with review date
**Given** a queue item exists
**When** the user sets priority to 5
**And** selects "Advance to next"
**Then** the item priority should update
**And** the item should move to the next review slot
**And** the current item should be marked complete

### Requirement: Queue Operations
The application MUST support batch operations on queue items.

#### Scenario: Batch mark complete
**Given** multiple items are selected
**When** the user clicks "Batch Mark Complete"
**Then** all selected items should be marked as reviewed
**And** scheduled according to algorithm
**And** progress should be shown

#### Scenario: Batch set priority
**Given** multiple items are selected
**When** the user sets priority to N
**Then** all selected items should have priority N
**And** the queue should reorder accordingly

#### Scenario: Batch delete
**Given** multiple items are selected
**When** the user clicks "Batch Delete"
**Then** a confirmation dialog should appear
**And** all selected items should be deleted on confirmation
**And** the database should be updated

## Implementation Notes

### Algorithm Implementation
```typescript
// Algorithm interface
interface SpacedRepetitionAlgorithm {
  name: 'fsrs' | 'sm2' | 'supermemo';
  calculateNextReview(item: LearningItem, rating: number): ScheduledReview;
  updateParameters(item: LearningItem, rating: number): LearningItem;
  getParameters(): AlgorithmParameters;
}
```

### FSRS Implementation
- Port FSRS-rs algorithm to TypeScript or use via WASM
- Support all FSRS parameters (stability, difficulty, retention)
- Implement short-term and long-term scheduling

### SM2 Implementation
- Use standard SuperMemo 2 formula
- Track easiness factor (EF)
- Implement interval calculation: I(1) = 1, I(n) = I(n-1) * EF

### Review Session State
```typescript
interface ReviewSession {
  id: string;
  items: LearningItem[];
  currentIndex: number;
  completed: number;
  ratings: Map<number, number>;
  startTime: Date;
  lastRatingTime?: Date;
}
```

### Performance Considerations
- Pre-fetch next card while reviewing current card
- Use IndexedDB for offline queue access
- Implement virtual scrolling for large queues
- Cache algorithm calculations

## Cross-References

- **Document Management**: Extracts are converted to learning items
- **Settings**: Algorithm configuration in settings
- **Statistics**: Review data contributes to statistics
- **Queue**: Items are managed in learning queue
