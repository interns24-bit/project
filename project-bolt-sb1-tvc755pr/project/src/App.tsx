import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import {
  HardDrive, Upload, FolderOpen, Image, FileText,
  Music, Video, Plus, Search, Loader2, Download, Trash2, Database // Added Database for storage icon
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

// Ensure this is your correct backend API URL
const API_URL = 'http://192.168.1.205:5000';

interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  modified: string;
}

interface StorageInfo {
  total: number;
  used: number;
  free: number;
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false); // For files list
  const [isStorageLoading, setIsStorageLoading] = useState(false); // For storage info
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/files`);
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to fetch files.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStorageInfo = async () => {
    try {
      setIsStorageLoading(true);
      const response = await axios.get<StorageInfo>(`${API_URL}/storage`);
      setStorageInfo(response.data);
    } catch (error) {
      console.error('Error fetching storage info:', error);
      toast.error('Failed to fetch storage details.');
    } finally {
      setIsStorageLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchStorageInfo();
  }, []);

  const categories = [
    { id: 'all', name: 'All Files', icon: HardDrive },
    { id: 'documents', name: 'Documents', icon: FileText },
    { id: 'images', name: 'Images', icon: Image },
    { id: 'music', name: 'Music', icon: Music },
    { id: 'videos', name: 'Videos', icon: Video }
  ];

  const onDrop = useCallback(async (acceptedFiles: globalThis.File[]) => { // Use globalThis.File for acceptedFiles
    // Check if total files would exceed storage capacity (optional - requires backend logic for size checking before upload)
    // For now, proceeding with upload and letting backend handle potential storage limits.

    const newUploadProgress: { [key: string]: number } = {};
    acceptedFiles.forEach(file => {
      newUploadProgress[file.name] = 0;
    });
    setUploadProgress(newUploadProgress);
    // No global isLoading for uploads, as progress is shown per file
    // setIsLoading(true);

    let anyError = false;
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        await axios.post(`${API_URL}/upload`, formData, {
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || file.size; // Fallback to file.size if total is not available
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / total
            );
            setUploadProgress((prev) => ({ ...prev, [file.name]: percentCompleted }));
          }
        });
        toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        anyError = true;
        console.error(`Error uploading ${file.name}:`, error);
        toast.error(`Upload failed for ${file.name}`);
        setUploadProgress((prev) => {
          const updatedProgress = { ...prev };
          delete updatedProgress[file.name]; // Remove failed upload from progress
          return updatedProgress;
        });
      }
    }

    // setIsLoading(false);
    if (!anyError) {
        setUploadProgress({}); // Clear progress only if all succeed or handle partial success
    }
    fetchFiles(); // Refresh file list
    fetchStorageInfo(); // Refresh storage info after upload

    // Reset file input
    const inputEl = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (inputEl) inputEl.value = '';
  }, [fetchFiles, fetchStorageInfo]); // Added dependencies

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true
  });

  const handleDownload = async (filename: string) => {
    try {
      // Use anchor tag for more reliable downloads and better UX
      const link = document.createElement('a');
      link.href = `${API_URL}/download/${filename}`;
      link.setAttribute('download', filename); // Optional: Prompt user with filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${filename}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Download failed');
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await axios.delete(`${API_URL}/delete/${filename}`);
      toast.success(`Deleted ${filename}`);
      fetchFiles(); // Refresh file list
      fetchStorageInfo(); // Refresh storage info after delete
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Delete failed');
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('audio/')) return Music;
    if (type.startsWith('video/')) return Video;
    if (type.includes('pdf')) return FileText; // More specific for PDFs
    if (type.includes('document') || type.includes('sheet') || type.includes('presentation')) return FileText;
    return FileText; // Default
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatGB = (bytes: number | undefined) => {
    if (bytes === undefined || isNaN(bytes)) return 'N/A';
    if (bytes === 0) return '0 GB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  const filteredFiles = files.filter((file) => {
    const fileTypeNormalized = file.type.toLowerCase();
    const matchCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'documents' && (
        fileTypeNormalized.includes('pdf') ||
        fileTypeNormalized.includes('document') ||
        fileTypeNormalized.includes('text') ||
        fileTypeNormalized.includes('sheet') || // for excel
        fileTypeNormalized.includes('presentation') // for ppt
      )) ||
      (selectedCategory === 'images' && fileTypeNormalized.startsWith('image/')) ||
      (selectedCategory === 'music' && fileTypeNormalized.startsWith('audio/')) ||
      (selectedCategory === 'videos' && fileTypeNormalized.startsWith('video/'));
    return matchCategory && file.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" {...getRootProps()}>
      <Toaster position="bottom-center" />
      <input {...getInputProps()} style={{ display: 'none' }} /> {/* Keep input hidden */}

      <header className="bg-white shadow-sm w-full sticky top-0 z-40">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <FolderOpen className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Cloud Storage</h1>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto sm:max-w-md">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onClick={(e) => e.stopPropagation()} // Prevent dropzone activation
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Important to prevent dropzone from opening its own dialog
                (document.querySelector('input[type="file"]') as HTMLInputElement)?.click();
              }}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-full flex items-center space-x-2 hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Upload className="h-5 w-5" />
              <span>Upload</span>
            </button>
          </div>
        </div>
      </header>

      {isDragActive && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-10 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center">
            <Upload className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900">Drop files here</h3>
            <p className="text-gray-500 mt-2">Release to upload your files</p>
          </div>
        </div>
      )}

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <div className="flex flex-col md:flex-row gap-6 h-full">
          {/* Sidebar */}
          <div className="w-full md:w-64 lg:w-72 flex-shrink-0 bg-white p-4 rounded-xl shadow-sm md:sticky md:top-24 self-start" style={{maxHeight: 'calc(100vh - 7rem)' /* Approximate sticky position adjustment */}}>
            <div className="flex flex-col h-full">
                {/* Categories */}
                <div className="space-y-1 mb-6">
                    {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                        <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition-colors ${
                            selectedCategory === category.id
                            ? 'bg-blue-100 text-blue-700 font-semibold'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                        >
                        <Icon className={`h-5 w-5 ${selectedCategory === category.id ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span>{category.name}</span>
                        </button>
                    );
                    })}
                </div>

                {/* Storage Info - Placed at the bottom of the sidebar flex container */}
                <div className="mt-auto border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <Database className="h-5 w-5 text-blue-600 mr-2"/> Storage Status
                    </h3>
                    {isStorageLoading ? (
                        <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                        </div>
                    ) : storageInfo ? (
                        <div className="text-xs space-y-1.5 text-gray-600">
                        <p>Total: {formatGB(storageInfo.total)}</p>
                        <p>Used: {formatGB(storageInfo.used)}</p>
                        <p>Free: {formatGB(storageInfo.free)}</p>
                        {storageInfo.total > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                            <div
                                className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${(storageInfo.used / storageInfo.total) * 100}%` }}
                            ></div>
                            </div>
                        )}
                        {storageInfo.total > 0 && (
                             <p className="text-right text-gray-500">{((storageInfo.used / storageInfo.total) * 100).toFixed(1)}% used</p>
                        )}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500">Storage details unavailable.</p>
                    )}
                </div>
            </div>
          </div>


          {/* Main File Display Area */}
          <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden">
            {Object.keys(uploadProgress).length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm text-gray-700 font-medium mb-2">Uploading files:</h3>
                <div className="space-y-3">
                  {Object.entries(uploadProgress).map(([filename, progress]) => (
                    <div key={filename}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span className="truncate max-w-[70%]">{filename}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-150"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">
                {categories.find(c => c.id === selectedCategory)?.name || 'Files'}
              </h2>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                <p className="ml-3 text-gray-600">Loading files...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-12 px-6">
                <HardDrive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">
                  {searchQuery ? 'No files match your search' : `No files in ${selectedCategory}`}
                </h3>
                <p className="text-gray-500 mt-2">
                  {searchQuery ? 'Try adjusting your search terms.' : 'Drop files here or click upload to add new files.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[calc(100vh-15rem)] overflow-y-auto"> {/* Adjust max-h as needed */}
                {filteredFiles.map((file) => {
                  const FileIcon = getFileIcon(file.type);
                  const isImage = file.type.startsWith('image/');
                  const isVideo = file.type.startsWith('video/');

                  return (
                    <div
                      key={file.id}
                      className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 hover:bg-gray-50 transition-colors"

                    >
                      <div className="flex items-center space-x-3 flex-grow min-w-0" onClick={() => setPreviewFile(file)} style={{cursor: 'pointer'}}>
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded bg-gray-100">
                          {isImage ? (
                            <img
                              src={`${API_URL}/preview/${file.name}?thumbnail=true`} // Suggest adding a thumbnail query for performance
                              alt={file.name}
                              className="h-full w-full object-cover rounded"
                              onError={(e) => (e.currentTarget.style.display = 'none')} // Hide if preview fails
                            />
                          ) : isVideo ? (
                            <Video className="h-5 w-5 text-blue-500" /> // Simple icon for list, preview will show video
                          ) : file.type.startsWith('audio/') ? (
                            <Music className="h-5 w-5 text-purple-500" />
                          ) : (
                            <FileIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate" title={file.name}>{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)} • {new Date(file.modified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file.name);
                          }}
                          title="Download"
                          className="p-2 hover:bg-gray-200 rounded-full text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file.name);
                          }}
                          title="Delete"
                          className="p-2 hover:bg-red-100 rounded-full text-gray-600 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-5 sm:p-6 rounded-xl shadow-2xl max-w-3xl w-full relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 break-all mr-8">{previewFile.name}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 absolute top-3 right-3"
                aria-label="Close preview"
              >
                <Plus className="h-6 w-6 transform rotate-45" /> {/* Using Plus rotated for an X mark */}
              </button>
            </div>
            <div className="flex-grow overflow-auto flex items-center justify-center">
                {previewFile.type.startsWith('image/') ? (
                <img
                    src={`${API_URL}/preview/${previewFile.name}`}
                    alt={previewFile.name}
                    className="max-h-[calc(80vh-60px)] w-auto object-contain rounded" // Adjusted max-h
                />
                ) : previewFile.type.startsWith('video/') ? (
                <video
                    src={`${API_URL}/preview/${previewFile.name}`}
                    controls
                    autoPlay
                    className="w-full max-h-[calc(80vh-60px)] rounded" // Adjusted max-h
                />
                ) : previewFile.type.startsWith('audio/') ? (
                <audio
                    src={`${API_URL}/preview/${previewFile.name}`}
                    controls
                    autoPlay
                    className="w-full"
                />
                ) : (
                <div className="text-gray-500 text-center py-10">
                    <FileText className="h-16 w-16 mx-auto text-gray-400 mb-3" />
                    No preview available for this file type.
                    <p className="text-sm mt-1">Type: {previewFile.type}</p>
                </div>
                )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                 <button
                    onClick={() => handleDownload(previewFile.name)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                >
                    <Download className="h-5 w-5" />
                    <span>Download</span>
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
