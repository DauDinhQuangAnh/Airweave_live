import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Route,
  Bot,
  Heart,
  Wind,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useLiveAirContext } from '@/contexts/live-air-context';
import { useRiskProfile } from '@/hooks/use-risk-profile';
import { hasAirQualityReading } from '@/lib/air-quality';

interface Props {
  lang?: 'vi' | 'en';
}

export default function PersonalizedAQIGuidance({ lang = 'vi' }: Props) {
  const { weather } = useLiveAirContext();
  const { risk } = useRiskProfile();
  const navigate = useNavigate();
  const aqi = weather?.aqi || 0;
  const hasReading = hasAirQualityReading(weather);

  // Determine actions based on AQI level
  const isHighAqi = aqi >= 100;
  const isModerateAqi = aqi > 50 && aqi < 100;

  const actions = [
    {
      icon: '😷',
      title: lang === 'vi' ? 'Khẩu trang bảo vệ' : 'Protective Mask',
      desc:
        !hasReading
          ? lang === 'vi' ? 'Chưa có AQI để khuyến nghị khẩu trang' : 'AQI unavailable for mask advice'
          : isHighAqi
          ? lang === 'vi'
            ? 'Bắt buộc khẩu trang N95 / KF94 khi ra đường'
            : 'Wear N95/KF94 mask when outdoors'
          : isModerateAqi
          ? lang === 'vi'
            ? 'Nên đeo khẩu trang y tế khi đi xe máy'
            : 'Surgical mask recommended in traffic'
          : lang === 'vi'
          ? 'Không cần đeo khẩu trang lọc bụi mịn'
          : 'Standard outdoor air, no mask needed',
      safe: hasReading && aqi <= 50,
    },
    {
      icon: '🪟',
      title: lang === 'vi' ? 'Thông khí phòng' : 'Indoor Ventilation',
      desc:
        !hasReading
          ? lang === 'vi' ? 'Chưa có AQI để khuyến nghị thông khí' : 'AQI unavailable for ventilation advice'
          : isHighAqi
          ? lang === 'vi'
            ? 'Đóng cửa sổ, bật máy lọc không khí HEPA'
            : 'Keep windows closed, run HEPA purifier'
          : lang === 'vi'
          ? 'Mở cửa thông thoáng vào buổi trưa & chiều'
          : 'Ventilate during midday and afternoon',
      safe: hasReading && aqi <= 75,
    },
    {
      icon: '🏃',
      title: lang === 'vi' ? 'Vận động thể chất' : 'Physical Exercise',
      desc:
        !hasReading
          ? lang === 'vi' ? 'Chưa có AQI để đánh giá vận động ngoài trời' : 'AQI unavailable for outdoor exercise advice'
          : isHighAqi
          ? lang === 'vi'
            ? 'Hạn chế chạy bộ ngoài trời giờ cao điểm'
            : 'Avoid intense outdoor runs during peak hours'
          : lang === 'vi'
          ? 'Tập luyện thể thao ngoài trời bình thường'
          : 'Safe for outdoor exercise and recreation',
      safe: hasReading && aqi <= 100,
    },
  ];

  return (
    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-white/10 p-5 sm:p-6 shadow-xl backdrop-blur-xl text-white flex flex-col justify-between space-y-4">
      {/* Card Header */}
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-heading font-bold tracking-wider text-cyan-400 block">
                {lang === 'vi' ? 'Khuyến Nghị Sức Khỏe' : 'Personal Health Advisory'}
              </span>
              <h3 className="text-sm sm:text-base font-heading font-bold text-white leading-tight">
                {risk?.label?.[lang] || risk?.label?.vi || (lang === 'vi' ? 'Hồ sơ sức khỏe cá nhân' : 'Personal Health Profile')}
              </h3>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px] font-heading font-bold border border-cyan-500/30 shrink-0">
            {lang === 'vi' ? 'Cá nhân hoá' : 'Tailored'}
          </span>
        </div>

        {/* 3 Visual Action Cards */}
        <div className="space-y-2.5 mt-3.5">
          {actions.map((act, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all text-left"
            >
              <span className="text-xl shrink-0">{act.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-heading font-bold text-white">{act.title}</h4>
                  {!hasReading ? (
                    <Sparkles className="w-3 h-3 text-slate-400 shrink-0" />
                  ) : act.safe ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-white/60 truncate mt-0.5">{act.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons & SOS Link */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate('/smart-route')}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Route className="w-3.5 h-3.5" />
            <span>{lang === 'vi' ? 'Lộ trình sạch' : 'Smart Route'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('airweave:open-ai-chat'))}
            className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'vi' ? 'Hỏi AI y tế' : 'Ask AI'}</span>
          </button>
        </div>

        {/* SOS Emergency Link */}
        <button
          type="button"
          onClick={() => navigate('/sos')}
          className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-heading font-medium text-[11px] flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>{lang === 'vi' ? 'Hồ sơ Y tế Cấp cứu SOS' : 'Emergency Medical SOS'}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
        </button>
      </div>
    </div>
  );
}
