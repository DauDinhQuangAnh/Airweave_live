export interface EssentialProfileStatus {
  isComplete: boolean;
  score: number; // 0 to 100
  missingFields: {
    key: string;
    labelVi: string;
    labelEn: string;
  }[];
}

export function checkEssentialProfile(
  profile: any,
  preferences: any,
  locations: any[] = []
): EssentialProfileStatus {
  const missingFields: { key: string; labelVi: string; labelEn: string }[] = [];
  let completedCount = 0;
  const totalCount = 5;

  // 1. Display Name
  if (profile?.display_name && profile.display_name.trim().length > 0) {
    completedCount += 1;
  } else {
    missingFields.push({
      key: 'display_name',
      labelVi: 'Họ và tên',
      labelEn: 'Full Name',
    });
  }

  // 2. Phone
  if (profile?.phone && profile.phone.trim().length >= 8) {
    completedCount += 1;
  } else {
    missingFields.push({
      key: 'phone',
      labelVi: 'Số điện thoại',
      labelEn: 'Phone Number',
    });
  }

  // 3. Date of Birth
  if (profile?.date_of_birth && String(profile.date_of_birth).trim().length > 0) {
    completedCount += 1;
  } else {
    missingFields.push({
      key: 'date_of_birth',
      labelVi: 'Ngày sinh',
      labelEn: 'Date of Birth',
    });
  }

  // 4. Health Tier / Medical Sensitivity
  const hasHealthTier =
    preferences?.health_tier &&
    Array.isArray(preferences.health_tier) &&
    preferences.health_tier.length > 0;
  const hasSensitiveGroup =
    preferences?.sensitive_group && preferences.sensitive_group !== 'none';

  if (hasHealthTier || hasSensitiveGroup) {
    completedCount += 1;
  } else {
    missingFields.push({
      key: 'health_tier',
      labelVi: 'Nhóm sức khỏe / Nhạy cảm AQI',
      labelEn: 'Health Profile / AQI Sensitivity',
    });
  }

  // 5. Primary Location (Home or Work or School)
  if (Array.isArray(locations) && locations.length > 0) {
    completedCount += 1;
  } else {
    missingFields.push({
      key: 'locations',
      labelVi: 'Địa điểm thường xuyên (Nhà / Công ty)',
      labelEn: 'Primary Location (Home / Work)',
    });
  }

  const score = Math.round((completedCount / totalCount) * 100);

  return {
    isComplete: missingFields.length === 0,
    score,
    missingFields,
  };
}
