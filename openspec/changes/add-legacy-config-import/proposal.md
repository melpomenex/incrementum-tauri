# Change: Add legacy .config/Incrementum archive import

## Why
Users need to import historical Incrementum data stored in legacy `.config/Incrementum` backups packaged as `.zip` or `.7z` archives.

## What Changes
- Add import flow in Import/Export settings to accept `.zip` and `.7z` legacy archives.
- Extract legacy archives and merge documents/extracts/learning items into the current database.
- Automatically reconcile schema differences by migrating legacy databases to the current schema before merge.
- Define duplicate handling: merge extracts into existing documents based on file identity.

## Impact
- Affected specs: legacy-config-import (new)
- Affected code: settings import UI, archive extraction, database import/merge pipeline
