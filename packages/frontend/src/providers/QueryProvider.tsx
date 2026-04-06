/**
 * React Query Provider
 *
 * Configures and provides the React Query client for the application.
 * Non-component exports (getQueryClient, useQueryClient) live in queryClient.ts
 * to satisfy react-refresh fast-refresh requirements.
 *
 * @module providers/QueryProvider
 */

import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { getQueryClient } from './queryClient';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const client = getQueryClient();

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

export default QueryProvider;
