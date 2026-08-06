import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/hooks/use-premium';

interface PremiumGateProps {
  children: React.ReactNode;
  feature: string;
  lang: 'vi' | 'en';
}

const PremiumGate = ({ children, feature, lang }: PremiumGateProps) => {
  const { isPremium } = usePremium();

  if (isPremium) return <>{children}</>;

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-primary/30">
        <Lock className="w-8 h-8 text-primary mb-3" />
        <p className="font-heading text-sm font-bold text-foreground mb-1">
          {lang === 'vi' ? 'Tính năng Premium' : 'Premium Feature'}
        </p>
        <p className="text-xs text-muted-foreground font-body mb-3 text-center px-4">
          {lang === 'vi'
            ? `Nâng cấp để mở khóa ${feature}`
            : `Upgrade to unlock ${feature}`}
        </p>
        <Button size="sm" className="font-heading text-xs">
          {lang === 'vi' ? 'Nâng cấp Premium' : 'Upgrade to Premium'}
        </Button>
      </div>
    </div>
  );
};

export default PremiumGate;
