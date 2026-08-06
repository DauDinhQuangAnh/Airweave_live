import { Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const explanations: Record<string, { vi: string; en: string }> = {
  'PM2.5': {
    vi: '🤖 AI giải thích: PM2.5 là bụi siêu mịn, kích thước chỉ bằng 1/30 sợi tóc. Khi chỉ số cao, bụi có thể đi thẳng vào mạch máu. Hãy đeo khẩu trang N95!',
    en: '🤖 AI explains: PM2.5 is ultra-fine dust, 1/30th the width of a hair. At high levels, it can enter your bloodstream directly. Wear an N95 mask!',
  },
  'temperature': {
    vi: '🤖 AI giải thích: Nhiệt độ cao kết hợp lặng gió khiến ô nhiễm tích tụ gần mặt đất. Khi trên 35°C, hạn chế hoạt động ngoài trời từ 11h-15h.',
    en: '🤖 AI explains: High temperatures with low wind trap pollution near ground level. Above 35°C, limit outdoor activity from 11AM-3PM.',
  },
  'humidity': {
    vi: '🤖 AI giải thích: Độ ẩm cao (>80%) khiến bụi mịn hút nước, phình to và lắng đọng nhanh hơn – tốt cho phổi nhưng dễ gây bí bách. Độ ẩm thấp (<40%) khiến bụi bay lơ lửng lâu hơn.',
    en: '🤖 AI explains: High humidity (>80%) makes particles absorb water and settle faster – good for lungs but feels stuffy. Low humidity (<40%) keeps dust airborne longer.',
  },
  'wind': {
    vi: '🤖 AI giải thích: Gió mạnh giúp phân tán ô nhiễm, nhưng cũng có thể mang bụi từ vùng khác đến. Hướng gió cho biết nguồn ô nhiễm có thể đến từ đâu.',
    en: '🤖 AI explains: Strong wind disperses pollution, but can also carry dust from other areas. Wind direction indicates where pollution may come from.',
  },
};

interface AITooltipProps {
  metricKey: string;
  lang: 'vi' | 'en';
}

const AITooltip = ({ metricKey, lang }: AITooltipProps) => {
  const explanation = explanations[metricKey];
  if (!explanation) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center justify-center w-4 h-4 text-primary animate-pulse hover:scale-110 transition-transform">
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm font-body" side="top">
        <p className="leading-relaxed text-foreground">{explanation[lang]}</p>
      </PopoverContent>
    </Popover>
  );
};

export default AITooltip;
