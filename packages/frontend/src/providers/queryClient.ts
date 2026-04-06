/**
 * Query Client singleton and utilities
 *
 * Separated from QueryProvider to satisfy react-refresh fast-refresh requirements.
 * Component files should only export components; utilities live here.
 */

import { QueryClient } from '@tanstack/react-query';
import { env } from '../config';
import { AuthError } from '../services/auth';

const DEFAULT_STALE_TIME = 5 * 60 * 1000;
const DEFAULT_GC_TIME = 30 * 60 * 1000;

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        retry: (failureCount, error) => {
          if (error instanceof AuthError) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: env.isProduction,
        refetchOnMount: 'always',
        networkMode: 'always',
      },
      mutations: {
        retry: 1,
        networkMode: 'always',
      },
    },
  });
}

let queryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
}

export function useQueryClient(): QueryClient {
  return getQueryClient();
}
