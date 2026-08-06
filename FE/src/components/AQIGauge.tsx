import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { getAQIColor, getAQITextColor } from '@/lib/aqi-utils';

interface AQIGaugeProps {
  aqi: number;
  size?: number;
}

const AQIGauge = ({ aqi, size = 220 }: AQIGaugeProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const color = getAQIColor(aqi);
  const textColor = getAQITextColor(aqi);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const maxAqi = 500;
  const progress = Math.min(aqi / maxAqi, 1);
  const strokeDashoffset = circumference * (1 - progress);

  // Count-up animation
  useEffect(() => {
    setDisplayValue(0);
    startTimeRef.current = undefined;

    const duration = 1500;
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(Math.round(eased * aqi));
      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [aqi]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* SVG ring */}
      <svg width={size} height={size} className="absolute -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="8"
          opacity={0.3}
        />
        {/* Animated progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: [0.33, 1, 0.68, 1] }}
        />
      </svg>

      {/* Inner circle with number */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-[75%] h-[75%] rounded-full flex flex-col items-center justify-center shadow-2xl"
        style={{ backgroundColor: color, color: textColor }}
      >
        <span className="font-heading text-6xl md:text-7xl font-extrabold leading-none tabular-nums">
          {displayValue}
        </span>
        <span className="font-heading text-sm font-semibold mt-1 opacity-80">AQI</span>
      </motion.div>
    </div>
  );
};

export default AQIGauge;
