import { useEffect, useState, useCallback } from 'react';
import { medicalApi } from '@/integrations/api';
import { useAuth } from '@/hooks/use-auth';

export interface MedicalProfile {
  id: string;
  user_id: string;
  relation: string;
  display_name: string;
  birth_year: number | null;
  blood_type: string | null;
  emergency_phone: string | null;
  emergency_name: string | null;
  avatar_emoji: string | null;
}

export interface MedicalCondition {
  id: string;
  profile_id: string;
  category: string;
  code: string;
  note: string | null;
}

export function useMedicalProfiles() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<MedicalProfile[]>([]);
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setConditions([]);
      setLoading(false);
      return;
    }
    const [p, c] = await Promise.all([
      medicalApi.listProfiles().catch(() => []),
      medicalApi.listConditions().catch(() => []),
    ]);
    setProfiles(p as MedicalProfile[]);
    setConditions(c as MedicalCondition[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upsertProfile = useCallback(
    async (patch: Partial<MedicalProfile> & { id?: string }) => {
      if (!user) return null;
      const { id, ...rest } = patch;
      const data = id
        ? await medicalApi.updateProfile(id, rest)
        : await medicalApi.createProfile({ display_name: '', ...rest });
      await reload();
      return data as MedicalProfile;
    },
    [user, reload]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await medicalApi.removeProfile(id);
      await reload();
    },
    [reload]
  );

  const toggleCondition = useCallback(
    async (profile_id: string, category: string, code: string, note?: string) => {
      if (!user) return;
      // BE tự quyết định thêm hay xoá dựa trên trạng thái hiện tại trong DB
      await medicalApi.toggleCondition(profile_id, category, code, note);
      await reload();
    },
    [user, reload]
  );

  const updateConditionNote = useCallback(
    async (profile_id: string, category: string, code: string, note: string) => {
      if (!user) return;
      await medicalApi.setConditionNote(profile_id, category, code, note);
      await reload();
    },
    [user, reload]
  );

  return {
    profiles,
    conditions,
    loading,
    upsertProfile,
    deleteProfile,
    toggleCondition,
    updateConditionNote,
    reload,
  };
}
