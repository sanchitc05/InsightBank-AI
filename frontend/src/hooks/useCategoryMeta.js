import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../services/api';

export function useCategoryMeta(statementId) {
  return useQuery({
    queryKey: ['category-meta', statementId],
    queryFn: async () => {
      if (!statementId) return {};
      const res = await getCategories(statementId);
      // Map category name to { color, icon }
      const meta = {};
      (res.data || []).forEach(cat => {
        meta[cat.category] = { color: cat.color, icon: cat.icon };
      });
      return meta;
    },
    enabled: !!statementId,
    staleTime: 1000 * 60 * 10,
  });
}
