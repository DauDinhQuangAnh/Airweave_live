import { motion } from 'framer-motion';
import { CloudRain, Wind, Thermometer, Activity, Gauge } from 'lucide-react';

const icons = [
  { Icon: CloudRain, top: '8%', left: '5%', size: 'w-48 h-48 md:w-64 md:h-64', delay: 0 },
  { Icon: Wind, top: '60%', right: '3%', size: 'w-40 h-40 md:w-56 md:h-56', delay: 8 },
  { Icon: Thermometer, bottom: '10%', left: '15%', size: 'w-36 h-36 md:w-48 md:h-48', delay: 15 },
  { Icon: Activity, top: '25%', right: '12%', size: 'w-32 h-32 md:w-44 md:h-44', delay: 22 },
  { Icon: Gauge, bottom: '30%', left: '65%', size: 'w-40 h-40 md:w-52 md:h-52', delay: 30 },
];

const ThematicWatermark = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {icons.map(({ Icon, size, delay, ...pos }, i) => (
        <motion.div
          key={i}
          className={`absolute ${size}`}
          style={pos as React.CSSProperties}
          animate={{ y: [0, -12, 0, 12, 0], rotate: 360 }}
          transition={{
            y: { duration: 8, ease: 'easeInOut', repeat: Infinity, delay: delay * 0.1 },
            rotate: { duration: 60, ease: 'linear', repeat: Infinity },
          }}
        >
          <Icon className="w-full h-full text-foreground opacity-[0.04]" />
        </motion.div>
      ))}
    </div>
  );
};

export default ThematicWatermark;
