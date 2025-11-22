'use client';

import {
  clearAllData,
  createProject,
  deleteFile,
  deleteProject,
  exportAllData,
  getAllFiles,
  getAllProjects,
  getStorageStats,
  type Project,
  type StoredFile,
} from '@/lib/storage';
import { useEffect, useState } from 'react';

export default function LibraryPage() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'midi' | 'audio'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFiles: 0,
    midiFiles: 0,
    audioFiles: 0,
    totalSize: 0,
    projects: 0,
  });
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [allFiles, allProjects, storageStats] = await Promise.all([
        getAllFiles(),
        getAllProjects(),
        getStorageStats(),
      ]);
      setFiles(allFiles);
      setProjects(allProjects);
      setStats(storageStats);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter files
  const filteredFiles = files
    .filter((file) => {
      if (filterType !== 'all' && file.type !== filterType) return false;
      if (selectedProject && file.projectId !== selectedProject) return false;
      if (
        searchTerm &&
        !file.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => b.metadata.createdAt - a.metadata.createdAt);

  const handleDownload = (file: StoredFile) => {
    try {
      const binaryString = atob(file.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const mimeType = file.type === 'midi' ? 'audio/midi' : 'audio/mpeg';
      const extension = file.type === 'midi' ? '.mid' : '.mp3';
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.endsWith(extension)
        ? file.name
        : `${file.name}${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file');
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await deleteFile(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      await createProject({
        name: newProjectName,
        description: '',
        metadata: {
          tempo: 120,
          key: 'C major',
          timeSignature: '4/4',
          genre: 'Electronic',
        },
      });
      setNewProjectName('');
      setShowNewProjectModal(false);
      await loadData();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this project? Files will remain in your library.'
      )
    )
      return;

    try {
      await deleteProject(id, false);
      if (selectedProject === id) setSelectedProject(null);
      await loadData();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const handleExportData = async () => {
    try {
      const jsonData = await exportAllData();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daw-library-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data');
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        'Are you sure you want to delete ALL files and projects? This cannot be undone!'
      )
    )
      return;

    try {
      await clearAllData();
      await loadData();
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center'>
        <div className='text-white text-xl'>Loading library...</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-5xl font-bold text-white mb-3'>📚 Library</h1>
          <p className='text-gray-300 text-lg'>
            Manage your generated MIDI patterns and audio files
          </p>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-8'>
          <div className='bg-gray-800 rounded-lg p-4'>
            <div className='text-gray-400 text-sm mb-1'>Total Files</div>
            <div className='text-white text-2xl font-bold'>
              {stats.totalFiles}
            </div>
          </div>
          <div className='bg-gray-800 rounded-lg p-4'>
            <div className='text-gray-400 text-sm mb-1'>MIDI Files</div>
            <div className='text-white text-2xl font-bold'>
              {stats.midiFiles}
            </div>
          </div>
          <div className='bg-gray-800 rounded-lg p-4'>
            <div className='text-gray-400 text-sm mb-1'>Audio Files</div>
            <div className='text-white text-2xl font-bold'>
              {stats.audioFiles}
            </div>
          </div>
          <div className='bg-gray-800 rounded-lg p-4'>
            <div className='text-gray-400 text-sm mb-1'>Projects</div>
            <div className='text-white text-2xl font-bold'>
              {stats.projects}
            </div>
          </div>
          <div className='bg-gray-800 rounded-lg p-4'>
            <div className='text-gray-400 text-sm mb-1'>Storage Used</div>
            <div className='text-white text-2xl font-bold'>
              {formatSize(stats.totalSize)}
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
          {/* Sidebar: Projects & Filters */}
          <div className='lg:col-span-1 space-y-6'>
            {/* Projects */}
            <div className='bg-gray-800 rounded-lg p-6'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-xl font-semibold text-white'>Projects</h2>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className='text-blue-400 hover:text-blue-300 text-2xl'
                  title='New Project'
                >
                  +
                </button>
              </div>

              <div className='space-y-2'>
                <button
                  onClick={() => setSelectedProject(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedProject === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All Files
                </button>

                {projects.map((project) => (
                  <div key={project.id} className='flex gap-2'>
                    <button
                      onClick={() => setSelectedProject(project.id)}
                      className={`flex-1 text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedProject === project.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {project.name}
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className='px-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg'
                      title='Delete Project'
                    >
                      🗑️
                    </button>
                  </div>
                ))}

                {projects.length === 0 && (
                  <p className='text-gray-500 text-sm text-center py-4'>
                    No projects yet
                  </p>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className='bg-gray-800 rounded-lg p-6'>
              <h2 className='text-xl font-semibold text-white mb-4'>Filters</h2>

              <div className='space-y-3'>
                <div>
                  <label className='block text-sm text-gray-400 mb-2'>
                    File Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) =>
                      setFilterType(e.target.value as 'all' | 'midi' | 'audio')
                    }
                    className='w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none'
                  >
                    <option value='all'>All Files</option>
                    <option value='midi'>MIDI Only</option>
                    <option value='audio'>Audio Only</option>
                  </select>
                </div>

                <div>
                  <label className='block text-sm text-gray-400 mb-2'>
                    Search
                  </label>
                  <input
                    type='text'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder='Search files...'
                    className='w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none'
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className='bg-gray-800 rounded-lg p-6'>
              <h2 className='text-xl font-semibold text-white mb-4'>Actions</h2>
              <div className='space-y-2'>
                <button
                  onClick={handleExportData}
                  className='w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors'
                >
                  💾 Export Backup
                </button>
                <button
                  onClick={handleClearAll}
                  className='w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors'
                >
                  🗑️ Clear All Data
                </button>
              </div>
            </div>
          </div>

          {/* Main Content: File List */}
          <div className='lg:col-span-3'>
            <div className='bg-gray-800 rounded-lg p-6'>
              <h2 className='text-2xl font-semibold text-white mb-4'>
                Files ({filteredFiles.length})
              </h2>

              {filteredFiles.length === 0 ? (
                <div className='text-center py-12 text-gray-400'>
                  <p className='text-lg mb-2'>No files found</p>
                  <p className='text-sm'>
                    Generate some MIDI patterns or audio files to get started!
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className='bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors'
                    >
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2 mb-2'>
                            <span className='text-2xl'>
                              {file.type === 'midi' ? '🎹' : '🎵'}
                            </span>
                            <h3 className='text-lg font-semibold text-white'>
                              {file.name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                file.type === 'midi'
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              {file.type.toUpperCase()}
                            </span>
                          </div>

                          {file.metadata.description && (
                            <p className='text-sm text-gray-300 mb-2'>
                              {file.metadata.description}
                            </p>
                          )}

                          <div className='flex flex-wrap gap-3 text-xs text-gray-400'>
                            {file.metadata.tempo && (
                              <span>🥁 {file.metadata.tempo} BPM</span>
                            )}
                            {file.metadata.key && (
                              <span>🎼 {file.metadata.key}</span>
                            )}
                            {file.metadata.instrument && (
                              <span>🎸 {file.metadata.instrument}</span>
                            )}
                            {file.metadata.patternType && (
                              <span>📝 {file.metadata.patternType}</span>
                            )}
                            <span>
                              📅 {formatDate(file.metadata.createdAt)}
                            </span>
                          </div>

                          {file.tags.length > 0 && (
                            <div className='flex flex-wrap gap-1 mt-2'>
                              {file.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className='px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded'
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className='flex gap-2 ml-4'>
                          <button
                            onClick={() => handleDownload(file)}
                            className='px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm'
                          >
                            💾
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className='px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm'
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4'>
            <h3 className='text-xl font-semibold text-white mb-4'>
              Create New Project
            </h3>
            <input
              type='text'
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder='Project name...'
              className='w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4'
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleCreateProject();
              }}
            />
            <div className='flex gap-2'>
              <button
                onClick={handleCreateProject}
                className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors'
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectName('');
                }}
                className='flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
