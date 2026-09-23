import { useEffect, useState } from 'react';
import { Key, Loader2, Lock, ShieldCheck, ShieldX } from 'lucide-react';
import { nodesApi } from '@/integrations/api';
import { useAppLang } from '@/hooks/use-app-lang';
import { isDemoMode } from '@/lib/demo/demo-mode';

export default function AdminApiKeysManager() {
  const lang = useAppLang();
  const demo = isDemoMode();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (demo) return;
    let active = true;
    nodesApi.adminStats()
      .then((stats) => { if (active) setConfigured(stats.ingestConfigured === true); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demo]);

  return <div className="max-w-3xl space-y-5 font-body">
    <div>
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white"><Key className="w-5 h-5 text-cyan-400" />{lang === 'vi' ? 'Bảo mật API thiết bị' : 'Device API security'}</h2>
      <p className="mt-1 text-xs text-white/60">{lang === 'vi' ? 'Trạng thái thật của cổng nhận telemetry. Backend hiện dùng một token cấu hình; chưa có hệ thống tạo, cấp lại hay thu hồi từng khóa.' : 'Actual telemetry-ingest status. The backend currently uses one configured token; per-key creation, rotation, and revocation are not implemented.'}</p>
    </div>
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-semibold text-white"><Lock className="h-4 w-4 text-cyan-300" />DEVICE_INGEST_TOKEN</span>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-white/50" /> : demo || error ? <span className="text-xs text-white/50">{lang === 'vi' ? 'Không kiểm tra trong demo' : 'Not checked in demo'}</span> : configured ? <span className="flex items-center gap-1 text-xs text-emerald-300"><ShieldCheck className="h-4 w-4" />{lang === 'vi' ? 'Đã cấu hình' : 'Configured'}</span> : <span className="flex items-center gap-1 text-xs text-amber-300"><ShieldX className="h-4 w-4" />{lang === 'vi' ? 'Chưa cấu hình' : 'Not configured'}</span>}
      </div>
      <p className="text-xs text-white/55">{lang === 'vi' ? 'Secret không được trả về trình duyệt. Cấu hình trên máy chủ và khởi động lại backend để thay đổi token.' : 'The secret is never returned to the browser. Configure it on the server and restart the backend to change the token.'}</p>
    </div>
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
      {lang === 'vi' ? 'Chức năng quản lý khóa riêng lẻ chưa có API và không được giả lập trên giao diện.' : 'Per-key management has no backend API and is not simulated in the UI.'}
    </div>
  </div>;
}
