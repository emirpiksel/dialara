import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  File, 
  Search, 
  Trash2, 
  Brain, 
  BookOpen, 
  Tag,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

interface Document {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  tags: string[];
  summary: string;
  chunk_count: number;
  created_at: string;
}

interface SearchResult {
  content: string;
  document_title: string;
  document_summary: string;
  similarity: number;
  source: string;
}

interface UploadResult {
  status: 'success' | 'error';
  document_id?: string;
  title?: string;
  chunk_count?: number;
  summary?: string;
  file_size?: number;
  message: string;
}

export function KnowledgeBase() {
  const { userId } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userId) {
      loadDocuments();
    }
  }, [userId]);

  const loadDocuments = async () => {
    try {
      const response = await fetch(`/api/knowledge/documents?user_id=${userId}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId || '');

      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      setUploadResult(result);

      if (result.status === 'success') {
        await loadDocuments(); // Refresh document list
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Clear file input
        }
      }
    } catch (error) {
      setUploadResult({
        status: 'error',
        message: 'Upload failed. Please try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          query: searchQuery,
          max_results: 5
        })
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this document? This action cannot be undone.');
    
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/knowledge/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId })
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        await loadDocuments(); // Refresh document list
      } else {
        alert('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('text')) return '📋';
    if (fileType.includes('json')) return '🔧';
    return '📁';
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading knowledge base...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">AI Knowledge Base</h2>
        <p className="text-gray-600">
          Upload documents for your AI assistant to reference during calls. Supports PDF, Word, Excel, text, and more.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Document Upload</h3>
              <p className="text-sm text-gray-600">
                Add documents to your knowledge base
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
              accept=".pdf,.docx,.xlsx,.txt,.md,.json,.csv"
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">
                {isUploading ? 'Uploading...' : 'Click to select files or drag and drop'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supports PDF, Word, Excel, Text, Markdown, JSON, CSV
              </p>
            </label>
          </div>

          {uploadResult && (
            <div className={`p-4 rounded-lg ${
              uploadResult.status === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start space-x-2">
                {uploadResult.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  {uploadResult.status === 'success' ? (
                    <div>
                      <h4 className="font-medium text-green-800">Upload Successful!</h4>
                      <p className="text-green-700 text-sm mt-1">
                        {uploadResult.message}
                      </p>
                      {uploadResult.chunk_count && (
                        <p className="text-green-600 text-sm">
                          Processed into {uploadResult.chunk_count} searchable chunks
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-medium text-red-800">Upload Failed</h4>
                      <p className="text-red-700 text-sm mt-1">{uploadResult.message}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">AI Knowledge Features:</h4>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• AI can search and reference your documents during calls</li>
              <li>• Automatic text extraction and semantic search</li>
              <li>• Supports multiple file formats</li>
              <li>• Private knowledge base per user</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Search className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Knowledge Search</h3>
            <p className="text-sm text-gray-600">
              Test semantic search across your documents
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search your knowledge base..."
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isSearching ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{isSearching ? 'Searching...' : 'Search'}</span>
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Search Results:</h4>
              {searchResults.map((result, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{result.source}</h5>
                    <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      {(result.similarity * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm mb-2">{result.content}</p>
                  {result.document_summary && (
                    <p className="text-xs text-gray-500">From: {result.document_summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="text-center py-4 text-gray-500">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Your Documents</h3>
              <p className="text-sm text-gray-600">
                {documents.length} documents in your knowledge base
              </p>
            </div>
          </div>
          <button
            onClick={loadDocuments}
            className="text-gray-600 hover:text-gray-800"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No documents uploaded yet</p>
            <p className="text-sm text-gray-500">Upload your first document to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="text-2xl">{getFileIcon(doc.file_type)}</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{doc.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{doc.summary}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{doc.chunk_count} chunks</span>
                        <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                      </div>
                      {doc.tags.length > 0 && (
                        <div className="flex items-center space-x-1 mt-2">
                          <Tag className="w-3 h-3 text-gray-400" />
                          {doc.tags.map((tag, index) => (
                            <span key={index} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Function Documentation */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">AI Function Integration</h3>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Available Function for AI:</h4>
          <div className="border-l-4 border-purple-500 pl-3">
            <code className="text-purple-700 font-mono">search_knowledge(query, max_results)</code>
            <p className="text-gray-600 mt-1">Searches the user's knowledge base and returns relevant content</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-yellow-800 mb-2">How it works:</h4>
          <ol className="list-decimal list-inside space-y-1 text-yellow-700 text-sm">
            <li>Upload documents to build your knowledge base</li>
            <li>Configure your Vapi assistant with the search_knowledge function</li>
            <li>During calls, AI can search and reference your documents</li>
            <li>Provides accurate, personalized information to callers</li>
          </ol>
        </div>
      </div>
    </div>
  );
}