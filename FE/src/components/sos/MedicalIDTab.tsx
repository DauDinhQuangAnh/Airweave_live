import { useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMedicalProfiles, MedicalProfile } from '@/hooks/use-medical-profiles';
import { CONDITION_GROUPS, RELATIONS, BLOOD_TYPES } from '@/lib/sos-conditions';
import { useAppLang } from '@/hooks/use-app-lang';
import { toast } from 'sonner';

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
      toast.success(lang === 'vi' ? 'Đã lưu hồ sơ' : 'Profile saved');
      setEditingId(null);
      setDraft({});
    } catch (e: any) {
      toast.error(e?.message ?? (lang === 'vi' ? 'Lỗi lưu hồ sơ' : 'Error saving profile'));
    }
  };

  const remove = async (id: string) => {
    if (!confirm(lang === 'vi' ? 'Xoá hồ sơ này?' : 'Delete this medical profile?')) return;
    await deleteProfile(id);
    toast.success(lang === 'vi' ? 'Đã xoá' : 'Deleted');
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground font-body">{lang === 'vi' ? 'Đang tải...' : 'Loading...'}</div>;

  return (
    <div className="space-y-4">
      {/* Profile cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {profiles.map((p) => {
          const profileConds = conditions.filter((c) => c.profile_id === p.id);
          const isEditing = editingId === p.id;
          if (isEditing) return <ProfileEditor key={p.id} draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setEditingId(null)} lang={lang} />;
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card/80 backdrop-blur p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{p.avatar_emoji ?? '👤'}</div>
                  <div>
                    <p className="font-heading font-bold text-foreground">{p.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {RELATIONS.find((r) => r.value === p.relation)?.[lang === 'vi' ? 'label' : 'labelEn'] || p.relation}
                      {p.birth_year ? ` · ${p.birth_year}` : ''}
                      {p.blood_type ? ` · ${p.blood_type}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
                    {lang === 'vi' ? 'Sửa' : 'Edit'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {p.emergency_phone && (
                <p className="text-xs text-muted-foreground">
                  📞 {p.emergency_name ?? (lang === 'vi' ? 'Khẩn cấp' : 'Emergency')}: <span className="font-mono">{p.emergency_phone}</span>
                </p>
              )}

              {/* Conditions */}
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {lang === 'vi' ? 'Bệnh nền / Điều kiện y tế' : 'Medical Conditions'}
                </p>
                {CONDITION_GROUPS.map((g) => (
                  <div key={g.category}>
                    <p className="text-[11px] font-semibold text-foreground/80 mb-1">
                      {g.icon} {lang === 'vi' ? g.label : g.labelEn}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.items.map((item) => {
                        const on = profileConds.some((c) => c.category === g.category && c.code === item.code);
                        return (
                          <button
                            key={item.code}
                            onClick={() => toggleCondition(p.id, g.category, item.code)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                              on
                                ? 'bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-400'
                                : 'bg-muted/40 border-border text-muted-foreground hover:bg-accent/50'
                            }`}
                          >
                            {on ? '✓ ' : ''}{lang === 'vi' ? item.label : item.labelEn}
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
          <ProfileEditor draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setEditingId(null)} lang={lang} />
        )}
      </div>

      {editingId === null && (
        <Button onClick={startNew} variant="outline" className="w-full font-heading">
          <Plus className="w-4 h-4 mr-2" />
          {lang === 'vi' ? 'Thêm hồ sơ người thân' : 'Add Family Member Profile'}
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
    <div className="rounded-xl border border-primary/40 bg-card p-4 space-y-3">
      <p className="font-heading font-bold text-sm">{lang === 'vi' ? 'Chỉnh sửa Hồ sơ' : 'Edit Profile'}</p>

      <div className="flex flex-wrap gap-1.5">
        {RELATIONS.map((r) => (
          <button
            key={r.value}
            onClick={() => setDraft({ ...draft, relation: r.value, avatar_emoji: r.emoji })}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
              draft.relation === r.value
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-muted/40 border-border text-muted-foreground'
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
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          placeholder={lang === 'vi' ? 'Năm sinh' : 'Birth Year'}
          value={draft.birth_year ?? ''}
          onChange={(e) => setDraft({ ...draft, birth_year: e.target.value ? parseInt(e.target.value) : null })}
        />
        <select
          value={draft.blood_type ?? ''}
          onChange={(e) => setDraft({ ...draft, blood_type: e.target.value || null })}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{lang === 'vi' ? 'Nhóm máu' : 'Blood Type'}</option>
          {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <Input
        placeholder={lang === 'vi' ? 'Tên người liên hệ khẩn cấp' : 'Emergency Contact Name'}
        value={draft.emergency_name ?? ''}
        onChange={(e) => setDraft({ ...draft, emergency_name: e.target.value })}
      />
      <Input
        placeholder={lang === 'vi' ? 'SĐT khẩn cấp (bắt buộc cho SOS)' : 'Emergency Phone (Required for SOS)'}
        type="tel"
        value={draft.emergency_phone ?? ''}
        onChange={(e) => setDraft({ ...draft, emergency_phone: e.target.value })}
      />

      <div className="flex gap-2 pt-1">
        <Button onClick={onSave} className="flex-1 font-heading">
          <Save className="w-4 h-4 mr-1" />
          {lang === 'vi' ? 'Lưu' : 'Save'}
        </Button>
        <Button onClick={onCancel} variant="outline"><X className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}
