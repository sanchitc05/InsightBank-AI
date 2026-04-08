import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';

/**
 * Hook for fetching AI insights for a statement
 */
export const useInsights = (statementId) => {
  return useQuery({
    queryKey: ['insights', statementId],
    queryFn: ({ signal }) => api.fetchInsights(statementId, signal),
    enabled: !!statementId,
  });
};

/**
 * Hook for generating new insights
 */
export const useGenerateInsights = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.generateInsights,
    onSuccess: (data, statementId) => {
      queryClient.invalidateQueries({ queryKey: ['insights', statementId] });
    },
  });
};
