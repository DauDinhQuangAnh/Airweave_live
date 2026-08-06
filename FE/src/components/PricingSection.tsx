import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PricingSection = ({ lang }: { lang: 'vi' | 'en' }) => {
  const [yearly, setYearly] = useState(false);

  const tiers = [
    {
      name: 'BASIC',
      price: '0',
      priceLabel: lang === 'vi' ? 'Miễn phí' : 'Free',
      desc: lang === 'vi' ? 'Quyền tiếp cận thông tin cơ bản cho mọi người dân.' : 'Basic air quality info for everyone.',
      features: [
        lang === 'vi' ? 'AQI Realtime' : 'AQI Realtime',
        lang === 'vi' ? 'Báo cáo cộng đồng' : 'Community Reporting',
        lang === 'vi' ? 'Dự báo 24h cơ bản' : 'Basic 24h Forecast',
      ],
      cta: lang === 'vi' ? 'Đang sử dụng' : 'Current Plan',
      highlight: false,
    },
    {
      name: 'PREMIUM',
      price: yearly ? '490.000' : '49.000',
      priceLabel: yearly
        ? (lang === 'vi' ? 'VNĐ / năm' : 'VND / year')
        : (lang === 'vi' ? 'VNĐ / tháng' : 'VND / month'),
      savingTag: yearly ? (lang === 'vi' ? 'Tiết kiệm 16%' : 'Save 16%') : null,
      desc: lang === 'vi' ? 'Bảo vệ chủ động sức khỏe cho gia đình và cá nhân di chuyển nhiều.' : 'Proactive health protection for families.',
      features: [
        lang === 'vi' ? 'Toàn bộ tính năng Basic' : 'All Basic features',
        lang === 'vi' ? 'Cảnh báo GPS vi vùng' : 'GPS Micro-zone Alerts',
        lang === 'vi' ? 'Smart Route (Lộ trình sạch)' : 'Smart Route',
        lang === 'vi' ? 'AI Insight chuyên sâu' : 'Advanced AI Insight',
        lang === 'vi' ? 'Tích hợp nhà thông minh' : 'Smart Home Integration',
      ],
      cta: lang === 'vi' ? 'Nâng cấp ngay (Premium Beta)' : 'Upgrade Now (Premium Beta)',
      highlight: true,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-xl md:text-2xl font-extrabold text-foreground mb-2">
          {lang === 'vi' ? 'Đầu tư cho nhịp thở của bạn và gia đình' : 'Invest in your family\'s breath'}
        </h2>
        {/* Toggle */}
        <div className="inline-flex items-center gap-2 p-1 rounded-full bg-muted mt-3">
          <button
            onClick={() => setYearly(false)}
            className={`px-4 py-1.5 rounded-full text-xs font-heading font-semibold transition-all ${!yearly ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            {lang === 'vi' ? 'Tháng' : 'Monthly'}
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-4 py-1.5 rounded-full text-xs font-heading font-semibold transition-all ${yearly ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            {lang === 'vi' ? 'Năm' : 'Yearly'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {tiers.map((tier, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={`relative glass-card p-6 ${
              tier.highlight ? 'border-2 border-primary shadow-2xl' : ''
            }`}
          >
            {tier.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-heading font-bold flex items-center gap-1">
                <Crown className="w-3 h-3" />
                {lang === 'vi' ? 'Khuyên dùng cho Gia đình' : 'Recommended for Families'}
              </div>
            )}
            <h3 className="font-heading text-lg font-extrabold text-foreground mb-1">{tier.name}</h3>
            <p className="text-xs text-muted-foreground font-body mb-4">{tier.desc}</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-heading text-3xl font-extrabold text-foreground">{tier.price}</span>
              <span className="text-sm text-muted-foreground font-body">{tier.priceLabel}</span>
            </div>
            {tier.savingTag && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 text-[10px] font-heading font-semibold mb-4">
                {tier.savingTag}
              </span>
            )}
            <ul className="space-y-2 mb-6 mt-2">
              {tier.features.map((f, j) => (
                <li key={j} className="flex items-center gap-2 text-sm font-body text-foreground">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className={`w-full font-heading font-semibold ${
                tier.highlight ? 'bg-primary hover:bg-primary/90' : ''
              }`}
              variant={tier.highlight ? 'default' : 'outline'}
              onClick={() => {
                if (tier.highlight) {
                  toast.success(lang === 'vi' ? 'Bạn đã được kích hoạt Premium Beta miễn phí!' : 'Premium Beta activated for free!');
                }
              }}
            >
              {tier.highlight ? (
                <span className="flex items-center gap-1.5">
                  <Crown className="w-4 h-4" />
                  {tier.cta}
                </span>
              ) : tier.cta}
            </Button>
            {tier.highlight && (
              <p className="text-[10px] text-center text-primary font-body mt-2">
                {lang === 'vi' ? 'Beta: Premium miễn phí cho tất cả người dùng' : 'Beta: Premium is free for all users'}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default PricingSection;
