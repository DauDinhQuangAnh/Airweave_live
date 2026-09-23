import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Building2, Cpu, Radio, RefreshCw } from 'lucide-react';
import AuroraBackground from '@/components/AuroraBackground';
import { nodesApi } from '@/integrations/api';
import { isDemoMode } from '@/lib/demo/demo-mode';

type PartnerNode = {
  id: string;
  name: string;
  chip_id: string;
  organization_id: string | null;
  organization_name: string | null;
  status: string;
  aqi: number | null;
};

export default function PartnerData() {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const [nodes, setNodes] = useState<PartnerNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await nodesApi.listNodes();
      setNodes(Array.isArray(result) ? result : []);
      setError(false);
    } catch {
      setNodes([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const partners = new Map<string, { name: string; nodes: PartnerNode[] }>();
  for (const node of nodes) {
    if (!node.organization_id || !node.organization_name) continue;
    const group = partners.get(node.organization_id) ?? { name: node.organization_name, nodes: [] };
    group.nodes.push(node);
    partners.set(node.organization_id, group);
  }

  return (
    <div className="h-full overflow-y-auto bg-[#050911] text-white relative font-body p-4 md:p-6 scrollbar-thin">
      <AuroraBackground />
      <div className="relative z-10 max-w-5xl mx-auto space-y-5">
        <div className="rounded-2xl border border-white/10 bg-[#0a1120]/80 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-cyan-400" />
            <div>
              <h1 className="font-heading font-bold text-xl">{lang === 'vi' ? 'Mạng lưới cảm biến đối tác' : 'Partner sensor network'}</h1>
              <p className="text-xs text-white/60">{lang === 'vi' ? 'Tổ chức và thiết bị đã đăng ký trong hệ thống' : 'Organizations and devices registered in the system'}</p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-50 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {lang === 'vi' ? 'Tải lại' : 'Refresh'}
          </button>
        </div>

        {isDemoMode() && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 text-sm">{lang === 'vi' ? 'Chế độ demo — dữ liệu trên trang này là dữ liệu mô phỏng.' : 'Demo mode — this page displays simulated data.'}</p>}
        {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">{lang === 'vi' ? 'Không tải được dữ liệu thiết bị. Hãy thử lại.' : 'Could not load device data. Please retry.'}</p>}
        {!loading && !error && partners.size === 0 && <p className="rounded-lg border border-white/10 bg-[#0a1120]/80 p-5 text-white/70">{lang === 'vi' ? 'Chưa có tổ chức nào có thiết bị đã đăng ký.' : 'No organization has a registered device yet.'}</p>}

        {[...partners.entries()].map(([id, partner]) => (
          <section key={id} className="rounded-2xl border border-white/10 bg-[#0a1120]/80 p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading font-semibold text-base">{partner.name}</h2>
              <span className="text-xs text-cyan-300">{partner.nodes.length} {lang === 'vi' ? 'thiết bị' : 'devices'}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {partner.nodes.map((node) => (
                <div key={node.id} className="rounded-xl border border-white/10 bg-slate-900/70 p-3 flex items-start gap-3">
                  <Cpu className="w-4 h-4 text-cyan-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{node.name}</p>
                    <p className="text-xs text-white/50 font-mono truncate">{node.chip_id}</p>
                    <p className="text-xs text-white/70 mt-1">
                      <Radio className="w-3 h-3 inline mr-1" />
                      {node.status === 'online' ? (lang === 'vi' ? 'Trực tuyến' : 'Online') : node.status === 'maintenance' ? (lang === 'vi' ? 'Bảo trì' : 'Maintenance') : (lang === 'vi' ? 'Ngoại tuyến' : 'Offline')}
                      {' · AQI '}{node.status === 'online' && Number.isFinite(node.aqi) ? node.aqi : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
