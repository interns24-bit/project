import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { 
  HardDrive, 
  Upload, 
  FolderOpen, 
  Image, 
  FileText, 
  Music, 
  Video,
  Plus,
  Search,
  Loader2,
  Download,
  Trash2
} from 'lucide-react';

// Update this to your Raspberry Pi's IP address
const API_URL = 'http://your-raspberry-pi-ip:5000';

interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  modified: string;
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/files`);
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const categories = [
    { id: 'all', name: 'All Files', icon: HardDrive },
    { id: 'documents', name: 'Documents', icon: FileText },
    { id: 'images', name: 'Images', icon: Image },
    { id: 'music', name: 'Music', icon: Music },
    { id: 'videos', name: 'Videos', icon: Video }
  ];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setIsLoading(true);
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post(`${API_URL}/upload`, formData);
      }
      fetchFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    noClick: true
  });

  const handleDownload = async (filename: string) => {
    try {
      window.location.href = `${API_URL}/download/${filename}`;
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await axios.delete(`${API_URL}/delete/${filename}`);
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('audio/')) return Music;
    if (type.startsWith('video/')) return Video;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50" {...getRootProps()}>
      <input {...getInputProps()} />
      
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Cloud Storage</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                document.querySelector('input[type="file"]')?.click();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center space-x-2 hover:bg-blue-700 transition-colors"
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Sidebar and Content Grid */}
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 space-y-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{category.name}</span>
                </button>
              );
            })}
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                // Handle new folder creation
              }}
              className="w-full mt-4 text-left px-4 py-3 rounded-lg flex items-center space-x-3 text-gray-700 hover:bg-gray-100"
            >
              <Plus className="h-5 w-5" />
              <span>New Folder</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">Files</h2>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No files yet</h3>
                  <p className="text-gray-500 mt-2">Drop files here or click upload to add files</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {files.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <div key={file.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <FileIcon className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)} • Modified {new Date(file.modified).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file.name);
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full"
                          >
                            <Download className="h-5 w-5 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(file.name);
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full text-red-500"
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
        </div>
      </main>
    </div>
  );
}

export default App;