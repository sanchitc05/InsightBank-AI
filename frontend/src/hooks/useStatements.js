import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';

/**
 * Hook for statement-related operations
 */
export const useStatements = () => {
  return useQuery({
    queryKey: ['statements'],
    queryFn: ({ signal }) => api.fetchStatements(signal),
  });
};

/**
 * Hook for uploading a statement
 */
export const useUploadStatement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.uploadStatement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
};

/**
 * Hook for deleting a statement
 */
export const useDeleteStatement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteStatement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
