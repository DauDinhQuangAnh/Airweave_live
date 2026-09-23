import { useEffect, useState } from 'react';
import { AlertTriangle, BellRing, Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { nodesApi } from '@/integrations/api';
import { useAppLang } from '@/hooks/use-app-lang';
import { isDemoMode } from '@/lib/demo/demo-mode';

type AlertStatus = Awaited<ReturnType<typeof nodesApi.alertStatus>>;

export default function AdminAlertsManager() {
  const lang = useAppLang();
  const demo = isDemoMode();
  const [status, setStatus] = useState<AlertStatus | null>(null);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (demo) return;
    let active = true;
    nodesApi.alertStatus()
      .then((value) => { if (active) setStatus(value); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demo]);

  if (demo) return <Unavailable lang={lang} message={lang === 'vi' ? 'Chế độ demo không chạy bộ gửi cảnh báo thật. Không có quy tắc mẫu nào được lưu hoặc kích hoạt.' : 'Demo mode does not run real alert dispatch. No sample rule is saved or activated.'} />;
  if (loading) return <div className="flex items-center gap-2 text-white/70 p-6"><Loader2 className="w-4 h-4 animate-spin" />{lang === 'vi' ? 'Đang tải cấu hình cảnh báo…' : 'Loading alert configuration…'}</div>;
  if (error || !status) return <Unavailable lang={lang} message={lang === 'vi' ? 'Không đọc được cấu hình cảnh báo từ máy chủ.' : 'Could not read alert configuration from the server.'} />;

  const rows = [
    { label: 'CO₂', value: `> ${status.co2Ppm} ppm`, active: true, note: lang === 'vi' ? 'Cảnh báo quản lý tổ chức khi node gửi số đo vượt ngưỡng' : 'Alerts organization managers when a node reports above the threshold' },
    { label: 'UV', value: `≥ ${status.uvIndex}`, active: true, note: lang === 'vi' ? 'Cảnh báo quản lý tổ chức khi node gửi số đo vượt ngưỡng' : 'Alerts organization managers when a node reports above the threshold' },
    { label: 'Push / OneSignal', value: status.pushConfigured ? (lang === 'vi' ? 'Đã cấu hình' : 'Configured') : (lang === 'vi' ? 'Chưa cấu hình' : 'Not configured'), active: status.pushConfigured, note: lang === 'vi' ? 'Chỉ gửi được khi có khóa OneSignal và người nhận hợp lệ' : 'Delivery requires OneSignal credentials and eligible recipients' },
    { label: 'SMS', value: lang === 'vi' ? 'Chưa triển khai' : 'Not implemented', active: false, note: lang === 'vi' ? 'Không có cổng SMS hoặc API gửi tin trong backend' : 'No SMS gateway or dispatch API exists in the backend' },
    { label: 'AQI / VOC', value: lang === 'vi' ? 'Chưa triển khai' : 'Not implemented', active: false, note: lang === 'vi' ? 'Không có quy tắc gửi cảnh báo toàn vùng cho các chỉ số này' : 'No regional alert dispatch rule exists for these readings' },
  ];

  return <div className="space-y-5 font-body">
    <div>
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white"><BellRing className="w-5 h-5 text-amber-400" />{lang === 'vi' ? 'Trạng thái cảnh báo IoT' : 'IoT alert status'}</h2>
      <p className="mt-1 text-xs text-white/60">{lang === 'vi' ? 'Đọc trực tiếp từ cấu hình máy chủ. Màn hình này không giả lập nút lưu; ngưỡng được cấu hình qua biến môi trường và cần khởi động lại backend.' : 'Read from server configuration. No simulated save action; thresholds are configured through environment variables and require a backend restart.'}</p>
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((row) => <div key={row.label} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-heading font-semibold text-white">{row.label}</span>
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${row.active ? 'text-emerald-300' : 'text-amber-300'}`}>
            {row.active ? <ShieldCheck className="w-4 h-4" /> : <ShieldX className="w-4 h-4" />}{row.value}
          </span>
        </div>
        <p className="text-xs text-white/55">{row.note}</p>
      </div>)}
    </div>
  </div>;
}

function Unavailable({ lang, message }: { lang: 'vi' | 'en'; message: string }) {
  return <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-100 space-y-2" role="status">
    <h2 className="flex items-center gap-2 font-heading font-bold"><AlertTriangle className="w-5 h-5" />{lang === 'vi' ? 'Không có cấu hình cảnh báo thật' : 'No live alert configuration'}</h2>
    <p className="text-sm text-white/65">{message}</p>
  </div>;
}
