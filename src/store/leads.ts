import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useAuthStore } from './auth';

type Lead = Database['public']['Tables']['leads']['Row'];

interface LeadsState {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  selectedStatus: string;
  searchQuery: string;
  fetchLeads: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setStatus: (status: string) => void;
  setSearchQuery: (query: string) => void;
  createLead: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'clinic_name'> & { agent_id?: string }) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  leads: [],
  loading: false,
  error: null,
  totalPages: 1,
  currentPage: 1,
  pageSize: 100,
  selectedStatus: 'all',
  searchQuery: '',

  fetchLeads: async () => {
    const state = get();
    const { userId } = useAuthStore.getState();

    if (!userId) {
      console.error('❌ No user ID available, skipping lead fetch.');
      return;
    }

    set({ loading: true, error: null });

    try {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (state.selectedStatus !== 'all') {
        query = query.eq('status', state.selectedStatus);
      }

      if (state.searchQuery) {
        query = query.or(`full_name.ilike.%${state.searchQuery}%,phone_number.ilike.%${state.searchQuery}%,email.ilike.%${state.searchQuery}%`);
      }

      const from = (state.currentPage - 1) * state.pageSize;
      const to = from + state.pageSize - 1;

      console.log(`📌 Fetching leads from index ${from} to ${to}`);

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      console.log("✅ Leads fetched from Supabase:", data);

      set({
        leads: data || [],
        totalPages: Math.ceil((count || 0) / state.pageSize),
        loading: false,
      });
    } catch (error) {
      console.error('❌ Error fetching leads:', error);
      set({
        error: 'Failed to fetch leads',
        loading: false,
      });
    }
  },

  setPage: (page: number) => {
    set({ currentPage: page });
    get().fetchLeads();
  },

  setPageSize: (size: number) => {
    set({ pageSize: size, currentPage: 1 });
    get().fetchLeads();
  },

  setStatus: (status: string) => {
    set({ selectedStatus: status, currentPage: 1 });
    get().fetchLeads();
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query, currentPage: 1 });
    get().fetchLeads();
  },

  createLead: async (lead) => {
    const { userId, clinicName } = useAuthStore.getState();

    if (!userId) {
      console.error('❌ No user ID available, cannot create lead.');
      return;
    }

    if (!clinicName) {
      console.error('❌ No clinic name found in auth store, cannot create lead.');
      return;
    }

    // Default agent ID belirle (kendi sisteminde agent_id’ni kullan)
    const defaultAgentId = '780bad63-528a-46ac-8035-e213d01a8675'; 

    try {
      const { id, agent_id, ...newLeadData } = lead;
      console.log("🔄 Creating lead:", newLeadData);

      const { error } = await supabase
        .from('leads')
        .insert([{
          ...newLeadData,
          user_id: userId,
          clinic_name: clinicName,
          agent_id: agent_id || defaultAgentId,
        }]);

      if (error) throw error;

      console.log("✅ Lead created successfully!");
      get().fetchLeads();
    } catch (error) {
      console.error('❌ Error creating lead:', error);
      throw error;
    }
  },

  updateLead: async (id, updates) => {
    try {
      if (!id) {
        console.error("❌ Missing ID in update request!");
        return;
      }

      console.log("🔄 Updating lead with ID:", id, "Updates:", updates);

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Lead updated successfully!", data);

      if (!data) {
        console.error("❌ Lead update failed: No data returned.");
        return;
      }

      set((state) => ({
        leads: state.leads.map((lead) =>
          lead.id === id ? { ...lead, ...updates } : lead
        ),
      }));
    } catch (error) {
      console.error('❌ Error updating lead:', error);
      throw error;
    }
  },

  deleteLead: async (id) => {
    try {
      console.log("🗑 Deleting lead with ID:", id);

      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log("✅ Lead deleted successfully!");
      get().fetchLeads();
    } catch (error) {
      console.error('❌ Error deleting lead:', error);
      throw error;
    }
  },
}));
