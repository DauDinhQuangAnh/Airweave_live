import { useOutletContext } from 'react-router-dom';
import { Crown, Check } from 'lucide-react';
import { usePremium } from '@/hooks/use-premium';

const Premium = () => {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const { isPremium, isBeta, loading } = usePremium();

  const features = lang === 'vi' ? [
    'Bản đồ AQI và nguồn dữ liệu',
    'Cảnh báo AQI theo ngưỡng đã cài đặt',
    'Lịch sử dữ liệu không khí khi có nguồn',
  ] : [
    'AQI map with data provenance',
    'AQI alerts using your configured threshold',
    'Air quality history when source data is available',
  ];

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
        <header className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground">Premium</h1>
          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full border font-heading font-bold uppercase ${
            isPremium ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' : 'bg-muted text-muted-foreground border-border'
          }`}>
            {loading ? '—' : isPremium ? (lang === 'vi' ? 'Đang dùng' : 'Active') : (lang === 'vi' ? 'Miễn phí' : 'Free')}
          </span>
        </header>

        <p className="text-xs text-muted-foreground font-body">
          {isBeta
            ? lang === 'vi' ? 'Quyền Premium đang được bật cho tài khoản trong bản Beta. Chưa có thanh toán hay gói thuê bao.' : 'Premium access is enabled during beta. Payments and subscriptions are not available.'
            : lang === 'vi' ? 'Quyền truy cập hiển thị theo trạng thái tài khoản. Chưa có chức năng mua gói trong ứng dụng.' : 'Access follows your account status. In-app purchases are not available.'}
        </p>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-sm font-body text-foreground">
              <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Premium;
