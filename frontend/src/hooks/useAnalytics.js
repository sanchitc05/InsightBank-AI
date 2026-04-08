import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';

/**
 * Hook for dashboard summary statistics
 */
export const useDashboardSummary = (id) => {
  return useQuery({
    queryKey: ['dashboard-summary', id],
    queryFn: ({ signal }) => api.fetchDashboardSummary(id, signal),
    enabled: !!id,
  });
};

/**
 * Hook for category breakdown chart
 */
export const useCategoryBreakdown = (id) => {
  return useQuery({
    queryKey: ['category-breakdown', id],
    queryFn: ({ signal }) => api.fetchCategoryBreakdown(id, signal),
    enabled: !!id,
  });
};

/**
 * Hook for monthly trends chart
 */
export const useMonthlyTrends = () => {
  return useQuery({
    queryKey: ['monthly-trends'],
    queryFn: ({ signal }) => api.fetchMonthlyTrends(signal),
  });
};

/**
 * Hook for category comparison (Current vs Average)
 */
export const useCategoryComparison = (category) => {
  return useQuery({
    queryKey: ['category-comparison', category],
    queryFn: ({ signal }) => api.fetchCategoryComparison(category, null, signal),
    enabled: !!category,
  });
};
