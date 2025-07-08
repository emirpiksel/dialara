import React from 'react';
import { Search, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { CallFilter, useCallsStore } from '../store/calls';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export function CallFilters() {
  const { filters, setFilters } = useCallsStore();

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search Phone Number
          </label>
          <div className="relative">
            <input
              type="text"
              id="search"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter phone number..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Call Type Filter */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Call Type
          </label>
          <div className="relative">
            <select
              id="type"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={filters.type}
              onChange={(e) => setFilters({ type: e.target.value as CallFilter['type'] })}
            >
              <option value="all">All Calls</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <DatePicker
                selected={filters.dateRange?.start}
                onChange={(date: Date) =>
                  setFilters({
                    dateRange: {
                      start: date,
                      end: filters.dateRange?.end || date,
                    },
                  })
                }
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholderText="Start date"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="relative flex-1">
              <DatePicker
                selected={filters.dateRange?.end}
                onChange={(date: Date) =>
                  setFilters({
                    dateRange: {
                      start: filters.dateRange?.start || date,
                      end: date,
                    },
                  })
                }
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholderText="End date"
                minDate={filters.dateRange?.start}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}