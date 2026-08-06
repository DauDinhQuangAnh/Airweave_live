import { motion } from 'framer-motion';

const steps = [
  { num: 1, title: 'Thu thập dữ liệu', desc: 'Tổng hợp từ PAM Air, OpenAQ, báo cáo cộng đồng và dữ liệu thời tiết theo thời gian thực.' },
  { num: 2, title: 'AI phân tích', desc: 'Mô hình AI kết hợp GPS, gió, nhiệt độ để lấp đầy điểm mù và dự báo ô nhiễm vi vùng.' },
  { num: 3, title: 'Cá nhân hóa', desc: 'Đối chiếu với hồ sơ sức khỏe, lịch sinh hoạt và vị trí GPS của từng người dùng.' },
  { num: 4, title: 'Hành động ngay', desc: 'Nhận cảnh báo, lộ trình sạch và gợi ý cụ thể — bảo vệ sức khỏe trước khi quá muộn.' },
];

const HowItWorks = () => (
  <section className="relative z-10 max-w-5xl mx-auto px-4 py-16">
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
      <span className="text-xs font-body font-medium text-[#00d4aa] tracking-widest uppercase mb-3 block">Cách hoạt động</span>
      <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-foreground tracking-[-1px]">
        Từ dữ liệu đến hành động — 4 bước
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
          <h3 className="font-heading text-base font-bold text-foreground mb-2">{s.title}</h3>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">{s.desc}</p>
        </motion.div>
      ))}
    </div>
  </section>
);

export default HowItWorks;
