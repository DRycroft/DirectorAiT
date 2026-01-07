
/**
 * Enhanced React Query Configuration
 * 
 * Provides optimized QueryClient configuration with caching strategies,
 * retry logic, and performance optimizations.
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { getUserFriendlyError } from './errorHandling';

/**
 * Default query options for React Query
 */
const defaultQueryOptions: DefaultOptions = {
  queries: {
    // Stale time: Data is considered fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    
    // Cache time: Keep unused data in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    
    // Retry failed requests 3 times with exponential backoff
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    
    // Exponential backoff delay
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Refetch on window focus for important data
    refetchOnWindowFocus: true,
    
    // Don't refetch on mount if data is fresh
    refetchOnMount: false,
    
    // Refetch on reconnect
    refetchOnReconnect: true,
    
    // Error handling
    throwOnError: false,
  },
  mutations: {
    // Retry mutations once
    retry: 1,
    
    // Error handling for mutations
    onError: (error: any) => {
      const message = getUserFriendlyError(error);
      console.error('Mutation error:', message);
    },
  },
};

/**
 * Create and configure QueryClient
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
  });
}

/**
 * Query key factories for consistent cache keys
 * Helps with cache invalidation and organization
 */
export const queryKeys = {
  // Auth
  auth: {
    user: () => ['auth', 'user'] as const,
    session: () => ['auth', 'session'] as const,
  },
  
  // Organizations
  organizations: {
    all: () => ['organizations'] as const,
    detail: (id: string) => ['organizations', id] as const,
    settings: (id: string) => ['organizations', id, 'settings'] as const,
  },
  
  // Boards
  boards: {
    all: (orgId: string) => ['boards', orgId] as const,
    detail: (id: string) => ['boards', 'detail', id] as const,
    members: (id: string) => ['boards', id, 'members'] as const,
  },
  
  // Board Papers
  boardPapers: {
    all: (orgId: string) => ['board-papers', orgId] as const,
    detail: (id: string) => ['board-papers', 'detail', id] as const,
    byBoard: (boardId: string) => ['board-papers', 'board', boardId] as const,
  },
  
  // Templates
  templates: {
    all: (orgId: string) => ['templates', orgId] as const,
    detail: (id: string) => ['templates', 'detail', id] as const,
    byType: (orgId: string, type: string) => ['templates', orgId, type] as const,
  },
  
  // Compliance
  compliance: {
    all: (orgId: string) => ['compliance', orgId] as const,
    detail: (id: string) => ['compliance', 'detail', id] as const,
    upcoming: (orgId: string) => ['compliance', orgId, 'upcoming'] as const,
  },
  
  // Members
  members: {
    all: (orgId: string) => ['members', orgId] as const,
    detail: (id: string) => ['members', 'detail', id] as const,
    pending: (orgId: string) => ['members', orgId, 'pending'] as const,
  },
  
  // Dashboard
  dashboard: {
    metrics: (orgId: string, period: string) => ['dashboard', orgId, 'metrics', period] as const,
    widgets: (orgId: string) => ['dashboard', orgId, 'widgets'] as const,
  },
};

/**
 * Prefetch utilities for optimistic loading
 */
export const prefetchQueries = {
  /**
   * Prefetch board papers when hovering over board
   */
  boardPapers: async (queryClient: QueryClient, boardId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.boardPapers.byBoard(boardId),
      queryFn: async () => {
        // Import dynamically to avoid circular dependencies
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('board_papers')
          .select('*')
          .eq('board_id', boardId);
        if (error) throw error;
        return data;
      },
    });
  },
  
  /**
   * Prefetch board details
   */
  boardDetail: async (queryClient: QueryClient, boardId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.boards.detail(boardId),
      queryFn: async () => {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('boards')
          .select('*')
          .eq('id', boardId)
          .single();
        if (error) throw error;
        return data;
      },
    });
  },
};

/**
 * Cache invalidation utilities
 */
export const invalidateQueries = {
  /**
   * Invalidate all board-related queries
   */
  boards: (queryClient: QueryClient, orgId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.boards.all(orgId) });
  },
  
  /**
   * Invalidate all board paper queries
   */
  boardPapers: (queryClient: QueryClient, orgId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.boardPapers.all(orgId) });
  },
  
  /**
   * Invalidate all template queries
   */
  templates: (queryClient: QueryClient, orgId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.templates.all(orgId) });
  },
  
  /**
   * Invalidate all compliance queries
   */
  compliance: (queryClient: QueryClient, orgId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.compliance.all(orgId) });
  },
};
