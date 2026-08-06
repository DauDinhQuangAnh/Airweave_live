import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useAppLang } from '@/hooks/use-app-lang';
import { toast } from 'sonner';

export default function ShareLocationButton({ lang: propLang }: { lang?: 'vi' | 'en' }) {
  const contextLang = useAppLang();
  const lang = propLang || contextLang;

  const { location, weather } = useLiveAirContext();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const hasLoc = !!(location.lat && location.lng);
  const mapsUrl = hasLoc ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : '';
  const acc = location.accuracy ? `±${location.accuracy}m` : '';

  const message =
    lang === 'vi'
      ? `🚨 SOS AirWeave — Cần hỗ trợ khẩn cấp\n📍 Vị trí của tôi (${acc}): ${location.label}\n🗺 ${mapsUrl}` +
        (weather.aqi ? `\n💨 AQI hiện tại: ${weather.aqi} | PM2.5: ${weather.pm25?.toFixed(0)}` : '')
      : `🚨 SOS AirWeave — Emergency assistance required\n📍 My location (${acc}): ${location.label}\n🗺 ${mapsUrl}` +
        (weather.aqi ? `\n💨 Live AQI: ${weather.aqi} | PM2.5: ${weather.pm25?.toFixed(0)}` : '');

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success(lang === 'vi' ? 'Đã sao chép link vị trí' : 'Location link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SOS AirWeave', text: message, url: mapsUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      setOpen((o) => !o);
    }
  };

  if (!hasLoc) {
    return (
      <Button disabled variant="outline" size="sm" className="w-full font-heading">
        <Share2 className="w-4 h-4 mr-2" />
        {lang === 'vi' ? 'Đang lấy GPS để chia sẻ...' : 'Acquiring GPS for sharing...'}
      </Button>
    );
  }

  return (
    <div className="space-y-2 font-body">
      <div className="flex gap-2">
        <Button
          onClick={nativeShare}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-heading font-bold"
        >
          <Share2 className="w-4 h-4 mr-2" />
          {lang === 'vi' ? 'Chia sẻ vị trí SOS' : 'Share SOS Location'}
        </Button>
        <Button onClick={copy} variant="outline" size="icon" title={lang === 'vi' ? 'Sao chép link' : 'Copy link'}>
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      {open && (
        <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
          <a
            href={`sms:?body=${encodeURIComponent(message)}`}
            className="flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold"
          >
            <Send className="w-3.5 h-3.5" /> SMS
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(mapsUrl)}&text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1 py-2 rounded-lg bg-sky-500 text-white text-xs font-semibold"
          >
            <Send className="w-3.5 h-3.5" /> Telegram
          </a>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        {lang === 'vi'
          ? `Gửi nhanh đến người thân, bệnh viện hoặc 115 với tọa độ GPS chính xác ${acc}.`
          : `Fast dispatch to family, hospitals, or 115 with high-accuracy GPS coordinates ${acc}.`}
      </p>
    </div>
  );
}
