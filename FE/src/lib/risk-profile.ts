/**
 * Central mapping: user_preferences → risk profile + personalized guidance.
 * Pure functions, no side effects. Used by dashboard, AI chat, AI insight, SOS, smart route.
 *
 * IMPORTANT: Never diagnose. Never invent AQI numbers. Guidance text is cautious and
 * action-oriented based on the *user's profile*, not on a medical assessment.
 */

export type RiskGroup =
  | 'standard'
  | 'respiratory'
  | 'cardio'
  | 'air_sensitive'      // allergic rhinitis / sinusitis / eye / skin irritation
  | 'sensitive_group'    // child / elderly / caregiver
  | 'custom'             // user-described "Khác"
  | 'unknown';           // explicit "Not sure" or empty profile

export interface UserRiskInput {
  sensitive_group?: string | null;
  medical_history?: string[] | null;
  health_tier?: string[] | null;
  high_exposure?: boolean | null;
  not_sure?: boolean | null;
  custom_sensitivity_note?: string | null;
}

export interface RiskProfile {
  group: RiskGroup;
  label: { vi: string; en: string };
  highExposure: boolean;
  customNote?: string | null;
}

export function deriveRiskProfile(input: UserRiskInput | null | undefined): RiskProfile {
  if (!input)
    return { group: 'unknown', label: { vi: 'Chưa rõ', en: 'Unknown' }, highExposure: false };

  const med = input.medical_history ?? [];
  const tier = input.health_tier ?? [];
  const hasRespiratory = med.includes('asthma') || med.includes('copd') || med.includes('chronic_lung');
  const hasCardio = med.includes('cardio') || med.includes('stroke');
  const hasAirSensitive =
    med.includes('rhinitis') || med.includes('sinusitis') || med.includes('eye_irritation') || med.includes('skin_irritation');
  const hasCustom = med.includes('other') || !!input.custom_sensitivity_note?.trim();
  const isChild = tier.includes('children') || input.sensitive_group === 'child';
  const isElderly = tier.includes('elderly') || input.sensitive_group === 'elderly';
  const noKnown = med.includes('none');

  const highExposure = !!input.high_exposure;
  const customNote = input.custom_sensitivity_note?.trim() || null;

  // Priority: respiratory > cardio > air_sensitive > sensitive_group > custom > not_sure > standard
  if (hasRespiratory)
    return { group: 'respiratory', label: { vi: 'Hô hấp nhạy cảm', en: 'Respiratory sensitive' }, highExposure, customNote };
  if (hasCardio)
    return { group: 'cardio', label: { vi: 'Tim mạch nhạy cảm', en: 'Cardiovascular sensitive' }, highExposure, customNote };
  if (hasAirSensitive)
    return { group: 'air_sensitive', label: { vi: 'Nhạy cảm với chất lượng không khí', en: 'Air quality sensitive' }, highExposure, customNote };
  if (isChild || isElderly)
    return { group: 'sensitive_group', label: { vi: 'Nhóm nhạy cảm', en: 'Sensitive group' }, highExposure, customNote };
  if (hasCustom)
    return { group: 'custom', label: { vi: 'Yếu tố nhạy cảm khác', en: 'Custom sensitive' }, highExposure, customNote };
  if (input.not_sure)
    return { group: 'unknown', label: { vi: 'Chưa rõ', en: 'Unknown' }, highExposure, customNote };
  if (noKnown)
    return { group: 'standard', label: { vi: 'Tiêu chuẩn', en: 'Standard' }, highExposure, customNote };

  return { group: 'standard', label: { vi: 'Tiêu chuẩn', en: 'Standard' }, highExposure, customNote };
}

export function getPersonalizedGuidance(
  risk: RiskProfile,
  aqi: number | null | undefined,
  lang: 'vi' | 'en' = 'vi'
): { headline: string; body: string } {
  const isVi = lang === 'vi';
  if (!aqi || aqi <= 0) {
    return {
      headline: isVi ? 'Dữ liệu AQI chưa khả dụng' : 'AQI data unavailable',
      body: isVi
        ? 'Chưa có dữ liệu AQI mới. Hãy thử làm mới hoặc cho phép vị trí để xem khuyến nghị cá nhân hóa.'
        : 'No fresh AQI yet. Refresh or enable location to see personalized guidance.',
    };
  }

  const tier = aqi >= 200 ? 'very_unhealthy' : aqi >= 150 ? 'unhealthy' : aqi >= 100 ? 'moderate_plus' : aqi >= 50 ? 'moderate' : 'good';

  if (risk.group === 'respiratory') {
    if (tier === 'good') return v(isVi, 'Không khí tốt cho hô hấp', 'Vẫn nên mang theo thuốc xịt nếu bạn dùng thường xuyên.', 'Air is good for breathing', 'Keep your inhaler with you if you usually use one.');
    if (tier === 'moderate') return v(isVi, 'Nhóm hô hấp nhạy cảm cần lưu ý', 'AQI hiện tại có thể gây khó chịu nhẹ. Cân nhắc giảm vận động ngoài trời kéo dài.', 'Respiratory sensitive — take note', 'Current AQI may cause mild discomfort. Consider reducing prolonged outdoor activity.');
    return v(isVi,
      'Bạn thuộc nhóm hô hấp nhạy cảm',
      'AQI hiện tại có thể làm tăng khó thở. Cân nhắc giảm tiếp xúc ngoài trời và chọn lộ trình có PM2.5 thấp hơn.',
      'You are in a respiratory sensitive group',
      'Current air quality may increase breathing discomfort. Reduce outdoor exposure and choose a lower PM2.5 route.');
  }

  if (risk.group === 'cardio') {
    if (tier === 'good' || tier === 'moderate') return v(isVi, 'Không khí ở mức chấp nhận được', 'Vẫn nên tránh hoạt động cường độ cao trong khu vực giao thông đông đúc.', 'Air is acceptable', 'Still avoid intense activity in heavy-traffic areas.');
    return v(isVi,
      'Bạn thuộc nhóm tim mạch nhạy cảm',
      'Khi AQI/PM2.5 tăng, nên giảm hoạt động ngoài trời cường độ cao và tránh khu vực ô nhiễm nặng.',
      'You are in a cardiovascular sensitive group',
      'When AQI/PM2.5 is elevated, reduce intense outdoor activity and avoid high-pollution areas.');
  }

  if (risk.group === 'air_sensitive') {
    return v(isVi,
      'Bạn có dấu hiệu nhạy cảm với chất lượng không khí',
      'Khi AQI/PM2.5 tăng cao, nên hạn chế tiếp xúc ngoài trời kéo dài và ưu tiên khu vực ít ô nhiễm hơn.',
      'You appear sensitive to air quality',
      'When AQI/PM2.5 is elevated, limit prolonged outdoor exposure and prefer lower-pollution areas.');
  }

  if (risk.group === 'sensitive_group') {
    if (tier === 'good') return v(isVi, 'Phù hợp cho trẻ em / người cao tuổi', 'Vẫn nên kiểm tra lại trước các hoạt động ngoài trời dài.', 'Suitable for children / elderly', 'Still check again before any long outdoor activity.');
    return v(isVi,
      'Khu vực có thể không phù hợp cho người nhạy cảm',
      'Trẻ em và người cao tuổi nên hạn chế hoạt động ngoài trời kéo dài. Kiểm tra lại AQI trước khi ra ngoài.',
      'May not be suitable for sensitive people',
      'Children and elderly should limit prolonged outdoor activity. Re-check AQI before going outside.');
  }

  if (risk.group === 'custom') {
    return v(isVi,
      'Hồ sơ của bạn có ghi nhận yếu tố nhạy cảm khác',
      'AirWeave sẽ ưu tiên cảnh báo thận trọng hơn khi chất lượng không khí xấu.',
      'Your profile notes a custom sensitivity',
      'AirWeave will lean cautious when air quality is poor.');
  }

  if (risk.group === 'unknown') {
    return v(isVi,
      'Bạn có thể hoàn thiện hồ sơ sức khỏe',
      'Hoàn thiện Hồ sơ Sức khỏe để nhận khuyến nghị phù hợp hơn.',
      'Complete your Health Profile',
      'Complete your Health Profile to get more personalized guidance.');
  }

  if (tier === 'good') return v(isVi, 'Chất lượng không khí tốt', 'Phù hợp cho hoạt động ngoài trời.', 'Air quality is good', 'Suitable for outdoor activity.');
  if (tier === 'moderate') return v(isVi, 'Chất lượng không khí trung bình', 'Có thể hoạt động bình thường, lưu ý nếu vận động mạnh kéo dài.', 'Air quality is moderate', 'Normal activity is fine; take note for prolonged exertion.');
  return v(isVi,
    'Chất lượng không khí cần lưu ý',
    'Cân nhắc giảm thời gian hoạt động ngoài trời kéo dài.',
    'Air quality requires attention',
    'Consider limiting long outdoor activity.');
}

function v(isVi: boolean, hVi: string, bVi: string, hEn: string, bEn: string) {
  return isVi ? { headline: hVi, body: bVi } : { headline: hEn, body: bEn };
}

export type CTAKey =
  | 'view_map'
  | 'cleaner_route'
  | 'lower_pm25_route'
  | 'avoid_high_aqi'
  | 'check_nearby'
  | 'monitor_area'
  | 'enable_alerts'
  | 'open_sos'
  | 'view_medical_id'
  | 'ask_ai'
  | 'share_location';

export function getCTAPriority(risk: RiskGroup): CTAKey[] {
  switch (risk) {
    case 'respiratory':
      return ['lower_pm25_route', 'enable_alerts', 'open_sos', 'view_medical_id', 'ask_ai'];
    case 'cardio':
      return ['avoid_high_aqi', 'lower_pm25_route', 'view_medical_id', 'share_location', 'ask_ai'];
    case 'air_sensitive':
      return ['cleaner_route', 'enable_alerts', 'monitor_area', 'ask_ai'];
    case 'sensitive_group':
      return ['monitor_area', 'enable_alerts', 'cleaner_route', 'ask_ai'];
    case 'custom':
      return ['enable_alerts', 'cleaner_route', 'ask_ai', 'view_medical_id'];
    case 'unknown':
      return ['view_map', 'enable_alerts', 'ask_ai'];
    case 'standard':
    default:
      return ['view_map', 'cleaner_route', 'check_nearby'];
  }
}

export function getAIGuardrails(risk: RiskProfile, lang: 'vi' | 'en'): string {
  const base =
    lang === 'vi'
      ? 'Hướng dẫn nội bộ: KHÔNG chẩn đoán bệnh. KHÔNG kê đơn thuốc. KHÔNG khẳng định tình trạng khẩn cấp. Đưa ra hướng dẫn thận trọng, gợi ý giảm tiếp xúc, gợi ý lộ trình sạch nếu có, và gợi ý mở AirWeave SOS / Medical ID nếu người dùng thấy không khoẻ.'
      : 'Internal guidance: DO NOT diagnose disease. DO NOT prescribe medication. DO NOT claim emergency certainty. Provide cautious, non-diagnostic guidance, recommend reducing exposure, suggest a cleaner route if available, and suggest opening AirWeave SOS / Medical ID if the user feels unwell.';

  const persona =
    risk.group === 'respiratory'
      ? (lang === 'vi' ? 'Người dùng thuộc nhóm hô hấp nhạy cảm (hen suyễn hoặc COPD).' : 'User is in a respiratory sensitive group (asthma or COPD).')
      : risk.group === 'cardio'
      ? (lang === 'vi' ? 'Người dùng thuộc nhóm tim mạch nhạy cảm.' : 'User is in a cardiovascular sensitive group.')
      : risk.group === 'air_sensitive'
      ? (lang === 'vi' ? 'Người dùng nhạy cảm với chất lượng không khí (viêm mũi dị ứng / viêm xoang / kích ứng mắt / da).' : 'User is sensitive to air quality (rhinitis / sinusitis / eye / skin irritation).')
      : risk.group === 'sensitive_group'
      ? (lang === 'vi' ? 'Người dùng chăm sóc trẻ nhỏ hoặc người cao tuổi.' : 'User cares for a child or elderly person.')
      : risk.group === 'custom'
      ? (lang === 'vi' ? `Người dùng tự mô tả yếu tố nhạy cảm: "${risk.customNote ?? ''}". KHÔNG suy luận thành chẩn đoán.` : `User-described sensitivity: "${risk.customNote ?? ''}". Do NOT infer a diagnosis.`)
      : risk.group === 'unknown'
      ? (lang === 'vi' ? 'Hồ sơ sức khoẻ chưa rõ — gợi ý hoàn thành Hồ sơ Sức khỏe.' : 'Health profile unknown — suggest completing the Health Profile.')
      : (lang === 'vi' ? 'Người dùng không thuộc nhóm nhạy cảm cụ thể.' : 'User is not in a specific sensitive group.');

  return `${base} ${persona}`;
}
