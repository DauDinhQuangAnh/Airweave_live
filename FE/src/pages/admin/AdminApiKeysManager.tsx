import { useState } from 'react';
import { Key, ShieldCheck, Copy, Check, RefreshCw, Lock, Sparkles, X, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminApiKeysManager() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<any | null>(null);

  const keysList = [
    {
      id: 'key-1',
      name: 'ESP32 Nodes Hardware Master Key',
      prefix: 'awk_node_live_9f823...',
      full_secret: 'awk_node_live_9f823a4b9c1d0e2f3a4b5c6d7e8f9012',
      created_at: '2026-08-01',
      scope: 'Node Telemetry Ingest',
      status: 'active',
      ip_whitelist: '14.225.10.15, 113.160.22.4',
      revocation_history: 'Chưa có lịch sử thu hồi',
    },
    {
      id: 'key-2',
      name: 'MQTT Broker Auth Token',
      prefix: 'awk_mqtt_prod_77c12...',
      full_secret: 'awk_mqtt_prod_77c12d3e4f5a6b7c8d9e0f1a2b3c4d5e',
      created_at: '2026-08-02',
      scope: 'MQTT Pub/Sub Telemetry',
      status: 'active',
      ip_whitelist: 'Tất cả IP (MQTT Port 1883/8883)',
      revocation_history: 'Chưa có lịch sử thu hồi',
    },
    {
      id: 'key-3',
      name: 'Enterprise Organization API Access Token',
      prefix: 'awk_org_ent_11b54...',
      full_secret: 'awk_org_ent_11b54c3d2e1f0a9b8c7d6e5f4a3b2c1d',
      created_at: '2026-08-05',
      scope: 'REST API Org Read',
      status: 'active',
      ip_whitelist: '118.70.180.20',
      revocation_history: 'Thu hồi lần 1 vào 2026-07-28',
    },
  ];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast.success('Đã sao chép khóa API!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRegenerate = (name: string) => {
    toast.success(`Đã cấp lại khóa API mới cho "${name}"!`);
    setSelectedKey(null);
  };

  return (
    <div className="space-y-6 font-body">
      {/* Mock Data Notice */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-heading font-semibold">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>
            📌 <strong>[QUẢN LÝ SƠ BỘ KHÓA BẢO MẬT]</strong> — Hiển thị rút gọn. Bấm vào bất kỳ dòng Khóa API nào để mở Pop-up xem secret & phân quyền.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold text-amber-200">
          KEYS SUMMARY
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-cyan-400" />
            Khóa Bảo mật & Quyền Truy cập API Phần cứng
          </h2>
          <p className="text-xs text-white/60">
            Quản lý API Key, Token xác thực ESP32 và phân quyền truy cập dữ liệu trạm quan trắc.
          </p>
        </div>

        <button
          onClick={() => handleRegenerate('Mới')}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-slate-950 font-heading text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all shrink-0"
        >
          <Key className="w-4 h-4" />
          Tạo Khóa API Mới
        </button>
      </div>

      {/* Clean Summary API Keys Table (Sơ bộ bên ngoài) */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body">
            <thead>
              <tr className="border-b border-white/10 text-white/40 font-heading font-semibold">
                <th className="pb-3 pl-1">Tên Khóa API / Mô tả</th>
                <th className="pb-3">Mã Khóa (Prefix)</th>
                <th className="pb-3">Phạm vi Quyền (Scope)</th>
                <th className="pb-3">Trạng thái</th>
                <th className="pb-3 text-right pr-1">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {keysList.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedKey(item)}
                  className="hover:bg-white/[0.05] transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 pl-1 font-semibold text-white group-hover:text-cyan-300">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 font-mono text-cyan-300 text-[11px]">
                    {item.prefix}
                  </td>
                  <td className="py-3.5 text-white/70">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-white/80">
                      {item.scope}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                      <ShieldCheck className="w-3 h-3" /> ACTIVE
                    </span>
                  </td>
                  <td className="py-3.5 pr-1 text-right">
                    <span className="text-[11px] font-heading font-semibold text-cyan-400 group-hover:text-cyan-300 inline-flex items-center gap-1">
                      Chi tiết secret <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* POP-UP MODAL: Chi tiết Khóa API & Secret Token */}
      {selectedKey && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedKey(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-slate-900 border border-cyan-500/40 p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto cursor-default font-body"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-white">
                    {selectedKey.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    STATUS: ACTIVE
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedKey(null)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Secret Key Display */}
            <div className="space-y-2">
              <label className="text-white/60 text-xs font-heading font-semibold block">
                Mã Khóa Secret Bí mật (Full Token):
              </label>
              <div className="p-3 rounded-xl bg-black/70 font-mono text-xs text-cyan-300 border border-white/10 flex items-center justify-between break-all gap-2">
                <span>{selectedKey.full_secret}</span>
                <button
                  onClick={() => handleCopy(selectedKey.full_secret, selectedKey.id)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0"
                  title="Sao chép Secret"
                >
                  {copiedKey === selectedKey.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2.5 text-xs text-white/80">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/50">Phạm vi Quyền (Scope):</span>
                  <span className="font-semibold text-white">{selectedKey.scope}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Danh sách IP Whitelist:</span>
                  <span className="font-mono text-cyan-300">{selectedKey.ip_whitelist}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Ngày tạo khóa:</span>
                  <span>{selectedKey.created_at}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Lịch sử thu hồi:</span>
                  <span className="text-white/60">{selectedKey.revocation_history}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                onClick={() => handleRegenerate(selectedKey.name)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-heading font-bold text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> Cấp lại Khóa Mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
