/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HERMES_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
