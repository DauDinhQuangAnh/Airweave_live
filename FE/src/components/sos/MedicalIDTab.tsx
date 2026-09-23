import { useState } from 'react';
import { Plus, Trash2, Save, X, Heart, AlertCircle, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMedicalProfiles, MedicalProfile } from '@/hooks/use-medical-profiles';
import { CONDITION_GROUPS, RELATIONS, BLOOD_TYPES } from '@/lib/sos-conditions';
import { useAppLang } from '@/hooks/use-app-lang';
import { toast } from 'sonner';
import { localizeDemoText } from '@/lib/localize-demo';

export default function MedicalIDTab({ lang: propLang }: { lang?: 'vi' | 'en' }) {
  const contextLang = useAppLang();
  const lang = propLang || contextLang;

  const {
    profiles,
    conditions,
    loading,
    upsertProfile,
    deleteProfile,
    toggleCondition,
  } = useMedicalProfiles();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<MedicalProfile>>({});

  const startNew = () => {
    setEditingId('new');
    setDraft({
      relation: 'self',
      avatar_emoji: '🧑',
      display_name: '',
      birth_year: undefined,
      blood_type: undefined,
      emergency_phone: '',
      emergency_name: '',
    });
  };

  const startEdit = (p: MedicalProfile) => {
    setEditingId(p.id);
    setDraft({ ...p });
  };

  const save = async () => {
    if (!draft.display_name?.trim()) {
      toast.error(lang === 'vi' ? 'Vui lòng nhập họ tên' : 'Please enter full name');
      return;
    }
    try {
      const payload = { ...draft };
      if (editingId !== 'new') payload.id = editingId!;
      await upsertProfile(payload);
      toast.success(lang === 'vi' ? 'Đã lưu hồ sơ Medical ID' : 'Medical ID profile saved');
      setEditingId(null);
      setDraft({});
    } catch (e: any) {
      toast.error(e?.message ?? (lang === 'vi' ? 'Lỗi lưu hồ sơ' : 'Error saving profile'));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(lang === 'vi' ? 'Xoá hồ sơ này?' : 'Delete this medical profile?')) return;
    await deleteProfile(id);
    toast.success(lang === 'vi' ? 'Đã xoá hồ sơ' : 'Deleted profile');
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-gray-400 font-body">
        {lang === 'vi' ? 'Đang tải hồ sơ Medical ID...' : 'Loading Medical ID profiles...'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informative Banner */}
      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-start gap-3">
        <Heart className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-300 leading-relaxed font-body">
          {lang === 'vi'
            ? 'Hồ sơ y tế giúp nhân viên cấp cứu và bác sĩ nhận biết ngay bệnh nền hô hấp, tim mạch & nhóm máu khi quét mã QR lúc nguy cấp.'
            : 'Medical ID profiles help first responders quickly recognize respiratory, cardiac conditions and blood type via QR scan.'}
        </p>
      </div>

      {/* Profile Cards */}
      <div className="grid gap-3.5 sm:grid-cols-1">
        {profiles.map((p) => {
          const profileConds = conditions.filter((c) => c.profile_id === p.id);
          const isEditing = editingId === p.id;
          if (isEditing) {
            return (
              <ProfileEditor
                key={p.id}
                draft={draft}
                setDraft={setDraft}
                onSave={save}
                onCancel={() => setEditingId(null)}
                lang={lang}
              />
            );
          }
          return (
            <div
              key={p.id}
              className="rounded-2xl border border-white/10 bg-[#0c1322]/80 backdrop-blur-xl p-4 sm:p-5 space-y-3.5 shadow-xl hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-2xl shadow-inner">
                    {p.avatar_emoji ?? '👤'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-bold text-white text-base">
                        {p.display_name}
                      </h3>
                      {p.blood_type && (
                        <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 text-[11px] font-mono font-bold">
                          {p.blood_type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 font-body">
                      {RELATIONS.find((r) => r.value === p.relation)?.[
                        lang === 'vi' ? 'label' : 'labelEn'
                      ] || p.relation}
                      {p.birth_year ? ` · ${lang === 'vi' ? 'Sinh năm' : 'Born'} ${p.birth_year}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(p)}
                    className="h-8 px-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/10"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1 text-sky-400" />
                    {lang === 'vi' ? 'Sửa' : 'Edit'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(p.id)}
                    className="h-8 px-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {p.emergency_phone && (
                <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    📞 {localizeDemoText(p.emergency_name, lang) || (lang === 'vi' ? 'Liên hệ khẩn cấp' : 'Emergency Contact')}:
                  </span>
                  <span className="font-mono font-bold text-white tracking-wider">
                    {p.emergency_phone}
                  </span>
                </div>
              )}

              {/* Conditions List */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-heading">
                  {lang === 'vi' ? 'Bệnh nền / Điều kiện y tế cần lưu ý' : 'Medical Conditions & Allergies'}
                </p>
                {CONDITION_GROUPS.map((g) => (
                  <div key={g.category} className="space-y-1">
                    <p className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                      <span>{g.icon}</span>
                      <span>{lang === 'vi' ? g.label : g.labelEn}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.items.map((item) => {
                        const on = profileConds.some(
                          (c) => c.category === g.category && c.code === item.code
                        );
                        return (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => toggleCondition(p.id, g.category, item.code)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                              on
                                ? 'bg-red-500/20 border-red-500/50 text-red-200 shadow-sm'
                                : 'bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
                            }`}
                          >
                            {on ? '✓ ' : ''}
                            {lang === 'vi' ? item.label : item.labelEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {editingId === 'new' && (
          <ProfileEditor
            draft={draft}
            setDraft={setDraft}
            onSave={save}
            onCancel={() => setEditingId(null)}
            lang={lang}
          />
        )}
      </div>

      {editingId === null && (
        <Button
          onClick={startNew}
          variant="outline"
          className="w-full h-11 rounded-2xl bg-white/[0.02] border-dashed border-white/20 hover:border-white/40 hover:bg-white/[0.05] text-gray-300 font-heading text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4 mr-2 text-emerald-400" />
          {lang === 'vi' ? '+ Thêm hồ sơ người thân' : '+ Add Family Member Profile'}
        </Button>
      )}
    </div>
  );
}

function ProfileEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
  lang,
}: {
  draft: Partial<MedicalProfile>;
  setDraft: (d: Partial<MedicalProfile>) => void;
  onSave: () => void;
  onCancel: () => void;
  lang: 'vi' | 'en';
}) {
  return (
    <div className="rounded-2xl border border-red-500/40 bg-[#0c1322] p-4 sm:p-5 space-y-3.5 shadow-2xl">
      <p className="font-heading font-bold text-sm text-white">
        {lang === 'vi' ? 'Chỉnh sửa Hồ sơ Medical ID' : 'Edit Medical Profile'}
      </p>

      {/* Relationship Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {RELATIONS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setDraft({ ...draft, relation: r.value, avatar_emoji: r.emoji })}
            className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
              draft.relation === r.value
                ? 'bg-red-500/25 border-red-500/60 text-red-200'
                : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            {r.emoji} {lang === 'vi' ? r.label : r.labelEn}
          </button>
        ))}
      </div>

      <Input
        placeholder={lang === 'vi' ? 'Họ và tên' : 'Full Name'}
        value={draft.display_name ?? ''}
        onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
        className="bg-white/[0.03] border-white/10 text-white placeholder:text-gray-500"
      />

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          placeholder={lang === 'vi' ? 'Năm sinh (vd: 1996)' : 'Birth Year'}
          value={draft.birth_year ?? ''}
          onChange={(e) =>
            setDraft({
              ...draft,
              birth_year: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
          className="bg-white/[0.03] border-white/10 text-white placeholder:text-gray-500"
        />
        <select
          value={draft.blood_type ?? ''}
          onChange={(e) => setDraft({ ...draft, blood_type: e.target.value || undefined })}
          className="h-10 rounded-md border border-white/10 bg-[#070b14] px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
        >
          <option value="">{lang === 'vi' ? 'Nhóm máu' : 'Blood Type'}</option>
          {BLOOD_TYPES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <Input
        placeholder={lang === 'vi' ? 'Tên người liên hệ khẩn cấp' : 'Emergency Contact Name'}
        value={draft.emergency_name ?? ''}
        onChange={(e) => setDraft({ ...draft, emergency_name: e.target.value })}
        className="bg-white/[0.03] border-white/10 text-white placeholder:text-gray-500"
      />

      <Input
        placeholder={lang === 'vi' ? 'SĐT khẩn cấp (vd: 0901 234 567)' : 'Emergency Phone'}
        type="tel"
        value={draft.emergency_phone ?? ''}
        onChange={(e) => setDraft({ ...draft, emergency_phone: e.target.value })}
        className="bg-white/[0.03] border-white/10 text-white placeholder:text-gray-500"
      />

      <div className="flex gap-2 pt-1">
        <Button
          onClick={onSave}
          className="flex-1 font-heading bg-red-600 hover:bg-red-700 text-white"
        >
          <Save className="w-4 h-4 mr-1.5" />
          {lang === 'vi' ? 'Lưu hồ sơ' : 'Save Profile'}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="border-white/10 hover:bg-white/10 text-gray-300"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
