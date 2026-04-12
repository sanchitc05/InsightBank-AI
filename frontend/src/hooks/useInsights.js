import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { useToast } from './useToast';

const normalizeInsights = (data) => {
  if (Array.isArray(data)) return data;
  return data?.insights || [];
};

/**
 * Hook for fetching AI insights for a statement
 */
export const useInsights = (statementId) => {
  return useQuery({
    queryKey: ['insights', statementId],
    queryFn: ({ signal }) => api.fetchInsights(statementId, signal),
    enabled: !!statementId,
    select: normalizeInsights,
  });
};

/**
 * Hook for generating new insights
 */
export const useGenerateInsights = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: api.generateInsights,
    onSuccess: (data, statementId) => {
      queryClient.invalidateQueries({ queryKey: ['insights', statementId] });
      showToast('Insights generated successfully', 'success');
    },
    onError: (error) => {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      let message = detail || 'Failed to generate insights.';
      if (status === 429) {
        message = 'Please wait a minute before generating insights again.';
      } else if (status === 404) {
        message = detail || 'Statement not found.';
      } else if (status === 422) {
        message = detail || 'No transactions found for this statement.';
      }
      showToast(message, 'error');
    },
  });
};
