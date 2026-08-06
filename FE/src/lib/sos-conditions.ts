export interface ConditionDef {
  code: string;
  label: string;
  labelEn: string;
}

export interface ConditionGroup {
  category: 'respiratory' | 'cardio' | 'allergy';
  label: string;
  labelEn: string;
  icon: string;
  items: ConditionDef[];
}

export const CONDITION_GROUPS: ConditionGroup[] = [
  {
    category: 'respiratory',
    label: 'Hô hấp',
    labelEn: 'Respiratory',
    icon: '🫁',
    items: [
      { code: 'asthma', label: 'Hen suyễn', labelEn: 'Asthma' },
      { code: 'copd', label: 'COPD', labelEn: 'COPD' },
      { code: 'chronic_pneumonia', label: 'Viêm phổi mãn tính', labelEn: 'Chronic Pneumonia' },
    ],
  },
  {
    category: 'cardio',
    label: 'Tim mạch',
    labelEn: 'Cardiovascular',
    icon: '❤️',
    items: [
      { code: 'hypertension', label: 'Cao huyết áp', labelEn: 'Hypertension' },
      { code: 'heart_failure', label: 'Suy tim', labelEn: 'Heart Failure' },
      { code: 'stroke_history', label: 'Đã từng đột quỵ', labelEn: 'Stroke History' },
    ],
  },
  {
    category: 'allergy',
    label: 'Dị ứng',
    labelEn: 'Allergies',
    icon: '⚠️',
    items: [
      { code: 'antibiotics', label: 'Kháng sinh', labelEn: 'Antibiotics' },
      { code: 'other', label: 'Khác', labelEn: 'Other' },
    ],
  },
];

export const RELATIONS = [
  { value: 'self', label: 'Bản thân', labelEn: 'Self', emoji: '🧑' },
  { value: 'father', label: 'Bố', labelEn: 'Father', emoji: '👨' },
  { value: 'mother', label: 'Mẹ', labelEn: 'Mother', emoji: '👩' },
  { value: 'child', label: 'Con', labelEn: 'Child', emoji: '🧒' },
  { value: 'spouse', label: 'Vợ/Chồng', labelEn: 'Spouse', emoji: '💑' },
  { value: 'other', label: 'Khác', labelEn: 'Other', emoji: '👤' },
];

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function getConditionLabel(category: string, code: string, lang: 'vi' | 'en' = 'vi'): string {
  const group = CONDITION_GROUPS.find((g) => g.category === category);
  const item = group?.items.find((i) => i.code === code);
  if (!item) return code;
  return lang === 'vi' ? item.label : item.labelEn;
}

export function getRelationEmoji(relation: string): string {
  return RELATIONS.find((r) => r.value === relation)?.emoji ?? '👤';
}
