import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/api';

/**
 * Hook for fetching AI insights for a statement
 */
export const useInsights = (statementId) => {
  return useQuery({
    queryKey: ['insights', statementId],
    queryFn: () => api.fetchInsights(statementId),
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
