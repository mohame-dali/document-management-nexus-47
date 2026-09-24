import { useQuery } from '@tanstack/react-query';
import { getOrganizationSettings } from '@/services/organizationSettingsService';

export const useSetupStatus = () => {
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const getDeptId = (field: unknown): string | null => {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && '_id' in (field as { _id: string })) {
      return (field as { _id: string })._id;
    }
    return null;
  };

  const rhDeptId = getDeptId(settings?.rhDepartmentId);
  const boDeptId = getDeptId(settings?.bureauOrdreDepartmentId);
  const dirDeptId = getDeptId(settings?.bureauDirecteurDepartmentId);
  const nomAdmin = settings?.nomAdministration?.trim();

  const isSetupComplete = Boolean(
    nomAdmin &&
    rhDeptId &&
    boDeptId &&
    dirDeptId
  );

  return {
    isSetupComplete,
    isLoading,
    settings,
    refetch,
    rhDeptId,
    boDeptId,
    dirDeptId,
    nomAdmin
  };
};
