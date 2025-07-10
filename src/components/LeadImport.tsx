import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { ConsentCheckbox, ComplianceNotice } from './ComplianceNotice';
import { useAuthStore } from '../store/auth';

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  status: 'success' | 'error';
  imported_count?: number;
  total_submitted?: number;
  errors?: string[];
  leads?: any[];
  message?: string;
}

export function LeadImport({ onImportComplete }: { onImportComplete?: () => void }) {
  const { userId } = useAuthStore();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file must have at least a header row and one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj: any = { _rowNumber: index + 2 }; // +2 because we skip header and arrays are 0-indexed
        
        headers.forEach((header, i) => {
          obj[header.toLowerCase().replace(/\s+/g, '_')] = values[i] || '';
        });
        
        return obj;
      });

      setCsvData(data);
      setShowPreview(true);
    };
    
    reader.readAsText(file);
  };

  const validateData = (data: any[]) => {
    const errors: string[] = [];
    const requiredFields = ['clinic_name', 'full_name', 'phone_number'];
    
    data.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!row[field] || row[field].toString().trim() === '') {
          errors.push(`Row ${row._rowNumber}: Missing required field '${field.replace('_', ' ')}'`);
        }
      });
    });

    return errors;
  };

  const handleImport = async () => {
    if (!userId) {
      alert('User ID not available');
      return;
    }

    if (!consentConfirmed) {
      alert('Please confirm consent before importing leads');
      return;
    }

    const validationErrors = validateData(csvData);
    if (validationErrors.length > 0) {
      setImportResult({
        status: 'error',
        errors: validationErrors
      });
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch('/api/import-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leads: csvData,
          user_id: userId,
          consent_confirmed: consentConfirmed
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setImportResult(result);
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        setImportResult({
          status: 'error',
          message: result.detail || 'Import failed'
        });
      }
    } catch (error) {
      setImportResult({
        status: 'error',
        message: 'Network error during import'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setCsvData([]);
    setConsentConfirmed(false);
    setImportResult(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Import Leads from CSV</h3>
        <p className="text-gray-600 text-sm">
          Upload a CSV file containing your leads. Required columns: clinic_name, full_name, phone_number
        </p>
      </div>

      {/* Compliance Notice */}
      <ComplianceNotice compact />

      {/* File Upload */}
      {!file && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drop your CSV file here
          </p>
          <p className="text-gray-500 mb-4">
            or click to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Choose File
          </button>
        </div>
      )}

      {/* File Info */}
      {file && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {csvData.length} rows detected
                </p>
              </div>
            </div>
            <button
              onClick={resetImport}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Data Preview */}
      {showPreview && csvData.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Preview (first 5 rows)</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(csvData[0]).filter(key => key !== '_rowNumber').map(key => (
                    <th key={key} className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 5).map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {Object.entries(row).filter(([key]) => key !== '_rowNumber').map(([key, value]) => (
                      <td key={key} className="px-4 py-2 text-sm text-gray-900 border-b">
                        {value as string}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Consent Confirmation */}
      {showPreview && (
        <ConsentCheckbox
          checked={consentConfirmed}
          onChange={setConsentConfirmed}
          required
        />
      )}

      {/* Import Button */}
      {showPreview && (
        <div className="flex space-x-3">
          <button
            onClick={handleImport}
            disabled={!consentConfirmed || isImporting}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Importing...' : `Import ${csvData.length} Leads`}
          </button>
          <button
            onClick={resetImport}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className={`p-4 rounded-lg ${
          importResult.status === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start space-x-2">
            {importResult.status === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              {importResult.status === 'success' ? (
                <div>
                  <h4 className="font-medium text-green-800">Import Successful!</h4>
                  <p className="text-green-700 text-sm mt-1">
                    Successfully imported {importResult.imported_count} of {importResult.total_submitted} leads.
                  </p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-green-700 text-sm font-medium">Some rows had errors:</p>
                      <ul className="text-green-700 text-sm mt-1 list-disc list-inside">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h4 className="font-medium text-red-800">Import Failed</h4>
                  <p className="text-red-700 text-sm mt-1">
                    {importResult.message || 'An error occurred during import.'}
                  </p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <ul className="text-red-700 text-sm mt-2 list-disc list-inside">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}