import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';

// ── Statements ────────────────────────────────
export const useStatementsQuery = () => {
  return useQuery({
    queryKey: ['statements'],
    queryFn: (context) => api.getStatements(context.signal),
    select: (data) => data.data || [],
  });
};

export const useStatementQuery = (id) => {
  return useQuery({
    queryKey: ['statement', id],
    queryFn: (context) => api.getStatement(id, context.signal),
    enabled: !!id,
  });
};

export const useDeleteStatementMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deleteStatement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements'] });
    },
  });
};

// ── Transactions ──────────────────────────────
export const useTransactionsQuery = (params, enabled = true) => {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: (context) => api.getTransactions(params, context.signal),
    enabled: enabled && !!params?.statement_id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// ── Analytics ─────────────────────────────────
export const useAnalyticsSummaryQuery = (id, enabled = true) => {
  return useQuery({
    queryKey: ['analytics', 'summary', id],
    queryFn: (context) => api.getAnalyticsSummary(id, context.signal),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCategoriesQuery = (id, enabled = true) => {
  return useQuery({
    queryKey: ['analytics', 'categories', id],
    queryFn: (context) => api.getCategories(id, context.signal),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTrendQuery = () => {
  return useQuery({
    queryKey: ['analytics', 'trend'],
    queryFn: (context) => api.getTrend(context.signal),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCompareQuery = (id1, id2, enabled = true) => {
  return useQuery({
    queryKey: ['analytics', 'compare', id1, id2],
    queryFn: (context) => api.getCompare(id1, id2, context.signal),
    enabled: enabled && !!id1 && !!id2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ── Insights ──────────────────────────────────
export const useInsightsQuery = (id, enabled = true) => {
  return useQuery({
    queryKey: ['insights', id],
    queryFn: (context) => api.getInsights(id, context.signal),
    enabled: enabled && !!id,
    select: (data) => data.data || [],
  });
};

export const useGenerateInsightsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.generateInsights(id),
    onSuccess: (data, id) => {
      // Invalidate insights for this statement
      queryClient.invalidateQueries({ queryKey: ['insights', id] });
    },
  });
};
