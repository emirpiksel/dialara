import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useAuthStore } from './auth';
import { CallLog, LoadingState } from '../types';
import { logger } from '../utils/logger';

type DatabaseCallLog = Database['public']['Tables']['call_logs']['Row'];

interface CallStats {
  totalCalls: number;
  avgDuration: string;
  uniqueCallers: number;
  successRate: string;
}

export type CallFilter = {
  type?: 'inbound' | 'outbound' | 'all';
  dateRange?: {
    start: Date;
    end: Date;
  } | null;
  search?: string;
};

interface CallsState extends LoadingState {
  calls: CallLog[];
  stats: CallStats;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  filters: CallFilter;
  fetchCalls: () => Promise<void>;
  fetchStats: () => Promise<void>;
  setPage: (page: number) => void;
  setFilters: (filters: Partial<CallFilter>) => void;
  setPageSize: (size: number) => void;
}

export const useCallsStore = create<CallsState>((set, get) => ({
  calls: [],
  stats: {
    totalCalls: 0,
    avgDuration: '0m',
    uniqueCallers: 0,
    successRate: '0%',
  },
  isLoading: false,
  error: null,
  totalPages: 1,
  currentPage: 1,
  pageSize: 10,
  filters: {
    type: 'all',
    dateRange: null,
    search: '',
  },

  setPage: (page: number) => {
    set({ currentPage: page });
    get().fetchCalls();
  },

  setFilters: (newFilters: Partial<CallFilter>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      currentPage: 1,
    }));
    get().fetchCalls();
  },

  setPageSize: (size: number) => {
    set({ pageSize: size, currentPage: 1 });
    get().fetchCalls();
  },

  fetchCalls: async () => {
    const state = get();
    const { userId } = useAuthStore.getState(); // Fetch userId from auth store
    
    if (!userId) {
      logger.component('CallsStore').error('No user ID available for fetchCalls');
      return;
    }

    set({ isLoading: true, error: null });

    try {
      logger.component('CallsStore').info('Fetching calls for user', { userId });

      let query = supabase
        .from('call_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);  // Filter calls by user_id

      // Apply filters
      if (state.filters.type && state.filters.type !== 'all') {
        query = query.eq('call_type', state.filters.type);
      }

      if (state.filters.dateRange) {
        query = query
          .gte('timestamp', state.filters.dateRange.start.toISOString())
          .lte('timestamp', state.filters.dateRange.end.toISOString());
      }

      if (state.filters.search) {
        query = query.ilike('caller_number', `%${state.filters.search}%`);
      }

      // Add pagination
      const from = (state.currentPage - 1) * state.pageSize;
      const to = from + state.pageSize - 1;

      const { data, count, error } = await query
        .order('timestamp', { ascending: false }) // Always show newest first
        .range(from, to);

      if (error) {
        logger.component('CallsStore').error('Error fetching calls', { userId }, error);
        throw error;
      }

      logger.component('CallsStore').info('Fetched calls', { userId, count: data?.length || 0 });

      // Ensure frontend only displays calls that exist in the database
      set({
        calls: data || [],
        totalPages: Math.ceil((count || 0) / state.pageSize),
        isLoading: false,
      });

      // Enable real-time sync for call_logs (deletes, inserts, updates)
      supabase
        .channel('call_logs_changes') // Create a real-time channel
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'call_logs' }, payload => {
          logger.component('CallsStore').info('Deleted call detected', { deletedCallId: payload.old.id });
          set(prevState => ({
            calls: prevState.calls.filter(call => call.id !== payload.old.id)
          }));
        })
        .subscribe();

    } catch (error) {
      logger.component('CallsStore').error('Error in fetchCalls', { userId }, error as Error);
      set({ 
        error: 'Failed to fetch calls',
        isLoading: false,
      });
    }
  },

  fetchStats: async () => {
    const { userId } = useAuthStore.getState(); // Fetch userId from auth store
    
    if (!userId) {
      logger.component('CallsStore').error('No user ID available for fetchStats');
      return;
    }

    try {
      logger.component('CallsStore').info('Fetching stats for user', { userId });
      
      const { data: calls, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('user_id', userId)  // Filter by user_id
        .order('timestamp', { ascending: false });

      if (error) throw error;

      if (calls) {
        const totalCalls = calls.length;
        const uniqueCallers = new Set(calls.map(call => call.caller_number)).size;
        const totalDuration = calls.reduce((sum, call) => sum + call.duration, 0);
        const avgDurationMinutes = totalCalls > 0 ? Math.round(totalDuration / totalCalls / 60) : 0;
        
        set({
          stats: {
            totalCalls,
            avgDuration: `${avgDurationMinutes}m`,
            uniqueCallers,
            successRate: `${totalCalls > 0 ? Math.round((calls.filter(c => c.duration > 0).length / totalCalls) * 100) : 0}%`,
          }
        });
      }
    } catch (error) {
      logger.component('CallsStore').error('Error fetching stats', { userId }, error as Error);
    }
  },
}));
