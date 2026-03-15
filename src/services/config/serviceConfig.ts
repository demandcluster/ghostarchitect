/**
 * Service config — env-flag swap between localStorage (v1) and API (v2) adapters.
 * Set NEXT_PUBLIC_BACKEND_ENABLED=true to use the API adapter.
 */

import type { GameService } from '@/services/gameService';

let _service: GameService | null = null;

export async function getGameService(): Promise<GameService> {
  if (_service) return _service;

  if (process.env.NEXT_PUBLIC_BACKEND_ENABLED === 'true') {
    const { apiAdapter } = await import('@/services/adapters/apiAdapter');
    _service = apiAdapter;
  } else {
    const { localStorageAdapter } = await import('@/services/adapters/localStorageAdapter');
    _service = localStorageAdapter;
  }

  return _service;
}
