import { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface ShareMapButtonProps {
  lang: 'vi' | 'en';
  targetRef: React.RefObject<HTMLElement>;
  caption?: string;
}

const ShareMapButton = ({ lang, targetRef, caption }: ShareMapButtonProps) => {
  const [busy, setBusy] = useState(false);

  const t = (vi: string, en: string) => (lang === 'vi' ? vi : en);

  const capture = async (): Promise<Blob | null> => {
    const node = targetRef.current;
    if (!node) return null;
    const canvas = await html2canvas(node, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0F172A',
      logging: false,
      scale: window.devicePixelRatio || 2,
    });
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.95));
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await capture();
      if (!blob) throw new Error('capture failed');

      const filename = `airweave-airmap-${Date.now()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      const text = caption ?? t(
        'Bản đồ AirWeave — Trạm thật & báo cáo cộng đồng',
        'AirWeave Air Map — Real stations & community reports'
      );

      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };

      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: 'AirWeave Air Map', text });
        toast.success(t('Đã mở hộp chia sẻ', 'Share sheet opened'));
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        toast.success(t('Đã tải ảnh bản đồ', 'Map image downloaded'));
      }
    } catch (e) {
      console.error(e);
      toast.error(t('Không thể chụp bản đồ', 'Failed to capture map'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={busy}
      aria-label={t('Chia sẻ ảnh bản đồ', 'Share map image')}
      className="flex items-center gap-1.5 rounded-full bg-card/90 backdrop-blur-md border border-border h-10 px-3 text-xs font-heading font-semibold text-foreground shadow-md hover:bg-card transition-colors disabled:opacity-60"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
      <span className="hidden sm:inline">{t('Chia sẻ', 'Share')}</span>
    </button>
  );
};

export default ShareMapButton;
