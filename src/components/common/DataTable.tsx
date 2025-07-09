/**
 * Reusable Data Table Component
 * Provides consistent table functionality with sorting, filtering, and pagination
 */
import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, Download } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { StatusBadge } from './StatusBadge';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string;
  onRowClick?: (row: T) => void;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, string>) => void;
  onExport?: (format: 'csv' | 'json') => void;
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  className?: string;
  rowClassName?: string | ((row: T) => string);
  emptyMessage?: string;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  error,
  onRowClick,
  onSort,
  onFilter,
  onExport,
  searchable = true,
  filterable = true,
  exportable = false,
  className = '',
  rowClassName = '',
  emptyMessage = 'No data found',
  pageSize = 10,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Handle sorting
  const handleSort = (key: keyof T) => {
    const direction = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(direction);
    onSort?.(key, direction);
  };

  // Handle filtering
  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    if (!value) {
      delete newFilters[key];
    }
    setFilters(newFilters);
    onFilter?.(newFilters);
  };

  // Filter and search data locally if no external handlers
  const filteredData = useMemo(() => {
    if (onFilter && onSort) {
      return data; // External handling
    }

    let result = [...data];

    // Apply search
    if (searchQuery) {
      result = result.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(row =>
          String(row[key]).toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortKey) {
      result.sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, filters, sortKey, sortDirection, onFilter, onSort]);

  // Get row class name
  const getRowClassName = (row: T) => {
    if (typeof rowClassName === 'function') {
      return rowClassName(row);
    }
    return rowClassName;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header with search and actions */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            
            {filterable && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
            )}
          </div>

          {exportable && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onExport?.('csv')}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => onExport?.('json')}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter inputs */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.filter(col => col.filterable).map((column) => (
                <div key={String(column.key)}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {column.label}
                  </label>
                  <input
                    type="text"
                    placeholder={`Filter by ${column.label.toLowerCase()}`}
                    value={filters[String(column.key)] || ''}
                    onChange={(e) => handleFilterChange(String(column.key), e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.headerClassName || ''}`}
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>{column.label}</span>
                      {sortKey === column.key && (
                        <div className="flex flex-col">
                          <ChevronUp className={`w-3 h-3 ${sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} />
                          <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} />
                        </div>
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center">
                  <LoadingSpinner size="lg" text="Loading data..." />
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => (
                <tr
                  key={index}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''} ${getRowClassName(row)}`}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`px-4 py-4 whitespace-nowrap text-sm ${column.className || ''}`}
                    >
                      {column.render ? column.render(row[column.key], row) : String(row[column.key] || '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {onPageChange && totalPages > 1 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      pageNum === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}