import { createClient } from '@insforge/sdk';

export const insforgeBaseUrl = import.meta.env.VITE_INSFORGE_BASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string | undefined;

export const isInsforgeConfigured = Boolean(insforgeBaseUrl && insforgeBaseUrl.trim().length > 0);

export const insforge = isInsforgeConfigured
  ? createClient({
      baseUrl: insforgeBaseUrl!,
      anonKey: anonKey?.trim() ? anonKey : undefined,
    })
  : null;

