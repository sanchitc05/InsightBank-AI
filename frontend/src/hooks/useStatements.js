import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { useToast } from './useToast';

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
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ file, onProgress }) => api.uploadStatement(file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      showToast('Statement uploaded successfully', 'success');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      const message = error.response?.data?.detail || 'Failed to upload statement. Please check the file format.';
      showToast(message, 'error');
    }
  });
};

/**
 * Hook for deleting a statement
 */
export const useDeleteStatement = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: api.deleteStatement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast('Statement deleted successfully', 'success');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      const message = error.response?.data?.detail || 'Failed to delete statement.';
      showToast(message, 'error');
    }
  });
};
