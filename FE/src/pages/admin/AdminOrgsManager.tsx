import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Cpu,
  MapPin,
  Phone,
  UserCheck,
  X,
} from 'lucide-react';
import { nodesApi } from '@/integrations/api';

export default function AdminOrgsManager() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

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
      setOrgs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    setCreating(true);
    try {
      await nodesApi.createOrganization({
        name,
        code,
        type,
        address,
        contact_name: contactName,
        contact_phone: contactPhone,
      });

      setShowAddModal(false);
      setName('');
      setCode('');
      setAddress('');
      fetchData();
    } catch (err) {
      alert('Không thể tạo Tổ chức: ' + (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Quản lý Các Tổ chức (Organizations)
          </h2>
          <p className="text-xs text-white/50">
            Khai báo và quản lý phân quyền sử dụng IoT Nodes cho Trường học, Bệnh viện, Cơ quan.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-heading font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Thêm Tổ chức Mới
        </button>
      </div>

      {/* Orgs List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orgs.map((org) => (
          <div
            key={org.id}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4 hover:border-blue-500/30 transition-all"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                  {org.type}
                </span>
                <span className="font-mono text-xs text-white/40">{org.code}</span>
              </div>
              <h3 className="font-heading font-bold text-base text-white pt-1">{org.name}</h3>
            </div>

            <div className="space-y-2 text-xs text-white/70">
              {org.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
                  <span className="leading-snug">{org.address}</span>
                </div>
              )}

              {org.contact_name && (
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <span>Quản lý: {org.contact_name}</span>
                </div>
              )}

              {org.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <span>SĐT: {org.contact_phone}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <Cpu className="w-4 h-4" />
                <span>{org._count?.nodes ?? 0} IoT Nodes gán</span>
              </div>

              <div className="text-white/40 text-[11px]">
                {org._count?.users ?? 1} tài khoản
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Org Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a1120] border border-white/15 rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Thêm Tổ chức / Cơ quan Mới
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-white/70 font-semibold">Tên Tổ chức / Trường học</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Trường THPT Chu Văn An"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-white/70 font-semibold">Mã Định danh (Code)</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: CVA-HN"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 font-semibold">Loại hình</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="school">Trường học (School)</option>
                    <option value="hospital">Bệnh viện (Hospital)</option>
                    <option value="office">Văn phòng (Office)</option>
                    <option value="factory">Nhà máy (Factory)</option>
                    <option value="residential">Khu dân cư (Residential)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-white/70 font-semibold">Địa chỉ trụ sở</label>
                <input
                  type="text"
                  placeholder="VD: 10 Thụy Khuê, Tây Hồ, Hà Nội"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-white/70 font-semibold">Người Đại diện / Quản lý</label>
                  <input
                    type="text"
                    placeholder="VD: Thầy Nguyễn Văn A"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white/70 font-semibold">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    placeholder="VD: 0912345678"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20"
                >
                  {creating ? 'Đang tạo...' : 'Tạo Tổ chức'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
