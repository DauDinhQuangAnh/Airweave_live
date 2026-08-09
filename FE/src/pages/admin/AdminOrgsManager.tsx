import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Cpu,
  MapPin,
  Phone,
  UserCheck,
  X,
  ShieldCheck,
  Search,
  ChevronRight,
  Info,
  ExternalLink,
} from 'lucide-react';
import { nodesApi } from '@/integrations/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAdminOrgs } from './_data/useAdminData';
import { normalizeOrg } from './_data/normalize';
import type { AdminOrg } from './_data/types';
import AdminDataBanner from '@/components/admin/AdminDataBanner';

export default function AdminOrgsManager() {
  const navigate = useNavigate();
  const query = useAdminOrgs();

  // State cục bộ nhân bản từ hook để hỗ trợ thêm mới lạc quan (optimistic).
  const [orgs, setOrgs] = useState<AdminOrg[]>(query.data);
  useEffect(() => setOrgs(query.data), [query.data]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<AdminOrg | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('school');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const filteredOrgs = useMemo(() => {
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orgs, searchTerm]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    setCreating(true);
    try {
      if (query.mode === 'live') {
        const created = await nodesApi
          .createOrganization({ name, code, type, address, contact_name: contactName, contact_phone: contactPhone })
          .catch(() => null);
        if (created) {
          setOrgs((prev) => [normalizeOrg(created), ...prev]);
          toast.success(`Đã đăng ký Tổ chức "${name}" (LIVE)!`);
        } else {
          toast.error('LIVE: Không tạo được tổ chức (kiểm tra API / quyền admin).');
          return;
        }
      } else {
        const localOrg: AdminOrg = {
          id: `org-${Date.now()}`,
          name,
          code,
          type,
          address: address || null,
          contact_name: contactName || null,
          contact_phone: contactPhone || null,
          nodesCount: 0,
          usersCount: 0,
          plan_tier: type === 'gov' || type === 'industrial' || type === 'enterprise' ? 'Enterprise' : 'Professional',
          status: 'active',
        };
        setOrgs((prev) => [localOrg, ...prev]);
        toast.success(`Đã thêm Tổ chức "${name}" (Demo cục bộ)!`);
      }

      setShowAddModal(false);
      setName('');
      setCode('');
      setAddress('');
      setContactName('');
      setContactPhone('');
    } catch (err) {
      toast.error('Lỗi tạo tổ chức: ' + (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <AdminDataBanner mode={query.mode} connected={query.connected} error={query.error} loading={query.loading} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Quản lý Tổ chức & Doanh nghiệp Đối tác ({filteredOrgs.length})
          </h2>
          <p className="text-xs text-white/60">
            Danh sách cơ quan nhà nước, trường học, khu công nghiệp sở hữu trạm quan trắc. Bấm thẻ để xem chi tiết.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-heading text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Thêm Tổ chức Mới
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Tên tổ chức, Mã Code (STNMT-HN)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-blue-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Orgs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrgs.map((org) => (
          <div
            key={org.id}
            onClick={() => setSelectedOrg(org)}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-400/50 hover:bg-white/[0.07] transition-all cursor-pointer space-y-4 relative group shadow-lg"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base shrink-0 font-heading">
                  {org.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {org.name}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-semibold">
                    {org.code}
                  </span>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-heading shrink-0">
                {org.plan_tier}
              </span>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold font-heading">
                <Cpu className="w-4 h-4" />
                <span>{org.nodesCount} IoT Nodes</span>
              </div>

              <span className="text-[11px] text-cyan-400 group-hover:text-cyan-300 font-heading font-semibold flex items-center gap-1">
                Chi tiết <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredOrgs.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10 space-y-2 text-white/50 text-sm">
          <Info className="w-6 h-6 text-blue-400 mx-auto" />
          <p>Không tìm thấy Tổ chức nào phù hợp với từ khóa.</p>
        </div>
      )}

      {/* POP-UP MODAL: Chi tiết Tổ chức */}
      {selectedOrg && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedOrg(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-slate-900 border border-blue-500/40 p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-xl font-heading">
                  {selectedOrg.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-white">
                    {selectedOrg.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      CODE: {selectedOrg.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Gói: {selectedOrg.plan_tier}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrg(null)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-white/80">
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-white/50 text-[10px] block">Trụ sở chính:</span>
                    <strong>{selectedOrg.address || 'Chưa cập nhật'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-white/80 pt-1 border-t border-white/5">
                  <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-white/50 text-[10px] block">Đại diện Liên hệ:</span>
                    <strong>{selectedOrg.contact_name || 'Chưa cập nhật'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-white/80 pt-1 border-t border-white/5">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-white/50 text-[10px] block">Số điện thoại:</span>
                    <strong className="text-emerald-300 font-mono">{selectedOrg.contact_phone || 'Chưa cập nhật'}</strong>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Số lượng IoT Nodes quản lý:</span>
                  <span className="font-heading font-bold text-cyan-300 text-sm flex items-center gap-1">
                    <Cpu className="w-4 h-4" /> {selectedOrg.nodesCount} Nodes
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Số tài khoản liên kết:</span>
                  <span className="text-white/80 font-semibold">{selectedOrg.usersCount} người dùng</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Trạng thái:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> {selectedOrg.status === 'active' ? 'HOẠT ĐỘNG' : selectedOrg.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                onClick={() => {
                  setSelectedOrg(null);
                  navigate('/org-dashboard');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-heading font-bold text-xs flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                Mở Org Dashboard Trực quan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Org */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/20 p-6 shadow-2xl space-y-4 relative font-body cursor-default"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Đăng ký Tổ chức / Doanh nghiệp Mới
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-3 text-xs font-body">
              <div>
                <label className="block text-white/70 mb-1 font-heading font-semibold">Tên Tổ chức / Doanh nghiệp *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Trường Đại học Bách Khoa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-heading font-semibold">Mã Định danh (Org Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: HUST-HN"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-heading font-semibold">Loại Tổ chức</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="school">Trường học / Viện nghiên cứu</option>
                  <option value="enterprise">Doanh nghiệp / Tập đoàn</option>
                  <option value="gov">Cơ quan Nhà nước</option>
                  <option value="industrial">Khu Công nghiệp</option>
                  <option value="hospital">Bệnh viện</option>
                </select>
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-heading font-semibold">Địa chỉ Trụ sở</label>
                <input
                  type="text"
                  placeholder="Địa chỉ trụ sở chính"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-white/70 mb-1 font-heading font-semibold">Người liên hệ</label>
                  <input
                    type="text"
                    placeholder="Họ và tên"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1 font-heading font-semibold">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="SĐT liên hệ"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-heading font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-heading font-bold"
                >
                  {creating ? 'Đang tạo...' : 'Xác nhận Đăng ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
