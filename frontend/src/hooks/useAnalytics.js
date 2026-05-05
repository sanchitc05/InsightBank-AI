import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';

/**
 * Hook for dashboard summary statistics
 */
export const useDashboardSummary = (selectedMonth) => {
  return useQuery({
    queryKey: ['dashboard-summary', selectedMonth ?? 'all'],
    queryFn: ({ signal }) => api.fetchDashboardSummary(selectedMonth, signal),
  });
};

/**
 * Hook for category breakdown chart
 */
export const useCategoryBreakdown = (selectedMonth) => {
  return useQuery({
    queryKey: ['category-breakdown', selectedMonth ?? 'all'],
    queryFn: ({ signal }) => api.fetchCategoryBreakdown(selectedMonth, signal),
  });
};

/**
 * Hook for monthly trends chart
 */
export const useMonthlyTrends = (selectedMonth) => {
  return useQuery({
    queryKey: ['monthly-trends', selectedMonth ?? 'all'],
    queryFn: ({ signal }) => api.fetchMonthlyTrends(selectedMonth, signal),
  });
};

/**
 * Hook for comparing two statements
 */
export const useCategoryComparison = (statementIdA, statementIdB) => {
  return useQuery({
    queryKey: ['category-comparison', statementIdA, statementIdB],
    queryFn: ({ signal }) => api.fetchCategoryComparison(statementIdA, statementIdB, signal),
    enabled: !!statementIdA && !!statementIdB,
  });
};
