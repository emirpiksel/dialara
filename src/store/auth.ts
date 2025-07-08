import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  clinicName: string | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userId: null,
  email: null,
  fullName: null,
  clinicName: null,
  isAdmin: false,
  loading: true,

  checkAuth: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      set({
        isAuthenticated: false,
        userId: null,
        email: null,
        fullName: null,
        clinicName: null,
        isAdmin: false,
        loading: false,
      });
      return;
    }

    const userId = user.id;
    const email = user.email ?? "";
    const fullName = user.user_metadata?.full_name ?? "";

    let { data: userData, error } = await supabase
      .from("users")
      .select("email, full_name, role, clinic_name")
      .eq("id", userId)
      .single();

    if (!userData || error) {
      const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
      const role = count === 0 ? "superadmin" : "admin";

      const insertRes = await supabase.from("users").upsert(
        [{ id: userId, email, full_name: fullName, role }],
        { onConflict: "id" }
      );

      if (insertRes.error) {
        console.error("User insert error:", insertRes.error);
        return;
      }

      userData = { email, full_name: fullName, role, clinic_name: null };
    }

    set({
      isAuthenticated: true,
      userId,
      email: userData.email,
      fullName: userData.full_name,
      clinicName: userData.clinic_name ?? null,
      isAdmin: userData.role === "admin" || userData.role === "superadmin",
      loading: false,
    });
  },

  signIn: async (email: string, password: string) => {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !user) throw error;

    const { data: userData } = await supabase
      .from("users")
      .select("role, full_name, clinic_name")
      .eq("id", user.id)
      .single();

    set({
      isAuthenticated: true,
      userId: user.id,
      email: user.email,
      fullName: userData?.full_name ?? "",
      clinicName: userData?.clinic_name ?? null,
      isAdmin: userData?.role === "admin" || userData?.role === "superadmin",
      loading: false,
    });
  },

  signUp: async (email: string, password: string, fullName: string) => {
    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error || !user) throw error;

    const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
    const role = count === 0 ? "superadmin" : "admin";

    const insertRes = await supabase.from("users").upsert(
      [{ id: user.id, email, full_name: fullName, role }],
      { onConflict: "id" }
    );

    if (insertRes.error) {
      console.error("Insert error after sign up:", insertRes.error);
      throw insertRes.error;
    }

    set({
      isAuthenticated: true,
      userId: user.id,
      email,
      fullName,
      clinicName: null,
      isAdmin: role === "admin" || role === "superadmin",
      loading: false,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      isAuthenticated: false,
      userId: null,
      email: null,
      fullName: null,
      clinicName: null,
      isAdmin: false,
      loading: false,
    });
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) throw error;
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },
}));
