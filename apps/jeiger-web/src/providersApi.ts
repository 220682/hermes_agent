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

export class ProvidersStatusError extends Error {
  constructor(readonly status: number) {
    super(`GET /api/providers/status -> ${status}`);
  }
}

export async function fetchProvidersStatus(): Promise<ProvidersStatus> {
  const response = await fetch("/api/providers/status", {
    headers: { "X-Hermes-Session-Token": HERMES_TOKEN },
  });

  if (!response.ok) {
    throw new ProvidersStatusError(response.status);
  }

  return (await response.json()) as ProvidersStatus;
}
