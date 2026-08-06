import { motion } from 'framer-motion';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { useGlobalRanking } from '@/hooks/use-global-ranking';

interface GlobalRankingAlertProps {
  lang: 'vi' | 'en';
}

const GlobalRankingAlert = ({ lang }: GlobalRankingAlertProps) => {
  const { ranking, loading } = useGlobalRanking();

  if (loading || !ranking.isInTop10) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-4 rounded-2xl border-2 border-destructive/40 bg-destructive/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-sm font-bold text-destructive mb-1">
              {lang === 'vi' ? '⚠️ Cảnh báo ô nhiễm nghiêm trọng' : '⚠️ Severe Pollution Alert'}
            </h3>
            <p className="text-sm text-foreground font-body leading-relaxed">
              {lang === 'vi'
                ? `${ranking.city} đang ở mức AQI ${ranking.aqi} — nguy hại cho sức khỏe. Mức ô nhiễm nằm trong nhóm tồi tệ nhất toàn cầu lúc này.`
                : `${ranking.city} has AQI ${ranking.aqi} — unhealthy. Pollution is among the worst globally right now.`}
            </p>
            <a
              href={ranking.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-heading font-semibold text-destructive hover:underline"
            >
              {lang === 'vi' ? 'Xem xếp hạng toàn cầu' : 'View global ranking'}
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-[10px] text-muted-foreground font-body ml-3">
              {lang === 'vi' ? 'Nguồn' : 'Source'}: {ranking.source}
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default GlobalRankingAlert;
