/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOG_LEVEL?: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_VAPI_API_KEY: string;
  readonly VITE_VAPI_WEB_KEY: string;
  // Add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
