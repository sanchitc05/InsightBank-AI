import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';

/**
 * Hook for fetching transactions
 */
export const useTransactions = (params) => {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: ({ signal }) => api.fetchTransactions(params, signal),
    placeholderData: (previousData) => previousData,
  });
};

export const useDashboardTransactions = (selectedMonth) => {
  return useQuery({
    queryKey: ['dashboard-transactions', selectedMonth ?? 'all'],
    queryFn: ({ signal }) => api.fetchDashboardTransactions(selectedMonth, signal),
    placeholderData: (previousData) => previousData,
  });
};
