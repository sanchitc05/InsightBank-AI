import { useQuery } from '@tanstack/react-query';
import * as api from '../api/api';

/**
 * Hook for fetching transactions
 */
export const useTransactions = (params) => {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api.fetchTransactions(params),
    placeholderData: (previousData) => previousData,
  });
};
