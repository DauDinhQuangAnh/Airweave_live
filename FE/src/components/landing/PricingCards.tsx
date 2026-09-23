import { useNavigate } from 'react-router-dom';
import { Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppLang } from '@/hooks/use-app-lang';

const PricingCards = () => {
  const navigate = useNavigate();
  const lang = useAppLang();
  const vi = lang === 'vi';

  return (
    <section className="relative z-10 max-w-4xl mx-auto px-4 py-16" id="pricing">
      <div className="rounded-2xl border border-border bg-card/80 p-6 md:p-10 text-center space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
          <Info className="w-3.5 h-3.5" /> {vi ? 'AirWeave đang ở giai đoạn Beta' : 'AirWeave is in beta'}
        </span>
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-foreground">
          {vi ? 'Trải nghiệm các tính năng hiện có' : 'Explore available features'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          {vi
            ? 'Chưa có hệ thống thanh toán, gói thuê bao hay chương trình hoa hồng đang vận hành. Quyền truy cập Beta phụ thuộc cấu hình hiện tại của ứng dụng.'
            : 'Payments, subscriptions, and affiliate commissions are not operating yet. Beta access depends on the current app configuration.'}
        </p>
        <div className="grid sm:grid-cols-3 gap-3 text-left text-sm text-foreground/80">
          {(vi
            ? ['Bản đồ AQI và nguồn dữ liệu', 'Báo cáo cộng đồng', 'Lộ trình và cảnh báo theo dữ liệu hiện có']
            : ['AQI map with data sources', 'Community reports', 'Routes and alerts based on available data']
          ).map((feature) => (
            <div key={feature} className="flex items-start gap-2 rounded-xl border border-border bg-background/50 p-3">
              <Check className="w-4 h-4 shrink-0 text-emerald-500" /> {feature}
            </div>
          ))}
        </div>
        <Button onClick={() => navigate('/auth')} className="font-heading font-semibold">
          {vi ? 'Bắt đầu sử dụng' : 'Get started'}
        </Button>
      </div>
    </section>
  );
};

export default PricingCards;
