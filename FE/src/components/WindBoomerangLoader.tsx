import { motion } from 'framer-motion';
import { Wind } from 'lucide-react';

interface WindBoomerangLoaderProps {
  text?: string;
  className?: string;
}

const WindBoomerangLoader = ({ text, className = '' }: WindBoomerangLoaderProps) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <motion.div
        animate={{
          x: [0, 40, 0, -40, 0],
          rotate: [0, 15, 0, -15, 0],
        }}
        transition={{
          duration: 1,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      >
        <Wind className="w-10 h-10 text-primary" />
      </motion.div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground font-body"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default WindBoomerangLoader;
