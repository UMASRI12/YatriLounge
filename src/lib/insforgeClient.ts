import { createClient } from '@insforge/sdk';

const baseUrl = import.meta.env.VITE_INSFORGE_BASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string | undefined;

export const isInsforgeConfigured = Boolean(baseUrl && baseUrl.trim().length > 0);

export const insforge = isInsforgeConfigured
  ? createClient({
      baseUrl: baseUrl!,
      anonKey: anonKey?.trim() ? anonKey : undefined,
    })
  : null;

