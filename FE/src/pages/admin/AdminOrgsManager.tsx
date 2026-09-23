import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Cpu,
  MapPin,
  Phone,
  UserCheck,
  X,
  Sparkles,
  ShieldCheck,
  Search,
  ChevronRight,
  Info,
  ExternalLink,
} from 'lucide-react';
import { nodesApi } from '@/integrations/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { isDemoMode } from '@/lib/demo/demo-mode';
import { useAppLang } from '@/hooks/use-app-lang';

export default function AdminOrgsManager() {
  const lang = useAppLang();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('school');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const data = await nodesApi.listOrganizations();
      if (Array.isArray(data) && (!isDemoMode() || data.length)) setOrgs(data);
      setError(false);
    } catch {
      if (!isDemoMode()) setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      const created = await nodesApi
        .createOrganization({
          name,
          code,
          type,
          address,
          contact_name: contactName,
          contact_phone: contactPhone,
        })
        .catch((error: unknown) => {
          if (!isDemoMode()) throw error;
          return null;
        });

      if (created) {
        setOrgs((prev) => [created, ...prev]);
      } else {
        const localOrg = {
          id: `org-${Date.now()}`,
          name,
          code,
          type,
          address: address || 'Chưa cập nhật',
          contact_name: contactName || 'Đại diện tổ chức',
          contact_phone: contactPhone || 'Chưa có SĐT',
          nodesCount: 0,
          plan_tier: 'Professional',
          status: 'active',
        };
        setOrgs((prev) => [localOrg, ...prev]);
      }

      toast.success(`Đã đăng ký Tổ chức "${name}" thành công!`);
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

  if (loading) return <div className="p-6 text-white/70">{lang === 'vi' ? 'Đang tải tổ chức...' : 'Loading organizations...'}</div>;
  if (error) return <div className="p-6 text-amber-300" role="alert">{lang === 'vi' ? 'Không thể tải danh sách tổ chức. Vui lòng kiểm tra kết nối máy chủ.' : 'Unable to load organizations. Check the server connection.'}</div>;

  return (
    <div className="space-y-6 font-body">
      {/* Mock Data Notice */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-heading font-semibold">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>
            📌 <strong>{lang === 'vi' ? '[QUẢN LÝ SƠ BỘ TỔ CHỨC]' : '[ORGANIZATION MANAGEMENT PREVIEW]'}</strong> — {lang === 'vi' ? 'Hiển thị rút gọn. Bấm vào bất kỳ thẻ Tổ chức nào để mở Pop-up xem chi tiết & điều khiển.' : 'Select an organization card to view details and controls.'}
          </span>
        </div>
        <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold text-amber-200">
          SUMMARY ORGS VIEW
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            {lang === 'vi' ? 'Quản lý Tổ chức & Doanh nghiệp Đối tác' : 'Organization & Partner Management'} ({filteredOrgs.length})
          </h2>
          <p className="text-xs text-white/60">
            {lang === 'vi' ? 'Danh sách rút gọn cơ quan nhà nước, trường học, khu công nghiệp sở hữu trạm quan trắc.' : 'Government agencies, schools, and industrial parks that own monitoring stations.'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-heading text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          {lang === 'vi' ? 'Thêm Tổ chức Mới' : 'Add Organization'}
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={lang === 'vi' ? 'Tìm theo Tên tổ chức, Mã Code (STNMT-HN)...' : 'Search organization name or code (STNMT-HN)...'}
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

      {/* Clean Summary Orgs Grid (Sơ bộ bên ngoài) */}
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
                {org.plan_tier || (lang === 'vi' ? 'Chưa cấu hình' : 'Not configured')}
              </span>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold font-heading">
                <Cpu className="w-4 h-4" />
                <span>{org.nodesCount ?? org._count?.nodes ?? 0} IoT Nodes</span>
              </div>

              <span className="text-[11px] text-cyan-400 group-hover:text-cyan-300 font-heading font-semibold flex items-center gap-1">
                {lang === 'vi' ? 'Chi tiết' : 'Details'} <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredOrgs.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10 space-y-2 text-white/50 text-sm">
          <Info className="w-6 h-6 text-blue-400 mx-auto" />
          <p>{lang === 'vi' ? 'Không tìm thấy Tổ chức nào phù hợp với từ khóa.' : 'No organizations match the search.'}</p>
        </div>
      )}

      {/* POP-UP MODAL: Chi tiết Tổ chức & Doanh nghiệp */}
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
            {/* Header Pop-up */}
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
                      {lang === 'vi' ? 'Gói' : 'Plan'}: {selectedOrg.plan_tier || (lang === 'vi' ? 'Chưa cấu hình' : 'Not configured')}
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

            {/* Chi tiết liên hệ & Trụ sở */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-white/80">
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-white/50 text-[10px] block">{lang === 'vi' ? 'Trụ sở chính' : 'Head Office'}:</span>
                    <strong>{selectedOrg.address || (lang === 'vi' ? 'Chưa cập nhật' : 'Not updated')}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-white/80 pt-1 border-t border-white/5">
                  <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-white/50 text-[10px] block">{lang === 'vi' ? 'Đại diện Liên hệ' : 'Contact Representative'}:</span>
                    <strong>{selectedOrg.contact_name || (lang === 'vi' ? 'Chưa cập nhật' : 'Not updated')}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-white/80 pt-1 border-t border-white/5">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-white/50 text-[10px] block">{lang === 'vi' ? 'Số điện thoại khẩn cấp' : 'Emergency Phone'}:</span>
                    <strong className="text-emerald-300 font-mono">{selectedOrg.contact_phone || (lang === 'vi' ? 'Chưa cập nhật' : 'Not updated')}</strong>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{lang === 'vi' ? 'Số lượng IoT Nodes quản lý' : 'Managed IoT Nodes'}:</span>
                  <span className="font-heading font-bold text-cyan-300 text-sm flex items-center gap-1">
                    <Cpu className="w-4 h-4" /> {selectedOrg.nodesCount ?? selectedOrg._count?.nodes ?? 0} Nodes
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">{lang === 'vi' ? 'Trạng thái Hợp đồng' : 'Contract Status'}:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> {lang === 'vi' ? 'HOẠT ĐỘNG' : 'ACTIVE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                onClick={() => {
                  setSelectedOrg(null);
                  navigate('/org-dashboard');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-heading font-bold text-xs flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                {lang === 'vi' ? 'Mở Org Dashboard Trực quan' : 'Open Organization Dashboard'}
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
                {lang === 'vi' ? 'Đăng ký Tổ chức / Doanh nghiệp Mới' : 'Register New Organization'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-3 text-xs font-body">
              <div>
                <label className="block text-white/70 mb-1 font-heading font-semibold">
                  {lang === 'vi' ? 'Tên Tổ chức / Doanh nghiệp' : 'Organization Name'} *
                </label>
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
                <label className="block text-white/70 mb-1 font-heading font-semibold">
                  {lang === 'vi' ? 'Mã Định danh (Org Code)' : 'Organization Code'} *
                </label>
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
                <label className="block text-white/70 mb-1 font-heading font-semibold">
                  {lang === 'vi' ? 'Loại Tổ chức' : 'Organization Type'}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="school">{lang === 'vi' ? 'Trường học / Viện nghiên cứu' : 'School / Research Institute'}</option>
                  <option value="enterprise">{lang === 'vi' ? 'Doanh nghiệp / Tập đoàn' : 'Enterprise / Corporation'}</option>
                  <option value="gov">{lang === 'vi' ? 'Cơ quan Nhà nước' : 'Government Agency'}</option>
                  <option value="industrial">{lang === 'vi' ? 'Khu Công nghiệp' : 'Industrial Park'}</option>
                </select>
              </div>

              <div>
                <label className="block text-white/70 mb-1 font-heading font-semibold">
                  {lang === 'vi' ? 'Địa chỉ Trụ sở' : 'Head Office Address'}
                </label>
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
                  <label className="block text-white/70 mb-1 font-heading font-semibold">
                    {lang === 'vi' ? 'Người liên hệ' : 'Contact Person'}
                  </label>
                  <input
                    type="text"
                    placeholder="Họ và tên"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1 font-heading font-semibold">
                    {lang === 'vi' ? 'Số điện thoại' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="SĐT khẩn cấp"
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
                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-heading font-bold"
                >
                  {creating ? (lang === 'vi' ? 'Đang tạo...' : 'Creating...') : (lang === 'vi' ? 'Xác nhận Đăng ký' : 'Confirm Registration')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
