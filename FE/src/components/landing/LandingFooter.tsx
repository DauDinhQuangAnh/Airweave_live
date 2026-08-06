import { Wind } from 'lucide-react';

const LandingFooter = () => (
  <footer className="relative z-10 border-t border-border mt-8">
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#0ea5e9] flex items-center justify-center">
              <Wind className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading text-lg font-bold text-foreground">AirWeave</span>
          </div>
          <p className="text-xs font-body text-muted-foreground leading-relaxed">
            Nền tảng dữ liệu không khí thông minh. Giúp người dân đô thị Việt Nam hít thở an toàn hơn mỗi ngày.
          </p>
        </div>

        {/* Products */}
        <div>
          <h4 className="text-xs font-heading font-bold text-foreground/60 uppercase tracking-wider mb-3">Sản phẩm</h4>
          <ul className="space-y-2 text-sm font-body text-muted-foreground">
            <li className="hover:text-foreground cursor-pointer transition-colors">Smart Route</li>
            <li className="hover:text-foreground cursor-pointer transition-colors">Heatmap cộng đồng</li>
            <li className="hover:text-foreground cursor-pointer transition-colors">AI Trợ lý</li>
            <li className="hover:text-foreground cursor-pointer transition-colors">API doanh nghiệp</li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-xs font-heading font-bold text-foreground/60 uppercase tracking-wider mb-3">Công ty</h4>
          <ul className="space-y-2 text-sm font-body text-muted-foreground">
            <li className="hover:text-foreground cursor-pointer transition-colors">Về chúng tôi</li>
            <li className="hover:text-foreground cursor-pointer transition-colors">Blog</li>
            <li className="hover:text-foreground cursor-pointer transition-colors">Tuyển dụng</li>
            <li className="hover:text-foreground cursor-pointer transition-colors">Liên hệ</li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="text-xs font-heading font-bold text-foreground/60 uppercase tracking-wider mb-3">Hỗ trợ</h4>
          <ul className="space-y-2 text-sm font-body text-muted-foreground">
            <li className="hover:text-foreground cursor-pointer transition-colors">Trợ giúp</li>
            <li className="hover:text-foreground cursor-pointer transition-colors">Chính sách bảo mật</li>
            <li className="hover:text-foreground cursor-pointer transition-colors">Điều khoản</li>
            <li className="hover:text-foreground cursor-pointer transition-colors">Báo lỗi</li>
          </ul>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs font-body text-muted-foreground/60">© 2025 AirWeave. Được xây dựng vì bầu trời xanh hơn.</p>
        <div className="flex gap-4">
          {['f', 'in', '𝕏', '▶'].map((icon, i) => (
            <span key={i} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-all">
              {icon}
            </span>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

export default LandingFooter;
