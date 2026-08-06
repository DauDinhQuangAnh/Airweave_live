import { motion, useInView } from 'framer-motion';
import { Star } from 'lucide-react';
import { useRef } from 'react';

const testimonials = [
  {
    stars: 5,
    quote: 'Từ khi dùng AirWeave, tôi biết chính xác khi nào an toàn để cho con ra ngoài chơi. Tính năng cảnh báo theo hồ sơ bệnh lý của bé là điều tôi tìm kiếm từ lâu.',
    initials: 'LH', color: '#00d4aa',
    name: 'Lê Hà Anh', role: 'Phụ huynh, Quận 2 · Bé 3 tuổi',
  },
  {
    stars: 5,
    quote: 'Tôi bị hen suyễn 10 năm. Lần đầu tiên tôi có một app hiểu mình cần gì thực sự — không phải chỉ cần biết AQI là bao nhiêu, mà cần biết tôi có nên đi làm bằng xe không.',
    initials: 'NM', color: '#0ea5e9',
    name: 'Nguyễn Minh Khoa', role: 'Kỹ sư phần mềm · Bệnh nhân hen suyễn',
  },
  {
    stars: 5,
    quote: 'Smart Route thay đổi hoàn toàn lộ trình chạy bộ của tôi. Ứng dụng chỉ tôi con đường qua công viên thay vì đường chính — phổi tôi cảm ơn mỗi sáng.',
    initials: 'PT', color: '#7c3aed',
    name: 'Phạm Thu Trang', role: 'Runner · Cộng đồng Strava Vietnam',
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const Testimonials = () => {
  const headerRef = useRef(null);
  const gridRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-80px' });
  const gridInView = useInView(gridRef, { once: true, margin: '-80px' });

  return (
    <section className="relative z-10 max-w-5xl mx-auto px-4 py-12 md:py-16">
      <motion.div
        ref={headerRef}
        initial={{ opacity: 0, y: 30 }}
        animate={headerInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-8 md:mb-12"
      >
        <span className="text-xs font-body font-medium text-[#00d4aa] tracking-widest uppercase mb-3 block">Người dùng nói gì</span>
        <h2 className="font-heading text-2xl md:text-4xl font-extrabold text-foreground tracking-[-1px]">Họ đã thở dễ hơn</h2>
      </motion.div>

      <motion.div
        ref={gridRef}
        variants={containerVariants}
        initial="hidden"
        animate={gridInView ? 'show' : 'hidden'}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5"
      >
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            variants={cardVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="rounded-2xl p-5 md:p-6 bg-card/80 backdrop-blur-xl border border-border shadow-sm hover:shadow-lg transition-shadow"
          >
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: t.stars }).map((_, j) => (
                <motion.span
                  key={j}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={gridInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.4 + i * 0.15 + j * 0.05, type: 'spring', stiffness: 300 }}
                >
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </motion.span>
              ))}
            </div>
            <p className="text-sm font-body text-muted-foreground leading-relaxed mb-6 italic">"{t.quote}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-heading font-bold text-white shadow-md" style={{ backgroundColor: t.color, boxShadow: `0 0 20px ${t.color}40` }}>
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-heading font-semibold text-foreground">{t.name}</p>
                <p className="text-xs font-body text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};

export default Testimonials;
