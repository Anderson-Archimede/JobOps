/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_ENABLED?: string;
  /** Backend origin for API calls (e.g. https://jobops.onrender.com). Avoids Vercel proxy timeout. */
  readonly VITE_API_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
