import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, Crown, Heart, Building2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Tier = {
  name: string;
  badge?: string;
  icon: React.ReactNode;
  priceMonthly: string;
  priceYearly: string;
  noteMonthly?: string;
  noteYearly?: string;
  desc: string;
  features: { text: string; ok: boolean }[];
  cta: string;
  featured?: boolean;
};

const PricingCards = () => {
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(false);

  const tiers: Tier[] = [
    {
      name: 'Basic',
      icon: <Check className="w-4 h-4" />,
      priceMonthly: '0đ',
      priceYearly: '0đ',
      noteMonthly: 'mãi mãi',
      noteYearly: 'mãi mãi',
      desc: 'Dành cho mọi người dân — quyền tiếp cận thông tin không khí cơ bản.',
      features: [
        { text: 'Bản đồ AQI Realtime', ok: true },
        { text: 'Cảnh báo hàng ngày', ok: true },
        { text: 'Báo cáo cộng đồng', ok: true },
        { text: 'AirWeave SOS — Flash Card công khai', ok: true },
        { text: 'Smart Route không giới hạn', ok: false },
        { text: 'AI Insight cá nhân hoá', ok: false },
        { text: 'Hồ sơ y tế đầy đủ (Medical ID)', ok: false },
      ],
      cta: 'Dùng miễn phí',
    },
    {
      name: 'Premium',
      badge: 'Phổ biến nhất',
      icon: <Crown className="w-4 h-4" />,
      priceMonthly: '49.000đ',
      priceYearly: '490.000đ',
      noteMonthly: '/tháng',
      noteYearly: '/năm · tiết kiệm 2 tháng',
      desc: 'Bảo vệ chủ động cho cá nhân & gia đình di chuyển nhiều trong đô thị.',
      features: [
        { text: 'Toàn bộ tính năng Basic', ok: true },
        { text: 'AirWeave SOS đầy đủ — Medical ID, bản đồ bệnh viện 15km, QR khẩn cấp', ok: true },
        { text: 'Smart Route (lộ trình AQI thấp nhất)', ok: true },
        { text: 'Cảnh báo GPS vi vùng', ok: true },
        { text: 'AI Insight chuyên sâu (Gemini)', ok: true },
        { text: 'Lịch sử ô nhiễm 2 năm + Time Machine', ok: true },
        { text: 'Báo cáo sức khoẻ tuần', ok: true },
      ],
      cta: 'Dùng thử 7 ngày — Beta đang miễn phí',
      featured: true,
    },
    {
      name: 'Family',
      icon: <Heart className="w-4 h-4" />,
      priceMonthly: '99.000đ',
      priceYearly: '990.000đ',
      noteMonthly: '/tháng · tối đa 5 thành viên',
      noteYearly: '/năm · 5 thành viên',
      desc: 'Cho gia đình có trẻ nhỏ, người cao tuổi hoặc người có bệnh hô hấp.',
      features: [
        { text: 'Toàn bộ tính năng Premium', ok: true },
        { text: 'Tối đa 5 hồ sơ Medical ID liên kết', ok: true },
        { text: 'SOS chia sẻ vị trí thời gian thực với người thân', ok: true },
        { text: 'Cảnh báo riêng cho trẻ em & người già', ok: true },
        { text: 'Bảng điều khiển sức khoẻ cả nhà', ok: true },
      ],
      cta: 'Bảo vệ cả gia đình',
    },
    {
      name: 'Business API',
      icon: <Building2 className="w-4 h-4" />,
      priceMonthly: 'Liên hệ',
      priceYearly: 'Liên hệ',
      desc: 'Cho trường học, phòng khám, tòa nhà, doanh nghiệp ESG.',
      features: [
        { text: 'Air Twin Data API', ok: true },
        { text: 'Báo cáo ESG & chất lượng không khí tự động', ok: true },
        { text: 'Tích hợp hệ thống nội bộ (HVAC, IoT)', ok: true },
        { text: 'SLA 99.9% uptime, hỗ trợ 24/7', ok: true },
        { text: 'Custom branding & white-label', ok: true },
      ],
      cta: 'Liên hệ tư vấn →',
    },
  ];

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 py-16" id="pricing">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
        <span className="text-xs font-body font-medium text-[#00d4aa] tracking-widest uppercase mb-3 block">Bảng giá AirWeave</span>
        <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-foreground tracking-[-1px] leading-tight">
          Đầu tư cho nhịp thở.<br />Bảo vệ cả gia đình.
        </h2>
        <p className="text-sm font-body text-muted-foreground max-w-2xl mx-auto mt-4">
          Mô hình freemium bền vững — gói Premium chỉ 49.000đ/tháng, cùng chương trình affiliate dành cho cộng đồng sức khoẻ.
        </p>

        {/* Toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-secondary mt-6 border border-border">
          <button
            onClick={() => setYearly(false)}
            className={`px-4 py-1.5 rounded-full text-xs font-heading font-semibold transition-all ${!yearly ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Theo tháng
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-4 py-1.5 rounded-full text-xs font-heading font-semibold transition-all ${yearly ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Theo năm <span className="ml-1 text-[#00d4aa]">−16%</span>
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {tiers.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className={`relative rounded-2xl p-6 bg-card/80 backdrop-blur-xl border shadow-sm flex flex-col ${
              t.featured
                ? 'lg:scale-[1.03] border-[#00d4aa]/40 shadow-[0_0_40px_rgba(0,212,170,0.15)]'
                : 'border-border'
            }`}
          >
            {t.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[#00d4aa] to-[#0ea5e9] text-white text-[10px] font-heading font-bold shadow-lg flex items-center gap-1">
                <Crown className="w-3 h-3" /> {t.badge}
              </div>
            )}

            <div className="flex items-center gap-2 mb-1 mt-2">
              <span className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground/70">
                {t.icon}
              </span>
              <h3 className="font-heading text-lg font-bold text-foreground">{t.name}</h3>
            </div>
            <p className="text-xs font-body text-muted-foreground mb-4 leading-relaxed min-h-[36px]">{t.desc}</p>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-heading font-extrabold text-foreground">
                {yearly ? t.priceYearly : t.priceMonthly}
              </span>
            </div>
            {(yearly ? t.noteYearly : t.noteMonthly) && (
              <p className="text-[11px] font-body text-muted-foreground/70 mb-5">
                {yearly ? t.noteYearly : t.noteMonthly}
              </p>
            )}

            <ul className="space-y-2 mb-6 flex-1">
              {t.features.map((f, j) => (
                <li key={j} className="flex items-start gap-2 text-xs font-body leading-snug">
                  {f.ok ? (
                    <Check className="w-4 h-4 text-[#00d4aa] shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                  )}
                  <span className={f.ok ? 'text-foreground/80' : 'text-muted-foreground/40'}>{f.text}</span>
                </li>
              ))}
            </ul>

            <Button
              className={`w-full font-heading font-semibold text-xs ${
                t.featured
                  ? 'bg-gradient-to-r from-[#00d4aa] to-[#0ea5e9] hover:opacity-90 text-white border-0 shadow-[0_0_20px_rgba(0,212,170,0.3)]'
                  : 'bg-secondary hover:bg-accent border border-border text-foreground'
              }`}
              onClick={() => navigate('/auth')}
            >
              {t.cta}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Affiliate strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-10 rounded-2xl p-6 md:p-8 bg-gradient-to-br from-[#00d4aa]/10 via-card/80 to-[#0ea5e9]/10 backdrop-blur-xl border border-[#00d4aa]/20 flex flex-col md:flex-row items-center gap-5"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4aa] to-[#0ea5e9] flex items-center justify-center shrink-0 shadow-lg">
          <Share2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="font-heading text-base md:text-lg font-bold text-foreground mb-1">
            Chương trình Affiliate — kiếm 30% hoa hồng định kỳ
          </h3>
          <p className="text-xs md:text-sm font-body text-muted-foreground leading-relaxed">
            Giới thiệu Premium hoặc Family cho bạn bè, nhận 30% giá trị mỗi tháng họ duy trì gói. Bác sĩ, KOLs sức khỏe và nhà thuốc nhận hoa hồng cao hơn (lên tới 40%).
          </p>
        </div>
        <Button
          variant="outline"
          className="font-heading font-semibold text-xs border-[#00d4aa]/40 text-foreground hover:bg-[#00d4aa]/10"
          onClick={() => navigate('/auth')}
        >
          Tham gia Affiliate
        </Button>
      </motion.div>

    </section>
  );
};

export default PricingCards;
