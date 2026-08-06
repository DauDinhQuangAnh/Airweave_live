import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const features = [
  { icon: '🗺️', title: 'Lộ trình Sạch', desc: 'Thuật toán Smart Route tìm đường ít bụi mịn PM2.5 nhất — không phải đường nhanh nhất. Lý tưởng cho 60 triệu người đi xe máy.', tag: 'Smart Route', glow: '#00d4aa' },
  { icon: '📍', title: 'Bản đồ Vi vùng', desc: 'Hyper-local Geofencing chia bản đồ thành ô lưới siêu nhỏ. Biết chính xác chất lượng không khí tại từng phường, từng ngõ bạn đang đứng.', tag: 'Hyper-local', glow: '#0ea5e9' },
  { icon: '🔥', title: 'Heatmap Cộng đồng', desc: 'Crowdsourcing real-time: người dân báo cáo điểm đốt rác, khói bụi công trình, kẹt xe. AI phân tích và hiển thị bản đồ ô nhiễm sống ngay lập tức.', tag: 'Crowdsourced', glow: '#7c3aed' },
  { icon: '🤖', title: 'Trợ lý AI Cá nhân', desc: "AI phân tích hồ sơ sức khỏe của bạn (hen suyễn, COPD, trẻ nhỏ) và đưa ra lời khuyên cụ thể: 'Dời lịch chạy bộ sang 9h sáng.'", tag: 'AI-powered', glow: '#f59e0b' },
  { icon: '🔔', title: 'Cảnh báo Cá nhân hóa', desc: 'Push notification thông minh dựa trên thói quen sinh hoạt. Chỉ cảnh báo khi thực sự cần — không spam, không bỏ sót.', tag: 'Personalized', glow: '#ec4899' },
  { icon: '🏠', title: 'Smart Home Integration', desc: 'Tự động bật máy lọc không khí (Xiaomi, Panasonic, Dyson) khi app phát hiện AQI ngoài trời vượt ngưỡng nguy hiểm.', tag: 'Tương lai gần', glow: '#22c55e' },
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
        <span className="text-xs font-body font-medium text-[#00d4aa] tracking-widest uppercase mb-3 block">Tính năng cốt lõi</span>
        <h2 className="font-heading text-2xl md:text-4xl font-extrabold text-foreground tracking-[-1px] leading-tight">
          Không chỉ báo số —<br />chúng tôi hướng dẫn hành động
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
              <h3 className="font-heading text-base md:text-lg font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm font-body text-muted-foreground leading-relaxed mb-4">{f.desc}</p>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-body font-medium border border-border text-muted-foreground">
                {f.tag}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default FeaturesSection;
