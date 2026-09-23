import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useAppLang } from '@/hooks/use-app-lang';

const features = [
  { icon: '🗺️', title: ['Lộ trình Sạch', 'Smart Route'], desc: ['So sánh lộ trình theo dữ liệu ô nhiễm hiện có và xem nguồn.', 'Compare routes using available pollution data and inspect sources.'], tag: 'Smart Route', glow: '#00d4aa' },
  { icon: '📍', title: ['Bản đồ Chất lượng Không khí', 'Air Quality Map'], desc: ['Xem trạm công khai và cảm biến đã kết nối. Vùng thiếu dữ liệu được đánh dấu rõ.', 'View public stations and connected sensors. Areas without data are marked clearly.'], tag: 'AQI Map', glow: '#0ea5e9' },
  { icon: '🔥', title: ['Báo cáo Cộng đồng', 'Community Reports'], desc: ['Gửi và xem báo cáo do người dùng cung cấp; cần kiểm chứng độc lập.', 'Submit and view user reports; independent verification is still needed.'], tag: 'Community', glow: '#7c3aed' },
  { icon: '🤖', title: ['Trợ lý AI', 'AI Assistant'], desc: ['Hỏi đáp theo ngữ cảnh không khí hiện có; không thay thế tư vấn y tế.', 'Ask about available air data; AI does not replace medical advice.'], tag: 'AI', glow: '#f59e0b' },
  { icon: '🔔', title: ['Cảnh báo theo ngưỡng', 'Threshold Alerts'], desc: ['Nhận cảnh báo trong ứng dụng khi AQI mới vượt ngưỡng đã cài.', 'Get in-app alerts when a fresh AQI reading exceeds your threshold.'], tag: 'Alerts', glow: '#ec4899' },
  { icon: '🏠', title: ['Tích hợp Nhà thông minh', 'Smart Home Integration'], desc: ['Định hướng phát triển; chưa có kết nối điều khiển máy lọc.', 'Planned only; air purifier controls are not connected.'], tag: ['Chưa triển khai', 'Not available'], glow: '#22c55e' },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const FeaturesSection = () => {
  const lang = useAppLang();
  const index = lang === 'vi' ? 0 : 1;
  const headerRef = useRef(null);
  const gridRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-80px' });
  const gridInView = useInView(gridRef, { once: true, margin: '-80px' });

  return (
    <section className="relative z-10 max-w-5xl mx-auto px-4 py-12 md:py-16">
      <motion.div
        ref={headerRef}
        variants={headerVariants}
        initial="hidden"
        animate={headerInView ? 'show' : 'hidden'}
        className="text-center mb-8 md:mb-12"
      >
        <span className="text-xs font-body font-medium text-[#00d4aa] tracking-widest uppercase mb-3 block">{lang === 'vi' ? 'Tính năng cốt lõi' : 'Core features'}</span>
        <h2 className="font-heading text-2xl md:text-4xl font-extrabold text-foreground tracking-[-1px] leading-tight">
          {lang === 'vi' ? <>Không chỉ báo số —<br />chúng tôi hướng dẫn hành động</> : <>More than a number —<br />information you can act on</>}
        </h2>
      </motion.div>

      <motion.div
        ref={gridRef}
        variants={containerVariants}
        initial="hidden"
        animate={gridInView ? 'show' : 'hidden'}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5"
      >
        {features.map((f, i) => (
          <motion.div
            key={i}
            variants={cardVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative rounded-2xl p-5 md:p-6 bg-card/80 backdrop-blur-xl border border-border hover:border-border transition-colors duration-300 group overflow-hidden shadow-sm"
          >
            <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 rounded-full blur-[40px] md:blur-[60px] opacity-10 group-hover:opacity-25 transition-opacity duration-500" style={{ backgroundColor: f.glow }} />
            <div className="relative z-10">
              <div
                className="w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-2xl mb-3 md:mb-4"
                style={{ backgroundColor: `${f.glow}15` }}
              >
                {f.icon}
              </div>
              <h3 className="font-heading text-base md:text-lg font-bold text-foreground mb-2">{f.title[index]}</h3>
              <p className="text-sm font-body text-muted-foreground leading-relaxed mb-4">{f.desc[index]}</p>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-body font-medium border border-border text-muted-foreground">
                {typeof f.tag === 'string' ? f.tag : f.tag[index]}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default FeaturesSection;
