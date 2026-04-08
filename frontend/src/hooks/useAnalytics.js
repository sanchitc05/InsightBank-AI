import { useQuery } from '@tanstack/react-query';
import * as api from '../api/api';

/**
 * Hook for dashboard summary statistics
 */
export const useDashboardSummary = () => {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: api.fetchDashboardSummary,
  });
};

/**
 * Hook for category breakdown chart
 */
export const useCategoryBreakdown = () => {
  return useQuery({
    queryKey: ['category-breakdown'],
    queryFn: api.fetchCategoryBreakdown,
  });
};

/**
 * Hook for monthly trends chart
 */
export const useMonthlyTrends = () => {
  return useQuery({
    queryKey: ['monthly-trends'],
    queryFn: api.fetchMonthlyTrends,
  });
};

/**
 * Hook for category comparison (Current vs Average)
 */
export const useCategoryComparison = (category) => {
  return useQuery({
    queryKey: ['category-comparison', category],
    queryFn: () => api.fetchCategoryComparison(category),
    enabled: !!category,
  });
};
