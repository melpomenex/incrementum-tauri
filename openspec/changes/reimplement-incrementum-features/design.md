# Design Document: Incrementum Feature Reimplementation

## Architecture Overview

### Technology Stack

#### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Desktop**: Tauri 2.0+
- **Styling**: Tailwind CSS + emotion/styled-components for theming
- **State Management**: Zustand (primary) + Jotai (fine-grained)
- **Routing**: React Router v7
- **Graph Visualization**: React Flow (2D) + Three.js (3D)
- **Charts**: Recharts or Chart.js
- **Forms**: React Hook Form + Zod validation

#### Backend (Rust)
- **Framework**: Tauri 2.0
- **Database**: SQLite (via rusqlite or sqlx)
- **Async Runtime**: Tokio
- **HTTP Client**: reqwest
- **File System**: tokio::fs
- **Serialization**: serde

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Router     │  │   Stores     │  │   Themes     │  │
│  │  (React      │  │  (Zustand/   │  │  (Context/   │  │
│  │   Router)    │  │   Jotai)     │  │   CSS vars)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │          │
│         └──────────────────┼──────────────────┘          │
│                            ▼                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Component Layer                      │  │
│  │  Documents | Learning | Graph | Settings | ...   │  │
│  └──────────────────────────────────────────────────┘  │
│                            │                             │
└────────────────────────────┼─────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Tauri IPC     │
                    │   (invoke/      │
                    │    events)      │
                    └────────┬────────┘
                             │
┌────────────────────────────┼─────────────────────────────┐
│                            ▼                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Rust Backend                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │ Database │  │  File    │  │ Network  │       │  │
│  │  │  Layer   │  │  System  │  │  Client  │       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  │                                                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │  OCR     │  │  Anki    │  │ Obsidian │       │  │
│  │  │ Service  │  │  Sync    │  │  Sync    │       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Theme System Design

### QSS to CSS Migration Strategy

#### Color System
```typescript
// Theme type definition
interface Theme {
  name: string;
  variant: 'light' | 'dark';
  colors: {
    // Base colors
    background: string;
    surface: string;
    surfaceVariant: string;
    primary: string;
    primaryContainer: string;
    onPrimary: string;
    onSurface: string;
    outline: string;

    // Functional colors
    error: string;
    errorContainer: string;
    onError: string;
    success: string;
    warning: string;

    // Component-specific
    toolbar: string;
    sidebar: string;
    card: string;
    input: string;
    border: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      medium: string;
      large: string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
}
```

#### Theme Provider Architecture
```typescript
// ThemeContext.tsx
interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: Theme[];
  customThemes: Theme[];
  addCustomTheme: (theme: Theme) => void;
  removeCustomTheme: (id: string) => void;
}

export const ThemeProvider: React.FC = () => {
  // Tauri store for persistence
  // CSS variable injection
  // Theme switching logic
}
```

#### CSS Variable Injection
```css
/* Runtime theme application */
:root {
  --color-background: #141218;
  --color-surface: #1D1B20;
  --color-primary: #D0BCFF;
  --color-outline: #49454F;
  /* ... */
}

[data-theme="light"] {
  --color-background: #FAFAFA;
  /* ... */
}
```

### Theme Picker Design
- **Layout**: Grid of theme previews with color swatches
- **Live Preview**: Apply theme immediately when selected
- **Customization**: Accent color picker, font size adjustment
- **Import/Export**: JSON-based theme format
- **Presets**: Quick access to popular themes

## Settings Architecture

### Settings Schema
```typescript
interface Settings {
  // General
  general: {
    autoSaveMinutes: number;
    maxRecentDocuments: number;
    defaultCategory: string;
    showStatsOnStartup: boolean;
    restoreSession: boolean;
  };

  // Interface
  interface: {
    theme: string;
    denseMode: boolean;
    toolbarIconSize: number;
    showStatistics: boolean;
    hintMode: boolean;
    hintModePersistent: boolean;
  };

  // Documents
  documents: {
    autoSegment: boolean;
    autoHighlight: boolean;
    segmentSize: number;
    segmentStrategy: 'semantic' | 'paragraph' | 'fixed' | 'smart';
    highlightColor: number; // 0-4 for 5 colors
    ocr: {
      enabled: boolean;
      provider: 'google' | 'aws' | 'mistral' | 'mathpix' | 'gpt4o' | 'claude' | 'local';
      apiKey: string;
      preferLocal: boolean;
    };
    mathOcr: {
      enabled: boolean;
      command: string;
      args: string;
      modelDir: string;
      modelUrl: string;
    };
  };

  // Learning
  learning: {
    minInterval: number;
    maxInterval: number;
    retention: number;
    intervalModifier: number;
    chunkSchedulingDefault: string;
    interleavedQueueMode: boolean;
    interleavedQueueRatio: number;
  };

  // Algorithm
  algorithm: {
    type: 'fsrs' | 'sm2' | 'supermemo';
    desiredRetention: number;
    maxRetention: number;
    weightsHalfLife: number;
    forgettingCurveHalfLife: number;
    stability: number;
    difficulty: number;
    globalForgettingIndex: number;
    useCategoryForgettingIndex: boolean;
    categoryForgettingIndexes: Record<string, number>;
  };

  // ... (all other categories)
}
```

### Settings Store Design
```typescript
// stores/settings.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

interface SettingsStore {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: () => Promise<string>;
  importSettings: (json: string) => Promise<void>;
  validateSettings: (settings: Settings) => boolean;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      updateSettings: async (updates) => {
        // Validate
        // Save to Tauri store
        // Emit events for dependent systems
      },
      // ...
    }),
    {
      name: 'incrementum-settings',
      storage: {
        getItem: (name) => invoke('settings_load', { name }),
        setItem: (name, value) => invoke('settings_save', { name, value }),
      },
    }
  )
);
```

## Component Architecture

### Component Hierarchy

```
App
├── Router
│   ├── Dashboard
│   │   ├── StatCards
│   │   ├── ProgressCards
│   │   └── QuickActions
│   ├── Documents
│   │   ├── DocumentList
│   │   ├── DocumentViewer
│   │   │   ├── Toolbar
│   │   │   ├── ContentArea
│   │   │   └── Sidebar
│   │   │       ├── ExtractsTree
│   │   │       └── TableOfContents
│   │   └── DocumentControls
│   ├── Learning
│   │   ├── QueueList
│   │   ├── ReviewSession
│   │   │   ├── Flashcard
│   │   │   └── ReviewControls
│   │   └── Statistics
│   ├── Graph
│   │   ├── Graph2D
│   │   └── Graph3D
│   ├── Settings
│   │   ├── SettingsLayout
│   │   └── SettingsTabs (20+ tabs)
│   └── Integrations
│       ├── RSS
│       ├── Anki
│       └── Obsidian
└── Global Components
    ├── CommandPalette
    ├── KeybindingDialog
    ├── ThemePicker
    └── NotificationSystem
```

### Component Design Patterns

#### Smart Components (with state)
```typescript
// DocumentViewer.tsx
export const DocumentViewer: React.FC = () => {
  const document = useDocumentStore(state => state.currentDocument);
  const extracts = useExtractStore(state => state.extracts);
  const { createExtract, updateExtract } = useExtractActions();

  return (
    <DocumentViewerLayout
      document={document}
      extracts={extracts}
      onExtractCreate={createExtract}
      onExtractUpdate={updateExtract}
    />
  );
};
```

#### Dumb Components (presentational)
```typescript
// DocumentViewerLayout.tsx
interface Props {
  document: Document;
  extracts: Extract[];
  onExtractCreate: (selection: TextSelection) => void;
  onExtractUpdate: (extract: Extract) => void;
}

export const DocumentViewerLayout: React.FC<Props> = ({
  document,
  extracts,
  onExtractCreate,
  onExtractUpdate
}) => {
  // Only presentation logic
  return (/* JSX */);
};
```

## IPC Layer Design

### Command Pattern
```rust
// Rust backend commands
#[tauri::command]
async fn import_document(path: String) -> Result<Document, String> {
    // File processing
    // Metadata extraction
    // Database insertion
}

#[tauri::command]
async fn get_queue_items(filter: QueueFilter) -> Result<Vec<QueueItem>, String> {
    // Database query
    // Filtering logic
}

#[tauri::command]
async fn create_flashcard(item: FlashcardInput) -> Result<Flashcard, String> {
    // Validation
    // Algorithm calculation
    // Database insertion
}
```

### Event System
```typescript
// Frontend event listeners
import { listen } from '@tauri-apps/api/event';

useEffect(() => {
  const unlisten = listen<ReviewDueEvent>('review:due', (event) => {
    showNotification(event.payload);
  });

  return () => { unlisten.then(fn => fn()); };
}, []);
```

### Async Operations
```typescript
// Async service layer
class DocumentService {
  async import(path: string): Promise<Document> {
    return invoke<Document>('import_document', { path });
  }

  async getExtracts(documentId: number): Promise<Extract[]> {
    return invoke<Extract[]>('get_extracts', { documentId });
  }
}
```

## Data Models

### Database Schema
```sql
-- Documents
CREATE TABLE documents (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  path TEXT,
  type TEXT NOT NULL, -- 'pdf', 'epub', 'arxiv', etc.
  content_hash TEXT,
  metadata TEXT, -- JSON
  created_at DATETIME,
  updated_at DATETIME
);

-- Extracts
CREATE TABLE extracts (
  id INTEGER PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id),
  content TEXT NOT NULL,
  position INTEGER,
  highlight_color INTEGER,
  tags TEXT,
  created_at DATETIME
);

-- Learning Items
CREATE TABLE learning_items (
  id INTEGER PRIMARY KEY,
  extract_id INTEGER REFERENCES extracts(id),
  type TEXT NOT NULL, -- 'flashcard', 'cloze'
  question TEXT,
  answer TEXT,
  algorithm TEXT,
  stability REAL,
  difficulty REAL,
  due_date DATETIME,
  interval INTEGER,
  easiness REAL
);

-- Reviews
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY,
  learning_item_id INTEGER REFERENCES learning_items(id),
  rating INTEGER NOT NULL,
  review_time DATETIME,
  time_spent INTEGER, -- milliseconds
  state TEXT, -- 'learning', 'review', 'relearning'
  algorithm_data TEXT -- JSON
);
```

### TypeScript Interfaces
```typescript
interface Document {
  id: number;
  title: string;
  path?: string;
  type: DocumentType;
  contentHash?: string;
  metadata: {
    author?: string;
    year?: number;
    tags?: string[];
    category?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Extract {
  id: number;
  documentId: number;
  content: string;
  position?: number;
  highlightColor: 0 | 1 | 2 | 3 | 4;
  tags: string[];
  createdAt: Date;
}

interface LearningItem {
  id: number;
  extractId?: number;
  type: 'flashcard' | 'cloze';
  question: string;
  answer: string;
  algorithm: 'fsrs' | 'sm2' | 'supermemo';
  stability: number;
  difficulty: number;
  dueDate: Date;
  interval: number;
  easiness: number;
}
```

## Performance Considerations

### Virtual Scrolling
- Use `react-window` or `react-virtuoso` for large lists
- Implement for: queue items, extracts tree, RSS feeds
- Dynamic item sizing for variable content

### Lazy Loading
- Code split by route
- Lazy load heavy components (graph viewer, PDF viewer)
- Dynamic imports for integration services

### Caching Strategy
- Cache document content after first load
- Cache OCR results
- Cache graph layout calculations
- Implement stale-while-revalidate for API calls

### Database Optimization
- Create indexes on frequently queried columns
- Use prepared statements
- Implement connection pooling
- Batch operations where possible

## Security Considerations

### API Keys
- Store in Tauri's secure store (keychain on macOS, Credential Manager on Windows)
- Never expose in frontend logs
- Allow user to manage keys through settings

### File System Access
- Validate all file paths
- Sanitize filenames
- Limit file sizes
- Use temporary directories for processing

### Network Security
- Validate and sanitize all API inputs
- Implement rate limiting for external APIs
- Use HTTPS for all network requests
- Validate SSL certificates

## Accessibility

### Keyboard Navigation
- Full keyboard support for all features
- Visible focus indicators
- Skip navigation links
- Logical tab order

### Screen Reader Support
- Semantic HTML
- ARIA labels and roles
- Alt text for images
- Screen reader-only text for context

### Visual Accessibility
- High contrast mode support
- Respect system font size preferences
- Color-blind friendly palettes
- Animation respect prefers-reduced-motion

## Testing Strategy

### Unit Tests
- Algorithm implementations (FSRS, SM2)
- Utility functions
- Data transformation logic
- Settings validation

### Integration Tests
- IPC layer
- Database operations
- File I/O operations
- API integrations

### E2E Tests
- Critical user flows:
  - Import document and create flashcard
  - Review session complete cycle
  - Theme switching
  - Settings change and persistence

## Migration Strategy

### Data Migration
- Provide migration tool from Qt SQLite database
- Validate data integrity after migration
- Allow rollback if migration fails
- Migrate in stages to minimize downtime

### Settings Migration
- Parse QSettings INI files
- Map to new settings schema
- Alert user to unsupported settings
- Preserve keyboard shortcuts

### Theme Migration
- Parse QSS files
- Extract color schemes
- Convert to CSS variables
- Create theme JSON files
- Manual refinement for complex themes
