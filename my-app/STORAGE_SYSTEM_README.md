# 📚 Browser Storage System for Music Production

## Overview

A complete browser-based file management system using **IndexedDB** to persistently store generated MIDI patterns and audio files. All data is stored locally in the user's browser with no server required.

## Features

### 🗄️ **Persistent Storage**

- All generated files are automatically saved to IndexedDB
- Data persists across browser sessions
- No server or account required
- Works completely offline

### 📁 **File Management**

- Store MIDI patterns (.mid files)
- Store audio files (MP3)
- Rich metadata (tempo, key, time signature, etc.)
- Tagging system for organization
- Search and filter capabilities

### 🎨 **Project Organization**

- Group files into projects
- Track project metadata
- Manage multiple tracks/compositions

### 💾 **Backup & Export**

- Export entire library as JSON
- Import backups to restore data
- Download individual files anytime

## Architecture

### Storage Structure

```
IndexedDB: MusicProducerDAW
│
├── Files Store
│   ├── id (primary key)
│   ├── name
│   ├── type (midi | audio)
│   ├── data (base64)
│   ├── metadata
│   │   ├── tempo
│   │   ├── key
│   │   ├── timeSignature
│   │   ├── genre
│   │   ├── description
│   │   ├── duration
│   │   ├── instrument
│   │   ├── patternType
│   │   └── chordProgression
│   ├── tags[]
│   └── projectId
│
└── Projects Store
    ├── id (primary key)
    ├── name
    ├── description
    ├── metadata
    │   ├── tempo
    │   ├── key
    │   ├── timeSignature
    │   └── genre
    ├── fileIds[]
    └── timestamps
```

## API Reference

### File Operations

#### `saveFile(file)`

Save a new file to the library.

```typescript
import { saveFile } from '@/lib/storage';

const fileId = await saveFile({
  name: 'Bass Line',
  type: 'midi',
  data: 'base64EncodedData...',
  metadata: {
    tempo: 120,
    key: 'C major',
    timeSignature: '4/4',
    genre: 'Electronic',
    description: 'Funky bass line',
    duration: 4, // bars
    patternType: 'bass',
  },
  tags: ['bass', 'funky', 'electronic'],
  projectId: 'optional-project-id',
});
```

#### `getFile(id)`

Retrieve a file by ID.

```typescript
const file = await getFile(fileId);
console.log(file.name, file.type, file.metadata);
```

#### `getAllFiles()`

Get all files in the library.

```typescript
const files = await getAllFiles();
console.log(`Total files: ${files.length}`);
```

#### `getFilesByType(type)`

Get files filtered by type.

```typescript
const midiFiles = await getFilesByType('midi');
const audioFiles = await getFilesByType('audio');
```

#### `updateFile(id, updates)`

Update file metadata or properties.

```typescript
await updateFile(fileId, {
  name: 'New Name',
  tags: ['new', 'tags'],
  metadata: {
    description: 'Updated description',
  },
});
```

#### `deleteFile(id)`

Remove a file from the library.

```typescript
await deleteFile(fileId);
```

#### `searchFilesByTags(tags)`

Find files by tags.

```typescript
const files = await searchFilesByTags(['bass', 'electronic']);
```

### Project Operations

#### `createProject(project)`

Create a new project.

```typescript
import { createProject } from '@/lib/storage';

const projectId = await createProject({
  name: 'My Epic Track',
  description: 'Summer festival banger',
  metadata: {
    tempo: 128,
    key: 'A minor',
    timeSignature: '4/4',
    genre: 'EDM',
  },
});
```

#### `getProject(id)`

Retrieve a project.

```typescript
const project = await getProject(projectId);
```

#### `getAllProjects()`

Get all projects.

```typescript
const projects = await getAllProjects();
```

#### `updateProject(id, updates)`

Update project properties.

```typescript
await updateProject(projectId, {
  name: 'Updated Name',
  description: 'New description',
});
```

#### `deleteProject(id, deleteFiles)`

Delete a project (optionally delete its files too).

```typescript
// Delete project but keep files
await deleteProject(projectId, false);

// Delete project AND all its files
await deleteProject(projectId, true);
```

#### `addFileToProject(projectId, fileId)`

Associate a file with a project.

```typescript
await addFileToProject(projectId, fileId);
```

#### `getFilesByProject(projectId)`

Get all files in a project.

```typescript
const projectFiles = await getFilesByProject(projectId);
```

### Utility Operations

#### `getStorageStats()`

Get storage usage statistics.

```typescript
const stats = await getStorageStats();
console.log(`
  Total Files: ${stats.totalFiles}
  MIDI Files: ${stats.midiFiles}
  Audio Files: ${stats.audioFiles}
  Storage Used: ${stats.totalSize} bytes
  Projects: ${stats.projects}
`);
```

#### `exportAllData()`

Export entire library as JSON.

```typescript
const jsonBackup = await exportAllData();
// Save to file
const blob = new Blob([jsonBackup], { type: 'application/json' });
// ... download logic
```

#### `importData(jsonData)`

Import data from JSON backup.

```typescript
await importData(jsonBackup);
```

#### `clearAllData()`

Delete all data (use with caution!)

```typescript
await clearAllData();
```

## Auto-Save Integration

### MIDI Assistant

Files are automatically saved when generated:

```typescript
// In handleGenerateMusic()
if (data.midiPattern && data.midiFileData) {
  await saveFile({
    name: data.midiPattern.name,
    type: 'midi',
    data: data.midiFileData,
    metadata: {
      /* ... */
    },
    tags: [
      /* ... */
    ],
  });
}
```

### DAW Assistant

Audio loops are automatically saved:

```typescript
// In handleGenerateLoop()
if (data.loop) {
  await saveFile({
    name: `${data.loop.instrument} - ${data.loop.metadata.title}`,
    type: 'audio',
    data: data.loop.audioUrl.split(',')[1], // Remove data: prefix
    metadata: {
      /* ... */
    },
    tags: [
      /* ... */
    ],
  });
}
```

## Library UI

Access the library at: `http://localhost:3000/library`

### Features:

1. **File Browser**

   - View all saved files
   - Filter by type (MIDI/Audio)
   - Search by name
   - View metadata and tags

2. **Project Management**

   - Create projects
   - Organize files into projects
   - Filter files by project

3. **Actions**

   - Download individual files
   - Delete files
   - Export backup (JSON)
   - Clear all data

4. **Statistics**
   - Total file count
   - Storage usage
   - File type breakdown

## Storage Limits

### IndexedDB Limits

- **Desktop Chrome/Edge**: 60% of available disk space
- **Desktop Firefox**: 50% of available disk space
- **Desktop Safari**: 1GB
- **Mobile**: Varies by device (typically 50-200MB)

### Approximate File Sizes

- **MIDI Pattern**: 1-10 KB
- **Audio Loop (10s)**: 100-300 KB
- **Audio Loop (30s)**: 300-900 KB

### Example Capacity

With 1GB storage:

- ~100,000 MIDI patterns, OR
- ~3,000 audio loops (10s each), OR
- Mix of both

## Best Practices

### 1. Regular Backups

```typescript
// Export backup weekly
const backup = await exportAllData();
// Save to cloud storage or download
```

### 2. Organize with Tags

```typescript
await saveFile({
  // ...
  tags: [genre, mood, instrument, tempo_range],
});
```

### 3. Use Projects

```typescript
// Group related files
const projectId = await createProject({
  /* ... */
});
await addFileToProject(projectId, fileId);
```

### 4. Clean Up Unused Files

```typescript
// Delete old test files
const files = await getAllFiles();
const testFiles = files.filter((f) => f.tags.includes('test'));
await Promise.all(testFiles.map((f) => deleteFile(f.id)));
```

### 5. Monitor Storage

```typescript
const stats = await getStorageStats();
if (stats.totalSize > 500_000_000) {
  // 500MB
  console.warn('Storage getting full');
}
```

## Migration & Portability

### Export Library

```typescript
// Export from old device
const backup = await exportAllData();
// Save backup.json
```

### Import to New Device

```typescript
// On new device
await importData(backupJson);
```

### Cross-Browser Sync

Each browser has its own IndexedDB, so:

- Chrome data ≠ Firefox data
- Use export/import to transfer between browsers

## Error Handling

```typescript
try {
  await saveFile(fileData);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    console.error('Storage full!');
    // Prompt user to delete old files
  } else {
    console.error('Save failed:', error);
  }
}
```

## Security & Privacy

### ✅ Secure

- All data stays in browser
- No server transmission
- No third-party access

### ⚠️ Limitations

- Data can be cleared if user clears browser data
- No automatic cloud backup
- Limited by browser storage quota

### 🛡️ Recommendations

- Regular exports for backup
- Don't rely solely on browser storage for critical data
- Use backup JSON files for long-term storage

## Future Enhancements

- [ ] Cloud sync (optional)
- [ ] Collaborative projects
- [ ] Version history
- [ ] File compression
- [ ] Advanced search (tempo range, key compatibility)
- [ ] Playlist/setlist creation
- [ ] Audio waveform visualization
- [ ] MIDI preview player
- [ ] Batch operations
- [ ] Auto-cleanup old files

## Troubleshooting

### Storage Not Persisting

- Check if browser is in Private/Incognito mode
- Verify IndexedDB is enabled in browser settings
- Check available disk space

### Quota Exceeded

- Delete unused files
- Export and clear old data
- Compress audio files before saving

### Import Fails

- Verify JSON format is correct
- Check for browser compatibility
- Try importing in smaller batches

## Example: Complete Workflow

```typescript
// 1. Create a project
const projectId = await createProject({
  name: 'Summer Track',
  description: 'Feel-good house music',
  metadata: {
    tempo: 124,
    key: 'G major',
    timeSignature: '4/4',
    genre: 'House',
  },
});

// 2. Generate and save MIDI
const midiId = await saveFile({
  name: 'Piano Melody',
  type: 'midi',
  data: midiBase64,
  projectId,
  metadata: { tempo: 124, key: 'G major' },
  tags: ['piano', 'melody', 'house'],
});

// 3. Generate and save audio
const audioId = await saveFile({
  name: 'Bass Line',
  type: 'audio',
  data: audioBase64,
  projectId,
  metadata: { tempo: 124, instrument: 'bass' },
  tags: ['bass', 'house'],
});

// 4. View project files
const files = await getFilesByProject(projectId);
console.log(`Project has ${files.length} files`);

// 5. Export for backup
const backup = await exportAllData();
```

---

**Happy music making! 🎵**
