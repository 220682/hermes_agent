/** Account-selector status: GET /api/providers/status (hermes_cli/web_routers/providers_status.py). */

import type { ProviderId } from "./gateway";

const HERMES_TOKEN = import.meta.env.VITE_HERMES_TOKEN ?? "";

export interface ProviderStatus {
  available: boolean;
  logged_in: boolean;
  plan: string;
  detail: string;
  login_command: string;
}

export type ProvidersStatus = Record<ProviderId, ProviderStatus>;

export async function fetchProvidersStatus(): Promise<ProvidersStatus> {
  const response = await fetch("/api/providers/status", {
    headers: { "X-Hermes-Session-Token": HERMES_TOKEN },
  });

  if (!response.ok) {
    throw new Error(`GET /api/providers/status -> ${response.status}`);
  }

  return (await response.json()) as ProvidersStatus;
}
