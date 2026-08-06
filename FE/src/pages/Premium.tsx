import { useOutletContext } from 'react-router-dom';
import { Crown, Check } from 'lucide-react';
import { usePremium } from '@/hooks/use-premium';

const Premium = () => {
  const { lang } = useOutletContext<{ lang: 'vi' | 'en' }>();
  const { isPremium } = usePremium();

  const features = lang === 'vi' ? [
    'Lộ trình sạch nâng cao với né điểm nóng',
    'Cảnh báo AQI cá nhân hoá theo hồ sơ sức khoẻ',
    'Lịch sử phơi nhiễm chi tiết',
    'Thông báo đẩy thời tiết xấu',
    'Hỗ trợ ưu tiên',
  ] : [
    'Advanced Smart Route with hotspot avoidance',
    'Personalised AQI alerts by health profile',
    'Detailed exposure history',
    'Severe-weather push notifications',
    'Priority support',
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
            {isPremium ? (lang === 'vi' ? 'Đang dùng' : 'Active') : (lang === 'vi' ? 'Miễn phí' : 'Free')}
          </span>
        </header>

        <p className="text-xs text-muted-foreground font-body">
          {lang === 'vi'
            ? 'Bản Beta hiện đang mở Premium cho tất cả người dùng để thu thập phản hồi.'
            : 'During beta, Premium is open to all users for feedback gathering.'}
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
