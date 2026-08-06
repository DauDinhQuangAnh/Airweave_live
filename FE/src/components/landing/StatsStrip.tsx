import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const stats = [
  { number: 70000, suffix: '+', prefix: '', display: '70K+', desc: 'ca tử vong/năm do ô nhiễm tại VN', source: 'WHO 2025' },
  { number: 10, suffix: 'M', prefix: '', display: '10M', desc: 'người Việt mắc bệnh phổi mãn tính', source: 'Bộ Y tế 2024' },
  { number: 40, suffix: '%', prefix: '', display: '40%', desc: 'giảm phơi nhiễm PM2.5 với Smart Route', source: 'AirWeave Research 2025' },
  { number: 13, suffix: 'B', prefix: '$', display: '$13B', desc: 'thiệt hại kinh tế/năm do không khí xấu', source: 'World Bank 2024' },
];

function formatNumber(val: number, stat: typeof stats[0]) {
  if (stat.display.includes('K')) {
    const k = Math.round(val / 1000);
    return `${stat.prefix}${k}K${stat.suffix}`;
  }
  return `${stat.prefix}${Math.round(val)}${stat.suffix}`;
}

function useCountUp(end: number, duration: number, start: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(eased * end);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, start]);

  return value;
}

const StatItem = ({ stat, delay }: { stat: typeof stats[0]; delay: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(t);
    }
  }, [inView, delay]);

  const value = useCountUp(stat.number, 2000, started);

  return (
    <motion.div
      ref={ref}
      className="text-center px-4 py-6"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: delay / 1000 }}
    >
      <div className="text-3xl md:text-4xl font-heading font-extrabold bg-gradient-to-r from-[#00d4aa] to-[#0ea5e9] bg-clip-text text-transparent mb-2 tabular-nums">
        {formatNumber(value, stat)}
      </div>
      <p className="text-xs md:text-sm font-body text-muted-foreground leading-relaxed">{stat.desc}</p>
      <p className="text-[10px] text-muted-foreground/50 font-body mt-1">Nguồn: {stat.source}</p>
    </motion.div>
  );
};

const StatsStrip = () => (
  <section className="relative z-10 max-w-5xl mx-auto px-4 py-16">
    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
      {stats.map((s, i) => (
        <StatItem key={i} stat={s} delay={i * 150} />
      ))}
    </div>
  </section>
);

export default StatsStrip;
