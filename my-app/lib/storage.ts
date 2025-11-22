/**
 * Browser Storage System for Music Production Files
 * Uses IndexedDB for persistent storage of MIDI patterns and audio files
 */

export interface StoredFile {
  id: string;
  name: string;
  type: 'midi' | 'audio';
  data: string; // Base64 encoded data
  metadata: {
    createdAt: number;
    updatedAt: number;
    tempo?: number;
    key?: string;
    timeSignature?: string;
    genre?: string;
    description?: string;
    duration?: number; // in seconds for audio, bars for MIDI
    instrument?: string; // for audio files
    patternType?: string; // for MIDI files
    chordProgression?: string;
  };
  tags: string[];
  projectId?: string; // Group files into projects
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  metadata: {
    tempo: number;
    key: string;
    timeSignature: string;
    genre: string;
  };
  fileIds: string[]; // References to StoredFile IDs
}

const DB_NAME = 'MusicProducerDAW';
const DB_VERSION = 1;
const FILES_STORE = 'files';
const PROJECTS_STORE = 'projects';

/**
 * Initialize IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create files store
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        const filesStore = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
        filesStore.createIndex('type', 'type', { unique: false });
        filesStore.createIndex('createdAt', 'metadata.createdAt', {
          unique: false,
        });
        filesStore.createIndex('projectId', 'projectId', { unique: false });
        filesStore.createIndex('tags', 'tags', {
          unique: false,
          multiEntry: true,
        });
      }

      // Create projects store
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        const projectsStore = db.createObjectStore(PROJECTS_STORE, {
          keyPath: 'id',
        });
        projectsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save a file to storage
 */
export async function saveFile(
  file: Omit<StoredFile, 'id' | 'metadata'> & {
    metadata?: Partial<StoredFile['metadata']>;
  }
): Promise<string> {
  const db = await openDatabase();

  const now = Date.now();
  const storedFile: StoredFile = {
    id: generateId(),
    name: file.name,
    type: file.type,
    data: file.data,
    metadata: {
      createdAt: now,
      updatedAt: now,
      ...file.metadata,
    },
    tags: file.tags || [],
    projectId: file.projectId,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE], 'readwrite');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.add(storedFile);

    request.onsuccess = () => resolve(storedFile.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a file by ID
 */
export async function getFile(id: string): Promise<StoredFile | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE], 'readonly');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all files
 */
export async function getAllFiles(): Promise<StoredFile[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE], 'readonly');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get files by type
 */
export async function getFilesByType(
  type: 'midi' | 'audio'
): Promise<StoredFile[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE], 'readonly');
    const store = transaction.objectStore(FILES_STORE);
    const index = store.index('type');
    const request = index.getAll(type);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get files by project ID
 */
export async function getFilesByProject(
  projectId: string
): Promise<StoredFile[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE], 'readonly');
    const store = transaction.objectStore(FILES_STORE);
    const index = store.index('projectId');
    const request = index.getAll(projectId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update a file
 */
export async function updateFile(
  id: string,
  updates: Partial<Omit<StoredFile, 'id' | 'metadata'>> & {
    metadata?: Partial<StoredFile['metadata']>;
  }
): Promise<void> {
  const db = await openDatabase();
  const existingFile = await getFile(id);

  if (!existingFile) {
    throw new Error(`File with id ${id} not found`);
  }

  const updatedFile: StoredFile = {
    ...existingFile,
    ...updates,
    metadata: {
      ...existingFile.metadata,
      ...updates.metadata,
      updatedAt: Date.now(),
    },
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE], 'readwrite');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.put(updatedFile);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a file
 */
export async function deleteFile(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE], 'readwrite');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Search files by tags
 */
export async function searchFilesByTags(tags: string[]): Promise<StoredFile[]> {
  const allFiles = await getAllFiles();
  return allFiles.filter((file) => tags.some((tag) => file.tags.includes(tag)));
}

/**
 * Create a new project
 */
export async function createProject(
  project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'fileIds'>
): Promise<string> {
  const db = await openDatabase();

  const now = Date.now();
  const newProject: Project = {
    id: generateId(),
    name: project.name,
    description: project.description,
    metadata: project.metadata,
    createdAt: now,
    updatedAt: now,
    fileIds: [],
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.add(newProject);

    request.onsuccess = () => resolve(newProject.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a project by ID
 */
export async function getProject(id: string): Promise<Project | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all projects
 */
export async function getAllProjects(): Promise<Project[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update a project
 */
export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await openDatabase();
  const existingProject = await getProject(id);

  if (!existingProject) {
    throw new Error(`Project with id ${id} not found`);
  }

  const updatedProject: Project = {
    ...existingProject,
    ...updates,
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.put(updatedProject);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a project (and optionally its files)
 */
export async function deleteProject(
  id: string,
  deleteFiles: boolean = false
): Promise<void> {
  const db = await openDatabase();

  if (deleteFiles) {
    const files = await getFilesByProject(id);
    await Promise.all(files.map((file) => deleteFile(file.id)));
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a file to a project
 */
export async function addFileToProject(
  projectId: string,
  fileId: string
): Promise<void> {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error(`Project with id ${projectId} not found`);
  }

  if (!project.fileIds.includes(fileId)) {
    project.fileIds.push(fileId);
    await updateProject(projectId, { fileIds: project.fileIds });
  }

  // Update the file's projectId
  await updateFile(fileId, { projectId });
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  totalFiles: number;
  midiFiles: number;
  audioFiles: number;
  totalSize: number; // Approximate size in bytes
  projects: number;
}> {
  const [files, projects] = await Promise.all([
    getAllFiles(),
    getAllProjects(),
  ]);

  const midiFiles = files.filter((f) => f.type === 'midi').length;
  const audioFiles = files.filter((f) => f.type === 'audio').length;

  // Approximate size (base64 is ~1.37x larger than binary)
  const totalSize = files.reduce((sum, file) => {
    return sum + Math.floor((file.data.length * 3) / 4);
  }, 0);

  return {
    totalFiles: files.length,
    midiFiles,
    audioFiles,
    totalSize,
    projects: projects.length,
  };
}

/**
 * Export all data as JSON (for backup)
 */
export async function exportAllData(): Promise<string> {
  const [files, projects] = await Promise.all([
    getAllFiles(),
    getAllProjects(),
  ]);

  return JSON.stringify(
    {
      version: DB_VERSION,
      exportedAt: Date.now(),
      files,
      projects,
    },
    null,
    2
  );
}

/**
 * Import data from JSON backup
 */
export async function importData(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);
  const db = await openDatabase();

  // Import files
  if (data.files && Array.isArray(data.files)) {
    const transaction = db.transaction([FILES_STORE], 'readwrite');
    const store = transaction.objectStore(FILES_STORE);

    for (const file of data.files) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(file);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // Import projects
  if (data.projects && Array.isArray(data.projects)) {
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);

    for (const project of data.projects) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(project);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

/**
 * Clear all data (use with caution!)
 */
export async function clearAllData(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [FILES_STORE, PROJECTS_STORE],
      'readwrite'
    );

    const filesStore = transaction.objectStore(FILES_STORE);
    const projectsStore = transaction.objectStore(PROJECTS_STORE);

    const clearFiles = filesStore.clear();
    const clearProjects = projectsStore.clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
