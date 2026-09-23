import { motion } from 'framer-motion';
import { useAppLang } from '@/hooks/use-app-lang';

const steps = [
  { num: 1, title: ['Thu thập dữ liệu', 'Collect data'], desc: ['Truy vấn WAQI và Open-Meteo; cộng đồng và IoT chỉ hiện khi có nguồn.', 'Query WAQI and Open-Meteo; community and IoT data appear only when available.'] },
  { num: 2, title: ['Phân tích theo vị trí', 'Location-based context'], desc: ['Tính AQI từ PM2.5 khi cần và ghi rõ nguồn trạm hoặc mô hình.', 'Calculate AQI from PM2.5 when needed and identify station or model sources.'] },
  { num: 3, title: ['Cá nhân hóa', 'Personalize'], desc: ['Áp dụng ngưỡng cảnh báo và vị trí bạn đã chọn.', 'Apply your alert threshold and chosen location.'] },
  { num: 4, title: ['Hành động', 'Take action'], desc: ['Xem cảnh báo, lộ trình và báo cáo khi có dữ liệu phù hợp.', 'View alerts, routes, and reports when supporting data is available.'] },
];

const HowItWorks = () => {
  const lang = useAppLang();
  const index = lang === 'vi' ? 0 : 1;
  return (
  <section className="relative z-10 max-w-5xl mx-auto px-4 py-16">
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
      <span className="text-xs font-body font-medium text-[#00d4aa] tracking-widest uppercase mb-3 block">{lang === 'vi' ? 'Cách hoạt động' : 'How it works'}</span>
      <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-foreground tracking-[-1px]">
        {lang === 'vi' ? 'Từ dữ liệu đến hành động — 4 bước' : 'From data to action — four steps'}
      </h2>
    </motion.div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {steps.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12 }}
          className="rounded-2xl p-6 text-center bg-card/80 backdrop-blur-xl border border-border shadow-sm"
        >
          {/* Spinning ring number */}
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full animate-spin-slow" style={{ background: 'conic-gradient(from 0deg, #00d4aa, #0ea5e9, #7c3aed, transparent)', padding: '2px' }}>
              <div className="w-full h-full rounded-full bg-card" />
            </div>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-heading font-extrabold text-foreground">
              {s.num}
            </span>
          </div>
          <h3 className="font-heading text-base font-bold text-foreground mb-2">{s.title[index]}</h3>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">{s.desc[index]}</p>
        </motion.div>
      ))}
    </div>
  </section>
  );
};

export default HowItWorks;
