import { useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  ShieldCheck,
  Save,
  Radio,
  Sliders,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAlertsManager() {
  const [aqiWarning, setAqiWarning] = useState(100);
  const [aqiHazardous, setAqiHazardous] = useState(150);
  const [vocThreshold, setVocThreshold] = useState(200);
  const [co2Threshold, setCo2Threshold] = useState(800);
  const [autoPush, setAutoPush] = useState(true);
  const [autoSmsEmergency, setAutoSmsEmergency] = useState(true);

  // Selected Rule Modal
  const [selectedRule, setSelectedRule] = useState<any | null>(null);

  const rulesList = [
    {
      id: 'rule-aqi',
      title: 'Quy tắc Ngưỡng Chỉ số AQI & Bụi Mịn',
      category: 'AQI & PM2.5',
      summary: `Cảnh báo Vàng (AQI ≥ ${aqiWarning}) · Báo động Đỏ (AQI ≥ ${aqiHazardous})`,
      icon: Sliders,
      color: 'text-amber-400',
      badge: 'EPA Standard',
      details: 'Tự động gửi thông báo Push Notification khẩn cấp cho người dùng trong bán kính 3km khi trạm quan trắc phát hiện chỉ số AQI vượt mốc đỏ.',
    },
    {
      id: 'rule-gas',
      title: 'Quy tắc Ngưỡng Khí độc VOCs & CO2',
      category: 'Sensirion / NDIR Gas',
      summary: `VOC Index (≥ ${vocThreshold}) · Nồng độ CO2 (≥ ${co2Threshold} ppm)`,
      icon: AlertTriangle,
      color: 'text-rose-400',
      badge: 'Toxic Gas Alert',
      details: 'Cảnh báo nồng độ khí hóa chất dễ bay hơi và bí khí CO2 trong các phòng học và khuôn viên tòa nhà.',
    },
    {
      id: 'rule-dispatch',
      title: 'Gửi tin nhắn Tự động (Auto Dispatch)',
      category: 'Push & SMS Channels',
      summary: `Push Notification (${autoPush ? 'Bật' : 'Tắt'}) · Emergency SMS (${autoSmsEmergency ? 'Bật' : 'Tắt'})`,
      icon: Radio,
      color: 'text-emerald-400',
      badge: 'Auto Dispatch',
      details: 'Tự động gửi tin nhắn SMS cho Đại diện Cơ quan & Ban quản trị hệ thống ngay khi node bị mất điện hoặc ngắt kết nối.',
    },
  ];

  const handleSaveConfig = () => {
    toast.success('Đã lưu cấu hình ngưỡng cảnh báo hệ thống!');
    setSelectedRule(null);
  };

  return (
    <div className="space-y-6 font-body">
      {/* Mock Data Notice */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-heading font-semibold">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>
            📌 <strong>[QUẢN LÝ SƠ BỘ QUY TẮC CẢNH BÁO]</strong> — Hiển thị rút gọn. Bấm vào bất kỳ quy tắc nào để mở Pop-up tinh chỉnh chi tiết.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold text-amber-200">
          ALERTS SUMMARY
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-400" />
            Cấu hình Quy tắc Cảnh báo & Ngưỡng Ô nhiễm
          </h2>
          <p className="text-xs text-white/60">
            Các mốc ô nhiễm khẩn cấp tự động kích hoạt thông báo toàn mạng lưới.
          </p>
        </div>
      </div>

      {/* Clean Summary Rule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rulesList.map((rule) => {
          const Icon = rule.icon;
          return (
            <div
              key={rule.id}
              onClick={() => setSelectedRule(rule)}
              className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.07] transition-all cursor-pointer space-y-4 relative group shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${rule.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                      {rule.title}
                    </h3>
                    <span className="text-[10px] text-white/50">{rule.category}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 text-xs font-semibold text-white/80 font-mono">
                {rule.summary}
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-amber-300">
                  {rule.badge}
                </span>
                <span className="text-[11px] font-heading font-semibold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
                  Chỉnh sửa <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* POP-UP MODAL: Tinh chỉnh Chi tiết Quy tắc Cảnh báo */}
      {selectedRule && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedRule(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/40 p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto cursor-default font-body"
          >
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-white">
                    {selectedRule.title}
                  </h3>
                  <p className="text-xs text-white/50">{selectedRule.details}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRule(null)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content per Rule */}
            {selectedRule.id === 'rule-aqi' && (
              <div className="space-y-4 text-xs font-body">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-white/80 font-heading font-semibold">
                    <span>Ngưỡng Cảnh báo Vàng (Sensitive Groups):</span>
                    <span className="text-amber-400">AQI ≥ {aqiWarning}</span>
                  </div>
                  <input
                    type="range"
                    min="51"
                    max="150"
                    value={aqiWarning}
                    onChange={(e) => setAqiWarning(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="flex justify-between text-white/80 font-heading font-semibold">
                    <span>Ngưỡng Báo động Đỏ (Hazardous):</span>
                    <span className="text-rose-400">AQI ≥ {aqiHazardous}</span>
                  </div>
                  <input
                    type="range"
                    min="101"
                    max="300"
                    value={aqiHazardous}
                    onChange={(e) => setAqiHazardous(Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>
              </div>
            )}

            {selectedRule.id === 'rule-gas' && (
              <div className="space-y-4 text-xs font-body">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-white/80 font-heading font-semibold">
                    <span>Chỉ số Khí độc VOC Index (Sensirion SGP40):</span>
                    <span className="text-amber-400">{vocThreshold} / 500</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="400"
                    value={vocThreshold}
                    onChange={(e) => setVocThreshold(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="flex justify-between text-white/80 font-heading font-semibold">
                    <span>Nồng độ CO2 Bí khí (ppm):</span>
                    <span className="text-cyan-400">{co2Threshold} ppm</span>
                  </div>
                  <input
                    type="range"
                    min="600"
                    max="2000"
                    step="50"
                    value={co2Threshold}
                    onChange={(e) => setCo2Threshold(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            )}

            {selectedRule.id === 'rule-dispatch' && (
              <div className="space-y-3 text-xs font-body">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-heading font-bold text-white">Gửi Push Notification</div>
                    <p className="text-white/50 text-[11px]">Thông báo ứng dụng cho người dùng gần trạm bị ô nhiễm.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPush}
                    onChange={(e) => setAutoPush(e.target.checked)}
                    className="w-5 h-5 accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-heading font-bold text-white">Gửi SMS Khẩn cấp SOS</div>
                    <p className="text-white/50 text-[11px]">Gửi SMS cho đại diện Tổ chức khi Node mất nguồn.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSmsEmergency}
                    onChange={(e) => setAutoSmsEmergency(e.target.checked)}
                    className="w-5 h-5 accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedRule(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-heading font-semibold text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-heading font-bold text-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Lưu Quy tắc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
