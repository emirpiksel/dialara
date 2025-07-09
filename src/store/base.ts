/**
 * Base store types and utilities for normalized state management
 */

import { logger } from '../utils/logger';

// Standard loading state interface
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Standard pagination state interface
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

// Standard filter state interface
export interface FilterState<T = any> {
  filters: T;
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Base store state that all stores should extend
export interface BaseStoreState extends LoadingState {
  initialized: boolean;
  lastUpdated: Date | null;
}

// Base store actions that all stores should have
export interface BaseStoreActions {
  reset: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Store with pagination capabilities
export interface PaginatedStoreState extends BaseStoreState, PaginationState {}

export interface PaginatedStoreActions extends BaseStoreActions {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetPagination: () => void;
}

// Store with filtering capabilities
export interface FilteredStoreState<T = any> extends BaseStoreState, FilterState<T> {}

export interface FilteredStoreActions<T = any> extends BaseStoreActions {
  setFilters: (filters: Partial<T>) => void;
  setSearchQuery: (query: string) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  clearFilters: () => void;
}

// Combined store for lists with pagination and filtering
export interface ListStoreState<T = any> extends BaseStoreState, PaginationState, FilterState<T> {}

export interface ListStoreActions<T = any> extends BaseStoreActions {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: Partial<T>) => void;
  setSearchQuery: (query: string) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  clearFilters: () => void;
  resetPagination: () => void;
  refresh: () => Promise<void>;
}

// Default values
export const defaultLoadingState: LoadingState = {
  isLoading: false,
  error: null,
};

export const defaultPaginationState: PaginationState = {
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  totalItems: 0,
};

export const defaultFilterState: FilterState = {
  filters: {},
  searchQuery: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
};

export const defaultBaseState: BaseStoreState = {
  ...defaultLoadingState,
  initialized: false,
  lastUpdated: null,
};

// Utility functions for creating normalized store actions
export const createBaseActions = <T>(
  set: (partial: Partial<T>) => void,
  storeName: string
): BaseStoreActions => ({
  reset: () => {
    logger.component(storeName).info('Resetting store');
    set({
      ...defaultBaseState,
      initialized: false,
    } as Partial<T>);
  },

  setLoading: (isLoading: boolean) => {
    logger.component(storeName).info('Setting loading state', { isLoading });
    set({ isLoading } as Partial<T>);
  },

  setError: (error: string | null) => {
    if (error) {
      logger.component(storeName).error('Setting error state', { error });
    } else {
      logger.component(storeName).info('Clearing error state');
    }
    set({ error, isLoading: false } as Partial<T>);
  },

  clearError: () => {
    logger.component(storeName).info('Clearing error state');
    set({ error: null } as Partial<T>);
  },
});

export const createPaginationActions = <T>(
  set: (partial: Partial<T>) => void,
  get: () => T,
  storeName: string,
  refreshFn?: () => Promise<void>
): PaginatedStoreActions => ({
  ...createBaseActions(set, storeName),

  setPage: (currentPage: number) => {
    logger.component(storeName).info('Setting page', { currentPage });
    set({ currentPage } as Partial<T>);
    if (refreshFn) {
      refreshFn();
    }
  },

  setPageSize: (pageSize: number) => {
    logger.component(storeName).info('Setting page size', { pageSize });
    set({ 
      pageSize, 
      currentPage: 1,
      totalPages: Math.ceil((get() as any).totalItems / pageSize)
    } as Partial<T>);
    if (refreshFn) {
      refreshFn();
    }
  },

  resetPagination: () => {
    logger.component(storeName).info('Resetting pagination');
    set({
      ...defaultPaginationState,
    } as Partial<T>);
  },
});

export const createFilterActions = <T, F>(
  set: (partial: Partial<T>) => void,
  get: () => T,
  storeName: string,
  refreshFn?: () => Promise<void>
): FilteredStoreActions<F> => ({
  ...createBaseActions(set, storeName),

  setFilters: (newFilters: Partial<F>) => {
    const currentFilters = (get() as any).filters;
    const updatedFilters = { ...currentFilters, ...newFilters };
    logger.component(storeName).info('Setting filters', { filters: updatedFilters });
    set({ 
      filters: updatedFilters,
      currentPage: 1  // Reset to first page when filtering
    } as Partial<T>);
    if (refreshFn) {
      refreshFn();
    }
  },

  setSearchQuery: (searchQuery: string) => {
    logger.component(storeName).info('Setting search query', { searchQuery });
    set({ 
      searchQuery,
      currentPage: 1  // Reset to first page when searching
    } as Partial<T>);
    if (refreshFn) {
      refreshFn();
    }
  },

  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => {
    logger.component(storeName).info('Setting sorting', { sortBy, sortOrder });
    set({ sortBy, sortOrder } as Partial<T>);
    if (refreshFn) {
      refreshFn();
    }
  },

  clearFilters: () => {
    logger.component(storeName).info('Clearing filters');
    set({
      ...defaultFilterState,
      currentPage: 1,
    } as Partial<T>);
    if (refreshFn) {
      refreshFn();
    }
  },
});

export const createListActions = <T, F>(
  set: (partial: Partial<T>) => void,
  get: () => T,
  storeName: string,
  refreshFn: () => Promise<void>
): ListStoreActions<F> => ({
  ...createBaseActions(set, storeName),

  setPage: (currentPage: number) => {
    logger.component(storeName).info('Setting page', { currentPage });
    set({ currentPage } as Partial<T>);
    refreshFn();
  },

  setPageSize: (pageSize: number) => {
    logger.component(storeName).info('Setting page size', { pageSize });
    set({ 
      pageSize, 
      currentPage: 1,
      totalPages: Math.ceil((get() as any).totalItems / pageSize)
    } as Partial<T>);
    refreshFn();
  },

  setFilters: (newFilters: Partial<F>) => {
    const currentFilters = (get() as any).filters;
    const updatedFilters = { ...currentFilters, ...newFilters };
    logger.component(storeName).info('Setting filters', { filters: updatedFilters });
    set({ 
      filters: updatedFilters,
      currentPage: 1
    } as Partial<T>);
    refreshFn();
  },

  setSearchQuery: (searchQuery: string) => {
    logger.component(storeName).info('Setting search query', { searchQuery });
    set({ 
      searchQuery,
      currentPage: 1
    } as Partial<T>);
    refreshFn();
  },

  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => {
    logger.component(storeName).info('Setting sorting', { sortBy, sortOrder });
    set({ sortBy, sortOrder } as Partial<T>);
    refreshFn();
  },

  clearFilters: () => {
    logger.component(storeName).info('Clearing filters');
    set({
      ...defaultFilterState,
      currentPage: 1,
    } as Partial<T>);
    refreshFn();
  },

  resetPagination: () => {
    logger.component(storeName).info('Resetting pagination');
    set({
      ...defaultPaginationState,
    } as Partial<T>);
  },

  refresh: refreshFn,
});

// Validation utilities
export const validateStoreState = <T extends BaseStoreState>(
  state: T,
  storeName: string
): boolean => {
  const errors: string[] = [];

  if (typeof state.isLoading !== 'boolean') {
    errors.push('isLoading must be a boolean');
  }

  if (state.error !== null && typeof state.error !== 'string') {
    errors.push('error must be null or string');
  }

  if (typeof state.initialized !== 'boolean') {
    errors.push('initialized must be a boolean');
  }

  if (state.lastUpdated !== null && !(state.lastUpdated instanceof Date)) {
    errors.push('lastUpdated must be null or Date');
  }

  if (errors.length > 0) {
    logger.component(storeName).error('Store state validation failed', { errors });
    return false;
  }

  return true;
};

// Error recovery utilities
export const createErrorRecovery = <T extends BaseStoreState>(
  set: (partial: Partial<T>) => void,
  get: () => T,
  storeName: string
) => ({
  handleError: (error: Error, context: string) => {
    logger.component(storeName).error(`Error in ${context}`, { error: error.message });
    
    // Set error state
    set({
      error: error.message,
      isLoading: false,
    } as Partial<T>);

    // Auto-clear error after 5 seconds
    setTimeout(() => {
      const currentState = get();
      if (currentState.error === error.message) {
        set({ error: null } as Partial<T>);
      }
    }, 5000);
  },

  recoverFromError: async (recoveryFn: () => Promise<void>) => {
    const currentState = get();
    
    if (currentState.error) {
      logger.component(storeName).info('Attempting error recovery');
      
      try {
        set({ error: null, isLoading: true } as Partial<T>);
        await recoveryFn();
        logger.component(storeName).info('Error recovery successful');
      } catch (recoveryError) {
        logger.component(storeName).error('Error recovery failed', { error: recoveryError });
        set({
          error: 'Recovery failed. Please try again.',
          isLoading: false,
        } as Partial<T>);
      }
    }
  },
});

// Store persistence utilities
export const createStorePersistence = <T>(
  storeName: string,
  keysToExclude: (keyof T)[] = ['isLoading', 'error']
) => ({
  serialize: (state: T) => {
    const stateToSerialize = { ...state };
    
    // Remove keys that shouldn't be persisted
    keysToExclude.forEach(key => {
      delete stateToSerialize[key];
    });
    
    return JSON.stringify(stateToSerialize);
  },

  deserialize: (serializedState: string): Partial<T> => {
    try {
      const parsed = JSON.parse(serializedState);
      
      // Always reset loading and error states on deserialize
      return {
        ...parsed,
        isLoading: false,
        error: null,
      };
    } catch (error) {
      logger.component(storeName).error('Failed to deserialize state', { error });
      return {};
    }
  },
});