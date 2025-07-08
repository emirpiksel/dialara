import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface WaitlistState {
  joinWaitlist: (email: string, source: string) => Promise<void>;
}

export const useWaitlistStore = create<WaitlistState>(() => ({
  joinWaitlist: async (email: string, source: string) => {
    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([{ email, source }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error joining waitlist:', error);
      throw error;
    }
  }
}));